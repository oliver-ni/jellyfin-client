import type { BaseItemDto } from '@/api/gen/types.gen'
import type { Season, TvDetails } from '@/seerr/api'

/**
 * A series' seasons from both sides: the library's, with episodes to play, and the ones Seerr
 * knows it lacks, to request or watch arrive. Library seasons are keyed by Jellyfin id and
 * missing ones by season number, so one `?season=` can point at either.
 */
export type SeasonEntry =
  | { key: string; kind: 'library'; item: BaseItemDto }
  | { key: string; kind: 'missing'; title: TvDetails; season: Season }

export function seasonEntries(
  library: readonly BaseItemDto[],
  title: TvDetails | null,
): SeasonEntry[] {
  const owned = new Set(library.map((s) => s.IndexNumber))
  const missing = title
    ? title.seasons
        .filter((s) => !owned.has(s.number) && s.availability !== 'available')
        .map((season): SeasonEntry => ({
          key: String(season.number),
          kind: 'missing',
          title,
          season,
        }))
    : []
  return [
    ...library.map((item): SeasonEntry => ({ key: item.Id ?? '', kind: 'library', item })),
    ...missing,
  ].sort((a, b) => {
    const [an, bn] = [seasonNumber(a), seasonNumber(b)]
    // Specials (season 0) trail the numbered seasons.
    if ((an === 0) !== (bn === 0)) return an === 0 ? 1 : -1
    return an - bn
  })
}

const seasonNumber = (e: SeasonEntry) =>
  e.kind === 'library' ? (e.item.IndexNumber ?? 0) : e.season.number

export const unplayed = (item: BaseItemDto) => item.UserData?.UnplayedItemCount ?? 0

/** First season worth landing on: the one asked for, else the first with something unplayed. */
export const defaultSeason = (entries: SeasonEntry[], key: string | undefined) =>
  entries.find((e) => e.key === key) ??
  entries.find((e) => e.kind === 'library' && unplayed(e.item) > 0) ??
  entries[0]
