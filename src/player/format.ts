export function formatTime(seconds: number, forceHours = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h > 0 || forceHours ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 || forceHours ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function languageName(code: string | undefined, fallback: string): string {
  if (!code) return fallback
  try {
    const name = new Intl.DisplayNames(undefined, { type: 'language' }).of(normalizeLanguage(code))
    return name && name !== code ? name : fallback
  } catch {
    return fallback
  }
}

const ISO_639_2: Record<string, string> = {
  eng: 'en',
  jpn: 'ja',
  chi: 'zh',
  zho: 'zh',
  fre: 'fr',
  fra: 'fr',
  ger: 'de',
  deu: 'de',
  spa: 'es',
  por: 'pt',
  ita: 'it',
  rus: 'ru',
  kor: 'ko',
  ara: 'ar',
  tha: 'th',
  vie: 'vi',
  ind: 'id',
  msa: 'ms',
  may: 'ms',
  dut: 'nl',
  nld: 'nl',
  swe: 'sv',
  nor: 'no',
  dan: 'da',
  fin: 'fi',
  pol: 'pl',
  tur: 'tr',
  hin: 'hi',
  heb: 'he',
  ces: 'cs',
  cze: 'cs',
  hun: 'hu',
  ell: 'el',
  gre: 'el',
  ukr: 'uk',
  ron: 'ro',
  rum: 'ro',
  enm: 'enm',
}

export function normalizeLanguage(code: string): string {
  const lower = code.toLowerCase()
  return ISO_639_2[lower] ?? lower
}
