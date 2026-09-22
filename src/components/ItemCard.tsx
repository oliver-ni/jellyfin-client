import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { Play } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { useRef } from 'react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { useMorphHandoff, useMorphTarget } from '@/hooks/useMorphTarget'
import { episodeLabel } from '@/lib/format'
import { itemImage, landscapeImage } from '@/lib/images'
import { itemLink, landingId, opensLink } from '@/lib/item-link'
import { fadeUp, springs, type MorphShape } from '@/lib/motion'
import { media } from '@/theme/media'
import { text } from '@/theme/text'
import { colors, motion, radii, shadows, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'

export interface ItemCardProps {
  item: BaseItemDto
  shape?: MorphShape
  /** Rendered width in CSS px, used to request an appropriately sized image. */
  width: number
  showProgress?: boolean
}

export function ItemCard({ item, shape = 'poster', width, showProgress }: ItemCardProps) {
  const isEpisode = item.Type === 'Episode'
  const image =
    shape === 'landscape' ? landscapeImage(item, width * 2) : itemImage(item, 'Primary', width * 2)

  const isSeason = item.Type === 'Season'
  const title = isEpisode || isSeason ? (item.SeriesName ?? item.Name) : item.Name
  const subtitle = isEpisode
    ? episodeLabel(item)
    : isSeason
      ? item.Name
      : item.ProductionYear?.toString()
  const progress = showProgress ? (item.UserData?.PlayedPercentage ?? 0) : 0
  const unplayed = item.UserData?.UnplayedItemCount
  const link = itemLink(item)
  const morphId = landingId(item)
  const tile = useRef<HTMLDivElement>(null)
  const source = useMorphTarget(morphId, shape, tile)
  useMorphHandoff(tile, morphId, shape, image?.url, (to) => opensLink(to, link))

  return (
    <m.div
      variants={fadeUp}
      initial={source ? false : undefined}
      {...stylex.props(styles.root)}
      style={{ width }}
    >
      <Link {...link} {...stylex.props(styles.card, stylex.defaultMarker())}>
        <m.div
          ref={tile}
          data-morph={morphId}
          transition={springs.snappy}
          whileHover={{ scale: 1.035 }}
          whileTap={{ scale: 0.97 }}
          {...stylex.props(styles.media, shape === 'poster' ? styles.poster : styles.landscape)}
        >
          <BlurImage src={image?.url} blurhash={image?.blurhash} alt="" style={media.fill} />
          <div {...stylex.props(media.hoverScrim)}>
            <span {...stylex.props(media.playBadge)}>
              <Play size={18} weight="fill" />
            </span>
          </div>
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
        </m.div>
        <div {...stylex.props(styles.meta)}>
          <span title={title ?? undefined} {...stylex.props(text.ellipsis, styles.title)}>
            {title}
          </span>
          {subtitle && <span {...stylex.props(text.ellipsis, styles.subtitle)}>{subtitle}</span>}
        </div>
      </Link>
    </m.div>
  )
}

const styles = stylex.create({
  root: {
    flexShrink: 0,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    width: '100%',
    outline: 'none',
    borderRadius: radii.xs,
  },
  media: {
    position: 'relative',
    width: '100%',
    borderRadius: radii.xs,
    overflow: 'hidden',
    boxShadow: {
      default: shadows.card,
      [stylex.when.ancestor(':hover')]: shadows.cardHover,
    },
    transitionProperty: 'box-shadow',
    transitionDuration: motion.base,
    transitionTimingFunction: motion.ease,
    outlineStyle: {
      default: 'none',
      [stylex.when.ancestor(':focus-visible')]: 'solid',
    },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 2,
  },
  poster: { aspectRatio: '2 / 3' },
  landscape: { aspectRatio: '16 / 9' },
  meta: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    paddingInline: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: 500,
    color: {
      default: colors.textMuted,
      [stylex.when.ancestor(':hover')]: colors.text,
    },
    transitionProperty: 'color',
    transitionDuration: motion.fast,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textFaint,
  },
})
