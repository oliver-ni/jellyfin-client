import { Clock, DownloadSimple, Plus, Prohibit, type Icon } from '@phosphor-icons/react'
import {
  DOWNLOAD_STATES,
  type Availability,
  type Coverage,
  type Download,
  type DownloadState,
  type MediaType,
  type Request,
  type RequestGroup,
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
  return owned
    ? `${owned} of ${episodes(s.episodeCount)}`
    : `${episodes(s.episodeCount)} · Not in your library`
}

export const episodes = (n: number) => `${n} ${n === 1 ? 'episode' : 'episodes'}`

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

const distinct = (ns: number[]) => [...new Set(ns)].sort((a, b) => a - b)

/**
 * Which part of a show the downloads cover: episodes of one season when `episodeCount` says how
 * long that season is, seasons of the title otherwise. `null` for a film, which has no parts.
 */
function part(downloads: Download[], episodeCount?: number): string | null {
  const episodes = downloads.flatMap((d) => d.episodes)
  if (episodes.length === 0) return null
  if (episodeCount === undefined) return range('season', distinct(episodes.map((e) => e.season)))
  const numbers = distinct(episodes.map((e) => e.number))
  return numbers.length >= episodeCount ? 'whole season' : range('episode', numbers)
}

/**
 * How many distinct episodes the downloads name, or `null` when one names none: Sonarr lists a
 * season pack without episodes, so it stands for whatever the season still lacks.
 */
function named(downloads: Download[]): number | null {
  if (downloads.some((d) => d.episodes.length === 0)) return null
  return new Set(downloads.flatMap((d) => d.episodes.map((e) => `${e.season}/${e.number}`))).size
}

/** Tooltip for a set of downloads: their release names, one per line. */
export const releaseNames = (downloads: Download[]) => downloads.map((d) => d.title).join('\n')

export interface Progress {
  /** The liveliest download's state, or `null` when nothing is moving. */
  state: DownloadState | null
  fraction: number
  /** Share of the bar drawn fainter after `fraction`, for what is on its way but not here. */
  coming?: number
  /** What's happening to what: `Downloading episodes 3–5`. */
  label: string
  /** How far along: `42% · 12m left`. */
  detail: string
}

/**
 * How far along a set of downloads is, or `null` when nothing is downloading. The liveliest
 * download's state stands for the set, over the `part` of the show it covers — episodes of one
 * season when `episodeCount` says how long that season is, seasons of the title otherwise. The
 * percentage is of the releases' combined size; a queue with no size yet is 0%.
 */
export function progress(
  downloads: Download[],
  episodeCount?: number,
): (Progress & { state: DownloadState }) | null {
  const state = DOWNLOAD_STATES.find((s) => downloads.some((d) => d.state === s))
  if (!state) return null
  const size = downloads.reduce((sum, d) => sum + d.size, 0)
  const left = downloads.reduce((sum, d) => sum + d.sizeLeft, 0)
  const fraction = size ? 1 - left / size : 0
  const estimates = downloads.flatMap((d) => (d.timeLeft ? [minutesLeft(d.timeLeft)] : []))
  return {
    state,
    fraction,
    label: [DOWNLOAD_STATE_LABEL[state], part(downloads, episodeCount)].filter(Boolean).join(' '),
    detail: [
      `${Math.round(fraction * 100)}%`,
      estimates.length > 0 && formatLeft(Math.max(...estimates)),
    ]
      .filter(Boolean)
      .join(' · '),
  }
}

export const REQUEST_GROUP_LABEL: Record<RequestGroup, string> = {
  downloading: 'Downloading now',
  partial: 'Partially downloaded',
  waiting: 'Not downloading',
  pending: 'Awaiting approval',
  done: 'In your library',
  closed: 'Declined',
}

/**
 * Where a request that isn't `done` stands, in a line or over a bar:
 *
 * - its own status, until approved;
 * - for a show with some of the requested episodes here (`c` from `coverage`), a bar of how
 *   many, with the episodes on their way drawn fainter after it: `3 of 12 episodes downloaded`
 *   over `Downloading 9 episodes · 42% · 12m left`, or over `9 left, not downloading yet`;
 * - otherwise the download alone, or `Not downloading yet`.
 */
export function requestStatus(r: Request, c: Coverage | null): Progress | string {
  switch (r.status) {
    case 'pending':
      return 'Awaiting approval'
    case 'declined':
      return 'Declined'
    case 'failed':
      return 'Failed'
  }
  const idle = 'Not downloading yet'
  if (!c?.total) return progress(r.downloads) ?? idle
  const missing = c.total - c.owned
  const coming = Math.min(missing, named(r.downloads) ?? missing)
  const download = progress(r.downloads)
  const fetching = (state: DownloadState) => `${DOWNLOAD_STATE_LABEL[state]} ${episodes(coming)}`
  if (!c.owned) return download ? { ...download, label: fetching(download.state) } : idle
  return {
    state: download?.state ?? null,
    fraction: c.owned / c.total,
    coming: download ? coming / c.total : 0,
    label: `${c.owned} of ${episodes(c.total)} downloaded`,
    detail: download
      ? `${fetching(download.state)} · ${download.detail}`
      : `${missing} left, not downloading yet`,
  }
}
