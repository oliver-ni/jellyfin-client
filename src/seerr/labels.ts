import type { Availability, Download, MediaType, Request } from './api'

export const MEDIA_TYPE_LABEL: Record<MediaType, string> = { movie: 'Film', tv: 'Series' }

/** Short state shown next to a title; `null` for the plain "not here" states. */
export const AVAILABILITY_LABEL: Record<Availability, string | null> = {
  unknown: null,
  deleted: null,
  pending: 'Requested',
  processing: 'On its way',
  partial: 'Partly in library',
  available: 'In your library',
  blocklisted: 'Unavailable',
}

/** Radarr/Sonarr's `D.HH:MM:SS` estimate, in minutes. */
function minutesLeft(timeLeft: string): number {
  const [s = 0, min = 0, h = 0, d = 0] = timeLeft.split(/[.:]/).map(Number).reverse()
  return d * 1440 + h * 60 + min + (s >= 30 ? 1 : 0)
}

const formatLeft = (minutes: number) =>
  minutes < 1
    ? 'under a minute left'
    : `${minutes >= 60 ? `${Math.floor(minutes / 60)}h ` : ''}${minutes % 60}m left`

/** How far along a set of downloads is, or `null` when nothing is downloading. */
export function progress(downloads: Download[]): { fraction: number; text: string } | null {
  const size = downloads.reduce((sum, d) => sum + d.size, 0)
  if (!size) return null
  const left = downloads.reduce((sum, d) => sum + d.sizeLeft, 0)
  const fraction = 1 - left / size
  const estimates = downloads.flatMap((d) => (d.timeLeft ? [minutesLeft(d.timeLeft)] : []))
  return {
    fraction,
    text: [
      `${Math.round(fraction * 100)}%`,
      estimates.length > 0 && formatLeft(Math.max(...estimates)),
    ]
      .filter(Boolean)
      .join(' · '),
  }
}

/** Where a request stands: its own status until approved, then the title's availability. */
export function requestLabel(r: Request): string {
  switch (r.status) {
    case 'pending':
      return 'Awaiting approval'
    case 'declined':
      return 'Declined'
    case 'failed':
      return 'Failed'
    case 'completed':
      return 'In your library'
    case 'approved':
      return AVAILABILITY_LABEL[r.availability] ?? 'On its way'
  }
}
