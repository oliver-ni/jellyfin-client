import {
  getLatestMediaOptions,
  getNextUpOptions,
  getResumeItemsOptions,
  getUserViewsOptions,
} from '@/api/gen/@tanstack/react-query.gen'
import type { ImageType, ItemFields } from '@/api/gen/types.gen'

export const CARD_FIELDS: ItemFields[] = ['PrimaryImageAspectRatio', 'MediaSourceCount']
const HERO_FIELDS: ItemFields[] = [...CARD_FIELDS, 'Overview', 'Genres']
const IMAGE_TYPES: ImageType[] = ['Primary', 'Backdrop', 'Thumb', 'Logo']

export const homeQueries = {
  views: (userId: string) => getUserViewsOptions({ query: { userId } }),
  resume: (userId: string) =>
    getResumeItemsOptions({
      query: {
        userId,
        limit: 12,
        fields: HERO_FIELDS,
        mediaTypes: ['Video'],
        enableImageTypes: IMAGE_TYPES,
      },
    }),
  nextUp: (userId: string) =>
    getNextUpOptions({
      query: {
        userId,
        limit: 16,
        fields: HERO_FIELDS,
        enableImageTypes: IMAGE_TYPES,
        enableResumable: false,
      },
    }),
  latest: (userId: string, parentId: string) =>
    getLatestMediaOptions({
      query: {
        userId,
        parentId,
        limit: 16,
        fields: HERO_FIELDS,
        enableImageTypes: IMAGE_TYPES,
      },
    }),
}
