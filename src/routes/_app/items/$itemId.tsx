import * as stylex from '@stylexjs/stylex'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion as m } from 'motion/react'
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { Button } from '@/components/Button'
import { CastRail } from '@/components/CastRail'
import { EpisodeList } from '@/components/EpisodeList'
import { FactSheet } from '@/components/FactSheet'
import { ItemCard } from '@/components/ItemCard'
import { ItemHero } from '@/components/ItemHero'
import { Notice } from '@/components/Notice'
import { Rail } from '@/components/Rail'
import { useSettled } from '@/hooks/useSettled'
import { plainText } from '@/lib/format'
import { fadeUp, springs, stagger } from '@/lib/motion'
import { queries } from '@/lib/queries'
import { getSession, useRequiredSession } from '@/lib/session'
import { focus } from '@/theme/focus'
import { colors, motion, radii, sizes, space } from '@/theme/tokens.stylex'

export interface ItemSearch {
  season?: string
  episode?: string
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)

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
      <div {...stylex.props(styles.state)}>
        <Notice
          title="Couldn’t load this title"
          text="It may have been removed from the server, or the link is wrong."
        >
          <Button onPress={() => void item.refetch()}>Try again</Button>
        </Notice>
      </div>
    )
  }
  if (!item.data) return <div {...stylex.props(styles.heroSkeleton)} />

  return <ItemDetail key={itemId} item={item.data} userId={userId} />
}

function ItemDetail({ item, userId }: { item: BaseItemDto; userId: string }) {
  const type = item.Type
  const similar = useQuery(queries.similar(userId, item.Id ?? ''))
  const similarItems = similar.data?.Items ?? []
  const overview = plainText(item.Overview)
  const sidebar = type === 'Series'

  return (
    <article {...stylex.props(styles.page)}>
      <ItemHero item={item} userId={userId} />

      <m.div
        initial="hidden"
        animate="show"
        variants={stagger(0.03, 0.1)}
        {...stylex.props(styles.body, sidebar && styles.bodySplit)}
      >
        <m.div variants={fadeUp} {...stylex.props(styles.main)}>
          {overview && <p {...stylex.props(styles.overview)}>{overview}</p>}
          {sidebar && <SeriesEpisodes series={item} userId={userId} />}
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

function sortSeasons(seasons: readonly BaseItemDto[]): BaseItemDto[] {
  return [...seasons].sort((a, b) => {
    const ai = a.IndexNumber ?? 0
    const bi = b.IndexNumber ?? 0
    if ((ai === 0) !== (bi === 0)) return ai === 0 ? 1 : -1
    return ai - bi
  })
}

function SeriesEpisodes({ series, userId }: { series: BaseItemDto; userId: string }) {
  const { season: selected, episode } = Route.useSearch()
  const navigate = useNavigate()
  const seriesId = series.Id ?? ''
  const seasons = useQuery(queries.seasons(userId, seriesId))
  const list = sortSeasons(seasons.data?.Items ?? [])

  const active =
    list.find((s) => s.Id === selected) ??
    list.find((s) => (s.UserData?.UnplayedItemCount ?? 0) > 0) ??
    list[0]

  if (seasons.isPending) return <div {...stylex.props(styles.listSkeleton)} />
  if (list.length === 0) return null

  return (
    <Tabs
      selectedKey={active?.Id ?? undefined}
      onSelectionChange={(key) =>
        void navigate({
          to: '/items/$itemId',
          params: { itemId: seriesId },
          search: { season: String(key) },
          replace: true,
          resetScroll: false,
        })
      }
      {...stylex.props(styles.section)}
    >
      <TabList aria-label="Seasons" {...stylex.props(styles.seasons)}>
        {list.map((s) => (
          <Tab
            key={s.Id}
            id={s.Id ?? undefined}
            {...stylex.props(
              focus.ring,
              styles.seasonTab,
              s.Id === active?.Id && styles.seasonTabActive,
            )}
          >
            {s.Id === active?.Id && (
              <m.span
                layoutId="season-pill"
                layoutCrossfade={false}
                transition={springs.gentle}
                {...stylex.props(styles.seasonPill)}
              />
            )}
            <span {...stylex.props(styles.seasonLabel)}>
              {s.Name}
              {(s.UserData?.UnplayedItemCount ?? 0) > 0 && (
                <span
                  role="img"
                  aria-label={`${s.UserData?.UnplayedItemCount} unplayed`}
                  {...stylex.props(styles.unplayedDot)}
                />
              )}
            </span>
          </Tab>
        ))}
      </TabList>
      {active?.Id && (
        <TabPanel id={active.Id}>
          <Episodes userId={userId} seriesId={seriesId} seasonId={active.Id} expandedId={episode} />
        </TabPanel>
      )}
    </Tabs>
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
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxl,
    paddingBottom: space.xxxl,
  },
  heroSkeleton: {
    minHeight: 'clamp(460px, 72vh, 820px)',
    backgroundImage: `linear-gradient(to top, ${colors.bg}, ${colors.skeleton})`,
  },
  body: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    columnGap: space.xxxl,
    rowGap: space.xl,
    alignItems: 'start',
    paddingInline: sizes.pageGutter,
    maxWidth: sizes.maxContent,
    marginInline: 'auto',
    width: '100%',
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
  overview: {
    fontSize: 16,
    lineHeight: 1.6,
    color: colors.textMuted,
    maxWidth: 760,
    whiteSpace: 'pre-line',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
  },
  seasons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  seasonTab: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
    height: 34,
    paddingInline: space.md,
    borderRadius: radii.full,
    fontSize: 13,
    fontWeight: 600,
    color: {
      default: colors.textMuted,
      ':hover': colors.text,
    },
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.surface,
    },
    transitionProperty: 'background-color, color',
    transitionDuration: motion.base,
  },
  seasonTabActive: {
    color: colors.accentText,
    backgroundColor: {
      default: 'transparent',
      ':hover': 'transparent',
    },
  },
  seasonPill: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  seasonLabel: {
    position: 'relative',
    zIndex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
  },
  unplayedDot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: 'currentColor',
    opacity: 0.6,
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
  state: {
    paddingTop: sizes.navHeight,
  },
})
