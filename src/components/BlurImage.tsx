import * as stylex from '@stylexjs/stylex'
import { decode } from 'blurhash'
import { useState } from 'react'
import { colors, motion } from '@/theme/tokens.stylex'

const blurCache = new Map<string, string>()
/** Sources that have decoded once anywhere; they paint at once instead of fading in again. */
const loadedSrcs = new Set<string>()

function blurhashToDataUrl(hash: string): string {
  const cached = blurCache.get(hash)
  if (cached) return cached
  const w = 32
  const h = 32
  const pixels = decode(hash, w, h)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const imageData = ctx.createImageData(w, h)
  imageData.data.set(pixels)
  ctx.putImageData(imageData, 0, 0)
  const url = canvas.toDataURL()
  blurCache.set(hash, url)
  return url
}

export interface BlurImageProps {
  src?: string | null
  /** Already-loaded lower-res version of `src`, shown underneath until `src` decodes. */
  placeholderSrc?: string | null
  blurhash?: string
  alt: string
  style?: stylex.StyleXStyles
  loading?: 'eager' | 'lazy'
  fetchPriority?: 'high' | 'low' | 'auto'
}

export function BlurImage({
  src,
  placeholderSrc,
  blurhash,
  alt,
  style,
  loading = 'lazy',
  fetchPriority,
}: BlurImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const loaded = !!src && (loadedSrc === src || loadedSrcs.has(src))
  const onLoad = (url: string) => {
    loadedSrcs.add(url)
    setLoadedSrc(url)
  }

  const placeholder = blurhash ? blurhashToDataUrl(blurhash) : undefined

  return (
    <div
      {...stylex.props(styles.wrap, style)}
      style={placeholder ? { backgroundImage: `url(${placeholder})` } : undefined}
    >
      {placeholderSrc && placeholderSrc !== src && (
        <img
          src={placeholderSrc}
          alt=""
          decoding="sync"
          draggable={false}
          {...stylex.props(styles.img, styles.visible)}
        />
      )}
      {src && (
        <img
          key={src}
          ref={(img) => {
            if (img?.complete && img.naturalWidth > 0) onLoad(src)
          }}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
          draggable={false}
          onLoad={() => onLoad(src)}
          {...stylex.props(styles.img, loaded && styles.visible)}
        />
      )}
    </div>
  )
}

const styles = stylex.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.skeleton,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  img: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: motion.slow,
    transitionTimingFunction: motion.ease,
  },
  visible: {
    opacity: 1,
  },
})
