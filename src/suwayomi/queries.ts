import { queryOptions } from '@tanstack/react-query'
import { queryClient } from '@/lib/query'
import * as suwayomi from './api'

export const suwayomiQueries = {
  configured: () =>
    queryOptions({
      queryKey: ['suwayomi', 'configured'],
      queryFn: suwayomi.isConfigured,
      staleTime: 5 * 60_000,
      retry: false,
    }),
  search: (query: string) =>
    queryOptions({
      queryKey: ['suwayomi', 'search', query],
      queryFn: () => suwayomi.search(query),
      staleTime: 5 * 60_000,
      retry: false,
    }),
  details: (id: number) =>
    queryOptions({
      queryKey: ['suwayomi', 'manga', id],
      queryFn: () => suwayomi.details(id),
      staleTime: 5 * 60_000,
      retry: false,
    }),
  /** Kept fresh while on screen so download counts move. */
  requests: () =>
    queryOptions({
      queryKey: ['suwayomi', 'requests'],
      queryFn: suwayomi.requests,
      refetchInterval: 15_000,
      retry: false,
    }),
}

export function requestManga(id: number) {
  return suwayomi
    .requestManga(id)
    .then(() => queryClient.invalidateQueries({ queryKey: ['suwayomi'] }))
}
