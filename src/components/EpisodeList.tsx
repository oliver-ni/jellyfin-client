import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { Check, Play } from 'lucide-react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { formatDate, formatRuntime, plainText } from '@/lib/format'
import { landscapeImage } from '@/lib/images'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'

export interface EpisodeListProps {
  episodes: readonly BaseItemDto[]
  /** Episode to visually highlight (the one whose page we're on). */
  currentId?: string
}

const STILL_WIDTH = 224

export function EpisodeList({ episodes, currentId }: EpisodeListProps) {
  return (
    <ol {...stylex.props(styles.list)}>
      {episodes.map((ep) => (
        <EpisodeRow key={ep.Id} episode={ep} current={ep.Id === currentId} />
      ))}
    </ol>
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

  return (
    <li {...stylex.props(styles.row, current && styles.rowCurrent, stylex.defaultMarker())}>
      <Link
        to="/play/$itemId"
        params={{ itemId: id }}
        aria-label={`Play ${episode.Name ?? 'episode'}`}
        {...stylex.props(styles.still)}
      >
        <BlurImage src={still?.url} blurhash={still?.blurhash} alt="" style={styles.image} />
        <span {...stylex.props(styles.stillOverlay)}>
          <Play size={18} fill="currentColor" />
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
      </Link>
      <div {...stylex.props(styles.body)}>
        <Link to="/items/$itemId" params={{ itemId: id }} {...stylex.props(styles.titleLink)}>
          <span {...stylex.props(styles.number)}>{episode.IndexNumber ?? '–'}</span>
          <span {...stylex.props(styles.title, played && styles.titlePlayed)}>{episode.Name}</span>
        </Link>
        {sub && <p {...stylex.props(styles.sub)}>{sub}</p>}
        {overview && <p {...stylex.props(styles.overview)}>{overview}</p>}
      </div>
    </li>
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
    '::before': {
      content: '""',
      position: 'absolute',
      width: 40,
      height: 40,
      borderRadius: radii.full,
      backgroundColor: colors.onMediaBg,
    },
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
