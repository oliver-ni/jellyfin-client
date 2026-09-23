import type { BaseItemDto } from '@/api/gen/types.gen'
import { incoming, type Season, type TvDetails } from '@/seerr/api'

/**
 * A series' seasons as one list keyed by season number: those in the library, each with
 * Seerr's view of it when Seerr tracks it, and those only Seerr knows about, which can be
 * requested.
 */
export type SeasonEntry =
  | { number: number; kind: 'library'; item: BaseItemDto; season: Season | null }
  | { number: number; kind: 'missing'; title: TvDetails; season: Season }

export function seasonEntries(
  library: readonly BaseItemDto[],
  title: TvDetails | null,
): SeasonEntry[] {
  const known = new Map(title?.seasons.map((s) => [s.number, s]))
  const owned = library.map((item): SeasonEntry => {
    const number = item.IndexNumber ?? 0
    return { number, kind: 'library', item, season: known.get(number) ?? null }
  })
  for (const s of owned) known.delete(s.number)
  const missing = title
    ? [...known.values()]
        .filter((s) => s.availability !== 'available')
        .map((season): SeasonEntry => ({ number: season.number, kind: 'missing', title, season }))
    : []

  // Specials (season 0) last.
  return [...owned, ...missing].sort((a, b) => {
    if ((a.number === 0) !== (b.number === 0)) return a.number === 0 ? 1 : -1
    return a.number - b.number
  })
}

/** Seerr's season when it still has news on this one: not here at all, or on its way. */
export const newsFor = (e: SeasonEntry): Season | null =>
  e.kind === 'missing' || (e.season && incoming(e.season.availability)) ? e.season : null

const unplayed = (item: BaseItemDto) => item.UserData?.UnplayedItemCount ?? 0

export const defaultSeason = (entries: SeasonEntry[], number: number | undefined) =>
  entries.find((e) => e.number === number) ??
  entries.find((e) => e.kind === 'library' && unplayed(e.item) > 0) ??
  entries[0]
