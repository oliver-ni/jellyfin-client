import * as stylex from '@stylexjs/stylex'
import { useRef } from 'react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { useMorphHandoff, useMorphTarget } from '@/hooks/useMorphTarget'
import { episodeLabel } from '@/lib/format'
import { itemImage, landscapeImage } from '@/lib/images'
import { itemLink, landingId, opensLink } from '@/lib/item-link'
import type { MorphShape } from '@/lib/motion'
import { media } from '@/theme/media'
import { Card } from './Card'

export interface ItemCardProps {
  item: BaseItemDto
  shape?: MorphShape
  /** Rendered width in CSS px, used to request an appropriately sized image. */
  width: number
  showProgress?: boolean
}

/** A Jellyfin item as a card: its artwork morphs into the page it opens. */
export function ItemCard({ item, shape = 'poster', width, showProgress }: ItemCardProps) {
  const isEpisode = item.Type === 'Episode'
  const isSeason = item.Type === 'Season'
  const image =
    shape === 'landscape' ? landscapeImage(item, width * 2) : itemImage(item, 'Primary', width * 2)
  const progress = showProgress ? (item.UserData?.PlayedPercentage ?? 0) : 0
  const unplayed = item.UserData?.UnplayedItemCount
  const link = itemLink(item)
  const morphId = landingId(item)
  const tile = useRef<HTMLDivElement>(null)
  const source = useMorphTarget(morphId, shape, tile)
  useMorphHandoff(tile, morphId, shape, image?.url, (to) => opensLink(to, link))

  return (
    <Card
      link={link}
      image={image}
      name={(isEpisode || isSeason ? item.SeriesName : null) ?? item.Name ?? ''}
      subtitle={isEpisode ? episodeLabel(item) : isSeason ? item.Name : item.ProductionYear}
      shape={shape}
      width={width}
      settled={source !== null}
      tileRef={tile}
      morphId={morphId}
    >
      {unplayed ? (
        <span aria-label={`${unplayed} unplayed`} {...stylex.props(media.cornerBadge)}>
          {unplayed}
        </span>
      ) : null}
      {progress > 0 && (
        <div {...stylex.props(media.progressTrack)}>
          <div {...stylex.props(media.progressBar)} style={{ width: `${progress}%` }} />
        </div>
      )}
    </Card>
  )
}
