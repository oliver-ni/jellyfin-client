import type { BaseItemDto } from '@/api/gen/types.gen'

const TICKS_PER_MINUTE = 600_000_000

export function ticksToMinutes(ticks: number | null | undefined): number {
  return ticks ? Math.round(ticks / TICKS_PER_MINUTE) : 0
}

export function formatRuntime(ticks: number | null | undefined): string | null {
  const total = ticksToMinutes(ticks)
  if (!total) return null
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

export function remainingMinutes(item: BaseItemDto): number | null {
  const pos = item.UserData?.PlaybackPositionTicks ?? 0
  if (!pos || !item.RunTimeTicks) return null
  return Math.max(1, ticksToMinutes(item.RunTimeTicks - pos))
}

export function episodeCode(item: BaseItemDto): string | null {
  const s = item.ParentIndexNumber
  const e = item.IndexNumber
  return s != null && e != null ? `S${s} E${e}` : null
}

export function episodeLabel(item: BaseItemDto): string {
  return [episodeCode(item)?.replace(' ', ':'), item.Name].filter(Boolean).join(' · ')
}

export function itemKindLabel(item: BaseItemDto): string | null {
  switch (item.Type) {
    case 'Movie':
      return 'Film'
    case 'Series':
    case 'Season':
    case 'Episode':
      return 'Series'
    default:
      return null
  }
}
