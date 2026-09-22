import {
  getEpisodesOptions,
  getItemOptions,
  getItemsOptions,
  getLatestMediaOptions,
  getNextUpOptions,
  getResumeItemsOptions,
  getSeasonsOptions,
  getSimilarItemsOptions,
  getUserViewsOptions,
} from '@/api/gen/@tanstack/react-query.gen'
import type { ImageType, ItemFields } from '@/api/gen/types.gen'

export const CARD_FIELDS: ItemFields[] = ['PrimaryImageAspectRatio', 'MediaSourceCount']
const HERO_FIELDS: ItemFields[] = [...CARD_FIELDS, 'Overview', 'Genres']
const EPISODE_FIELDS: ItemFields[] = [...CARD_FIELDS, 'Overview', 'MediaStreams']
const HERO_IMAGES: ImageType[] = ['Primary', 'Backdrop', 'Thumb', 'Logo']
const CARD_IMAGES: ImageType[] = ['Primary']

export const queries = {
  views: (userId: string) => getUserViewsOptions({ query: { userId } }),
  resume: (userId: string) =>
    getResumeItemsOptions({
      query: {
        userId,
        limit: 12,
        fields: HERO_FIELDS,
        mediaTypes: ['Video'],
        enableImageTypes: HERO_IMAGES,
      },
    }),
  nextUp: (userId: string) =>
    getNextUpOptions({
      query: {
        userId,
        limit: 16,
        fields: HERO_FIELDS,
        enableImageTypes: HERO_IMAGES,
        enableResumable: false,
      },
    }),
  latest: (userId: string, parentId: string) =>
    getLatestMediaOptions({
      query: { userId, parentId, limit: 16, fields: HERO_FIELDS, enableImageTypes: HERO_IMAGES },
    }),
  item: (userId: string, itemId: string) => getItemOptions({ path: { itemId }, query: { userId } }),
  seasons: (userId: string, seriesId: string) =>
    getSeasonsOptions({
      path: { seriesId },
      query: { userId, fields: [...CARD_FIELDS, 'ChildCount'], enableImageTypes: CARD_IMAGES },
    }),
  episodes: (userId: string, seriesId: string, seasonId: string) =>
    getEpisodesOptions({
      path: { seriesId },
      query: { userId, seasonId, fields: EPISODE_FIELDS, enableImageTypes: CARD_IMAGES },
    }),
  search: (userId: string, searchTerm: string) =>
    getItemsOptions({
      query: {
        userId,
        searchTerm,
        recursive: true,
        includeItemTypes: ['Movie', 'Series', 'Episode'],
        limit: 24,
        fields: CARD_FIELDS,
        enableImageTypes: CARD_IMAGES,
        imageTypeLimit: 1,
      },
    }),
  similar: (userId: string, itemId: string) =>
    getSimilarItemsOptions({ path: { itemId }, query: { userId, limit: 16, fields: CARD_FIELDS } }),
}
