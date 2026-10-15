import type { RequestGroup } from '@/seerr/api'
import type { Progress } from '@/seerr/labels'
import type { MangaRequest } from './api'

/** Where a requested title sits among the Requests page's groups, by its chapters. */
export function mangaGroup(m: MangaRequest): RequestGroup {
  if (m.queued > 0) return 'downloading'
  if (m.chapters > 0 && m.downloaded >= m.chapters) return 'done'
  return m.downloaded > 0 ? 'partial' : 'waiting'
}

export const chapters = (n: number) => `${n} chapter${n === 1 ? '' : 's'}`

/** `12 of 40 chapters` over what's queued or missing. */
export function mangaProgress(m: MangaRequest): Progress | null {
  if (m.chapters === 0) return null
  return {
    state: m.queued > 0 ? 'downloading' : null,
    fraction: m.downloaded / m.chapters,
    label: `${m.downloaded} of ${chapters(m.chapters)}`,
    detail:
      m.queued > 0 ? `Downloading ${chapters(m.queued)}` : `${m.chapters - m.downloaded} missing`,
  }
}
