import type { BaseItemDto } from '@/api/gen/types.gen'
import type { ItemSearch } from '@/routes/_app/items/$itemId'

export interface ItemLink {
  to: '/items/$itemId'
  params: { itemId: string }
  search: ItemSearch
}

/**
 * Where an item opens. Seasons and episodes have no page of their own: they open the series
 * with that season selected (and that episode expanded).
 */
export function itemLink(item: BaseItemDto): ItemLink {
  const id = item.Id ?? ''
  if (item.SeriesId && item.Type === 'Season') {
    return { to: '/items/$itemId', params: { itemId: item.SeriesId }, search: { season: id } }
  }
  if (item.SeriesId && item.Type === 'Episode') {
    const search: ItemSearch = { season: item.SeasonId ?? undefined, episode: id }
    return { to: '/items/$itemId', params: { itemId: item.SeriesId }, search }
  }
  return { to: '/items/$itemId', params: { itemId: id }, search: {} }
}

/** The element a link lands on: the expanded episode row, otherwise the page hero. */
export const landingId = (link: ItemLink) => link.search.episode ?? link.params.itemId
