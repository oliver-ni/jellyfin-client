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

export type SeerrState = 'unavailable' | 'signedOut' | 'signedIn'

/** Whether Seerr is reachable and this browser holds a session for it; `undefined` while probing. */
export function useSeerr(): SeerrState | undefined {
  const configured = useQuery(seerrQueries.configured())
  const me = useQuery({ ...seerrQueries.me(), enabled: configured.data === true })
  if (configured.isPending) return undefined
  if (!configured.data) return 'unavailable'
  if (me.isPending) return undefined
  return me.data ? 'signedIn' : 'signedOut'
}

/**
 * Rejects with a `SeerrError` when Seerr is missing, unreachable or refuses the credentials.
 * The password is only ever sent once a Seerr has answered `/status`.
 */
export async function signIn(username: string, password: string): Promise<void> {
  if (!(await queryClient.fetchQuery(seerrQueries.configured()))) {
    throw new seerr.SeerrError(0, 'Seerr is not configured')
  }
  const user = await seerr.signIn(username, password)
  queryClient.setQueryData(seerrQueries.me().queryKey, user)
}

export async function signOut() {
  if (queryClient.getQueryData(seerrQueries.me().queryKey)) {
    await seerr.signOut().catch(() => null)
  }
  queryClient.setQueryData(seerrQueries.me().queryKey, null)
}

/** Refetches a title after a request so its availability moves to `pending`/`processing`. */
export function invalidateTitle(type: seerr.MediaType, tmdbId: number) {
  void queryClient.invalidateQueries({ queryKey: ['seerr', 'search'] })
  return queryClient.invalidateQueries({ queryKey: ['seerr', type, tmdbId] })
}
