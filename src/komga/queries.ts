import { infiniteQueryOptions, queryOptions, useQuery } from '@tanstack/react-query'
import { queryClient } from '@/lib/query'
import { SSO_PROVIDER } from '@/lib/sso'
import * as komga from './api'

/**
 * Everything Komga serves behind its session goes through here: a rejected session flips `me`
 * to `null`, so every screen falls back to the gate from that one query.
 */
const withSession = <T>(call: () => Promise<T>) =>
  call().catch((err: unknown) => {
    if (err instanceof komga.KomgaError && (err.status === 401 || err.status === 403)) {
      setUser(null)
    }
    throw err
  })

/** Session changes drop everything fetched under the previous one. */
function setUser(user: komga.User | null) {
  queryClient.removeQueries({
    queryKey: ['komga'],
    predicate: (q) => q.queryKey[1] !== 'me',
  })
  queryClient.setQueryData(komgaQueries.me().queryKey, user)
}

export const komgaQueries = {
  /**
   * Asked once per page load and never persisted: sign-in and sign-out set it directly, which the
   * persister doesn't see, so a stored answer would outlive the session it described.
   */
  me: () =>
    queryOptions({
      queryKey: ['komga', 'me'],
      queryFn: komga.me,
      staleTime: Infinity,
      retry: false,
      persister: undefined,
    }),
  series: () =>
    infiniteQueryOptions({
      queryKey: ['komga', 'series'],
      queryFn: ({ pageParam }) => withSession(() => komga.series(pageParam)),
      initialPageParam: 0,
      getNextPageParam: (last) => last.nextPage,
    }),
  seriesById: (id: string) =>
    queryOptions({
      queryKey: ['komga', 'series', id],
      queryFn: () => withSession(() => komga.seriesById(id)),
    }),
  books: (seriesId: string) =>
    queryOptions({
      queryKey: ['komga', 'series', seriesId, 'books'],
      queryFn: () => withSession(() => komga.books(seriesId)),
    }),
  inProgress: () =>
    queryOptions({
      queryKey: ['komga', 'books', 'in-progress'],
      queryFn: () => withSession(komga.inProgress),
    }),
  onDeck: () =>
    queryOptions({
      queryKey: ['komga', 'books', 'on-deck'],
      queryFn: () => withSession(komga.onDeck),
    }),
  book: (id: string) =>
    queryOptions({
      queryKey: ['komga', 'books', id],
      queryFn: () => withSession(() => komga.book(id)),
    }),
  pages: (bookId: string) =>
    queryOptions({
      queryKey: ['komga', 'books', bookId, 'pages'],
      queryFn: () => withSession(() => komga.pages(bookId)),
      staleTime: 60 * 60_000,
    }),
  nextBook: (bookId: string) =>
    queryOptions({
      queryKey: ['komga', 'books', bookId, 'next'],
      queryFn: () => withSession(() => komga.nextBook(bookId)),
      staleTime: 60 * 60_000,
    }),
}

export type KomgaSession =
  | { state: 'unavailable' | 'signedOut' }
  | { state: 'signedIn'; user: komga.User }

/** Whether Komga is set up and this browser holds a session for it; `undefined` while probing. */
export function useKomga(): KomgaSession | undefined {
  const me = useQuery({ ...komgaQueries.me(), enabled: komga.KOMGA_URL !== null })
  if (!komga.KOMGA_URL || me.isError) return { state: 'unavailable' }
  if (me.isPending) return undefined
  return me.data ? { state: 'signedIn', user: me.data } : { state: 'signedOut' }
}

const SIGN_IN_TIMEOUT = 2 * 60_000

/**
 * Komga's own sign-in, in a popup: its identity-provider flow when the server has one (the same
 * provider name as Jellyfin's SSO plugin uses, so one setting names it for both), else its login
 * page. Komga lands on its home page afterwards, so the popup can't report back; this polls `me`
 * until the session exists and then closes it. Must be called from a click, or the popup is
 * blocked.
 */
export async function connect(): Promise<komga.User> {
  const path = SSO_PROVIDER ? `/oauth2/authorization/${SSO_PROVIDER}` : '/login'
  const popup = window.open(
    `${komga.KOMGA_URL}${path}`,
    'komga-sign-in',
    'popup,width=480,height=720',
  )
  if (!popup) throw new Error('The sign-in window was blocked; allow pop-ups for this site.')
  const deadline = Date.now() + SIGN_IN_TIMEOUT
  try {
    while (Date.now() < deadline) {
      if (popup.closed) throw new Error('The sign-in window was closed.')
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const user = await komga.me().catch(() => null)
      if (user) {
        setUser(user)
        return user
      }
    }
    throw new Error('Signing in took too long.')
  } finally {
    popup.close()
  }
}

export async function signOut() {
  await komga.logout()
  setUser(null)
}

/** Reading moves bookmarks, so the lists built from them are stale once the reader closes. */
export function invalidateProgress() {
  return queryClient.invalidateQueries({
    queryKey: ['komga'],
    predicate: (q) => q.queryKey[1] !== 'me',
  })
}
