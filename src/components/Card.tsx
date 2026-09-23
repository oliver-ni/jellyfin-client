import * as stylex from '@stylexjs/stylex'
import { Link, type LinkProps } from '@tanstack/react-router'
import { Play } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import type { ReactNode, Ref } from 'react'
import { fadeUp, springs, type MorphShape } from '@/lib/motion'
import { media } from '@/theme/media'
import { text } from '@/theme/text'
import { colors, motion, radii, shadows, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'

export interface CardProps {
  link: Pick<LinkProps, 'to' | 'params' | 'search'>
  image: { url: string | null | undefined; blurhash?: string } | null
  name: string
  subtitle?: string | number | null
  shape?: MorphShape
  /** Rendered width in CSS px; leave unset to fill the parent (a grid cell). */
  width?: number
  /** Set when the artwork is already on screen as a morph source, so it must not fade in. */
  settled?: boolean
  tileRef?: Ref<HTMLDivElement>
  morphId?: string
  /** Overlays on the artwork: badges, progress. */
  children?: ReactNode
}

/** Poster or landscape tile with a caption: the one way artwork links look across the app. */
export function Card({
  link,
  image,
  name,
  subtitle,
  shape = 'poster',
  width,
  settled,
  tileRef,
  morphId,
  children,
}: CardProps) {
  return (
    <m.div
      variants={fadeUp}
      initial={settled ? false : undefined}
      {...stylex.props(styles.root)}
      style={{ width }}
    >
      <Link {...link} {...stylex.props(styles.card, stylex.defaultMarker())}>
        <m.div
          ref={tileRef}
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
          {children}
        </m.div>
        <div {...stylex.props(styles.meta)}>
          <span title={name} {...stylex.props(text.ellipsis, styles.title)}>
            {name}
          </span>
          {subtitle != null && (
            <span {...stylex.props(text.ellipsis, styles.subtitle)}>{subtitle}</span>
          )}
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
    backgroundColor: colors.skeleton,
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
