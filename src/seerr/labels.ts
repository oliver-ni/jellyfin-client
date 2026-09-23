import { Clock, DownloadSimple, Plus, Prohibit, type Icon } from '@phosphor-icons/react'
import {
  DOWNLOAD_STATES,
  covered,
  type Availability,
  type Coverage,
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
function part(downloads: Download[], episodeCount?: number): string | null {
  const episodes = downloads.flatMap((d) => d.episodes)
  if (episodes.length === 0) return null
  const distinct = (ns: number[]) => [...new Set(ns)].sort((a, b) => a - b)
  if (episodeCount === undefined) return range('season', distinct(episodes.map((e) => e.season)))
  const numbers = distinct(episodes.map((e) => e.number))
  return numbers.length >= episodeCount ? 'whole season' : range('episode', numbers)
}

/** Tooltip for a set of downloads: their release names, one per line. */
export const releaseNames = (downloads: Download[]) => downloads.map((d) => d.title).join('\n')

export interface Progress {
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
    label: [DOWNLOAD_STATE_LABEL[state], part(downloads, episodeCount)].filter(Boolean).join(' '),
    detail: [
      `${Math.round(fraction * 100)}%`,
      estimates.length > 0 && formatLeft(Math.max(...estimates)),
    ]
      .filter(Boolean)
      .join(' · '),
  }
}

const episodes = (n: number) => `${n} ${n === 1 ? 'episode' : 'episodes'}`

/**
 * Where a request stands. Its own status until approved; then, for a show with some of the
 * requested episodes here (`c` from `coverage`), a bar of how many, with what is being fetched
 * for the rest drawn fainter after it; otherwise the download alone, or the plain fact.
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
  const download = progress(r.downloads)
  if (c && covered(c)) return `${episodes(c.owned)} downloaded`
  if (!c?.owned) {
    if (download) return download
    return r.availability === 'available' ? 'In your library' : 'Not downloading yet'
  }
  // A release without episode numbers is a season pack: everything still missing is on its way.
  const coming = r.downloads.some((d) => d.episodes.length === 0)
    ? c.total - c.owned
    : new Set(r.downloads.flatMap((d) => d.episodes.map((e) => `${e.season}/${e.number}`))).size
  return {
    fraction: c.owned / c.total,
    coming: download ? Math.min(coming, c.total - c.owned) / c.total : 0,
    label: `${c.owned} of ${episodes(c.total)} downloaded`,
    detail: download ? `${download.label} · ${download.detail}` : 'Not downloading yet',
  }
}
