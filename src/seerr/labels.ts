import type { Availability, MediaType, Request } from './api'

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
