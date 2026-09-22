import * as stylex from '@stylexjs/stylex'
import { createLink, Link } from '@tanstack/react-router'
import { Check, Heart, Play } from '@phosphor-icons/react'
import { AnimatePresence, motion as m } from 'motion/react'
import { useEffect, useRef, type Ref } from 'react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { useMorphHandoff, useMorphTarget } from '@/hooks/useMorphTarget'
import { useUserDataToggles } from '@/hooks/useUserDataToggles'
import {
  audioStreamLabel,
  formatDate,
  formatRuntime,
  languageName,
  plainText,
  remainingMinutes,
  unique,
  videoStreamLabel,
} from '@/lib/format'
import { landscapeImage } from '@/lib/images'
import { fadeUp, springs, stagger, vanish } from '@/lib/motion'
import { focus } from '@/theme/focus'
import { media, playPill } from '@/theme/media'
import { text } from '@/theme/text'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'
import { BlurImage } from './BlurImage'
import { Facts } from './Facts'
import { IconToggle } from './IconButton'

export interface EpisodeListProps {
  episodes: readonly BaseItemDto[]
  userId: string
  seriesId: string
  seasonId: string
  /** Episode whose details are open in place. */
  expandedId?: string
  /** Root element; needed by `AnimatePresence mode="popLayout"` to take an exiting list out of flow. */
  ref?: Ref<HTMLOListElement>
}

const STILL_WIDTH = 224

const MotionLink = createLink(m.a)

export function EpisodeList({
  episodes,
  userId,
  seriesId,
  seasonId,
  expandedId,
  ref,
}: EpisodeListProps) {
  return (
    <m.ol
      ref={ref}
      initial="hidden"
      animate="show"
      exit={vanish}
      variants={stagger()}
      {...stylex.props(styles.list)}
    >
      {episodes.map((ep) => (
        <EpisodeRow
          key={ep.Id}
          episode={ep}
          userId={userId}
          seriesId={seriesId}
          seasonId={seasonId}
          expanded={ep.Id === expandedId}
        />
      ))}
    </m.ol>
  )
}

interface EpisodeRowProps {
  episode: BaseItemDto
  userId: string
  seriesId: string
  seasonId: string
  expanded: boolean
}

function EpisodeRow({ episode, userId, seriesId, seasonId, expanded }: EpisodeRowProps) {
  const id = episode.Id ?? ''
  const seriesPath = `/items/${seriesId}`
  const still = landscapeImage(episode, STILL_WIDTH * 2)
  const progress = episode.UserData?.PlayedPercentage ?? 0
  const played = episode.UserData?.Played ?? false
  const overview = plainText(episode.Overview)
  const sub = [formatRuntime(episode.RunTimeTicks), formatDate(episode.PremiereDate)]
    .filter(Boolean)
    .join('  ·  ')
  const stillRef = useRef<HTMLAnchorElement>(null)
  const source = useMorphTarget(id, 'landscape', stillRef)
  useMorphHandoff(stillRef, id, 'landscape', still?.url, (to) => to.pathname !== seriesPath)
  const rowRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const row = rowRef.current
    if (!expanded || !row) return
    const frame = requestAnimationFrame(() => {
      const { top, bottom } = row.getBoundingClientRect()
      const viewport = window.innerHeight
      if (top >= 0 && bottom <= viewport) return
      const far = Math.abs((top + bottom) / 2 - viewport / 2) > viewport
      const jump = far || source !== null
      row.scrollIntoView({ block: 'center', behavior: jump ? 'instant' : 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [expanded, source])

  return (
    <m.li
      ref={rowRef}
      variants={fadeUp}
      initial={source ? false : undefined}
      {...stylex.props(styles.row, expanded && styles.rowExpanded, stylex.defaultMarker())}
    >
      <MotionLink
        ref={stillRef}
        data-morph={id}
        to="/play/$itemId"
        params={{ itemId: id }}
        aria-label={`Play ${episode.Name ?? 'episode'}`}
        {...stylex.props(focus.ring, styles.still)}
      >
        <BlurImage src={still?.url} blurhash={still?.blurhash} alt="" style={media.fill} />
        <span {...stylex.props(media.hoverScrim)}>
          <span {...stylex.props(media.playBadge)}>
            <Play size={18} weight="fill" />
          </span>
        </span>
        {played && !progress && (
          <span {...stylex.props(media.cornerBadge)}>
            <Check size={12} weight="bold" />
          </span>
        )}
        {progress > 0 && (
          <span {...stylex.props(media.progressTrack)}>
            <span {...stylex.props(media.progressBar)} style={{ width: `${progress}%` }} />
          </span>
        )}
      </MotionLink>
      <div {...stylex.props(styles.body)}>
        <Link
          to="/items/$itemId"
          params={{ itemId: seriesId }}
          search={{ season: seasonId, episode: expanded ? undefined : id }}
          replace
          resetScroll={false}
          aria-expanded={expanded}
          {...stylex.props(focus.ring, styles.titleLink)}
        >
          <span {...stylex.props(styles.number)}>{episode.IndexNumber ?? '–'}</span>
          <span {...stylex.props(styles.title, played && styles.titlePlayed)}>{episode.Name}</span>
        </Link>
        {sub && <p {...stylex.props(styles.sub)}>{sub}</p>}
        {overview && (
          <p {...stylex.props(styles.overview, expanded ? styles.overviewFull : text.clamp2)}>
            {overview}
          </p>
        )}
        <AnimatePresence initial={false}>
          {expanded && (
            <m.div
              key="details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={springs.gentle}
              {...stylex.props(styles.details)}
            >
              <EpisodeDetails episode={episode} userId={userId} />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.li>
  )
}

function EpisodeDetails({ episode, userId }: { episode: BaseItemDto; userId: string }) {
  const id = episode.Id ?? ''
  const toggles = useUserDataToggles(userId, episode)
  const remaining = remainingMinutes(episode)
  const streams = episode.MediaStreams ?? []
  const video = streams.find((s) => s.Type === 'Video')
  const audio = unique(streams.filter((s) => s.Type === 'Audio').map(audioStreamLabel))
  const subs = unique(
    streams.filter((s) => s.Type === 'Subtitle').map((s) => languageName(s.Language) ?? s.Title),
  )
  const facts = [
    video && videoStreamLabel(video),
    audio.join(', '),
    subs.length > 0 && `Subtitles: ${subs.join(', ')}`,
  ]

  return (
    <div {...stylex.props(styles.detailsInner)}>
      <div {...stylex.props(styles.actions)}>
        <Link
          to="/play/$itemId"
          params={{ itemId: id }}
          {...stylex.props(focus.ring, playPill.base, playPill.small)}
        >
          <Play size={16} weight="fill" />
          {remaining ? `Resume · ${remaining} min left` : 'Play'}
        </Link>
        <IconToggle
          aria-label={toggles.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          isSelected={toggles.isFavorite}
          onChange={toggles.toggleFavorite}
        >
          <Heart size={16} weight={toggles.isFavorite ? 'fill' : 'regular'} />
        </IconToggle>
        <IconToggle
          aria-label={toggles.isPlayed ? 'Mark as unwatched' : 'Mark as watched'}
          isSelected={toggles.isPlayed}
          onChange={toggles.togglePlayed}
        >
          <Check size={16} weight="bold" />
        </IconToggle>
      </div>
      <Facts items={facts} style={styles.facts} />
    </div>
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
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.surface,
    },
    transitionProperty: 'background-color',
    transitionDuration: motion.fast,
  },
  rowExpanded: {
    backgroundColor: colors.surface,
  },
  still: {
    position: 'relative',
    display: 'block',
    aspectRatio: '16 / 9',
    borderRadius: radii.xs,
    overflow: 'hidden',
    backgroundColor: colors.skeleton,
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
    marginTop: space.xs,
  },
  overviewFull: {
    whiteSpace: 'pre-line',
  },
  details: {
    overflow: 'hidden',
  },
  detailsInner: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
    paddingTop: space.md,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
  },
  facts: {
    fontSize: 13,
    color: colors.textFaint,
  },
})
