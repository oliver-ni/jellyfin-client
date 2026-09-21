/**
 * Seerr (formerly Jellyseerr), reached through the same-origin `/seerr` proxy (vite in
 * development, nginx in the container) so its cookie session works without CORS. Responses
 * are parsed into the client's own `Title` shape at this boundary; nothing else in the app
 * sees Seerr's types.
 */

const BASE = '/seerr/api/v1'
const TMDB_IMAGE = 'https://image.tmdb.org/t/p'

export type MediaType = 'movie' | 'tv'

/** Seerr's `MediaStatus` enum. */
export type Availability =
  | 'unknown'
  | 'pending'
  | 'processing'
  | 'partial'
  | 'available'
  | 'blocklisted'
  | 'deleted'

const AVAILABILITY: Record<number, Availability> = {
  1: 'unknown',
  2: 'pending',
  3: 'processing',
  4: 'partial',
  5: 'available',
  6: 'blocklisted',
  7: 'deleted',
}

/** Something can be requested when it is missing, or (for tv) only partly there. */
export const requestable = (a: Availability) =>
  a === 'unknown' || a === 'deleted' || a === 'partial'

export interface Title {
  type: MediaType
  tmdbId: number
  name: string
  year: number | null
  overview: string
  tagline: string | null
  genres: string[]
  rating: number | null
  poster: string | null
  backdrop: string | null
  availability: Availability
  /** Jellyfin id when Seerr has matched it to the library. */
  jellyfinId: string | null
}

interface Season {
  number: number
  name: string
  episodeCount: number
  availability: Availability
}

export interface TvDetails extends Title {
  type: 'tv'
  seasons: Season[]
}

export interface MovieDetails extends Title {
  type: 'movie'
  runtimeMinutes: number | null
}

/** Seasons still open to a request; a series is requestable while any remain. */
export const openSeasons = (tv: TvDetails) => tv.seasons.filter((s) => requestable(s.availability))

export interface SeerrUser {
  id: number
}

/** Seerr's `MediaRequestStatus` enum. */
const REQUEST_STATUS: Record<number, 'pending' | 'approved' | 'declined' | 'failed' | 'completed'> =
  {
    1: 'pending',
    2: 'approved',
    3: 'declined',
    4: 'failed',
    5: 'completed',
  }

export class SeerrError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface RawMediaInfo {
  status?: number
  jellyfinMediaId?: string | null
  seasons?: { seasonNumber: number; status: number }[]
  requests?: { status: number; seasons?: { seasonNumber: number }[] }[]
}

interface RawTitle {
  id: number
  mediaType: string
  title?: string
  name?: string
  releaseDate?: string
  firstAirDate?: string
  overview?: string
  tagline?: string
  genres?: { name: string }[]
  voteAverage?: number
  posterPath?: string | null
  backdropPath?: string | null
  runtime?: number | null
  seasons?: { seasonNumber: number; name: string; episodeCount: number }[]
  mediaInfo?: RawMediaInfo
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  })
  // Without the proxy the SPA fallback answers with index.html.
  if (!res.headers.get('content-type')?.includes('application/json')) {
    throw new SeerrError(res.status, 'Seerr is not configured')
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    throw new SeerrError(res.status, body?.message ?? `Seerr responded with ${res.status}`)
  }
  return res.json() as Promise<T>
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const year = (date?: string) => (date ? Number(date.slice(0, 4)) || null : null)
const image = (path: string | null | undefined, size: string) =>
  path ? `${TMDB_IMAGE}/${size}${path}` : null

function toTitle(raw: RawTitle): Title {
  return {
    type: raw.mediaType === 'tv' ? 'tv' : 'movie',
    tmdbId: raw.id,
    name: raw.title ?? raw.name ?? '',
    year: year(raw.releaseDate ?? raw.firstAirDate),
    overview: raw.overview ?? '',
    tagline: raw.tagline || null,
    genres: raw.genres?.map((g) => g.name) ?? [],
    rating: raw.voteAverage || null,
    poster: image(raw.posterPath, 'w342'),
    backdrop: image(raw.backdropPath, 'w1280'),
    availability: AVAILABILITY[raw.mediaInfo?.status ?? 1] ?? 'unknown',
    jellyfinId: raw.mediaInfo?.jellyfinMediaId ?? null,
  }
}

/** `true` when the proxy reaches a Seerr. Needs no session. */
export async function isConfigured(): Promise<boolean> {
  return request('/status').then(
    () => true,
    () => false,
  )
}

/** The signed-in Seerr user, or `null` when the cookie session is missing or expired. */
export async function me(): Promise<SeerrUser | null> {
  return request<SeerrUser>('/auth/me').catch((err: unknown) => {
    if (err instanceof SeerrError && (err.status === 401 || err.status === 403)) return null
    throw err
  })
}

/** Signs in with Jellyfin credentials; Seerr verifies them against its own Jellyfin. */
export function signIn(username: string, password: string): Promise<SeerrUser> {
  return request<SeerrUser>('/auth/jellyfin', json({ username, password }))
}

export function signOut() {
  return request('/auth/logout', { method: 'POST' })
}

export async function search(query: string): Promise<Title[]> {
  const page = await request<{ results: RawTitle[] }>(
    `/search?query=${encodeURIComponent(query)}&page=1`,
  )
  return page.results.filter((r) => r.mediaType === 'movie' || r.mediaType === 'tv').map(toTitle)
}

export async function movie(tmdbId: number): Promise<MovieDetails> {
  const raw = await request<RawTitle>(`/movie/${tmdbId}`)
  return { ...toTitle(raw), type: 'movie', runtimeMinutes: raw.runtime || null }
}

/**
 * Per-season availability. Seerr only lists a season under `mediaInfo.seasons` once the
 * downloader reports on it; until then an open request is the only sign it is spoken for.
 */
function seasonAvailability(info: RawMediaInfo | undefined): Map<number, Availability> {
  const out = new Map<number, Availability>()
  for (const req of info?.requests ?? []) {
    const status = REQUEST_STATUS[req.status]
    if (status === 'declined' || status === 'failed') continue
    for (const s of req.seasons ?? []) {
      out.set(s.seasonNumber, status === 'pending' ? 'pending' : 'processing')
    }
  }
  for (const s of info?.seasons ?? []) {
    const a = AVAILABILITY[s.status]
    if (a && a !== 'unknown') out.set(s.seasonNumber, a)
  }
  return out
}

export async function tv(tmdbId: number): Promise<TvDetails> {
  const raw = await request<RawTitle>(`/tv/${tmdbId}`)
  const availability = seasonAvailability(raw.mediaInfo)
  return {
    ...toTitle(raw),
    type: 'tv',
    seasons: (raw.seasons ?? [])
      .filter((s) => s.seasonNumber > 0)
      .map((s) => ({
        number: s.seasonNumber,
        name: s.name,
        episodeCount: s.episodeCount,
        availability: availability.get(s.seasonNumber) ?? 'unknown',
      })),
  }
}

export function requestMovie(tmdbId: number) {
  return request('/request', json({ mediaType: 'movie', mediaId: tmdbId }))
}

export function requestSeasons(tmdbId: number, seasons: number[]) {
  return request('/request', json({ mediaType: 'tv', mediaId: tmdbId, seasons }))
}
