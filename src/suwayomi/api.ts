/**
 * Manga requests, through the same-origin `/suwayomi` proxy: a small service next to Suwayomi
 * (manga/requests.py in the server's Nix config) that searches its sources and adds titles, open
 * only to browsers holding a Seerr session. Suwayomi downloads what's added, and Komga serves it
 * in the Manga tab.
 */

const BASE = '/suwayomi'

/** A title on one of Suwayomi's sources. */
export interface Manga {
  id: number
  title: string
  /** The site it comes from: `MangaDex`, `Weeb Central`. */
  source: string
  /** Already requested. */
  inLibrary: boolean
}

export type MangaStatus =
  | 'UNKNOWN'
  | 'ONGOING'
  | 'COMPLETED'
  | 'LICENSED'
  | 'PUBLISHING_FINISHED'
  | 'CANCELLED'
  | 'ON_HIATUS'

/** A title as its source describes it, for its request page. */
export interface MangaDetails extends Manga {
  authors: string[]
  description: string
  genres: string[]
  status: MangaStatus
  chapters: number
}

/** A requested title and how much of it is downloaded. */
export interface MangaRequest extends Manga {
  chapters: number
  downloaded: number
  /** Chapters waiting in Suwayomi's download queue. */
  queued: number
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  // Without the proxy the SPA fallback answers with index.html.
  if (!res.ok || (res.status !== 204 && !res.headers.get('content-type')?.includes('json'))) {
    throw new Error(`Manga requests responded with ${res.status}`)
  }
  return (res.status === 204 ? undefined : res.json()) as Promise<T>
}

export const thumbnail = (id: number) => `${BASE}/thumbnail/${id}`

export const search = (query: string) => request<Manga[]>(`/search?q=${encodeURIComponent(query)}`)

export const details = (id: number) => request<MangaDetails>(`/manga/${id}`)

export const requests = () => request<MangaRequest[]>('/requests')

/** `true` when the proxy reaches the service and lets this browser in. */
export const isConfigured = () =>
  requests().then(
    () => true,
    () => false,
  )

/** Adds a title and downloads all of its chapters. */
export const requestManga = (id: number) => request<void>(`/request/${id}`, { method: 'POST' })
