import * as stylex from '@stylexjs/stylex'
import { createLink, Link } from '@tanstack/react-router'
import { Check, Play } from 'lucide-react'
import { motion as m } from 'motion/react'
import { useRef } from 'react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { useMorphTarget } from '@/hooks/useMorphTarget'
import { formatDate, formatRuntime, plainText } from '@/lib/format'
import { landscapeImage } from '@/lib/images'
import { fadeUp, rectOf, setMorphSource, stagger } from '@/lib/motion'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'

export interface EpisodeListProps {
  episodes: readonly BaseItemDto[]
  /** Episode to visually highlight (the one whose page we're on). */
  currentId?: string
}

const STILL_WIDTH = 224

const MotionLink = createLink(m.a)

export function EpisodeList({ episodes, currentId }: EpisodeListProps) {
  return (
    <m.ol initial="hidden" animate="show" variants={stagger(0.035)} {...stylex.props(styles.list)}>
      {episodes.map((ep) => (
        <EpisodeRow key={ep.Id} episode={ep} current={ep.Id === currentId} />
      ))}
    </m.ol>
  )
}

function EpisodeRow({ episode, current }: { episode: BaseItemDto; current: boolean }) {
  const id = episode.Id ?? ''
  const still = landscapeImage(episode, STILL_WIDTH * 2)
  const progress = episode.UserData?.PlayedPercentage ?? 0
  const played = episode.UserData?.Played ?? false
  const overview = plainText(episode.Overview)
  const sub = [formatRuntime(episode.RunTimeTicks), formatDate(episode.PremiereDate)]
    .filter(Boolean)
    .join('  ·  ')
  const stillRef = useRef<HTMLAnchorElement>(null)
  const morph = useMorphTarget(id, 'landscape', stillRef)

  function handOffStill() {
    if (!id || !stillRef.current) return
    setMorphSource({
      itemId: id,
      shape: 'landscape',
      rect: rectOf(stillRef.current),
      src: still?.url ?? null,
    })
  }

  return (
    <m.li
      variants={fadeUp}
      initial={morph.morphing ? false : undefined}
      {...stylex.props(styles.row, current && styles.rowCurrent, stylex.defaultMarker())}
    >
      <MotionLink
        ref={stillRef}
        data-morph={id}
        to="/play/$itemId"
        params={{ itemId: id }}
        aria-label={`Play ${episode.Name ?? 'episode'}`}
        style={{ opacity: morph.opacity }}
        {...stylex.props(styles.still)}
      >
        <BlurImage src={still?.url} blurhash={still?.blurhash} alt="" style={styles.image} />
        <span {...stylex.props(styles.stillOverlay)}>
          <span {...stylex.props(styles.playBadge)}>
            <Play size={18} fill="currentColor" />
          </span>
        </span>
        {played && !progress && (
          <span {...stylex.props(styles.playedBadge)}>
            <Check size={12} strokeWidth={3} />
          </span>
        )}
        {progress > 0 && (
          <span {...stylex.props(styles.progressTrack)}>
            <span {...stylex.props(styles.progressBar)} style={{ width: `${progress}%` }} />
          </span>
        )}
      </MotionLink>
      <div {...stylex.props(styles.body)}>
        <Link
          to="/items/$itemId"
          params={{ itemId: id }}
          onClick={handOffStill}
          {...stylex.props(styles.titleLink)}
        >
          <span {...stylex.props(styles.number)}>{episode.IndexNumber ?? '–'}</span>
          <span {...stylex.props(styles.title, played && styles.titlePlayed)}>{episode.Name}</span>
        </Link>
        {sub && <p {...stylex.props(styles.sub)}>{sub}</p>}
        {overview && <p {...stylex.props(styles.overview)}>{overview}</p>}
      </div>
    </m.li>
  )
}

const styles = stylex.create({
  list: {
    display: 'flex',
    flexDirection: 'column',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: {
      default: `${STILL_WIDTH}px minmax(0, 1fr)`,
      '@media (max-width: 720px)': '128px minmax(0, 1fr)',
    },
    gap: space.lg,
    alignItems: 'start',
    paddingBlock: space.lg,
    paddingInline: space.md,
    marginInline: `calc(-1 * ${space.md})`,
    borderRadius: radii.md,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.surface,
    },
    transitionProperty: 'background-color',
    transitionDuration: motion.fast,
  },
  rowCurrent: {
    backgroundColor: colors.surface,
  },
  still: {
    position: 'relative',
    display: 'block',
    aspectRatio: '16 / 9',
    borderRadius: radii.xs,
    overflow: 'hidden',
    backgroundColor: colors.skeleton,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 2,
  },
  image: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  stillOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    color: colors.onMediaText,
    backgroundColor: colors.scrim,
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover')]: 1,
    },
    transitionProperty: 'opacity',
    transitionDuration: motion.base,
  },
  playBadge: {
    display: 'grid',
    placeItems: 'center',
    width: 40,
    height: 40,
    paddingLeft: 3,
    borderRadius: radii.full,
    backgroundColor: colors.onMediaBg,
  },
  playedBadge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    display: 'grid',
    placeItems: 'center',
    width: 20,
    height: 20,
    borderRadius: radii.full,
    color: colors.onMediaText,
    backgroundColor: colors.onMediaBg,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressBar: {
    display: 'block',
    height: '100%',
    backgroundColor: colors.progress,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    minWidth: 0,
  },
  titleLink: {
    display: 'flex',
    alignItems: 'baseline',
    gap: space.sm,
    color: colors.text,
    borderRadius: radii.xs,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 2,
  },
  number: {
    flexShrink: 0,
    minWidth: 20,
    fontSize: 14,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    color: colors.textFaint,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    textDecoration: {
      default: 'none',
      [stylex.when.ancestor(':hover')]: 'underline',
    },
    textUnderlineOffset: 3,
    textDecorationColor: colors.borderStrong,
  },
  titlePlayed: {
    color: colors.textMuted,
  },
  sub: {
    fontSize: 13,
    color: colors.textFaint,
  },
  overview: {
    fontSize: 14,
    lineHeight: 1.5,
    color: colors.textMuted,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
    marginTop: space.xs,
  },
})
