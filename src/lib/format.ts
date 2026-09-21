import type { BaseItemDto, MediaStream } from '@/api/gen/types.gen'

const TICKS_PER_MINUTE = 600_000_000

function ticksToMinutes(ticks: number | null | undefined): number {
  return ticks ? Math.round(ticks / TICKS_PER_MINUTE) : 0
}

export function formatRuntime(ticks: number | null | undefined): string | null {
  const total = ticksToMinutes(ticks)
  if (!total) return null
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

export function remainingMinutes(item: BaseItemDto): number | null {
  const pos = item.UserData?.PlaybackPositionTicks ?? 0
  if (!pos || !item.RunTimeTicks) return null
  return Math.max(1, ticksToMinutes(item.RunTimeTicks - pos))
}

export function episodeCode(item: BaseItemDto): string | null {
  const s = item.ParentIndexNumber
  const e = item.IndexNumber
  return s != null && e != null ? `S${s} E${e}` : null
}

export function episodeLabel(item: BaseItemDto): string {
  return [episodeCode(item)?.replace(' ', ':'), item.Name].filter(Boolean).join(' · ')
}

export function itemKindLabel(item: BaseItemDto): string | null {
  switch (item.Type) {
    case 'Movie':
      return 'Film'
    case 'Series':
    case 'Season':
    case 'Episode':
      return 'Series'
    default:
      return null
  }
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return dateFormat.format(d)
}

const languageNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(undefined, { type: 'language', fallback: 'none' })
    : null

export function languageName(code: string | null | undefined): string | null {
  if (!code || code === 'und') return null
  try {
    return languageNames?.of(code) ?? code
  } catch {
    return code
  }
}

const CODEC_LABELS: Record<string, string> = {
  h264: 'H.264',
  hevc: 'HEVC',
  h265: 'HEVC',
  av1: 'AV1',
  vp9: 'VP9',
  mpeg4: 'MPEG-4',
  aac: 'AAC',
  ac3: 'Dolby Digital',
  eac3: 'Dolby Digital+',
  truehd: 'TrueHD',
  dts: 'DTS',
  flac: 'FLAC',
  opus: 'Opus',
  mp3: 'MP3',
  vorbis: 'Vorbis',
  pcm_s16le: 'PCM',
  subrip: 'SRT',
  srt: 'SRT',
  ass: 'ASS',
  ssa: 'SSA',
  pgssub: 'PGS',
  dvdsub: 'VobSub',
  webvtt: 'WebVTT',
}

export function codecLabel(codec: string | null | undefined): string | null {
  if (!codec) return null
  const key = codec.toLowerCase()
  return CODEC_LABELS[key] ?? codec.toUpperCase()
}

export function resolutionLabel(
  width: number | null | undefined,
  height: number | null | undefined,
): string | null {
  if (!width && !height) return null
  const w = width ?? 0
  const h = height ?? 0
  if (w >= 3800 || h >= 2100) return '4K'
  if (w >= 1900 || h >= 1060) return '1080p'
  if (w >= 1260 || h >= 700) return '720p'
  if (h) return `${h}p`
  return null
}

function channelLabel(
  channels: number | null | undefined,
  layout: string | null | undefined,
): string | null {
  if (layout) return layout.replace('(side)', '').replace('stereo', '2.0').replace('mono', '1.0')
  if (!channels) return null
  if (channels === 1) return '1.0'
  if (channels === 2) return '2.0'
  if (channels === 6) return '5.1'
  if (channels === 8) return '7.1'
  return `${channels}ch`
}

export function videoStreamLabel(s: MediaStream): string {
  const parts = [resolutionLabel(s.Width, s.Height), codecLabel(s.Codec)]
  if (s.VideoRangeType && s.VideoRangeType !== 'SDR' && s.VideoRangeType !== 'Unknown') {
    parts.push(s.VideoRangeType.replace('DOVI', 'Dolby Vision'))
  }
  return parts.filter(Boolean).join(' · ')
}

export function audioStreamLabel(s: MediaStream): string {
  return [languageName(s.Language), codecLabel(s.Codec), channelLabel(s.Channels, s.ChannelLayout)]
    .filter(Boolean)
    .join(' · ')
}

export function unique<T>(xs: readonly (T | null | undefined)[]): T[] {
  return [...new Set(xs.filter((x): x is T => x != null))]
}

/** Overviews from some metadata providers contain HTML; flatten to plain text with newlines. */
export function plainText(html: string | null | undefined): string | null {
  if (!html) return null
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
  return text || null
}
