/**
 * A URL handle for a Jellyfin item: `<slug>-<id>`, where the slug is the item's name for
 * reading and the id is its 32-hex GUID re-encoded as 22 base62 characters. Only the id is
 * significant, so a renamed title keeps its links.
 */

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const ID_LENGTH = 22

const GUID = /^[0-9a-f]{32}$/i

const encodeId = (hex: string): string => {
  if (!GUID.test(hex)) return hex
  let n = BigInt(`0x${hex}`)
  let out = ''
  while (out.length < ID_LENGTH) {
    out = ALPHABET[Number(n % 62n)] + out
    n /= 62n
  }
  return out
}

const decodeId = (id: string): string | null => {
  if (id.length !== ID_LENGTH) return null
  let n = 0n
  for (const c of id) {
    const digit = ALPHABET.indexOf(c)
    if (digit < 0) return null
    n = n * 62n + BigInt(digit)
  }
  const hex = n.toString(16).padStart(32, '0')
  return GUID.test(hex) ? hex : null
}

const slugify = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function toHandle(id: string, name: string | null | undefined): string {
  const slug = slugify(name ?? '')
  return slug ? `${slug}-${encodeId(id)}` : encodeId(id)
}

/** The item id a handle points at, or null when its tail is not an encoded id. */
export const idFromHandle = (handle: string): string | null =>
  decodeId(handle.slice(handle.lastIndexOf('-') + 1))
