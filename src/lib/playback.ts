import { queryOptions } from '@tanstack/react-query'
import {
  getEpisodes,
  getItemSegments,
  getNextUp,
  getPostedPlaybackInfo,
  reportPlaybackProgress,
  reportPlaybackStart,
  reportPlaybackStopped,
} from '@/api/gen/sdk.gen'
import type {
  BaseItemDto,
  MediaSegmentDto,
  MediaSourceInfo,
  MediaStream,
  PlaybackInfoResponse,
  PlayMethod,
} from '@/api/gen/types.gen'
import type {
  AudioTrack,
  NextItem,
  PlaybackSnapshot,
  PlayerSource,
  QualityOption,
  Segment,
  SubtitleTrack,
  Thumbnail,
} from '@/player'
import { buildDeviceProfile } from './device-profile'
import { codecLabel, episodeCode, languageName, resolutionLabel } from './format'
import { CARD_FIELDS } from './home-queries'
import { landscapeImage } from './images'
import { getDeviceId, getSession } from './session'

const TICKS_PER_SECOND = 10_000_000

export function ticksToSeconds(ticks: number | null | undefined): number {
  return ticks ? ticks / TICKS_PER_SECOND : 0
}

function secondsToTicks(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND)
}

export const AUTO_QUALITY = 'auto'
const MAX_BITRATE = 120_000_000

const QUALITY_OPTIONS: QualityOption[] = [
  { id: AUTO_QUALITY, label: 'Auto' },
  { id: '20000000', label: '1080p · 20 Mbps' },
  { id: '10000000', label: '1080p · 10 Mbps' },
  { id: '6000000', label: '720p · 6 Mbps' },
  { id: '4000000', label: '720p · 4 Mbps' },
  { id: '2000000', label: '480p · 2 Mbps' },
  { id: '1000000', label: '360p · 1 Mbps' },
]

export interface PlaybackSelection {
  audioIndex: number | null
  subtitleIndex: number | null
  qualityId: string
  /** Position to resume from, in seconds. */
  startTime: number
}

export interface PlaybackSession {
  playSessionId: string
  mediaSource: MediaSourceInfo
  mediaSourceId: string
  playMethod: PlayMethod
  source: PlayerSource
}

function serverBase(): string {
  return getSession()?.serverUrl ?? ''
}

function withAuth(path: string, params: Record<string, string | undefined> = {}): string {
  const url = new URL(path, serverBase())
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v)
  if (!url.searchParams.has('api_key') && !url.searchParams.has('ApiKey')) {
    url.searchParams.set('api_key', getSession()?.accessToken ?? '')
  }
  return url.toString()
}

export async function negotiatePlayback(
  itemId: string,
  mediaSourceId: string | undefined,
  userId: string,
  selection: PlaybackSelection,
  signal?: AbortSignal,
): Promise<PlaybackSession> {
  const maxBitrate =
    selection.qualityId === AUTO_QUALITY ? MAX_BITRATE : Number(selection.qualityId)

  const { data, error } = await getPostedPlaybackInfo({
    path: { itemId },
    body: {
      UserId: userId,
      DeviceProfile: buildDeviceProfile(maxBitrate),
      MaxStreamingBitrate: maxBitrate,
      StartTimeTicks: secondsToTicks(selection.startTime),
      AudioStreamIndex: selection.audioIndex,
      SubtitleStreamIndex: selection.subtitleIndex,
      MediaSourceId: mediaSourceId,
      EnableDirectPlay: true,
      EnableDirectStream: true,
      EnableTranscoding: true,
      AllowVideoStreamCopy: true,
      AllowAudioStreamCopy: true,
      AutoOpenLiveStream: true,
    },
    signal,
  })
  if (error || !data) throw new Error('Could not get playback info from the server.')
  return toPlaybackSession(itemId, data, selection)
}

const PLAYBACK_ERRORS: Record<NonNullable<PlaybackInfoResponse['ErrorCode']>, string> = {
  NotAllowed: 'Playback of this item is not allowed for your account.',
  NoCompatibleStream: 'No compatible stream is available for this browser.',
  RateLimitExceeded: 'Too many streams are playing. Try again in a moment.',
}

function toPlaybackSession(
  itemId: string,
  info: PlaybackInfoResponse,
  selection: PlaybackSelection,
): PlaybackSession {
  if (info.ErrorCode) throw new Error(PLAYBACK_ERRORS[info.ErrorCode])
  const mediaSource = info.MediaSources?.[0]
  const mediaSourceId = mediaSource?.Id
  const playSessionId = info.PlaySessionId
  if (!mediaSource || !mediaSourceId || !playSessionId) {
    throw new Error('The server returned no playable media source.')
  }

  let url: string
  let protocol: PlayerSource['protocol']
  let playMethod: PlayMethod
  if (mediaSource.SupportsDirectPlay || mediaSource.SupportsDirectStream) {
    playMethod = mediaSource.SupportsDirectPlay ? 'DirectPlay' : 'DirectStream'
    protocol = 'native'
    url = withAuth(`/Videos/${itemId}/stream.${mediaSource.Container ?? 'mp4'}`, {
      Static: 'true',
      mediaSourceId,
      deviceId: getDeviceId(),
      Tag: mediaSource.ETag ?? undefined,
      PlaySessionId: playSessionId,
    })
  } else if (mediaSource.TranscodingUrl) {
    playMethod = 'Transcode'
    protocol = mediaSource.TranscodingSubProtocol === 'hls' ? 'hls' : 'native'
    url = withAuth(mediaSource.TranscodingUrl)
  } else {
    throw new Error('No compatible stream is available for this browser.')
  }

  const streams = mediaSource.MediaStreams ?? []
  const audioTracks = streams.filter((s) => s.Type === 'Audio').map(toAudioTrack)
  const subtitleTracks = streams
    .filter((s) => s.Type === 'Subtitle')
    .map((s) => toSubtitleTrack(s, itemId, mediaSource))

  const audioIndex = selection.audioIndex ?? mediaSource.DefaultAudioStreamIndex ?? null
  const subtitleIndex = selection.subtitleIndex ?? mediaSource.DefaultSubtitleStreamIndex ?? null
  const audioTrackId = audioTracks.find((t) => t.id === String(audioIndex))?.id ?? null
  const subtitleTrackId =
    subtitleIndex !== null && subtitleIndex >= 0
      ? (subtitleTracks.find((t) => t.id === String(subtitleIndex))?.id ?? null)
      : null

  return {
    playSessionId,
    mediaSource,
    mediaSourceId,
    playMethod,
    source: {
      id: playSessionId,
      url,
      protocol,
      startTime: selection.startTime,
      duration: ticksToSeconds(mediaSource.RunTimeTicks) || undefined,
      audioTracks,
      subtitleTracks,
      audioTrackId,
      subtitleTrackId,
      qualityOptions: QUALITY_OPTIONS,
      qualityId: selection.qualityId,
      deliveryLabel: deliveryLabel(playMethod, mediaSource),
      crossOrigin: 'anonymous',
    },
  }
}

function deliveryLabel(method: PlayMethod, ms: MediaSourceInfo): string {
  const video = ms.MediaStreams?.find((s) => s.Type === 'Video')
  const parts = [
    method === 'Transcode' ? 'Transcoding' : 'Direct play',
    resolutionLabel(video?.Width, video?.Height),
    codecLabel(video?.Codec),
    ms.Container?.toUpperCase(),
  ]
  return parts.filter((p): p is string => Boolean(p)).join(' · ')
}

function trackLabel(s: MediaStream): string {
  const lang = languageName(s.Language)
  const parts = [s.Title?.trim() || lang || 'Unknown', codecLabel(s.Codec)]
  if (s.Type === 'Audio' && s.ChannelLayout) parts.push(s.ChannelLayout)
  if (s.Title && lang && !s.Title.toLowerCase().includes(lang.toLowerCase()))
    parts.splice(1, 0, lang)
  return parts.filter((p): p is string => Boolean(p)).join(' · ')
}

function toAudioTrack(s: MediaStream): AudioTrack {
  return { id: String(s.Index ?? 0), label: trackLabel(s), language: s.Language ?? undefined }
}

const FONT_EXT = /\.(ttf|otf|ttc|woff2?)$/i

function toSubtitleTrack(s: MediaStream, itemId: string, ms: MediaSourceInfo): SubtitleTrack {
  const codec = (s.Codec ?? '').toLowerCase()
  const index = s.Index ?? 0
  const base: SubtitleTrack = {
    id: String(index),
    label: trackLabel(s),
    language: s.Language ?? undefined,
    kind: 'source',
    default: s.IsDefault ?? false,
    forced: s.IsForced ?? false,
  }
  if (s.DeliveryMethod === 'Encode' || !s.IsTextSubtitleStream) return base

  const streamUrl = (format: string) =>
    withAuth(`/Videos/${itemId}/${ms.Id}/Subtitles/${index}/0/Stream.${format}`)

  if (codec === 'ass' || codec === 'ssa') {
    const fonts = (ms.MediaAttachments ?? [])
      .filter(
        (a) =>
          a.MimeType?.startsWith('font/') ||
          a.MimeType?.includes('font') ||
          FONT_EXT.test(a.FileName ?? ''),
      )
      .map((a) => withAuth(a.DeliveryUrl ?? `/Videos/${itemId}/${ms.Id}/Attachments/${a.Index}`))
    return { ...base, kind: 'ass', url: streamUrl(codec), fonts }
  }
  return { ...base, kind: 'vtt', url: streamUrl('vtt') }
}

// ---------------------------------------------------------------------------
// Segments (intro/outro skipping)

const SEGMENT_TYPES = ['Intro', 'Outro', 'Recap', 'Preview', 'Commercial'] as const

export const playbackQueries = {
  segments: (itemId: string) =>
    queryOptions({
      queryKey: ['segments', itemId],
      queryFn: async ({ signal }) => {
        const { data } = await getItemSegments({
          path: { itemId },
          query: { includeSegmentTypes: [...SEGMENT_TYPES] },
          // Enum arrays on this endpoint reject the comma form the rest of the API accepts.
          querySerializer: { array: { explode: true, style: 'form' } },
          signal,
        })
        return data?.Items ?? []
      },
    }),
  nextEpisode: (userId: string, item: BaseItemDto) =>
    queryOptions({
      queryKey: ['next-episode', item.Id],
      queryFn: async ({ signal }) => {
        if (!item.SeriesId || !item.Id) return null
        const { data } = await getEpisodes({
          path: { seriesId: item.SeriesId },
          query: { userId, startItemId: item.Id, limit: 2, fields: CARD_FIELDS },
          signal,
        })
        const items = data?.Items ?? []
        const next = items[0]?.Id === item.Id ? items[1] : items[0]
        return next?.Id && next.Id !== item.Id ? next : null
      },
    }),
}

/** Where a series starts playing: the next-up (or in-progress) episode, else its first. */
export async function seriesStartEpisode(userId: string, seriesId: string) {
  const nextUp = await getNextUp({ query: { userId, seriesId, limit: 1, enableResumable: true } })
  const first = nextUp.data?.Items?.[0]
  if (first) return first
  const episodes = await getEpisodes({ path: { seriesId }, query: { userId, limit: 1 } })
  return episodes.data?.Items?.[0] ?? null
}

export function toSegments(
  items: MediaSegmentDto[],
  duration: number | undefined,
  hasNext: boolean,
): Segment[] {
  const out: Segment[] = []
  for (const s of items) {
    if (!s.Id || s.StartTicks == null || s.EndTicks == null) continue
    const start = ticksToSeconds(s.StartTicks)
    const end = ticksToSeconds(s.EndTicks)
    if (end - start < 2) continue
    const range = { id: s.Id, start, end }
    switch (s.Type) {
      case 'Intro':
        out.push({ ...range, name: 'Intro', label: 'Skip intro', action: 'skip' })
        break
      case 'Recap':
        out.push({ ...range, name: 'Recap', label: 'Skip recap', action: 'skip' })
        break
      case 'Commercial':
        out.push({ ...range, name: 'Ad', label: 'Skip ad', action: 'skip' })
        break
      case 'Outro':
        if (hasNext) out.push({ ...range, name: 'Credits', label: 'Next episode', action: 'next' })
        break
      case 'Preview':
        if (hasNext) out.push({ ...range, name: 'Preview', label: 'Next episode', action: 'next' })
        else out.push({ ...range, name: 'Preview', label: 'Skip preview', action: 'skip' })
        break
      default:
        break
    }
  }
  // Without a detected outro, offer "next" over the final stretch of the episode.
  if (hasNext && duration && !out.some((s) => s.action === 'next')) {
    const start = Math.max(0, duration - 30)
    out.push({
      id: 'credits',
      start,
      end: duration,
      name: 'Credits',
      label: 'Next episode',
      action: 'next',
    })
  }
  return out.sort((a, b) => a.start - b.start)
}

export function toNextItem(item: BaseItemDto | null | undefined): NextItem | null {
  if (!item?.Id) return null
  const code = episodeCode(item)
  return {
    title: item.Name ?? 'Next episode',
    subtitle: [item.SeriesName, code].filter(Boolean).join(' · ') || undefined,
    image: landscapeImage(item, 480)?.url,
  }
}

// ---------------------------------------------------------------------------
// Trickplay (scrubber thumbnails)

export function trickplayThumbnailer(
  item: BaseItemDto,
  mediaSourceId: string,
): ((time: number) => Thumbnail | null) | undefined {
  const byWidth = item.Trickplay?.[mediaSourceId]
  if (!item.Id || !byWidth) return undefined
  const widths = Object.keys(byWidth)
    .map(Number)
    .filter((w) => Number.isFinite(w))
    .sort((a, b) => a - b)
  const width = widths.find((w) => w >= 320) ?? widths.at(-1)
  const info = width !== undefined ? byWidth[String(width)] : undefined
  if (!info?.Width || !info.Height || !info.TileWidth || !info.TileHeight || !info.Interval) {
    return undefined
  }
  const { Width, Height, TileWidth, TileHeight, Interval, ThumbnailCount } = info
  const perTile = TileWidth * TileHeight
  const itemId = item.Id
  return (time) => {
    let index = Math.floor((time * 1000) / Interval)
    if (ThumbnailCount) index = Math.min(index, ThumbnailCount - 1)
    if (index < 0) return null
    const tile = Math.floor(index / perTile)
    const pos = index % perTile
    return {
      src: withAuth(`/Videos/${itemId}/Trickplay/${width}/${tile}.jpg`, { mediaSourceId }),
      x: (pos % TileWidth) * Width,
      y: Math.floor(pos / TileWidth) * Height,
      width: Width,
      height: Height,
    }
  }
}

// ---------------------------------------------------------------------------
// Progress reporting

function reportBody(session: PlaybackSession, itemId: string, snap: PlaybackSnapshot) {
  return {
    ItemId: itemId,
    MediaSourceId: session.mediaSourceId,
    PlaySessionId: session.playSessionId,
    PositionTicks: secondsToTicks(snap.time),
    IsPaused: snap.paused,
    IsMuted: snap.muted,
    VolumeLevel: Math.round(snap.volume * 100),
    AudioStreamIndex: snap.audioTrackId !== null ? Number(snap.audioTrackId) : null,
    SubtitleStreamIndex: snap.subtitleTrackId !== null ? Number(snap.subtitleTrackId) : -1,
    PlayMethod: session.playMethod,
    CanSeek: true,
  }
}

export function reportStart(session: PlaybackSession, itemId: string, snap: PlaybackSnapshot) {
  return reportPlaybackStart({ body: reportBody(session, itemId, snap) })
}

export function reportProgress(session: PlaybackSession, itemId: string, snap: PlaybackSnapshot) {
  return reportPlaybackProgress({ body: reportBody(session, itemId, snap) })
}

export function reportStopped(session: PlaybackSession, itemId: string, snap: PlaybackSnapshot) {
  return reportPlaybackStopped({
    body: {
      ItemId: itemId,
      MediaSourceId: session.mediaSourceId,
      PlaySessionId: session.playSessionId,
      PositionTicks: secondsToTicks(snap.time),
    },
    keepalive: true,
  })
}
