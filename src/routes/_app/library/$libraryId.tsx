import * as stylex from '@stylexjs/stylex'
import { hashKey, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowDown, ArrowUp } from '@phosphor-icons/react'
import { AnimatePresence } from 'motion/react'
import { useCallback } from 'react'
import { Button as AriaButton } from 'react-aria-components'
import { Button } from '@/components/Button'
import { FilterMenu, FilterToggle } from '@/components/FilterMenu'
import { ItemGrid } from '@/components/ItemGrid'
import { Notice } from '@/components/Notice'
import { Select } from '@/components/Select'
import { useSettled } from '@/hooks/useSettled'
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
import { queries } from '@/lib/queries'
import { useRequiredSession } from '@/lib/session'
import { focus } from '@/theme/focus'
import { glass } from '@/theme/glass'
import { toolbarControl } from '@/theme/toolbar'
import { colors, radii, sizes, space } from '@/theme/tokens.stylex'

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

  const library = useQuery(queries.item(userId, libraryId))
  const itemTypes = libraryItemTypes(library.data?.CollectionType)
  const facets = useQuery({
    ...libraryFiltersQuery(userId, libraryId, itemTypes),
    enabled: library.isSuccess,
  })
  const itemsQuery = libraryItemsQuery({ userId, libraryId, itemTypes, search })
  const items = useInfiniteQuery({ ...itemsQuery, enabled: library.isSuccess })
  // What's on screen lags the URL while the previous result set is shown as a placeholder,
  // so the title, count and grid switch together.
  const settled = !items.isPlaceholderData
  const resultSetKey = useSettled(hashKey(itemsQuery.queryKey), settled)
  const title = useSettled(library.data?.Name, settled)

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

  const clearFilters = () =>
    update({ genre: undefined, year: undefined, unplayed: undefined, favorite: undefined })

  const genres = (facets.data?.Genres ?? []).map((g) => ({ key: g, label: g }))
  const years = [...(facets.data?.Years ?? [])]
    .sort((a, b) => b - a)
    .map((y) => ({ key: y, label: String(y) }))

  return (
    <div {...stylex.props(styles.page)}>
      <header {...stylex.props(styles.head)}>
        <h1 {...stylex.props(styles.title)}>{title ?? '\u00a0'}</h1>
        <span {...stylex.props(styles.count)}>
          {items.isSuccess ? `${total.toLocaleString()} ${total === 1 ? 'title' : 'titles'}` : ''}
        </span>
      </header>

      {!library.isError && (
        <div {...stylex.props(styles.toolbar)}>
          <Select
            label="Sort"
            aria-label="Sort by"
            value={sort.key}
            options={SORT_CHOICES}
            onChange={(key) => update({ sort: key, order: undefined })}
          />
          {sort.key !== 'random' && (
            <AriaButton
              aria-label={
                order === 'asc'
                  ? 'Ascending, click for descending'
                  : 'Descending, click for ascending'
              }
              onPress={() => update({ order: order === 'asc' ? 'desc' : 'asc' })}
              {...stylex.props(focus.ring, glass.surface, toolbarControl.trigger, styles.order)}
            >
              {order === 'asc' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
            </AriaButton>
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
              onClick={clearFilters}
              {...stylex.props(focus.ring, styles.clear)}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <AnimatePresence mode="popLayout" initial={false}>
        {library.isError || items.isError ? (
          <Notice
            key="error"
            title="Couldn’t load this library"
            text="Check that the server is reachable, then try again."
          >
            <Button onPress={() => void (library.isError ? library : items).refetch()}>
              Try again
            </Button>
          </Notice>
        ) : items.isSuccess && total === 0 ? (
          <Notice
            key="empty"
            title="Nothing here"
            text={filterCount > 0 ? 'No titles match these filters.' : 'This library is empty.'}
          >
            {filterCount > 0 && <Button onPress={clearFilters}>Clear filters</Button>}
          </Notice>
        ) : (
          <ItemGrid
            key={resultSetKey}
            total={items.isSuccess ? total : 24}
            items={loaded}
            onRenderedUpTo={onRenderedUpTo}
          />
        )}
      </AnimatePresence>
    </div>
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
  order: {
    paddingInline: 0,
    width: 36,
    justifyContent: 'center',
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
  },
})
