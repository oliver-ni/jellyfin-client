import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import { getItems, getQueryFiltersLegacy } from '@/api/gen/sdk.gen'
import type {
  BaseItemDto,
  BaseItemKind,
  CollectionType,
  GetItemsData,
  ItemFilter,
  ItemSortBy,
  SortOrder,
} from '@/api/gen/types.gen'
import { CARD_FIELDS } from './home-queries'

export const SORT_KEYS = [
  'added',
  'name',
  'premiere',
  'year',
  'rating',
  'critic',
  'runtime',
  'played',
  'random',
] as const
export type SortKey = (typeof SORT_KEYS)[number]
export type Order = 'asc' | 'desc'

export interface SortOption {
  key: SortKey
  label: string
  sortBy: ItemSortBy[]
  defaultOrder: Order
}

export const SORT_OPTIONS: readonly SortOption[] = [
  {
    key: 'added',
    label: 'Recently added',
    sortBy: ['DateCreated', 'SortName'],
    defaultOrder: 'desc',
  },
  { key: 'name', label: 'Name', sortBy: ['SortName'], defaultOrder: 'asc' },
  {
    key: 'premiere',
    label: 'Release date',
    sortBy: ['PremiereDate', 'SortName'],
    defaultOrder: 'desc',
  },
  { key: 'year', label: 'Year', sortBy: ['ProductionYear', 'SortName'], defaultOrder: 'desc' },
  {
    key: 'rating',
    label: 'Community rating',
    sortBy: ['CommunityRating', 'SortName'],
    defaultOrder: 'desc',
  },
  {
    key: 'critic',
    label: 'Critic rating',
    sortBy: ['CriticRating', 'SortName'],
    defaultOrder: 'desc',
  },
  { key: 'runtime', label: 'Runtime', sortBy: ['Runtime', 'SortName'], defaultOrder: 'desc' },
  { key: 'played', label: 'Last played', sortBy: ['DatePlayed', 'SortName'], defaultOrder: 'desc' },
  { key: 'random', label: 'Random', sortBy: ['Random'], defaultOrder: 'asc' },
]

export function sortOption(key: SortKey): SortOption {
  return SORT_OPTIONS.find((o) => o.key === key) ?? SORT_OPTIONS[0]
}

/** URL search state for a library page. Everything is optional so URLs stay short. */
export interface LibrarySearch {
  sort?: SortKey
  order?: Order
  genre?: string[]
  year?: number[]
  unplayed?: boolean
  favorite?: boolean
}

const isSortKey = (v: unknown): v is SortKey =>
  typeof v === 'string' && (SORT_KEYS as readonly string[]).includes(v)

function stringList(v: unknown): string[] | undefined {
  const arr = Array.isArray(v) ? v : typeof v === 'string' ? [v] : []
  const out = arr.filter((x): x is string => typeof x === 'string' && x.length > 0)
  return out.length ? out : undefined
}

function numberList(v: unknown): number[] | undefined {
  const arr = Array.isArray(v) ? v : v == null ? [] : [v]
  const out = arr.map(Number).filter((n) => Number.isInteger(n) && n > 1800 && n < 3000)
  return out.length ? out : undefined
}

export function validateLibrarySearch(raw: Record<string, unknown>): LibrarySearch {
  const out: LibrarySearch = {}
  if (isSortKey(raw.sort)) out.sort = raw.sort
  if (raw.order === 'asc' || raw.order === 'desc') out.order = raw.order
  const genre = stringList(raw.genre)
  if (genre) out.genre = genre
  const year = numberList(raw.year)
  if (year) out.year = year
  if (raw.unplayed === true) out.unplayed = true
  if (raw.favorite === true) out.favorite = true
  return out
}

export function activeFilterCount(s: LibrarySearch): number {
  return (
    (s.genre?.length ?? 0) + (s.year?.length ?? 0) + (s.unplayed ? 1 : 0) + (s.favorite ? 1 : 0)
  )
}

/** Item kinds to list at the top level of a library, keyed by its collection type. */
export function libraryItemTypes(type: CollectionType | null | undefined): BaseItemKind[] {
  switch (type) {
    case 'movies':
      return ['Movie']
    case 'tvshows':
      return ['Series']
    case 'boxsets':
      return ['BoxSet']
    case 'homevideos':
      return ['Video']
    default:
      return ['Movie', 'Series']
  }
}

export const PAGE_SIZE = 100

export interface LibraryItemsParams {
  userId: string
  libraryId: string
  itemTypes: BaseItemKind[]
  search: LibrarySearch
}

export function libraryItemsQuery({ userId, libraryId, itemTypes, search }: LibraryItemsParams) {
  const sort = sortOption(search.sort ?? 'added')
  const order: SortOrder =
    (search.order ?? sort.defaultOrder) === 'asc' ? 'Ascending' : 'Descending'
  const filters: ItemFilter[] = []
  if (search.unplayed) filters.push('IsUnplayed')
  if (search.favorite) filters.push('IsFavorite')

  const query: NonNullable<GetItemsData['query']> = {
    userId,
    parentId: libraryId,
    recursive: true,
    includeItemTypes: itemTypes,
    sortBy: sort.sortBy,
    sortOrder: [order],
    genres: search.genre,
    years: search.year,
    filters: filters.length ? filters : undefined,
    fields: CARD_FIELDS,
    enableImageTypes: ['Primary'],
    imageTypeLimit: 1,
    limit: PAGE_SIZE,
  }

  return infiniteQueryOptions({
    queryKey: ['libraryItems', query] as const,
    queryFn: async ({ pageParam, signal }) => {
      const { data } = await getItems({
        query: { ...query, startIndex: pageParam },
        signal,
        throwOnError: true,
      })
      return data
    },
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + (p.Items?.length ?? 0), 0)
      const total = last.TotalRecordCount ?? loaded
      return loaded < total && (last.Items?.length ?? 0) > 0 ? loaded : undefined
    },
    // Random order must not be re-shuffled on every background refetch.
    staleTime: sort.key === 'random' ? Infinity : undefined,
  })
}

export function flattenPages(pages: { Items?: BaseItemDto[] | null }[] | undefined): BaseItemDto[] {
  return pages?.flatMap((p) => p.Items ?? []) ?? []
}

export function libraryFiltersQuery(userId: string, libraryId: string, itemTypes: BaseItemKind[]) {
  return queryOptions({
    queryKey: ['libraryFilters', { userId, libraryId, itemTypes }] as const,
    queryFn: async ({ signal }) => {
      const { data } = await getQueryFiltersLegacy({
        query: { userId, parentId: libraryId, includeItemTypes: itemTypes },
        signal,
        throwOnError: true,
      })
      return data
    },
    staleTime: 1000 * 60 * 10,
  })
}
