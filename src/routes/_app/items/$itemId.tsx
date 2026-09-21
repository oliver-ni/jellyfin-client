import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { motion as m } from 'motion/react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { Button } from '@/components/Button'
import { CastRail } from '@/components/CastRail'
import { DetailHero } from '@/components/DetailHero'
import { EpisodeList } from '@/components/EpisodeList'
import { FactSheet } from '@/components/FactSheet'
import { ItemCard } from '@/components/ItemCard'
import { Rail } from '@/components/Rail'
import { useRequiredSession } from '@/hooks/useSession'
import { plainText } from '@/lib/format'
import { itemQueries } from '@/lib/item-queries'
import { fadeUp, springs, stagger } from '@/lib/motion'
import { getSession } from '@/lib/session'
import { colors, motion, radii, sizes, space } from '@/theme/tokens.stylex'

interface ItemSearch {
  season?: string
}

export const Route = createFileRoute('/_app/items/$itemId')({
  validateSearch: (raw: Record<string, unknown>): ItemSearch =>
    typeof raw.season === 'string' && raw.season ? { season: raw.season } : {},
  // Resolve the item before the route commits so the hero mounts in the same frame the
  // previous page unmounts, which the shared-element morph depends on.
  loader: async ({ context: { queryClient }, params }) => {
    const session = getSession()
    if (!session) return
    await queryClient
      .ensureQueryData(itemQueries.item(session.userId, params.itemId))
      .catch(() => {})
  },
  component: ItemPage,
})

function ItemPage() {
  const { itemId } = Route.useParams()
  const { userId } = useRequiredSession()
  const item = useQuery(itemQueries.item(userId, itemId))

  if (item.isError) {
    return (
      <div {...stylex.props(styles.state)}>
        <p {...stylex.props(styles.stateTitle)}>Couldn’t load this title</p>
        <p {...stylex.props(styles.stateText)}>{item.error.message}</p>
        <Button onPress={() => void item.refetch()}>Try again</Button>
      </div>
    )
  }
  if (!item.data) return <div {...stylex.props(styles.heroSkeleton)} />

  return <ItemDetail item={item.data} userId={userId} />
}

function ItemDetail({ item, userId }: { item: BaseItemDto; userId: string }) {
  const type = item.Type
  const showSimilar = type === 'Movie' || type === 'Series'
  const similar = useQuery({
    ...itemQueries.similar(userId, item.Id ?? ''),
    enabled: showSimilar,
  })
  const similarItems = similar.data?.Items ?? []
  const overview = type === 'Season' ? null : plainText(item.Overview)

  return (
    <article {...stylex.props(styles.page)}>
      <DetailHero item={item} userId={userId} />

      <m.div
        initial="hidden"
        animate="show"
        variants={stagger(0.08, 0.25)}
        {...stylex.props(styles.body)}
      >
        <m.div variants={fadeUp} {...stylex.props(styles.main)}>
          {overview && <p {...stylex.props(styles.overview)}>{overview}</p>}
          {type === 'Series' && <SeriesEpisodes series={item} userId={userId} />}
          {type === 'Season' && item.SeriesId && item.Id && (
            <Episodes userId={userId} seriesId={item.SeriesId} seasonId={item.Id} />
          )}
          {type === 'Episode' && item.SeriesId && item.SeasonId && (
            <Episodes
              userId={userId}
              seriesId={item.SeriesId}
              seasonId={item.SeasonId}
              currentId={item.Id}
              title={item.SeasonName ?? 'Episodes'}
            />
          )}
        </m.div>
        <m.aside variants={fadeUp} {...stylex.props(styles.aside)}>
          <FactSheet item={item} />
        </m.aside>
      </m.div>

      {item.People && item.People.length > 0 && (
        <div {...stylex.props(styles.rails)}>
          <CastRail people={item.People} />
        </div>
      )}

      {showSimilar && similarItems.length > 0 && (
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
  const { season: selected } = Route.useSearch()
  const seriesId = series.Id ?? ''
  const seasons = useQuery(itemQueries.seasons(userId, seriesId))
  const list = sortSeasons(seasons.data?.Items ?? [])

  const active =
    list.find((s) => s.Id === selected) ??
    list.find((s) => (s.UserData?.UnplayedItemCount ?? 0) > 0) ??
    list[0]

  if (seasons.isPending) return <div {...stylex.props(styles.listSkeleton)} />
  if (list.length === 0) return null

  return (
    <section {...stylex.props(styles.section)}>
      <div {...stylex.props(styles.seasons)} role="tablist" aria-label="Seasons">
        {list.map((s) => (
          <Link
            key={s.Id}
            role="tab"
            aria-selected={s.Id === active?.Id}
            to="/items/$itemId"
            params={{ itemId: seriesId }}
            search={{ season: s.Id }}
            replace
            resetScroll={false}
            {...stylex.props(styles.seasonTab, s.Id === active?.Id && styles.seasonTabActive)}
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
                <span {...stylex.props(styles.unplayedDot)} />
              )}
            </span>
          </Link>
        ))}
      </div>
      {active?.Id && (
        <Episodes key={active.Id} userId={userId} seriesId={seriesId} seasonId={active.Id} />
      )}
    </section>
  )
}

function Episodes({
  userId,
  seriesId,
  seasonId,
  currentId,
  title,
}: {
  userId: string
  seriesId: string
  seasonId: string
  currentId?: string
  title?: string
}) {
  const episodes = useQuery(itemQueries.episodes(userId, seriesId, seasonId))
  const list = episodes.data?.Items ?? []

  return (
    <section {...stylex.props(styles.section)}>
      {title && (
        <h2 {...stylex.props(styles.sectionTitle)}>
          <Link
            to="/items/$itemId"
            params={{ itemId: seasonId }}
            {...stylex.props(styles.sectionLink)}
          >
            {title}
          </Link>
        </h2>
      )}
      {episodes.isPending ? (
        <div {...stylex.props(styles.listSkeleton)} />
      ) : episodes.isError ? (
        <p {...stylex.props(styles.stateText)}>Couldn’t load episodes.</p>
      ) : list.length === 0 ? (
        <p {...stylex.props(styles.stateText)}>No episodes.</p>
      ) : (
        <EpisodeList episodes={list} currentId={currentId} />
      )}
    </section>
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
    gridTemplateColumns: {
      default: 'minmax(0, 1fr) 300px',
      '@media (max-width: 1024px)': 'minmax(0, 1fr)',
    },
    columnGap: space.xxxl,
    rowGap: space.xl,
    alignItems: 'start',
    paddingInline: {
      default: sizes.pageGutter,
      '@media (max-width: 720px)': sizes.pageGutterMobile,
    },
    maxWidth: sizes.maxContent,
    marginInline: 'auto',
    width: '100%',
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  sectionLink: {
    color: {
      default: colors.textMuted,
      ':hover': colors.text,
    },
    borderRadius: radii.xs,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 3,
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
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 2,
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: `calc(${sizes.navHeight} + ${space.xxxl})`,
    paddingBottom: space.xxxl,
    textAlign: 'center',
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: 600,
  },
  stateText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: space.sm,
  },
})
