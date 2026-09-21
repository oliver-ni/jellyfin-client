import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryClient } from '@/lib/query'
import * as seerr from './api'

/** Connection state mirrors a cookie session, so it is probed per page load, never persisted. */
const live = { retry: false, persister: undefined }

export const seerrQueries = {
  configured: () =>
    queryOptions({
      queryKey: ['seerr', 'configured'],
      queryFn: seerr.isConfigured,
      staleTime: Infinity,
      ...live,
    }),
  me: () =>
    queryOptions({
      queryKey: ['seerr', 'me'],
      queryFn: seerr.me,
      staleTime: 5 * 60_000,
      ...live,
    }),
  search: (query: string) =>
    queryOptions({
      queryKey: ['seerr', 'search', query],
      queryFn: () => seerr.search(query),
      staleTime: 60_000,
    }),
  title: (type: seerr.MediaType, tmdbId: number) =>
    queryOptions({
      queryKey: ['seerr', type, tmdbId],
      queryFn: (): Promise<seerr.MovieDetails | seerr.TvDetails> =>
        type === 'movie' ? seerr.movie(tmdbId) : seerr.tv(tmdbId),
    }),
}

/** Whether Seerr is reachable and this browser holds a session for it; `undefined` while probing. */
export function useSeerr(): 'unavailable' | 'signedOut' | 'signedIn' | undefined {
  const configured = useQuery(seerrQueries.configured())
  const me = useQuery({ ...seerrQueries.me(), enabled: configured.data === true })
  if (configured.isPending) return undefined
  if (!configured.data) return 'unavailable'
  if (me.isPending) return undefined
  return me.data ? 'signedIn' : 'signedOut'
}

/** Rejects with a `SeerrError` when Seerr is missing, unreachable or refuses the credentials. */
export async function signIn(username: string, password: string) {
  queryClient.setQueryData(seerrQueries.me().queryKey, await seerr.signIn(username, password))
}

export async function signOut() {
  await seerr.signOut().catch(() => null)
  queryClient.setQueryData(seerrQueries.me().queryKey, null)
}

/** Refetches a title after a request so its availability moves to `pending`/`processing`. */
export function invalidateTitle(type: seerr.MediaType, tmdbId: number) {
  void queryClient.invalidateQueries({ queryKey: ['seerr', 'search'] })
  return queryClient.invalidateQueries({ queryKey: ['seerr', type, tmdbId] })
}
