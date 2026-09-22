import type { BaseItemDto } from '@/api/gen/types.gen'
import { incoming, type Season, type TvDetails } from '@/seerr/api'

/**
 * A series' seasons as one list: those in the library, each with Seerr's view of it when
 * Seerr tracks it, and those only Seerr knows about, which can be requested.
 */
export type SeasonEntry =
  | { key: string; kind: 'library'; item: BaseItemDto; season: Season | null }
  | { key: string; kind: 'missing'; title: TvDetails; season: Season }

export function seasonEntries(
  library: readonly BaseItemDto[],
  title: TvDetails | null,
): SeasonEntry[] {
  const known = new Map(title?.seasons.map((s) => [s.number, s]))
  const owned = library.map((item): SeasonEntry => ({
    key: item.Id ?? '',
    kind: 'library',
    item,
    season: known.get(item.IndexNumber ?? -1) ?? null,
  }))
  for (const s of library) known.delete(s.IndexNumber ?? -1)
  const missing = title
    ? [...known.values()]
        .filter((s) => s.availability !== 'available')
        .map((season): SeasonEntry => ({
          key: String(season.number),
          kind: 'missing',
          title,
          season,
        }))
    : []

  return [...owned, ...missing].sort((a, b) => {
    const [an, bn] = [seasonNumber(a), seasonNumber(b)]
    if ((an === 0) !== (bn === 0)) return an === 0 ? 1 : -1
    return an - bn
  })
}

/** Seerr's season when it still has news on this one: not here at all, or on its way. */
export const newsFor = (e: SeasonEntry): Season | null =>
  e.kind === 'missing' || (e.season && incoming(e.season.availability)) ? e.season : null

const seasonNumber = (e: SeasonEntry) =>
  e.kind === 'library' ? (e.item.IndexNumber ?? 0) : e.season.number

export const unplayed = (item: BaseItemDto) => item.UserData?.UnplayedItemCount ?? 0

export const defaultSeason = (entries: SeasonEntry[], key: string | undefined) =>
  entries.find((e) => e.key === key) ??
  entries.find((e) => e.kind === 'library' && unplayed(e.item) > 0) ??
  entries[0]
