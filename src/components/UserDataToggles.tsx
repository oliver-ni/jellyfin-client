import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Heart } from '@phosphor-icons/react'
import {
  markFavoriteItem,
  markPlayedItem,
  unmarkFavoriteItem,
  markUnplayedItem,
} from '@/api/gen/sdk.gen'
import type { BaseItemDto, BaseItemDtoQueryResult, UserItemDataDto } from '@/api/gen/types.gen'
import { invalidateUserData, isQuery, queries } from '@/lib/queries'
import { IconToggle } from './IconButton'

/** Optimistic favorite / played mutations for an item, kept in sync with the item and episode queries. */
function useUserDataToggles(userId: string, item: BaseItemDto) {
  const queryClient = useQueryClient()
  const itemId = item.Id ?? ''
  const { queryKey } = queries.item(userId, itemId)

  const patched = (prev: BaseItemDto, patch: Partial<UserItemDataDto>): BaseItemDto =>
    prev.UserData ? { ...prev, UserData: { ...prev.UserData, ...patch } } : prev

  const apply = (patch: Partial<UserItemDataDto>) => {
    queryClient.setQueryData<BaseItemDto>(queryKey, (prev) => prev && patched(prev, patch))
    queryClient.setQueriesData<BaseItemDtoQueryResult>(
      { predicate: (q) => isQuery(q.queryKey, 'getEpisodes') },
      (prev) =>
        prev?.Items?.some((it) => it.Id === itemId)
          ? { ...prev, Items: prev.Items.map((it) => (it.Id === itemId ? patched(it, patch) : it)) }
          : prev,
    )
  }

  const settle = () => void invalidateUserData(queryClient)

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

export interface UserDataTogglesProps {
  userId: string
  item: BaseItemDto
  /** Icon size in px. */
  size: number
  /** Passed through to `IconToggle` for buttons sitting on artwork. */
  onMedia?: boolean
}

/** Favorite and watched toggles for an item. */
export function UserDataToggles({ userId, item, size, onMedia }: UserDataTogglesProps) {
  const toggles = useUserDataToggles(userId, item)
  return (
    <>
      <IconToggle
        onMedia={onMedia}
        aria-label={toggles.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        isSelected={toggles.isFavorite}
        onChange={toggles.toggleFavorite}
      >
        <Heart size={size} weight={toggles.isFavorite ? 'fill' : 'regular'} />
      </IconToggle>
      <IconToggle
        onMedia={onMedia}
        aria-label={toggles.isPlayed ? 'Mark as unwatched' : 'Mark as watched'}
        isSelected={toggles.isPlayed}
        onChange={toggles.togglePlayed}
      >
        <Check size={size} weight="bold" />
      </IconToggle>
    </>
  )
}
