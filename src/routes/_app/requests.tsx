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
  REQUEST_GROUPS,
  byTitle,
  canViewAllRequests,
  coverage,
  requestGroup,
  titleKey,
  type Coverage,
  type Request,
  type SeerrUser,
  type Title,
} from '@/seerr/api'
import { Gate } from '@/seerr/Gate'
import {
  MEDIA_TYPE_LABEL,
  REQUEST_GROUP_LABEL,
  episodes,
  releaseNames,
  requestStatus,
} from '@/seerr/labels'
import { Progress } from '@/seerr/Progress'
import { seerrQueries, useSeerr } from '@/seerr/queries'
import { focus } from '@/theme/focus'
import { list } from '@/theme/list'
import { text } from '@/theme/text'
import { colors, motion, radii, shadows, space } from '@/theme/tokens.stylex'

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
  // Seerr hands requests back newest first, which holds within each group.
  const rows = (requests.data ?? []).map((r) => {
    const title = titles.byKey.get(titleKey(r))
    const c =
      title?.type === 'tv'
        ? coverage(r.seasons, title, owned.bySeries.get(r.jellyfinId ?? ''))
        : null
    return { r, title, c, group: requestGroup(r, c) }
  })

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
          {REQUEST_GROUPS.map((g) => {
            const members = rows.filter((x) => x.group === g)
            if (members.length === 0) return null
            return (
              <section key={g} {...stylex.props(styles.group)}>
                <h2 {...stylex.props(list.faint)}>
                  {REQUEST_GROUP_LABEL[g]}
                  <span {...stylex.props(styles.count)}>{members.length}</span>
                </h2>
                <ul {...stylex.props(styles.list, g === 'done' && styles.grid)}>
                  {members.map(({ r, title, c }) =>
                    g === 'done' ? (
                      <DoneCard key={titleKey(r)} request={r} title={title} coverage={c} />
                    ) : (
                      <RequestRow
                        key={titleKey(r)}
                        request={r}
                        title={title}
                        coverage={c}
                        requester={everyone ? r.requestedBy : null}
                      />
                    ),
                  )}
                </ul>
              </section>
            )
          })}
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

interface RowProps {
  request: Request
  title: Pick<Title, 'name' | 'year' | 'poster'> | undefined
  coverage: Coverage | null
}

const requestLink = (r: Request, title: RowProps['title']) =>
  r.jellyfinId
    ? titleLink(r.jellyfinId, title?.name)
    : ({ to: '/request/$type/$tmdbId', params: { type: r.type, tmdbId: r.tmdbId } } as const)

function RequestRow({
  request: r,
  title,
  coverage: c,
  requester,
}: RowProps & { requester: string | null }) {
  const status = requestStatus(r, c)
  return (
    <li>
      <Link {...requestLink(r, title)} {...stylex.props(focus.ring, styles.row)}>
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

/** A request that is all here: poster, name, and for a show how many episodes were requested. */
function DoneCard({ request: r, title, coverage: c }: RowProps) {
  return (
    <li>
      <Link {...requestLink(r, title)} {...stylex.props(focus.ring, styles.card)}>
        <BlurImage src={title?.poster} alt="" style={styles.cardPoster} />
        <span {...stylex.props(text.ellipsis, styles.cardName)}>
          {title?.name ?? 'Unknown title'}
        </span>
        <span {...stylex.props(text.ellipsis, styles.meta)}>
          {c?.total ? episodes(c.total) : title?.year}
        </span>
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
  count: {
    marginLeft: space.sm,
    opacity: 0.6,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: space.md,
    paddingTop: space.xs,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    borderRadius: radii.xs,
  },
  cardPoster: {
    width: '100%',
    aspectRatio: '2 / 3',
    marginBottom: space.xs,
    borderRadius: radii.xs,
    backgroundColor: colors.skeleton,
    boxShadow: shadows.card,
    transform: {
      default: 'none',
      [stylex.when.ancestor(':hover')]: 'scale(1.035)',
    },
    transitionProperty: 'transform',
    transitionDuration: motion.base,
    transitionTimingFunction: motion.ease,
  },
  cardName: {
    fontSize: 13,
    fontWeight: 500,
    color: {
      default: colors.textMuted,
      [stylex.when.ancestor(':hover')]: colors.text,
    },
    transitionProperty: 'color',
    transitionDuration: motion.fast,
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
