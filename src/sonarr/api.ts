/**
 * Sonarr, read-only, through the same-origin `/sonarr` proxy that holds its API key (vite in
 * development, nginx in the container). Seerr only relays what Sonarr is actively fetching; why a
 * season it approved still isn't in the library — unmonitored, not aired, searched and nothing
 * found, downloaded but stuck at import — is only known here.
 */

import { formatDate, timeAgo } from '@/lib/format'

const BASE = '/sonarr/api/v3'

/** Where a grabbed release for an episode stands: fetching, done but held back from import, or failed. */
export type QueueState = 'downloading' | 'blocked' | 'failed'

export interface Episode {
  season: number
  number: number
  hasFile: boolean
  monitored: boolean
  airDate: string | null
  /** When Sonarr last searched indexers for it; `null` if it never has. */
  lastSearch: string | null
  queue: QueueState | null
}

export interface Series {
  monitored: boolean
  seasons: { number: number; monitored: boolean }[]
  episodes: Episode[]
}

interface RawSeries {
  monitored: boolean
  seasons: { seasonNumber: number; monitored: boolean }[]
}

interface RawEpisode {
  id: number
  seasonNumber: number
  episodeNumber: number
  hasFile: boolean
  monitored: boolean
  airDateUtc?: string
  lastSearchTime?: string | null
}

interface RawQueue {
  records: { episodeId: number; trackedDownloadState: string }[]
}

const QUEUE_STATE: Record<string, QueueState> = {
  downloading: 'downloading',
  importPending: 'downloading',
  importing: 'downloading',
  importBlocked: 'blocked',
  failedPending: 'failed',
  failed: 'failed',
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } })
  // Without the proxy the SPA fallback answers with index.html.
  if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`Sonarr responded with ${res.status}`)
  }
  return res.json() as Promise<T>
}

/** `true` when the proxy reaches a Sonarr. */
export function isConfigured(): Promise<boolean> {
  return request('/system/status').then(
    () => true,
    () => false,
  )
}

/** A series by Sonarr's own id, which Seerr keeps on media it has sent there. */
export async function series(id: number): Promise<Series> {
  const [raw, episodes, queue] = await Promise.all([
    request<RawSeries>(`/series/${id}`),
    request<RawEpisode[]>(`/episode?seriesId=${id}`),
    request<RawQueue>(`/queue?seriesIds=${id}&pageSize=1000`),
  ])
  const queued = new Map(queue.records.map((q) => [q.episodeId, q.trackedDownloadState]))
  return {
    monitored: raw.monitored,
    seasons: raw.seasons.map((s) => ({ number: s.seasonNumber, monitored: s.monitored })),
    episodes: episodes.map((e) => ({
      season: e.seasonNumber,
      number: e.episodeNumber,
      hasFile: e.hasFile,
      monitored: e.monitored,
      airDate: e.airDateUtc ?? null,
      lastSearch: e.lastSearchTime ?? null,
      queue: QUEUE_STATE[queued.get(e.id) ?? ''] ?? null,
    })),
  }
}

/**
 * Why the requested `seasons` aren't in the library, as far as Sonarr can tell: it isn't watching
 * them, a download is stuck at import (or failed, or still running), it looked and found nothing
 * (or hasn't looked), they haven't aired, or it has them and Jellyfin hasn't caught up.
 */
export function holdup(seasons: number[], s: Series, now = new Date()): string {
  const watched = s.seasons.filter((x) => s.monitored && x.monitored && seasons.includes(x.number))
  if (watched.length === 0) return 'Unmonitored in Sonarr'
  const missing = s.episodes.filter((e) => !e.hasFile && watched.some((x) => x.number === e.season))
  const queue = (state: QueueState) => missing.some((e) => e.queue === state)
  if (queue('blocked')) return 'Downloaded, import blocked in Sonarr'
  if (queue('downloading')) return 'Downloading in Sonarr'
  if (queue('failed')) return 'Download failed in Sonarr'
  const aired = missing.filter((e) => e.airDate && new Date(e.airDate) <= now)
  const wanted = aired.filter((e) => e.monitored)
  if (wanted.length > 0) {
    const last = wanted
      .flatMap((e) => e.lastSearch ?? [])
      .sort()
      .at(-1)
    return last ? `Last searched ${timeAgo(last, now)}` : 'Not searched yet'
  }
  if (aired.length > 0) return `${aired.length} unmonitored in Sonarr`
  if (missing.length === 0) return 'In Sonarr, not in Jellyfin yet'
  const next = formatDate(missing.flatMap((e) => e.airDate ?? []).sort()[0])
  return next ? `Next episode ${next}` : 'Not aired yet'
}
