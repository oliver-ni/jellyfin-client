import * as stylex from '@stylexjs/stylex'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowDown, ArrowUp } from '@phosphor-icons/react'
import { useCallback } from 'react'
import { getItemOptions } from '@/api/gen/@tanstack/react-query.gen'
import { Button } from '@/components/Button'
import { FilterMenu, FilterToggle } from '@/components/FilterMenu'
import { ItemGrid } from '@/components/ItemGrid'
import { Select } from '@/components/Select'
import { useRequiredSession } from '@/hooks/useSession'
import {
  SORT_OPTIONS,
  activeFilterCount,
  flattenPages,
  libraryFiltersQuery,
  libraryItemTypes,
  libraryItemsQuery,
  sortOption,
  validateLibrarySearch,
  type LibrarySearch,
  type Order,
} from '@/lib/library'
import { glass } from '@/theme/glass'
import { colors, motion, radii, sizes, space } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/_app/library/$libraryId')({
  validateSearch: validateLibrarySearch,
  component: LibraryPage,
})

const SORT_CHOICES = SORT_OPTIONS.map((o) => ({ key: o.key, label: o.label }))

function LibraryPage() {
  const { libraryId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { userId } = useRequiredSession()

  const library = useQuery(getItemOptions({ path: { itemId: libraryId }, query: { userId } }))
  const itemTypes = libraryItemTypes(library.data?.CollectionType)
  const facets = useQuery({
    ...libraryFiltersQuery(userId, libraryId, itemTypes),
    enabled: library.isSuccess,
  })
  const items = useInfiniteQuery({
    ...libraryItemsQuery({ userId, libraryId, itemTypes, search }),
    enabled: library.isSuccess,
  })

  const loaded = flattenPages(items.data?.pages)
  const total = items.data?.pages[0]?.TotalRecordCount ?? loaded.length

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = items
  const onRenderedUpTo = useCallback(
    (index: number) => {
      if (index >= loaded.length - 1 && hasNextPage && !isFetchingNextPage) void fetchNextPage()
    },
    [loaded.length, hasNextPage, isFetchingNextPage, fetchNextPage],
  )

  const update = (patch: Partial<LibrarySearch>) =>
    void navigate({
      search: (prev) => {
        const next: LibrarySearch = { ...prev, ...patch }
        for (const k of Object.keys(next) as (keyof LibrarySearch)[]) {
          const v = next[k]
          if (v === undefined || v === false || (Array.isArray(v) && v.length === 0)) delete next[k]
        }
        return next
      },
      replace: true,
      resetScroll: true,
    })

  const sort = sortOption(search.sort ?? 'added')
  const order: Order = search.order ?? sort.defaultOrder
  const filterCount = activeFilterCount(search)

  const genres = (facets.data?.Genres ?? []).map((g) => ({ key: g, label: g }))
  const years = [...(facets.data?.Years ?? [])]
    .sort((a, b) => b - a)
    .map((y) => ({ key: y, label: String(y) }))

  return (
    <div {...stylex.props(styles.page)}>
      <header {...stylex.props(styles.head)}>
        <h1 {...stylex.props(styles.title)}>{library.data?.Name ?? '\u00a0'}</h1>
        <span {...stylex.props(styles.count)}>
          {items.isSuccess ? `${total.toLocaleString()} ${total === 1 ? 'title' : 'titles'}` : ''}
        </span>
      </header>

      <div {...stylex.props(styles.toolbar)}>
        <Select
          label="Sort"
          aria-label="Sort by"
          value={sort.key}
          options={SORT_CHOICES}
          onChange={(key) => update({ sort: key, order: undefined })}
        />
        {sort.key !== 'random' && (
          <button
            type="button"
            aria-label={
              order === 'asc'
                ? 'Ascending, click for descending'
                : 'Descending, click for ascending'
            }
            onClick={() => update({ order: order === 'asc' ? 'desc' : 'asc' })}
            {...stylex.props(glass.surface, styles.orderButton)}
          >
            {order === 'asc' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
          </button>
        )}
        <span {...stylex.props(styles.gap)} />
        <FilterMenu
          label="Genre"
          options={genres}
          selected={search.genre ?? []}
          onChange={(genre) => update({ genre })}
        />
        <FilterMenu
          label="Year"
          options={years}
          selected={search.year ?? []}
          onChange={(year) => update({ year })}
        />
        <FilterToggle selected={!!search.unplayed} onChange={(v) => update({ unplayed: v })}>
          Unplayed
        </FilterToggle>
        <FilterToggle selected={!!search.favorite} onChange={(v) => update({ favorite: v })}>
          Favorites
        </FilterToggle>
        {filterCount > 0 && (
          <button
            type="button"
            onClick={() =>
              update({
                genre: undefined,
                year: undefined,
                unplayed: undefined,
                favorite: undefined,
              })
            }
            {...stylex.props(styles.clear)}
          >
            Clear filters
          </button>
        )}
      </div>

      {items.isError ? (
        <div {...stylex.props(styles.state)}>
          <p {...stylex.props(styles.stateTitle)}>Couldn’t load this library</p>
          <p {...stylex.props(styles.stateText)}>{items.error.message}</p>
          <Button onPress={() => void items.refetch()}>Try again</Button>
        </div>
      ) : items.isSuccess && total === 0 ? (
        <div {...stylex.props(styles.state)}>
          <p {...stylex.props(styles.stateTitle)}>Nothing here</p>
          <p {...stylex.props(styles.stateText)}>
            {filterCount > 0 ? 'No titles match these filters.' : 'This library is empty.'}
          </p>
        </div>
      ) : (
        <ItemGrid
          total={items.isSuccess ? total : 24}
          items={loaded}
          onRenderedUpTo={onRenderedUpTo}
        />
      )}
    </div>
  )
}

const styles = stylex.create({
  page: {
    paddingInline: {
      default: sizes.pageGutter,
      '@media (max-width: 720px)': sizes.pageGutterMobile,
    },
    paddingTop: `calc(${sizes.navHeight} + ${space.xxl})`,
    paddingBottom: space.xxxl,
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
    maxWidth: sizes.maxContent,
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
  toolbar: {
    position: 'sticky',
    top: sizes.navHeight,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.xs,
    pointerEvents: 'none',
  },
  gap: {
    width: space.sm,
  },
  orderButton: {
    pointerEvents: 'auto',
    display: 'grid',
    placeItems: 'center',
    width: 36,
    height: 36,
    color: {
      default: colors.textMuted,
      ':hover': colors.text,
    },
    backgroundColor: {
      default: colors.glass,
      ':hover': colors.glassStrong,
    },
    borderRadius: radii.full,
    cursor: 'pointer',
    transitionProperty: 'color, background-color, transform',
    transitionDuration: motion.fast,
    transform: { default: 'none', ':active': 'scale(0.97)' },
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 2,
  },
  clear: {
    pointerEvents: 'auto',
    height: 36,
    paddingInline: space.sm,
    fontSize: 13,
    fontWeight: 500,
    color: {
      default: colors.textFaint,
      ':hover': colors.text,
    },
    backgroundColor: 'transparent',
    borderRadius: radii.sm,
    cursor: 'pointer',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
  },
  state: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: space.sm,
    paddingBlock: space.xxxl,
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
