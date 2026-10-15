/**
 * Komga, as the manga library. Its API is called directly at `VITE_KOMGA_URL` with the browser
 * session: Komga allows this origin through CORS, and its cookie is same-site with ours, so
 * `credentials: 'include'` carries it. The session itself comes from Komga's own sign-in, run in a
 * popup (see queries.ts), so nothing here handles credentials.
 */

export const KOMGA_URL = import.meta.env.VITE_KOMGA_URL?.replace(/\/+$/, '') || null

export class KomgaError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export interface User {
  id: string
  email: string
}

export type ReadingDirection = 'ltr' | 'rtl' | 'vertical' | 'webtoon'

export interface Author {
  name: string
  role: string
}

export interface Series {
  id: string
  name: string
  summary: string
  status: string
  genres: string[]
  authors: Author[]
  publisher: string
  language: string
  links: { label: string; url: string }[]
  booksCount: number
  booksReadCount: number
  booksUnreadCount: number
  readingDirection: ReadingDirection | null
}

export interface Progress {
  page: number
  completed: boolean
}

export interface Book {
  id: string
  seriesId: string
  seriesTitle: string
  title: string
  number: number
  pagesCount: number
  progress: Progress | null
}

export interface Page {
  number: number
  width: number | null
  height: number | null
}

interface PageOf<T> {
  content: T[]
  last: boolean
  totalElements: number
}

export interface Paged<T> {
  items: T[]
  total: number
  nextPage: number | null
}

interface SeriesDto {
  id: string
  name: string
  booksCount: number
  booksReadCount: number
  booksUnreadCount: number
  metadata: {
    title: string
    summary: string
    status: string
    genres: string[]
    readingDirection: string
    publisher: string
    language: string
    links: { label: string; url: string }[]
  }
  booksMetadata: { authors: Author[] }
}

interface BookDto {
  id: string
  seriesId: string
  seriesTitle: string
  name: string
  metadata: { title: string; numberSort: number }
  media: { pagesCount: number }
  readProgress?: { page: number; completed: boolean }
}

interface PageDto {
  number: number
  width?: number
  height?: number
}

const DIRECTIONS: Record<string, ReadingDirection> = {
  LEFT_TO_RIGHT: 'ltr',
  RIGHT_TO_LEFT: 'rtl',
  VERTICAL: 'vertical',
  WEBTOON: 'webtoon',
}

const toSeries = (s: SeriesDto): Series => ({
  id: s.id,
  name: s.metadata.title || s.name,
  summary: s.metadata.summary,
  status: s.metadata.status,
  genres: s.metadata.genres,
  authors: s.booksMetadata.authors,
  publisher: s.metadata.publisher,
  language: s.metadata.language,
  links: s.metadata.links,
  booksCount: s.booksCount,
  booksReadCount: s.booksReadCount,
  booksUnreadCount: s.booksUnreadCount,
  readingDirection: DIRECTIONS[s.metadata.readingDirection] ?? null,
})

const toBook = (b: BookDto): Book => ({
  id: b.id,
  seriesId: b.seriesId,
  seriesTitle: b.seriesTitle,
  title: b.metadata.title || b.name,
  number: b.metadata.numberSort,
  pagesCount: b.media.pagesCount,
  progress: b.readProgress
    ? { page: b.readProgress.page, completed: b.readProgress.completed }
    : null,
})

const toPage = (p: PageDto): Page => ({
  number: p.number,
  width: p.width ?? null,
  height: p.height ?? null,
})

const toPaged = <T, U>(page: PageOf<T>, pageIndex: number, map: (t: T) => U): Paged<U> => ({
  items: page.content.map(map),
  total: page.totalElements,
  nextPage: page.last ? null : pageIndex + 1,
})

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!KOMGA_URL) throw new KomgaError(0, 'Komga is not configured')
  const res = await fetch(`${KOMGA_URL}${path}`, {
    credentials: 'include',
    ...init,
    // Without this Komga answers 401 with `WWW-Authenticate: Basic` and the browser pops its own
    // login dialog over ours.
    headers: { 'X-Requested-With': 'XMLHttpRequest', ...init.headers },
  })
  if (!res.ok) throw new KomgaError(res.status, res.statusText)
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

const patch = (path: string, body: unknown) =>
  request<void>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const PAGE_SIZE = 60

/** The signed-in user, or null without a session. */
export const me = () =>
  request<User>('/api/v2/users/me').catch((err: unknown) => {
    if (err instanceof KomgaError && err.status === 401) return null
    throw err
  })

export const logout = () => request<void>('/api/logout', { method: 'POST' }).catch(() => undefined)

export const series = (page: number) =>
  request<PageOf<SeriesDto>>(
    `/api/v1/series?page=${page}&size=${PAGE_SIZE}&sort=metadata.titleSort,asc`,
  ).then((p) => toPaged(p, page, toSeries))

export const seriesById = (id: string) => request<SeriesDto>(`/api/v1/series/${id}`).then(toSeries)

/** Every chapter of a series, in reading order. */
export const books = (seriesId: string) =>
  request<PageOf<BookDto>>(
    `/api/v1/series/${seriesId}/books?unpaged=true&sort=metadata.numberSort,asc`,
  ).then((p) => p.content.map(toBook))

/** Chapters with a bookmark in them, most recently read first. */
export const inProgress = () =>
  request<PageOf<BookDto>>(
    '/api/v1/books?read_status=IN_PROGRESS&sort=readProgress.readDate,desc&size=20',
  ).then((p) => p.content.map(toBook))

/** The next unread chapter of each series that has been started. */
export const onDeck = () =>
  request<PageOf<BookDto>>('/api/v1/books/ondeck?size=20').then((p) => p.content.map(toBook))

export const book = (id: string) => request<BookDto>(`/api/v1/books/${id}`).then(toBook)

export const pages = (bookId: string) =>
  request<PageDto[]>(`/api/v1/books/${bookId}/pages`).then((ps) => ps.map(toPage))

/** The chapter after this one in its series, or null at the end. */
export const nextBook = (bookId: string) =>
  request<BookDto>(`/api/v1/books/${bookId}/next`)
    .then(toBook)
    .catch((err: unknown) => {
      if (err instanceof KomgaError && err.status === 404) return null
      throw err
    })

export const setProgress = (bookId: string, progress: Progress) =>
  patch(`/api/v1/books/${bookId}/read-progress`, progress)

export const seriesCover = (id: string) => `${KOMGA_URL}/api/v1/series/${id}/thumbnail`
export const bookCover = (id: string) => `${KOMGA_URL}/api/v1/books/${id}/thumbnail`
/** Full-size page image; `page` is 1-based. */
export const pageImage = (bookId: string, page: number) =>
  `${KOMGA_URL}/api/v1/books/${bookId}/pages/${page}`
