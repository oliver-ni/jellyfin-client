import type { ParsedLocation } from '@tanstack/react-router'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { toHandle } from '@/lib/handle'
import type { ItemSearch } from '@/routes/_app/$title'

export interface ItemLink {
  to: '/$title'
  params: { title: string }
  search: ItemSearch
}

export const titleLink = (
  id: string,
  name: string | null | undefined,
  search: ItemSearch = {},
): ItemLink => ({ to: '/$title', params: { title: toHandle(id, name) }, search })

/**
 * Where an item opens. Seasons and episodes have no page of their own: they open the series
 * with that season selected (and that episode expanded).
 */
export function itemLink(item: BaseItemDto): ItemLink {
  if (item.SeriesId && item.Type === 'Season') {
    return titleLink(item.SeriesId, item.SeriesName, { season: item.IndexNumber ?? undefined })
  }
  if (item.SeriesId && item.Type === 'Episode') {
    const season = item.ParentIndexNumber ?? undefined
    return titleLink(item.SeriesId, item.SeriesName, {
      season,
      episode: item.IndexNumber ?? undefined,
    })
  }
  return titleLink(item.Id ?? '', item.Name)
}

export const playLink = (item: BaseItemDto) =>
  ({ to: '/play/$title', params: { title: toHandle(item.Id ?? '', item.Name) } }) as const

export const libraryLink = (library: BaseItemDto) =>
  ({
    to: '/library/$library',
    params: { library: toHandle(library.Id ?? '', library.Name) },
  }) as const

/** Whether `to` is the page `link` opens, whichever season or episode it shows. */
export const onPage = (to: ParsedLocation, link: ItemLink) =>
  to.pathname === `/${link.params.title}`

/** Whether navigating to `to` lands on `link`: the same page, and the same episode if any. */
export const opensLink = (to: ParsedLocation<Partial<ItemSearch>>, link: ItemLink) =>
  onPage(to, link) &&
  (link.search.episode === undefined ||
    (to.search.episode === link.search.episode && to.search.season === link.search.season))

/** The element a link lands on: the expanded episode row, otherwise the page hero. */
export const landingId = (item: BaseItemDto) =>
  (item.Type === 'Episode' ? item.Id : (item.SeriesId ?? item.Id)) ?? ''
