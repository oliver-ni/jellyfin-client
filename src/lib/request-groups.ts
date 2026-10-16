/** What is happening to a request, in the order a list shows them: closest to landing first. */
export const REQUEST_GROUPS = [
  'downloading',
  'partial',
  'waiting',
  'pending',
  'done',
  'closed',
] as const
export type RequestGroup = (typeof REQUEST_GROUPS)[number]

export const REQUEST_GROUP_LABEL: Record<RequestGroup, string> = {
  downloading: 'Downloading now',
  partial: 'Partially downloaded',
  waiting: 'Not downloading',
  pending: 'Awaiting approval',
  done: 'In your library',
  closed: 'Declined',
}
