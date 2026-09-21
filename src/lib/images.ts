import type { BaseItemDto, ImageType } from '@/api/gen/types.gen'
import { getSession } from './session'

export interface ImageOptions {
  type?: ImageType
  width?: number
  height?: number
  quality?: number
  tag?: string
  index?: number
}

export function imageUrl(itemId: string, opts: ImageOptions = {}): string {
  const base = getSession()?.serverUrl ?? ''
  const { type = 'Primary', width, height, quality = 90, tag, index } = opts
  const params = new URLSearchParams()
  if (width) params.set('fillWidth', String(Math.round(width)))
  if (height) params.set('fillHeight', String(Math.round(height)))
  params.set('quality', String(quality))
  if (tag) params.set('tag', tag)
  const suffix = index !== undefined ? `/${index}` : ''
  return `${base}/Items/${itemId}/Images/${type}${suffix}?${params}`
}

export interface ResolvedImage {
  url: string
  blurhash?: string
  ratio: number
}

/** Prefer the item's own image, then fall back to the parent's (episode → series, etc). */
export function itemImage(
  item: BaseItemDto,
  type: ImageType,
  size: { width?: number; height?: number },
): ResolvedImage | null {
  const tag = item.ImageTags?.[type]
  const ratio = item.PrimaryImageAspectRatio ?? (type === 'Primary' ? 2 / 3 : 16 / 9)
  if (tag && item.Id) {
    return {
      url: imageUrl(item.Id, { type, tag, ...size }),
      blurhash: item.ImageBlurHashes?.[type]?.[tag] ?? undefined,
      ratio,
    }
  }
  if (type === 'Backdrop' && item.BackdropImageTags?.[0] && item.Id) {
    const bt = item.BackdropImageTags[0]
    return {
      url: imageUrl(item.Id, { type, tag: bt, index: 0, ...size }),
      blurhash: item.ImageBlurHashes?.Backdrop?.[bt] ?? undefined,
      ratio: 16 / 9,
    }
  }
  if (type === 'Primary' && item.SeriesPrimaryImageTag && item.SeriesId) {
    return {
      url: imageUrl(item.SeriesId, { type, tag: item.SeriesPrimaryImageTag, ...size }),
      blurhash: item.ImageBlurHashes?.Primary?.[item.SeriesPrimaryImageTag] ?? undefined,
      ratio: 2 / 3,
    }
  }
  if (type === 'Thumb' && item.ParentThumbImageTag && item.ParentThumbItemId) {
    return {
      url: imageUrl(item.ParentThumbItemId, { type, tag: item.ParentThumbImageTag, ...size }),
      blurhash: item.ImageBlurHashes?.Thumb?.[item.ParentThumbImageTag] ?? undefined,
      ratio: 16 / 9,
    }
  }
  if (type === 'Backdrop' && item.ParentBackdropImageTags?.[0] && item.ParentBackdropItemId) {
    const bt = item.ParentBackdropImageTags[0]
    return {
      url: imageUrl(item.ParentBackdropItemId, { type, tag: bt, index: 0, ...size }),
      blurhash: item.ImageBlurHashes?.Backdrop?.[bt] ?? undefined,
      ratio: 16 / 9,
    }
  }
  return null
}

/** Landscape art: episode still → Thumb → Backdrop, with parent fallbacks. */
export function landscapeImage(item: BaseItemDto, width: number): ResolvedImage | null {
  if (item.Type === 'Episode' && item.ImageTags?.Primary && item.Id) {
    const tag = item.ImageTags.Primary
    return {
      url: imageUrl(item.Id, { type: 'Primary', tag, width }),
      blurhash: item.ImageBlurHashes?.Primary?.[tag] ?? undefined,
      ratio: 16 / 9,
    }
  }
  return itemImage(item, 'Thumb', { width }) ?? itemImage(item, 'Backdrop', { width })
}

/** Backdrop for full-bleed heroes: own Backdrop → parent Backdrop → Thumb. */
export function backdropImage(item: BaseItemDto, width: number): ResolvedImage | null {
  return itemImage(item, 'Backdrop', { width }) ?? itemImage(item, 'Thumb', { width })
}

/** Title-treatment logo (Logo image), own or inherited from the series. */
export function logoImage(item: BaseItemDto, width: number): string | null {
  const own = item.ImageTags?.Logo
  if (own && item.Id) return imageUrl(item.Id, { type: 'Logo', tag: own, width })
  if (item.ParentLogoImageTag && item.ParentLogoItemId) {
    return imageUrl(item.ParentLogoItemId, { type: 'Logo', tag: item.ParentLogoImageTag, width })
  }
  return null
}
