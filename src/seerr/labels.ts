import { Clock, DownloadSimple, Plus, Prohibit, type Icon } from '@phosphor-icons/react'
import {
  DOWNLOAD_STATES,
  type Availability,
  type Download,
  type DownloadState,
  type MediaType,
  type Request,
  type Season,
} from './api'

export const MEDIA_TYPE_LABEL: Record<MediaType, string> = { movie: 'Film', tv: 'Series' }

/** Short state shown next to a title; `null` for the plain "not here" states. */
export const AVAILABILITY_LABEL: Record<Availability, string | null> = {
  unknown: null,
  deleted: null,
  pending: 'Requested',
  processing: 'On its way',
  partial: 'Some seasons in library',
  available: 'In your library',
  blocklisted: 'Unavailable',
}

/** What a season's state looks like at a glance: requestable, waiting, downloading or refused. */
export const AVAILABILITY_ICON: Record<Availability, Icon | null> = {
  unknown: Plus,
  deleted: Plus,
  partial: null,
  pending: Clock,
  processing: DownloadSimple,
  blocklisted: Prohibit,
  available: null,
}

/**
 * One line on a season: how many episodes, and how many of them the library already holds.
 * Says outright when none are, since the rest of Seerr's news sits in a pill beside it.
 */
export function seasonLabel(s: Season, owned: number): string {
  const count = owned
    ? `${owned} of ${s.episodeCount} episodes`
    : `${s.episodeCount} ${s.episodeCount === 1 ? 'episode' : 'episodes'}`
  return owned ? count : `${count} · Not in your library`
}

/** Radarr/Sonarr's `D.HH:MM:SS` estimate, in minutes. */
function minutesLeft(timeLeft: string): number {
  const [s = 0, min = 0, h = 0, d = 0] = timeLeft.split(/[.:]/).map(Number).reverse()
  return d * 1440 + h * 60 + min + (s >= 30 ? 1 : 0)
}

function formatLeft(minutes: number): string {
  if (minutes < 1) return 'under a minute left'
  const [d, h, min] = [Math.floor(minutes / 1440), Math.floor(minutes / 60) % 24, minutes % 60]
  const parts = d ? [`${d}d`, `${h}h`] : h ? [`${h}h`, `${min}m`] : [`${min}m`]
  return `${parts.join(' ')} left`
}

const DOWNLOAD_STATE_LABEL: Record<DownloadState, string> = {
  downloading: 'Downloading',
  importing: 'Importing',
  queued: 'Queued',
  paused: 'Paused',
  stalled: 'Stalled',
}

/** `episode 7`, `episodes 3–5`, or `4 episodes` when they don't run in sequence. */
function range(noun: string, numbers: number[]): string {
  const [first, last] = [numbers[0], numbers[numbers.length - 1]]
  if (numbers.length === 1) return `${noun} ${first}`
  if (last === first + numbers.length - 1) return `${noun}s ${first}–${last}`
  return `${numbers.length} ${noun}s`
}

/**
 * Which part of a show the downloads cover: episodes of one season when `episodeCount` says how
 * long that season is, seasons of the title otherwise. `null` for a film, which has no parts.
 */
function coverage(downloads: Download[], episodeCount?: number): string | null {
  const episodes = downloads.flatMap((d) => d.episodes)
  if (episodes.length === 0) return null
  const distinct = (ns: number[]) => [...new Set(ns)].sort((a, b) => a - b)
  if (episodeCount === undefined) return range('season', distinct(episodes.map((e) => e.season)))
  const numbers = distinct(episodes.map((e) => e.number))
  return numbers.length >= episodeCount ? 'whole season' : range('episode', numbers)
}

export interface Progress {
  fraction: number
  /** What's happening to what: `Downloading episodes 3–5`. */
  label: string
  /** How far along: `42% · 12m left`. */
  detail: string
}

/**
 * How far along a set of downloads is, or `null` when nothing is downloading. The liveliest
 * download's state stands for the set, the percentage is of the releases' combined size, and a
 * queue with no size yet is 0%.
 */
export function progress(downloads: Download[], episodeCount?: number): Progress | null {
  const state = DOWNLOAD_STATES.find((s) => downloads.some((d) => d.state === s))
  if (!state) return null
  const size = downloads.reduce((sum, d) => sum + d.size, 0)
  const left = downloads.reduce((sum, d) => sum + d.sizeLeft, 0)
  const fraction = size ? 1 - left / size : 0
  const estimates = downloads.flatMap((d) => (d.timeLeft ? [minutesLeft(d.timeLeft)] : []))
  return {
    fraction,
    label: [DOWNLOAD_STATE_LABEL[state], coverage(downloads, episodeCount)]
      .filter(Boolean)
      .join(' '),
    detail: [
      `${Math.round(fraction * 100)}%`,
      estimates.length > 0 && formatLeft(Math.max(...estimates)),
    ]
      .filter(Boolean)
      .join(' · '),
  }
}

/** Where a request stands: its own status until approved, then the title's availability. */
export function requestLabel(r: Request): string {
  switch (r.status) {
    case 'pending':
      return 'Awaiting approval'
    case 'declined':
      return 'Declined'
    case 'failed':
      return 'Failed'
    case 'completed':
      return 'In your library'
    case 'approved':
      if (r.availability === 'partial') {
        const here = r.seasonsHere.length
        return here > 0 && r.seasons.length > 1
          ? `${here} of ${r.seasons.length} seasons in library`
          : 'Some episodes in library'
      }
      return AVAILABILITY_LABEL[r.availability] ?? 'On its way'
  }
}
