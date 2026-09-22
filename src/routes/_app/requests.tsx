import * as stylex from '@stylexjs/stylex'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { motion as m } from 'motion/react'
import { BlurImage } from '@/components/BlurImage'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import { Segmented } from '@/components/Segmented'
import { fadeUp } from '@/lib/motion'
import {
  DONE_RANK,
  canViewAllRequests,
  requestRank,
  type MediaType,
  type Request,
  type SeerrUser,
  type Title,
} from '@/seerr/api'
import { Gate } from '@/seerr/Gate'
import { MEDIA_TYPE_LABEL, requestLabel } from '@/seerr/labels'
import { Progress } from '@/seerr/Progress'
import { seerrQueries, useSeerr } from '@/seerr/queries'
import { focus } from '@/theme/focus'
import { text } from '@/theme/text'
import { colors, motion, radii, sizes, space } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/_app/requests')({
  validateSearch: (raw: Record<string, unknown>) => ({
    from: raw.from === 'everyone' ? ('everyone' as const) : undefined,
  }),
  component: RequestsPage,
})

function RequestsPage() {
  const session = useSeerr()
  if (session === undefined) return null
  if (session.state !== 'signedIn') return <Gate state={session.state} />
  return <RequestList user={session.user} />
}

function RequestList({ user }: { user: SeerrUser }) {
  const { from } = Route.useSearch()
  const navigate = Route.useNavigate()
  const canViewAll = canViewAllRequests(user)
  const everyone = from === 'everyone' && canViewAll
  const requests = useQuery(seerrQueries.requests(everyone ? undefined : user.id))
  // Requests only carry ids; the titles behind them come from Seerr, once per distinct title.
  const distinct = [...new Map((requests.data ?? []).map((r) => [titleKey(r), r])).values()]
  const titles = useQueries({
    queries: distinct.map((r) => seerrQueries.title(r.type, r.tmdbId)),
    combine: (results) => ({
      pending: results.some((t) => t.isPending),
      byKey: new Map(results.flatMap((t) => (t.data ? [[titleKey(t.data), t.data] as const] : []))),
    }),
  })
  // Seerr hands them back newest first; a stable sort keeps that within each rank.
  const ranked = [...(requests.data ?? [])].sort((a, b) => requestRank(a) - requestRank(b))
  const active = ranked.filter((r) => requestRank(r) < DONE_RANK)
  const done = ranked.filter((r) => requestRank(r) >= DONE_RANK)
  const rows = (list: Request[]) => (
    <ul {...stylex.props(styles.list)}>
      {list.map((r) => (
        <RequestRow
          key={r.id}
          request={r}
          title={titles.byKey.get(titleKey(r))}
          requester={everyone ? r.requestedBy : null}
        />
      ))}
    </ul>
  )

  return (
    <div {...stylex.props(styles.page)}>
      <header {...stylex.props(styles.head)}>
        <h1 {...stylex.props(styles.title)}>Requests</h1>
        {requests.data && <span {...stylex.props(styles.count)}>{requests.data.length}</span>}
        {canViewAll && (
          <span {...stylex.props(styles.filters)}>
            <Segmented
              label="Requested by"
              options={FROM_OPTIONS}
              selected={everyone ? 'everyone' : 'me'}
              onChange={(key) =>
                void navigate({
                  search: { from: key === 'everyone' ? key : undefined },
                  replace: true,
                })
              }
            />
          </span>
        )}
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
        <m.div
          key={String(everyone)}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          {...stylex.props(styles.groups)}
        >
          {active.length > 0 && rows(active)}
          {done.length > 0 && (
            <section {...stylex.props(styles.group)}>
              <h2 {...stylex.props(styles.groupTitle)}>Done</h2>
              {rows(done)}
            </section>
          )}
        </m.div>
      ) : null}
    </div>
  )
}

const FROM_OPTIONS = [
  { key: 'me', label: 'Yours' },
  { key: 'everyone', label: 'Everyone' },
] as const

const titleKey = (t: { type: MediaType; tmdbId: number }) => `${t.type}/${t.tmdbId}`

const seasonList = (seasons: number[]) =>
  seasons.length === 0
    ? null
    : seasons.length === 1
      ? `Season ${seasons[0]}`
      : `Seasons ${seasons.join(', ')}`

function RequestRow({
  request: r,
  title,
  requester,
}: {
  request: Request
  title: Pick<Title, 'name' | 'year' | 'poster'> | undefined
  requester: string | null
}) {
  const link = r.jellyfinId
    ? ({ to: '/items/$itemId', params: { itemId: r.jellyfinId } } as const)
    : ({ to: '/request/$type/$tmdbId', params: { type: r.type, tmdbId: r.tmdbId } } as const)
  return (
    <li>
      <Link {...link} {...stylex.props(focus.ring, styles.row)}>
        <BlurImage src={title?.poster} alt="" style={styles.poster} />
        <span {...stylex.props(styles.copy)}>
          <span {...stylex.props(text.ellipsis, styles.name)}>
            {title?.name ?? 'Unknown title'}
          </span>
          <span {...stylex.props(text.ellipsis, styles.meta)}>
            {[requester, MEDIA_TYPE_LABEL[r.type], title?.year, seasonList(r.seasons)]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        <span {...stylex.props(styles.status)}>
          <span {...stylex.props(styles.statusLabel, r.status === 'failed' && styles.failed)}>
            {requestLabel(r)}
          </span>
          <Progress downloads={r.downloads} />
        </span>
      </Link>
    </li>
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
  filters: {
    marginLeft: 'auto',
    alignSelf: 'center',
  },
  groups: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xl,
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.sm,
  },
  groupTitle: {
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
})
