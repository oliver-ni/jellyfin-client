import * as stylex from '@stylexjs/stylex'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { motion as m } from 'motion/react'
import { BlurImage } from '@/components/BlurImage'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import { fadeUp, stagger } from '@/lib/motion'
import type { Download, Request } from '@/seerr/api'
import { Gate } from '@/seerr/Gate'
import { MEDIA_TYPE_LABEL, requestLabel } from '@/seerr/labels'
import { seerrQueries, useSeerr } from '@/seerr/queries'
import { focus } from '@/theme/focus'
import { text } from '@/theme/text'
import { colors, motion, radii, sizes, space } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/_app/requests')({
  component: RequestsPage,
})

function RequestsPage() {
  const state = useSeerr()
  const me = useQuery({ ...seerrQueries.me(), enabled: state === 'signedIn' })
  const requests = useQuery({ ...seerrQueries.requests(me.data?.id ?? 0), enabled: !!me.data })
  // Requests only carry ids; the titles behind them come from Seerr one by one.
  const titles = useQueries({
    queries: (requests.data ?? []).map((r) => seerrQueries.title(r.type, r.tmdbId)),
    combine: (results) => ({
      pending: results.some((t) => t.isPending),
      data: results.map((t) => t.data),
    }),
  })

  if (state === undefined) return null
  if (state !== 'signedIn') return <Gate state={state} />

  return (
    <div {...stylex.props(styles.page)}>
      <header {...stylex.props(styles.head)}>
        <h1 {...stylex.props(styles.title)}>Requests</h1>
        {requests.data && <span {...stylex.props(styles.count)}>{requests.data.length}</span>}
      </header>
      {requests.isError ? (
        <Notice title="Couldn’t load your requests" text="Seerr may be signed out or offline.">
          <Button onPress={() => void requests.refetch()}>Try again</Button>
        </Notice>
      ) : requests.data?.length === 0 ? (
        <Notice
          title="Nothing requested yet"
          text="Search with / for something the library is missing and request it."
        />
      ) : requests.data && !titles.pending ? (
        <m.ul initial="hidden" animate="show" variants={stagger()} {...stylex.props(styles.list)}>
          {requests.data.map((r, i) => (
            <RequestRow key={r.id} request={r} title={titles.data[i]} />
          ))}
        </m.ul>
      ) : null}
    </div>
  )
}

const seasonList = (seasons: number[]) =>
  seasons.length === 0
    ? null
    : seasons.length === 1
      ? `Season ${seasons[0]}`
      : `Seasons ${seasons.join(', ')}`

/** Radarr/Sonarr's `D.HH:MM:SS` estimate, in minutes. */
function minutesLeft(timeLeft: string): number {
  const [s = 0, min = 0, h = 0, d = 0] = timeLeft.split(/[.:]/).map(Number).reverse()
  return d * 1440 + h * 60 + min + (s >= 30 ? 1 : 0)
}

const formatLeft = (minutes: number) =>
  minutes < 1
    ? 'under a minute left'
    : `${minutes >= 60 ? `${Math.floor(minutes / 60)}h ` : ''}${minutes % 60}m left`

/** How far along the request's downloads are, or `null` when nothing is downloading. */
function progress(downloads: Download[]): { fraction: number; text: string } | null {
  const size = downloads.reduce((sum, d) => sum + d.size, 0)
  if (!size) return null
  const left = downloads.reduce((sum, d) => sum + d.sizeLeft, 0)
  const fraction = 1 - left / size
  const estimates = downloads.flatMap((d) => (d.timeLeft ? [minutesLeft(d.timeLeft)] : []))
  return {
    fraction,
    text: [
      `${Math.round(fraction * 100)}%`,
      estimates.length > 0 && formatLeft(Math.max(...estimates)),
    ]
      .filter(Boolean)
      .join(' · '),
  }
}

function RequestRow({
  request: r,
  title,
}: {
  request: Request
  title: { name: string; year: number | null; poster: string | null } | undefined
}) {
  const link = r.jellyfinId
    ? ({ to: '/items/$itemId', params: { itemId: r.jellyfinId } } as const)
    : ({ to: '/request/$type/$tmdbId', params: { type: r.type, tmdbId: r.tmdbId } } as const)
  const download = progress(r.downloads)
  return (
    <m.li variants={fadeUp}>
      <Link {...link} {...stylex.props(focus.ring, styles.row)}>
        <BlurImage src={title?.poster} alt="" style={styles.poster} />
        <span {...stylex.props(styles.copy)}>
          <span {...stylex.props(text.ellipsis, styles.name)}>
            {title?.name ?? 'Unknown title'}
          </span>
          <span {...stylex.props(text.ellipsis, styles.meta)}>
            {[MEDIA_TYPE_LABEL[r.type], title?.year, seasonList(r.seasons)]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        <span {...stylex.props(styles.status)}>
          <span {...stylex.props(styles.statusLabel, r.status === 'failed' && styles.failed)}>
            {requestLabel(r)}
          </span>
          {download && (
            <>
              <span {...stylex.props(styles.meta)}>{download.text}</span>
              <span {...stylex.props(styles.track)}>
                <span
                  {...stylex.props(styles.bar)}
                  style={{ width: `${download.fraction * 100}%` }}
                />
              </span>
            </>
          )}
        </span>
      </Link>
    </m.li>
  )
}

const styles = stylex.create({
  page: {
    paddingInline: sizes.pageGutter,
    paddingTop: `calc(${sizes.navHeight} + ${space.xxl})`,
    paddingBottom: space.xxxl,
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
    maxWidth: 960,
    marginInline: 'auto',
    width: '100%',
  },
  head: {
    display: 'flex',
    alignItems: 'baseline',
    gap: space.md,
  },
  title: {
    fontSize: 'clamp(28px, 3vw, 40px)',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1.05,
  },
  count: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.textFaint,
    letterSpacing: '0.02em',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: space.md,
    paddingBlock: space.sm,
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
  poster: {
    width: 44,
    aspectRatio: '2 / 3',
    borderRadius: radii.sm,
    backgroundColor: colors.skeleton,
    flexShrink: 0,
  },
  copy: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  status: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: space.xxs,
    minWidth: 120,
    textAlign: 'right',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.textMuted,
  },
  failed: {
    color: colors.danger,
  },
  track: {
    width: '100%',
    height: 3,
    marginTop: space.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
    overflow: 'hidden',
  },
  bar: {
    display: 'block',
    height: '100%',
    backgroundColor: colors.progress,
  },
})
