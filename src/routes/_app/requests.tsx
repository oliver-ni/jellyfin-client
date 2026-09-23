import * as stylex from '@stylexjs/stylex'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { motion as m } from 'motion/react'
import { titleHead } from '@/brand'
import { BlurImage } from '@/components/BlurImage'
import { Notice } from '@/components/Notice'
import { Segmented } from '@/components/Segmented'
import { titleLink } from '@/lib/item-link'
import { fadeUp } from '@/lib/motion'
import { queries } from '@/lib/queries'
import { useRequiredSession } from '@/lib/session'
import {
  DONE_RANK,
  byTitle,
  canViewAllRequests,
  coverage,
  requestRank,
  titleKey,
  type Coverage,
  type Request,
  type SeerrUser,
  type Title,
} from '@/seerr/api'
import { Gate } from '@/seerr/Gate'
import { MEDIA_TYPE_LABEL, releaseNames, requestStatus } from '@/seerr/labels'
import { Progress } from '@/seerr/Progress'
import { seerrQueries, useSeerr } from '@/seerr/queries'
import { focus } from '@/theme/focus'
import { list } from '@/theme/list'
import { text } from '@/theme/text'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/_app/requests')({
  validateSearch: (raw: Record<string, unknown>) => ({
    from: raw.from === 'everyone' ? ('everyone' as const) : undefined,
  }),
  head: () => titleHead('Requests'),
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
  const { userId } = useRequiredSession()
  const canViewAll = canViewAllRequests(user)
  const everyone = from === 'everyone' && canViewAll
  const requests = useQuery({
    ...seerrQueries.requests(everyone ? undefined : user.id),
    select: byTitle,
  })
  // Requests only carry ids; the titles behind them come from Seerr.
  const titles = useQueries({
    queries: (requests.data ?? []).map((r) => seerrQueries.title(r.type, r.tmdbId)),
    combine: (results) => ({
      pending: results.some((t) => t.isPending),
      byKey: new Map(results.flatMap((t) => (t.data ? [[titleKey(t.data), t.data] as const] : []))),
    }),
  })
  // How many episodes of each show are actually here comes from Jellyfin's seasons.
  const series = (requests.data ?? []).flatMap((r) =>
    r.type === 'tv' && r.jellyfinId ? [r.jellyfinId] : [],
  )
  const owned = useQueries({
    queries: series.map((id) => queries.seasons(userId, id)),
    combine: (results) => ({
      pending: results.some((s) => s.isPending),
      bySeries: new Map(
        results.map((s, i) => [
          series[i],
          new Map(s.data?.Items?.map((item) => [item.IndexNumber ?? 0, item.ChildCount ?? 0])),
        ]),
      ),
    }),
  })
  const rows = (requests.data ?? []).map((r) => {
    const title = titles.byKey.get(titleKey(r))
    const c =
      title?.type === 'tv'
        ? coverage(r.seasons, title, owned.bySeries.get(r.jellyfinId ?? '') ?? new Map())
        : null
    return { r, title, c, rank: requestRank(r, c ?? undefined) }
  })
  // Seerr hands them back newest first; a stable sort keeps that within each rank.
  const ranked = rows.toSorted((a, b) => a.rank - b.rank)
  const active = ranked.filter((x) => x.rank < DONE_RANK)
  const done = ranked.filter((x) => x.rank >= DONE_RANK)
  const group = (list: typeof rows) => (
    <ul {...stylex.props(styles.list)}>
      {list.map(({ r, title, c }) => (
        <RequestRow
          key={titleKey(r)}
          request={r}
          title={title}
          coverage={c}
          requester={everyone ? r.requestedBy : null}
        />
      ))}
    </ul>
  )

  return (
    <div {...stylex.props(list.page, styles.page)}>
      <header {...stylex.props(list.head)}>
        <h1 {...stylex.props(list.title)}>Requests</h1>
        {requests.data && <span {...stylex.props(list.faint)}>{requests.data.length}</span>}
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
        <Notice
          title="Couldn’t load your requests"
          text="Seerr may be signed out or offline."
          onRetry={() => void requests.refetch()}
        />
      ) : requests.data?.length === 0 ? (
        <Notice
          title="Nothing requested yet"
          text="Search with / for something the library is missing and request it."
        />
      ) : requests.data && !titles.pending && !owned.pending ? (
        <m.div
          key={String(everyone)}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          {...stylex.props(styles.groups)}
        >
          {active.length > 0 && group(active)}
          {done.length > 0 && (
            <section {...stylex.props(styles.group)}>
              <h2 {...stylex.props(list.faint)}>Done</h2>
              {group(done)}
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

const seasonList = (seasons: number[]) =>
  seasons.length === 0
    ? null
    : seasons.length === 1
      ? `Season ${seasons[0]}`
      : `Seasons ${seasons.join(', ')}`

function RequestRow({
  request: r,
  title,
  coverage: c,
  requester,
}: {
  request: Request
  title: Pick<Title, 'name' | 'year' | 'poster'> | undefined
  coverage: Coverage | null
  requester: string | null
}) {
  const link = r.jellyfinId
    ? titleLink(r.jellyfinId, title?.name)
    : ({ to: '/request/$type/$tmdbId', params: { type: r.type, tmdbId: r.tmdbId } } as const)
  const status = requestStatus(r, c)
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
        {typeof status === 'string' ? (
          <span {...stylex.props(styles.status, r.status === 'failed' && styles.failed)}>
            {status}
          </span>
        ) : (
          <Progress value={status} title={releaseNames(r.downloads)} />
        )}
      </Link>
    </li>
  )
}

const styles = stylex.create({
  page: {
    maxWidth: 960,
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
    fontSize: 13,
    fontWeight: 500,
    color: colors.textMuted,
  },
  failed: {
    color: colors.danger,
  },
})
