import { create, createStore, type StoreApi } from 'zustand'
import { persist } from 'zustand/middleware'

export type PlayerStatus = 'idle' | 'loading' | 'ready' | 'ended' | 'error'
export type PlayerMenu = 'audio' | 'subtitles' | 'settings' | null
export type FlashKind = 'play' | 'pause' | 'back' | 'forward' | 'volume' | 'muted'
export interface Flash {
  id: number
  kind: FlashKind
  text?: string
}

export interface PlayerState {
  status: PlayerStatus
  error: string | null
  paused: boolean
  /** Stalled waiting for data while the user expects playback. */
  waiting: boolean
  seeking: boolean
  duration: number
  /** Coarse playhead (whole seconds); the scrubber reads the MotionValue instead. */
  currentTime: number
  buffered: ReadonlyArray<readonly [number, number]>
  volume: number
  muted: boolean
  rate: number
  fullscreen: boolean
  pip: boolean
  controlsVisible: boolean
  hoveringControls: boolean
  menu: PlayerMenu
  scrubbing: boolean
  audioTrackId: string | null
  subtitleTrackId: string | null
  /** Segment currently offering an action (skip intro, next episode), if any. */
  activeSegmentId: string | null
  /** Transient center feedback for keyboard/tap actions. */
  flash: Flash | null
}

let flashId = 0
export function flash(store: PlayerStore, kind: FlashKind, text?: string) {
  store.setState({ flash: { id: ++flashId, kind, text } })
}

export type PlayerStore = StoreApi<PlayerState>

export function createPlayerStore(initial: Partial<PlayerState> = {}): PlayerStore {
  return createStore<PlayerState>(() => ({
    status: 'idle',
    error: null,
    paused: true,
    waiting: false,
    seeking: false,
    duration: 0,
    currentTime: 0,
    buffered: [],
    volume: 1,
    muted: false,
    rate: 1,
    fullscreen: false,
    pip: false,
    controlsVisible: true,
    hoveringControls: false,
    menu: null,
    scrubbing: false,
    audioTrackId: null,
    subtitleTrackId: null,
    activeSegmentId: null,
    flash: null,
    ...initial,
  }))
}

export interface PlayerPrefs {
  volume: number
  muted: boolean
  rate: number
  audioLanguage: string | null
  subtitleLanguage: string | null
  subtitlesEnabled: boolean
  autoplayNext: boolean
  subtitleScale: number
  set: (patch: Partial<Omit<PlayerPrefs, 'set'>>) => void
}

export const usePlayerPrefs = create<PlayerPrefs>()(
  persist(
    (set) => ({
      volume: 1,
      muted: false,
      rate: 1,
      audioLanguage: null,
      subtitleLanguage: null,
      subtitlesEnabled: true,
      autoplayNext: true,
      subtitleScale: 1,
      set: (patch) => set(patch),
    }),
    {
      name: 'player.prefs',
      partialize: ({ set: _set, ...rest }) => rest,
    },
  ),
)
