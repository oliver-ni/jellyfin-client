import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryClient } from '@/lib/query'
import * as seerr from './api'

/**
 * Everything Seerr serves behind its session goes through here: a rejected session flips
 * `me` to `null`, so every screen falls back to the gate from that one query.
 */
const withSession = <T>(call: () => Promise<T>) =>
  call().catch((err: unknown) => {
    if (err instanceof seerr.SeerrError && (err.status === 401 || err.status === 403)) {
      setUser(null)
    }
    throw err
  })

/** Session changes drop everything fetched under the previous one. */
function setUser(user: seerr.SeerrUser | null) {
  queryClient.removeQueries({
    queryKey: ['seerr'],
    predicate: (q) => q.queryKey[1] !== 'configured' && q.queryKey[1] !== 'me',
  })
  queryClient.setQueryData(seerrQueries.me().queryKey, user)
}

export const seerrQueries = {
  configured: () =>
    queryOptions({
      queryKey: ['seerr', 'configured'],
      queryFn: seerr.isConfigured,
      staleTime: 5 * 60_000,
      retry: false,
    }),
  /** Cached like the rest so the shell renders signed-in at once; a 401 anywhere corrects it. */
  me: () =>
    queryOptions({
      queryKey: ['seerr', 'me'],
      queryFn: seerr.me,
      staleTime: 5 * 60_000,
      retry: false,
    }),
  search: (query: string) =>
    queryOptions({
      queryKey: ['seerr', 'search', query],
      queryFn: () => withSession(() => seerr.search(query)),
      staleTime: 60_000,
    }),
  title: (type: seerr.MediaType, tmdbId: number) =>
    queryOptions({
      queryKey: ['seerr', type, tmdbId],
      queryFn: () =>
        withSession((): Promise<seerr.MovieDetails | seerr.TvDetails> =>
          type === 'movie' ? seerr.movie(tmdbId) : seerr.tv(tmdbId),
        ),
    }),
  /** Kept fresh while on screen so download progress moves. */
  requests: (userId?: number) =>
    queryOptions({
      queryKey: ['seerr', 'requests', userId ?? 'all'],
      queryFn: () => withSession(() => seerr.requests(userId)),
      refetchInterval: 15_000,
      retry: false,
    }),
}

export type SeerrSession =
  | { state: 'unavailable' | 'signedOut' }
  | { state: 'signedIn'; user: seerr.SeerrUser }

/** Whether Seerr is reachable and this browser holds a session for it; `undefined` while probing. */
export function useSeerr(): SeerrSession | undefined {
  const configured = useQuery(seerrQueries.configured())
  const me = useQuery({ ...seerrQueries.me(), enabled: configured.data === true })
  if (configured.isPending) return undefined
  if (!configured.data) return { state: 'unavailable' }
  if (me.isPending) return undefined
  return me.data ? { state: 'signedIn', user: me.data } : { state: 'signedOut' }
}

/** Seerr's view of a library series, or `null` without a session, a TMDB id or an answer yet. */
export function useSeerrSeries(tmdbId: number | null): seerr.TvDetails | null {
  const session = useSeerr()
  const title = useQuery({
    ...seerrQueries.title('tv', tmdbId ?? 0),
    enabled: session?.state === 'signedIn' && tmdbId !== null,
  })
  return session?.state === 'signedIn' && title.data?.type === 'tv' ? title.data : null
}

/** Rejects with a `SeerrError` when Seerr is missing, unreachable or refuses the credentials. */
export async function signIn(username: string, password: string) {
  setUser(await seerr.signIn(username, password))
}

export async function signOut() {
  await seerr.signOut().catch(() => null)
  setUser(null)
}

/** Sends a request, then refetches the title so its availability moves to `pending`/`processing`. */
export function requestTitle(title: seerr.Title, seasons: number[]) {
  return withSession(() =>
    title.type === 'movie'
      ? seerr.requestMovie(title.tmdbId)
      : seerr.requestSeasons(title.tmdbId, seasons),
  ).then(() => {
    void queryClient.invalidateQueries({ queryKey: ['seerr', 'search'] })
    void queryClient.invalidateQueries({ queryKey: ['seerr', 'requests'] })
    return queryClient.invalidateQueries({ queryKey: ['seerr', title.type, title.tmdbId] })
  })
}
