import * as stylex from '@stylexjs/stylex'
import { useQueries, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { titleHead } from '@/brand'
import { Card } from '@/components/Card'
import { Notice } from '@/components/Notice'
import { RequestGroups, RequestRow } from '@/components/RequestGroups'
import { Segmented } from '@/components/Segmented'
import { Select } from '@/components/Select'
import { titleLink } from '@/lib/item-link'
import { queries } from '@/lib/queries'
import { useRequiredSession } from '@/lib/session'
import {
  byTitle,
  canViewAllRequests,
  coverage,
  requestGroup,
  titleKey,
  type Coverage,
  type Request,
  type RequestSort,
  type SeerrUser,
  type Title,
} from '@/seerr/api'
import { Gate } from '@/seerr/Gate'
import { MEDIA_TYPE_LABEL, episodes, releaseNames, requestProgress } from '@/seerr/labels'
import { Progress } from '@/components/Progress'
import { seerrQueries, useSeerr } from '@/seerr/queries'
import { DOWNLOADING, holdup } from '@/sonarr/api'
import { sonarrQueries } from '@/sonarr/queries'
import { list } from '@/theme/list'
import { colors, space } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/_app/watch/requests')({
  validateSearch: (raw: Record<string, unknown>) => ({
    from: raw.from === 'me' ? ('me' as const) : undefined,
    sort: raw.sort === 'added' ? ('added' as const) : undefined,
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
  const { from, sort = 'modified' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const update = (next: { from?: 'me'; sort?: 'added' }) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true })
  const { userId } = useRequiredSession()
  const canViewAll = canViewAllRequests(user)
  const everyone = from !== 'me' && canViewAll
  const requests = useQuery({
    ...seerrQueries.requests(everyone ? undefined : user.id, sort),
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
  // Seerr hands requests back in the chosen order, which holds within each group.
  const idle = (requests.data ?? []).map((r) => {
    const title = titles.byKey.get(titleKey(r))
    const c =
      title?.type === 'tv'
        ? coverage(r.seasons, title, owned.bySeries.get(r.jellyfinId ?? ''))
        : null
    return { r, title, c, group: requestGroup(r, c) }
  })
  // Why a show isn't downloading is Sonarr's to say, when there is one to ask.
  const sonarr = useQuery(sonarrQueries.configured())
  const stuck = idle.flatMap(({ r, group }) =>
    sonarr.data && r.sonarrId !== null && (group === 'partial' || group === 'waiting') ? [r] : [],
  )
  const holdups = useQueries({
    queries: stuck.map((r) => sonarrQueries.series(r.sonarrId ?? 0)),
    combine: (results) =>
      new Map(
        results.flatMap((s, i) =>
          s.data ? [[titleKey(stuck[i]), holdup(stuck[i].seasons, s.data)] as const] : [],
        ),
      ),
  })
  const entries = idle.map(({ r, title, c, group }) => {
    const why = holdups.get(titleKey(r)) ?? null
    return {
      key: titleKey(r),
      group: why === DOWNLOADING ? ('downloading' as const) : group,
      card: (
        <Card
          link={requestLink(r, title)}
          image={{ url: title?.poster }}
          name={title?.name ?? 'Unknown title'}
          subtitle={c?.total ? episodes(c.total) : title?.year}
        />
      ),
      row: (
        <TitleRow
          request={r}
          title={title}
          coverage={c}
          holdup={why}
          requester={everyone ? r.requestedBy : null}
        />
      ),
    }
  })
  const total = requests.data?.length

  return (
    <div {...stylex.props(list.page, styles.page)}>
      <header {...stylex.props(list.head)}>
        <h1 {...stylex.props(list.title)}>Requests</h1>
        {total !== undefined && <span {...stylex.props(list.faint)}>{total}</span>}
      </header>
      <div {...stylex.props(styles.toolbar)}>
        {canViewAll && (
          <Segmented
            label="Requested by"
            options={FROM_OPTIONS}
            selected={everyone ? 'everyone' : 'me'}
            onChange={(key) => update({ from: key === 'me' ? key : undefined })}
          />
        )}
        <Select
          label="Sort"
          aria-label="Sort by"
          value={sort}
          options={SORT_OPTIONS}
          onChange={(key) => update({ sort: key === 'added' ? key : undefined })}
        />
      </div>
      {requests.isError ? (
        <Notice
          title="Couldn’t load your requests"
          text="Seerr may be signed out or offline."
          onRetry={() => void requests.refetch()}
        />
      ) : total === 0 ? (
        <Notice
          title="Nothing requested yet"
          text="Search with / for something the library is missing and request it."
        />
      ) : requests.data && !titles.pending && !owned.pending ? (
        <RequestGroups entries={entries} animateKey={`${everyone}/${sort}`} />
      ) : null}
    </div>
  )
}

const FROM_OPTIONS = [
  { key: 'everyone', label: 'All requests' },
  { key: 'me', label: 'Your requests' },
] as const

const SORT_OPTIONS: readonly { key: RequestSort; label: string }[] = [
  { key: 'modified', label: 'Recently updated' },
  { key: 'added', label: 'Recently requested' },
]

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
  holdup: string | null
  requester: string | null
}

const requestLink = (r: Request, title: RowProps['title']) =>
  r.jellyfinId
    ? titleLink(r.jellyfinId, title?.name)
    : ({ to: '/watch/request/$type/$tmdbId', params: { type: r.type, tmdbId: r.tmdbId } } as const)

function TitleRow({ request: r, title, coverage: c, holdup, requester }: RowProps) {
  const bar = requestProgress(r, c, holdup)
  return (
    <RequestRow
      link={requestLink(r, title)}
      poster={title?.poster}
      name={title?.name ?? 'Unknown title'}
      meta={[requester, MEDIA_TYPE_LABEL[r.type], title?.year, seasonList(r.seasons)]
        .filter(Boolean)
        .join(' · ')}
    >
      {r.status === 'failed' ? (
        <span {...stylex.props(styles.failed)}>Failed</span>
      ) : bar ? (
        <Progress value={bar} title={releaseNames(r.downloads)} />
      ) : (
        holdup
      )}
    </RequestRow>
  )
}

const styles = stylex.create({
  page: {
    maxWidth: 960,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  failed: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.danger,
  },
})
