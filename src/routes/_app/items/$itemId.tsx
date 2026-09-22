import * as stylex from '@stylexjs/stylex'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion as m } from 'motion/react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { Button } from '@/components/Button'
import { CastRail } from '@/components/CastRail'
import { EpisodeList } from '@/components/EpisodeList'
import { FactSheet } from '@/components/FactSheet'
import { ItemCard } from '@/components/ItemCard'
import { ItemHero } from '@/components/ItemHero'
import { Notice } from '@/components/Notice'
import { Rail } from '@/components/Rail'
import { SeasonTabs } from '@/components/SeasonTabs'
import { useSettled } from '@/hooks/useSettled'
import { plainText } from '@/lib/format'
import { fadeUp, stagger } from '@/lib/motion'
import { queries } from '@/lib/queries'
import { defaultSeason, newsFor, seasonEntries } from '@/lib/seasons'
import { getSession, useRequiredSession } from '@/lib/session'
import { MissingSeason } from '@/seerr/MissingSeason'
import { useSeerrSeries } from '@/seerr/queries'
import { SeasonStatus } from '@/seerr/SeasonStatus'
import { detail } from '@/theme/detail'
import { colors, radii, sizes, space } from '@/theme/tokens.stylex'

export interface ItemSearch {
  season?: string
  episode?: string
}

const str = (v: unknown) =>
  typeof v === 'number' ? String(v) : typeof v === 'string' && v ? v : undefined

export const Route = createFileRoute('/_app/items/$itemId')({
  validateSearch: (raw: Record<string, unknown>): ItemSearch => ({
    season: str(raw.season),
    episode: str(raw.episode),
  }),
  loaderDeps: ({ search }) => search,
  // Resolve the item (and, for a deep-linked episode, its season's rows) before the route
  // commits so the morph target mounts in the same frame the previous page unmounts.
  // Seasons and episodes have no page of their own: they land on the series with that
  // tab/row open.
  loader: async ({ context: { queryClient }, params, deps }) => {
    const session = getSession()
    if (!session) return
    const { userId } = session
    const item = await queryClient
      .ensureQueryData(queries.item(userId, params.itemId))
      .catch(() => null)
    if (item?.Type === 'Season' && item.SeriesId) {
      throw redirect({
        to: '/items/$itemId',
        params: { itemId: item.SeriesId },
        search: { season: item.Id ?? undefined },
        replace: true,
      })
    }
    if (item?.Type === 'Episode' && item.SeriesId) {
      throw redirect({
        to: '/items/$itemId',
        params: { itemId: item.SeriesId },
        search: { season: item.SeasonId ?? undefined, episode: item.Id ?? undefined },
        replace: true,
      })
    }
    if (item?.Type === 'Series' && deps.season && deps.episode) {
      await Promise.all([
        queryClient.ensureQueryData(queries.seasons(userId, params.itemId)),
        queryClient.ensureQueryData(queries.episodes(userId, params.itemId, deps.season)),
      ]).catch(() => null)
    }
  },
  component: ItemPage,
})

function ItemPage() {
  const { itemId } = Route.useParams()
  const { userId } = useRequiredSession()
  const item = useQuery(queries.item(userId, itemId))

  if (item.isError) {
    return (
      <div {...stylex.props(detail.state)}>
        <Notice
          title="Couldn’t load this title"
          text="It may have been removed from the server, or the link is wrong."
        >
          <Button onPress={() => void item.refetch()}>Try again</Button>
        </Notice>
      </div>
    )
  }
  if (!item.data) return <div {...stylex.props(detail.heroSkeleton)} />

  return <ItemDetail key={itemId} item={item.data} userId={userId} />
}

function ItemDetail({ item, userId }: { item: BaseItemDto; userId: string }) {
  const type = item.Type
  const similar = useQuery(queries.similar(userId, item.Id ?? ''))
  const similarItems = similar.data?.Items ?? []
  const overview = plainText(item.Overview)
  const sidebar = type === 'Series'

  return (
    <article {...stylex.props(detail.page)}>
      <ItemHero item={item} userId={userId} />

      <m.div
        initial="hidden"
        animate="show"
        variants={stagger(0.03, 0.1)}
        {...stylex.props(detail.body, styles.body, sidebar && styles.bodySplit)}
      >
        <m.div variants={fadeUp} {...stylex.props(styles.main)}>
          {overview && <p {...stylex.props(detail.overview)}>{overview}</p>}
          {sidebar && <SeriesSeasons series={item} userId={userId} />}
        </m.div>
        <m.aside variants={fadeUp} {...stylex.props(sidebar && styles.aside)}>
          <FactSheet item={item} layout={sidebar ? 'column' : 'grid'} />
        </m.aside>
      </m.div>

      {item.People && item.People.length > 0 && (
        <div {...stylex.props(styles.rails)}>
          <CastRail people={item.People} />
        </div>
      )}

      {similarItems.length > 0 && (
        <div {...stylex.props(styles.rails)}>
          <Rail title="More like this">
            {similarItems.map((s) => (
              <ItemCard key={s.Id} item={s} width={160} />
            ))}
          </Rail>
        </div>
      )}
    </article>
  )
}

/** The library's seasons plus, with Seerr connected, the ones it could still fetch. */
function SeriesSeasons({ series, userId }: { series: BaseItemDto; userId: string }) {
  const { season: selected, episode } = Route.useSearch()
  const navigate = useNavigate()
  const seriesId = series.Id ?? ''
  const seasons = useQuery(queries.seasons(userId, seriesId))
  const title = useSeerrSeries(Number(series.ProviderIds?.Tmdb) || null)
  const entries = seasonEntries(seasons.data?.Items ?? [], title)
  const active = defaultSeason(entries, selected)

  if (seasons.isPending) return <div {...stylex.props(styles.listSkeleton)} />
  if (!active) return null

  return (
    <SeasonTabs
      entries={entries}
      selected={active}
      onSelect={(season) =>
        void navigate({
          to: '/items/$itemId',
          params: { itemId: seriesId },
          search: { season },
          replace: true,
          resetScroll: false,
        })
      }
    >
      {(entry) => {
        if (entry.kind === 'missing')
          return <MissingSeason title={entry.title} season={entry.season} />
        const news = newsFor(entry)
        return (
          <div {...stylex.props(styles.season)}>
            {news && <SeasonStatus season={news} owned={entry.item.ChildCount ?? 0} />}
            <Episodes
              userId={userId}
              seriesId={seriesId}
              seasonId={entry.key}
              expandedId={episode}
            />
          </div>
        )
      }}
    </SeasonTabs>
  )
}

function Episodes({
  userId,
  seriesId,
  seasonId,
  expandedId,
}: {
  userId: string
  seriesId: string
  seasonId: string
  expandedId?: string
}) {
  // Switching seasons keeps the current rows on screen until the new season arrives.
  const episodes = useQuery({
    ...queries.episodes(userId, seriesId, seasonId),
    placeholderData: keepPreviousData,
  })
  const shownSeasonId = useSettled(seasonId, !episodes.isPlaceholderData)
  const list = episodes.data?.Items ?? []

  if (episodes.isPending) return <div {...stylex.props(styles.listSkeleton)} />
  if (episodes.isError) return <Notice title="Couldn’t load episodes" />
  if (list.length === 0) return <Notice title="No episodes" />
  return (
    <AnimatePresence mode="popLayout">
      <EpisodeList
        key={shownSeasonId}
        episodes={list}
        userId={userId}
        seriesId={seriesId}
        seasonId={shownSeasonId}
        expandedId={expandedId}
      />
    </AnimatePresence>
  )
}

const styles = stylex.create({
  body: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    columnGap: space.xxxl,
    rowGap: space.xl,
    alignItems: 'start',
  },
  bodySplit: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr) 300px',
      '@media (max-width: 1024px)': 'minmax(0, 1fr)',
    },
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxl,
    minWidth: 0,
  },
  aside: {
    position: {
      default: 'sticky',
      '@media (max-width: 1024px)': 'static',
    },
    top: `calc(${sizes.navHeight} + ${space.lg})`,
  },
  season: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
  },
  listSkeleton: {
    height: 320,
    borderRadius: radii.md,
    backgroundColor: colors.skeleton,
  },
  rails: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxl,
    maxWidth: sizes.maxContent,
    marginInline: 'auto',
    width: '100%',
  },
})
