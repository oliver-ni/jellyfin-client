import { getSession } from '@/lib/session'

/** `VITE_BRAND_MARK`: an emoji or short glyph shown in the header, on sign-in and in tab titles. */
export const brandMark = import.meta.env.VITE_BRAND_MARK || null

/** Route `head`: `Frieren · 🍵`, with the server name standing in when the build has no mark. */
export function titleHead(name?: string | null) {
  const suffix = brandMark ?? getSession()?.serverName ?? 'Jellyfin'
  return { meta: [{ title: name ? `${name} · ${suffix}` : suffix }] }
}

/** Rasterises the mark into the favicon so the tab matches the header. */
export function installFavicon() {
  if (!brandMark) return
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.font = '52px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(brandMark, 32, 36)
  const link =
    document.querySelector<HTMLLinkElement>('link[rel="icon"]') ??
    document.head.appendChild(document.createElement('link'))
  link.rel = 'icon'
  link.type = 'image/png'
  link.href = canvas.toDataURL('image/png')
}
