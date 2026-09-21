import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  markFavoriteItem,
  markPlayedItem,
  unmarkFavoriteItem,
  markUnplayedItem,
} from '@/api/gen/sdk.gen'
import type { BaseItemDto, BaseItemDtoQueryResult, UserItemDataDto } from '@/api/gen/types.gen'
import { itemQueries } from '@/lib/item-queries'

function isQuery(key: unknown, id: string | RegExp): boolean {
  if (typeof key !== 'object' || key === null || !('_id' in key) || typeof key._id !== 'string') {
    return false
  }
  return typeof id === 'string' ? key._id === id : id.test(key._id)
}

/** Optimistic favorite / played toggles for an item, kept in sync with the item and episode queries. */
export function useUserDataToggles(userId: string, item: BaseItemDto) {
  const queryClient = useQueryClient()
  const itemId = item.Id ?? ''
  const { queryKey } = itemQueries.item(userId, itemId)

  const patched = (prev: BaseItemDto, patch: Partial<UserItemDataDto>): BaseItemDto =>
    prev.UserData ? { ...prev, UserData: { ...prev.UserData, ...patch } } : prev

  const apply = (patch: Partial<UserItemDataDto>) => {
    queryClient.setQueryData<BaseItemDto>(queryKey, (prev) => prev && patched(prev, patch))
    queryClient.setQueriesData<BaseItemDtoQueryResult>(
      { predicate: (q) => isQuery(q.queryKey[0], 'getEpisodes') },
      (prev) =>
        prev?.Items?.some((it) => it.Id === itemId)
          ? { ...prev, Items: prev.Items.map((it) => (it.Id === itemId ? patched(it, patch) : it)) }
          : prev,
    )
  }

  const settle = () => {
    void queryClient.invalidateQueries({ queryKey })
    void queryClient.invalidateQueries({
      predicate: (q) =>
        q.queryKey[0] === 'libraryItems' ||
        isQuery(q.queryKey[0], /^get(ResumeItems|NextUp|LatestMedia|Episodes|Seasons|Items)$/),
    })
  }

  const favorite = useMutation({
    mutationFn: async (next: boolean) => {
      const fn = next ? markFavoriteItem : unmarkFavoriteItem
      const { data } = await fn({ path: { itemId }, query: { userId }, throwOnError: true })
      return data
    },
    onMutate: (next) => apply({ IsFavorite: next }),
    onSuccess: (data) => data && apply(data),
    onSettled: settle,
  })

  const played = useMutation({
    mutationFn: async (next: boolean) => {
      const fn = next ? markPlayedItem : markUnplayedItem
      const { data } = await fn({ path: { itemId }, query: { userId }, throwOnError: true })
      return data
    },
    onMutate: (next) => apply({ Played: next, PlaybackPositionTicks: 0, PlayedPercentage: 0 }),
    onSuccess: (data) => data && apply(data),
    onSettled: settle,
  })

  return {
    isFavorite: item.UserData?.IsFavorite ?? false,
    isPlayed: item.UserData?.Played ?? false,
    toggleFavorite: () => favorite.mutate(!(item.UserData?.IsFavorite ?? false)),
    togglePlayed: () => played.mutate(!(item.UserData?.Played ?? false)),
  }
}
