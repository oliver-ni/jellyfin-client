export interface AudioTrack {
  id: string
  label: string
  language?: string
}

export type SubtitleKind =
  /** WebVTT delivered as a sidecar file; rendered by the player. */
  | 'vtt'
  /** ASS/SSA sidecar; rendered with libass (lazy loaded). */
  | 'ass'
  /** Not renderable client-side (bitmap subs, muxed-in tracks); selecting it asks the host for a new source. */
  | 'source'

export interface SubtitleTrack {
  id: string
  label: string
  language?: string
  kind: SubtitleKind
  url?: string
  /** Extra font files to load for ASS rendering (embedded MKV attachments, etc). */
  fonts?: string[]
  default?: boolean
  forced?: boolean
}

export interface QualityOption {
  id: string
  label: string
}

/** A chapter-like range that offers an action while the playhead is inside it. */
export interface Segment {
  id: string
  start: number
  end: number
  /** Short chapter name shown on the timeline ("Intro"). */
  name: string
  /** Action button text ("Skip intro"). */
  label: string
  /** `skip` jumps to `end`; `next` offers the next item (with autoplay countdown). */
  action: 'skip' | 'next'
}

export interface NextItem {
  title: string
  subtitle?: string
  image?: string
}

export interface Thumbnail {
  src: string
  x: number
  y: number
  width: number
  height: number
}

export interface PlayerSource {
  /** Changing this reloads the media element. */
  id: string
  url: string
  protocol: 'native' | 'hls'
  /** Where to start, in seconds. */
  startTime?: number
  /** Known duration, for transcodes where the element doesn't report one up front. */
  duration?: number
  audioTracks: AudioTrack[]
  subtitleTracks: SubtitleTrack[]
  audioTrackId: string | null
  subtitleTrackId: string | null
  qualityOptions?: QualityOption[]
  qualityId?: string | null
  /** Short description of how the media is being delivered, shown in the settings menu. */
  deliveryLabel?: string
  /** CORS mode for the media element; required for canvas/VideoFrame access to cross-origin media. */
  crossOrigin?: 'anonymous' | 'use-credentials'
}

export interface PlaybackSnapshot {
  time: number
  paused: boolean
  muted: boolean
  volume: number
  audioTrackId: string | null
  subtitleTrackId: string | null
}

export type ProgressReason = 'start' | 'tick' | 'play' | 'pause' | 'seek' | 'unload'
