import {
  getLatestMediaOptions,
  getNextUpOptions,
  getResumeItemsOptions,
  getUserViewsOptions,
} from '@/api/gen/@tanstack/react-query.gen'
import type { ItemFields } from '@/api/gen/types.gen'

export const CARD_FIELDS: ItemFields[] = ['PrimaryImageAspectRatio', 'MediaSourceCount']

export const homeQueries = {
  views: (userId: string) => getUserViewsOptions({ query: { userId } }),
  resume: (userId: string) =>
    getResumeItemsOptions({
      query: {
        userId,
        limit: 12,
        fields: CARD_FIELDS,
        mediaTypes: ['Video'],
        enableImageTypes: ['Primary', 'Backdrop', 'Thumb'],
      },
    }),
  nextUp: (userId: string) =>
    getNextUpOptions({
      query: {
        userId,
        limit: 16,
        fields: CARD_FIELDS,
        enableImageTypes: ['Primary', 'Backdrop', 'Thumb'],
        enableResumable: false,
      },
    }),
  latest: (userId: string, parentId: string) =>
    getLatestMediaOptions({
      query: {
        userId,
        parentId,
        limit: 16,
        fields: CARD_FIELDS,
        enableImageTypes: ['Primary', 'Backdrop', 'Thumb'],
      },
    }),
}
