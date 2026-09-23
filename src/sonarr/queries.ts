import { queryOptions, useQuery } from '@tanstack/react-query'
import * as sonarr from './api'
import { useSeerr } from '@/seerr/queries'

export const sonarrQueries = {
  configured: () =>
    queryOptions({
      queryKey: ['sonarr', 'configured'],
      queryFn: sonarr.isConfigured,
      staleTime: 5 * 60_000,
      retry: false,
    }),
  series: (id: number) =>
    queryOptions({
      queryKey: ['sonarr', 'series', id],
      queryFn: () => sonarr.series(id),
      staleTime: 60_000,
      retry: false,
    }),
}

/**
 * Why Sonarr isn't downloading a show's `seasons`, or `null` without a Sonarr, a Seerr session
 * (the proxy only answers signed-in users) or an answer yet.
 */
export function useHoldup(sonarrId: number | null, seasons: number[]): string | null {
  const signedIn = useSeerr()?.state === 'signedIn'
  const configured = useQuery({ ...sonarrQueries.configured(), enabled: signedIn })
  const series = useQuery({
    ...sonarrQueries.series(sonarrId ?? 0),
    enabled: configured.data === true && sonarrId !== null,
  })
  return series.data ? sonarr.holdup(seasons, series.data) : null
}
