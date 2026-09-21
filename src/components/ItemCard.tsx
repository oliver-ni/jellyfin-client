import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { Play } from 'lucide-react'
import { motion as m } from 'motion/react'
import { useRef } from 'react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { episodeLabel } from '@/lib/format'
import { itemImage, landscapeImage } from '@/lib/images'
import { fadeUp, setMorphSource, springs } from '@/lib/motion'
import { colors, motion, radii, shadows, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'

export type CardShape = 'poster' | 'landscape'

export interface ItemCardProps {
  item: BaseItemDto
  shape?: CardShape
  /** Rendered width in CSS px, used to request an appropriately sized image. */
  width: number
  showProgress?: boolean
}

export function ItemCard({ item, shape = 'poster', width, showProgress }: ItemCardProps) {
  const isEpisode = item.Type === 'Episode'
  const image =
    shape === 'landscape'
      ? landscapeImage(item, width * 2)
      : itemImage(item, 'Primary', { width: width * 2 })

  const isSeason = item.Type === 'Season'
  const title = isEpisode || isSeason ? (item.SeriesName ?? item.Name) : item.Name
  const subtitle = isEpisode
    ? episodeLabel(item)
    : isSeason
      ? item.Name
      : item.ProductionYear?.toString()
  const progress = showProgress ? (item.UserData?.PlayedPercentage ?? 0) : 0
  const unplayed = item.UserData?.UnplayedItemCount
  const media = useRef<HTMLDivElement>(null)

  return (
    <m.div variants={fadeUp} {...stylex.props(styles.root)} style={{ width }}>
      <Link
        to="/items/$itemId"
        params={{ itemId: item.Id ?? '' }}
        onClick={() => {
          if (!item.Id || !media.current) return
          const { x, y, width: w, height: h } = media.current.getBoundingClientRect()
          setMorphSource({
            itemId: item.Id,
            shape,
            rect: { x, y, width: w, height: h },
            src: image?.url ?? null,
          })
        }}
        {...stylex.props(styles.card, stylex.defaultMarker())}
      >
        <m.div
          ref={media}
          data-morph={item.Id}
          transition={springs.snappy}
          whileHover={{ scale: 1.035 }}
          whileTap={{ scale: 0.97 }}
          {...stylex.props(styles.media, shape === 'poster' ? styles.poster : styles.landscape)}
        >
          <BlurImage src={image?.url} blurhash={image?.blurhash} alt="" style={styles.image} />
          <div {...stylex.props(styles.overlay)}>
            <span {...stylex.props(styles.playBadge)}>
              <Play size={18} fill="currentColor" />
            </span>
          </div>
          {unplayed ? <span {...stylex.props(styles.count)}>{unplayed}</span> : null}
          {progress > 0 && (
            <div {...stylex.props(styles.progressTrack)}>
              <div {...stylex.props(styles.progressBar)} style={{ width: `${progress}%` }} />
            </div>
          )}
        </m.div>
        <div {...stylex.props(styles.meta)}>
          <span {...stylex.props(styles.title)}>{title}</span>
          {subtitle && <span {...stylex.props(styles.subtitle)}>{subtitle}</span>}
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
  image: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: colors.scrim,
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover')]: 1,
    },
    transitionProperty: 'opacity',
    transitionDuration: motion.base,
    transitionTimingFunction: motion.ease,
  },
  playBadge: {
    display: 'grid',
    placeItems: 'center',
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.onMediaBg,
    color: colors.onMediaText,
    paddingLeft: 3,
  },
  count: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    minWidth: 22,
    height: 22,
    paddingInline: 6,
    display: 'grid',
    placeItems: 'center',
    fontSize: 11,
    fontWeight: 700,
    color: colors.onMediaText,
    backgroundColor: colors.onMediaBg,
    borderRadius: radii.full,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: colors.scrim,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.progress,
  },
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
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  subtitle: {
    fontSize: 12,
    color: colors.textFaint,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
})
