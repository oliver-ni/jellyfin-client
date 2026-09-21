import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  markFavoriteItem,
  markPlayedItem,
  unmarkFavoriteItem,
  markUnplayedItem,
} from '@/api/gen/sdk.gen'
import type { BaseItemDto, UserItemDataDto } from '@/api/gen/types.gen'
import { itemQueries } from '@/lib/item-queries'

/** Optimistic favorite / played toggles for an item, kept in sync with the item query. */
export function useUserDataToggles(userId: string, item: BaseItemDto) {
  const queryClient = useQueryClient()
  const itemId = item.Id ?? ''
  const { queryKey } = itemQueries.item(userId, itemId)

  const apply = (patch: Partial<UserItemDataDto>) =>
    queryClient.setQueryData<BaseItemDto>(queryKey, (prev) =>
      prev?.UserData ? { ...prev, UserData: { ...prev.UserData, ...patch } } : prev,
    )

  const settle = () => {
    void queryClient.invalidateQueries({ queryKey })
    void queryClient.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey[0]
        if (k === 'libraryItems') return true
        return (
          typeof k === 'object' &&
          k !== null &&
          '_id' in k &&
          typeof k._id === 'string' &&
          /^get(ResumeItems|NextUp|LatestMedia|Episodes|Seasons|Items)$/.test(k._id)
        )
      },
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
