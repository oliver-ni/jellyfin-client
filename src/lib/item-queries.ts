import {
  getEpisodesOptions,
  getItemOptions,
  getSeasonsOptions,
  getSimilarItemsOptions,
} from '@/api/gen/@tanstack/react-query.gen'
import type { ImageType, ItemFields } from '@/api/gen/types.gen'
import { CARD_FIELDS } from './home-queries'

const EPISODE_FIELDS: ItemFields[] = [...CARD_FIELDS, 'Overview']
const EPISODE_IMAGES: ImageType[] = ['Primary']

export const itemQueries = {
  item: (userId: string, itemId: string) => getItemOptions({ path: { itemId }, query: { userId } }),
  seasons: (userId: string, seriesId: string) =>
    getSeasonsOptions({
      path: { seriesId },
      query: { userId, fields: CARD_FIELDS, enableImageTypes: EPISODE_IMAGES },
    }),
  episodes: (userId: string, seriesId: string, seasonId: string) =>
    getEpisodesOptions({
      path: { seriesId },
      query: { userId, seasonId, fields: EPISODE_FIELDS, enableImageTypes: EPISODE_IMAGES },
    }),
  similar: (userId: string, itemId: string) =>
    getSimilarItemsOptions({
      path: { itemId },
      query: { userId, limit: 16, fields: CARD_FIELDS },
    }),
}
