import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { Check, Heart, Play } from '@phosphor-icons/react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { useUserDataToggles } from '@/hooks/useUserDataToggles'
import { formatRuntime, itemKindLabel, remainingMinutes } from '@/lib/format'
import { backdropImage, itemImage, logoImage } from '@/lib/images'
import { playLink } from '@/lib/item-link'
import { focus } from '@/theme/focus'
import { playPill } from '@/theme/media'
import { DetailHero } from './DetailHero'
import { IconToggle } from './IconButton'

const TILE_W = 190

function seriesYears(item: BaseItemDto): string | undefined {
  if (!item.ProductionYear) return undefined
  if (item.Status === 'Continuing') return `${item.ProductionYear}–`
  const end = item.EndDate ? new Date(item.EndDate).getFullYear() : item.ProductionYear
  return end === item.ProductionYear ? String(end) : `${item.ProductionYear}–${end}`
}

/** Hero for a library film or series: play, favorite and watched actions. */
export function ItemHero({ item, userId }: { item: BaseItemDto; userId: string }) {
  const itemId = item.Id ?? ''
  const remaining = remainingMinutes(item)
  const toggles = useUserDataToggles(userId, item)
  const isSeries = item.Type === 'Series'
  const seasons = item.ChildCount
    ? `${item.ChildCount} ${item.ChildCount === 1 ? 'season' : 'seasons'}`
    : null

  return (
    <DetailHero
      backdrop={backdropImage(item, 1920)}
      tile={itemImage(item, 'Primary', TILE_W * 2)}
      morphId={itemId}
      logo={logoImage(item, 800)}
      title={item.Name ?? ''}
      tagline={item.Taglines?.[0]}
      meta={[
        itemKindLabel(item),
        isSeries ? seriesYears(item) : item.ProductionYear,
        item.OfficialRating,
        isSeries ? seasons : formatRuntime(item.RunTimeTicks),
      ]}
      rating={item.CommunityRating}
      genres={item.Genres ?? []}
    >
      {(item.Type === 'Movie' || isSeries) && (
        <Link {...playLink(item)} {...stylex.props(focus.ring, playPill.base)}>
          <Play size={18} weight="fill" />
          {remaining ? `Resume · ${remaining} min left` : 'Play'}
        </Link>
      )}
      <IconToggle
        onMedia
        aria-label={toggles.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        isSelected={toggles.isFavorite}
        onChange={toggles.toggleFavorite}
      >
        <Heart size={18} weight={toggles.isFavorite ? 'fill' : 'regular'} />
      </IconToggle>
      <IconToggle
        onMedia
        aria-label={toggles.isPlayed ? 'Mark as unwatched' : 'Mark as watched'}
        isSelected={toggles.isPlayed}
        onChange={toggles.togglePlayed}
      >
        <Check size={18} weight="bold" />
      </IconToggle>
    </DetailHero>
  )
}
