import type { BaseItemDto, ImageType } from '@/api/gen/types.gen'
import { getSession } from './session'

export interface ImageOptions {
  type?: ImageType
  width?: number
  tag?: string
  index?: number
}

export function imageUrl(itemId: string, opts: ImageOptions = {}): string {
  const { type = 'Primary', width, tag, index } = opts
  const params = new URLSearchParams({ quality: '90' })
  if (width) params.set('fillWidth', String(Math.round(width)))
  if (tag) params.set('tag', tag)
  const suffix = index === undefined ? '' : `/${index}`
  return `${getSession()?.serverUrl ?? ''}/Items/${itemId}/Images/${type}${suffix}?${params}`
}

export interface ResolvedImage {
  url: string
  blurhash?: string
}

/** Prefer the item's own image, then fall back to the parent's (episode → series, etc). */
export function itemImage(item: BaseItemDto, type: ImageType, width: number): ResolvedImage | null {
  const pick = (id?: string | null, tag?: string | null, index?: number) =>
    id && tag
      ? {
          url: imageUrl(id, { type, tag, index, width }),
          blurhash: item.ImageBlurHashes?.[type]?.[tag] ?? undefined,
        }
      : null
  return (
    pick(item.Id, item.ImageTags?.[type]) ??
    (type === 'Primary' ? pick(item.SeriesId, item.SeriesPrimaryImageTag) : null) ??
    (type === 'Thumb' ? pick(item.ParentThumbItemId, item.ParentThumbImageTag) : null) ??
    (type === 'Backdrop'
      ? (pick(item.Id, item.BackdropImageTags?.[0], 0) ??
        pick(item.ParentBackdropItemId, item.ParentBackdropImageTags?.[0], 0))
      : null)
  )
}

/** Landscape art: episode still → Thumb → Backdrop, with parent fallbacks. */
export function landscapeImage(item: BaseItemDto, width: number): ResolvedImage | null {
  const still = item.Type === 'Episode' ? item.ImageTags?.Primary : undefined
  return (
    (still && item.Id
      ? {
          url: imageUrl(item.Id, { tag: still, width }),
          blurhash: item.ImageBlurHashes?.Primary?.[still] ?? undefined,
        }
      : null) ??
    itemImage(item, 'Thumb', width) ??
    itemImage(item, 'Backdrop', width)
  )
}

/** Backdrop for full-bleed heroes: own Backdrop → parent Backdrop → Thumb. */
export function backdropImage(item: BaseItemDto, width: number): ResolvedImage | null {
  return itemImage(item, 'Backdrop', width) ?? itemImage(item, 'Thumb', width)
}

/** Title-treatment logo (Logo image), own or inherited from the series. */
export function logoImage(item: BaseItemDto, width: number): string | null {
  return (
    itemImage(item, 'Logo', width)?.url ??
    (item.ParentLogoItemId && item.ParentLogoImageTag
      ? imageUrl(item.ParentLogoItemId, { type: 'Logo', tag: item.ParentLogoImageTag, width })
      : null)
  )
}
