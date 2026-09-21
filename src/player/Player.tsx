import * as stylex from '@stylexjs/stylex'
import { useMotionValue } from 'motion/react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { PlayerContext, type PlayerContextValue } from './context'
import { Controls } from './controls/Controls'
import { CenterFlash, EndedOverlay, ErrorOverlay, Spinner } from './controls/Overlays'
import { SegmentAction } from './controls/SegmentAction'
import { TopBar } from './controls/TopBar'
import { PlayerEngine } from './engine'
import {
  toggleFullscreen,
  togglePlayback,
  useControlsVisibility,
  useFullscreenState,
  useKeyboard,
  useSegments,
} from './hooks'
import { createPlayerStore, usePlayerPrefs, type PlayerStore } from './store'
import { Subtitles } from './subtitles/Subtitles'
import { player } from './tokens.stylex'
import type {
  NextItem,
  PlaybackSnapshot,
  PlayerSource,
  ProgressReason,
  Segment,
  Thumbnail,
} from './types'

export interface PlayerProps {
  source: PlayerSource
  title?: ReactNode
  subtitle?: ReactNode
  segments?: Segment[]
  next?: NextItem | null
  /** Preview frame for a playhead position, used by the scrubber tooltip. */
  thumbnailAt?: (time: number) => Thumbnail | null
  /** Seconds between `onProgress` ticks while playing. */
  progressInterval?: number
  onBack?: () => void
  onNext?: () => void
  onAudioChange?: (id: string, snapshot: PlaybackSnapshot) => void
  /** Called with `null` when subtitles are turned off. */
  onSubtitleChange?: (id: string | null, snapshot: PlaybackSnapshot) => void
  onQualityChange?: (id: string, snapshot: PlaybackSnapshot) => void
  onProgress?: (snapshot: PlaybackSnapshot, reason: ProgressReason) => void
  onEnded?: () => void
  onError?: (message: string) => void
  /** Extra StyleX styles for the outer element (theme overrides, sizing). */
  style?: stylex.StyleXStyles
}

export function Player({
  source,
  title,
  subtitle,
  segments,
  next,
  thumbnailAt,
  progressInterval = 10,
  onBack,
  onNext,
  onAudioChange,
  onSubtitleChange,
  onQualityChange,
  onProgress,
  onEnded,
  onError,
  style,
}: PlayerProps) {
  const container = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const time = useMotionValue(source.startTime ?? 0)
  const [store] = useState<PlayerStore>(() => {
    const prefs = usePlayerPrefs.getState()
    return createPlayerStore({ volume: prefs.volume, muted: prefs.muted, rate: prefs.rate })
  })
  const [engine] = useState(() => new PlayerEngine(store, time, progressInterval))

  useEffect(() => {
    engine.setCallbacks({ onProgress, onEnded, onError })
  }, [engine, onProgress, onEnded, onError])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    engine.attach(video)
    container.current?.focus({ preventScroll: true })
    return () => engine.destroy()
  }, [engine])

  // Only a new media URL reloads the element; track/metadata changes are adopted in place.
  const sourceRef = useRef(source)
  useEffect(() => {
    sourceRef.current = source
    engine.updateSource(source)
  }, [engine, source])
  useEffect(() => {
    void engine.load(sourceRef.current)
    return () => engine.unload()
  }, [engine, source.id, source.url])

  // Persist volume/mute/rate as they change.
  useEffect(
    () =>
      store.subscribe((s, prev) => {
        if (s.volume !== prev.volume || s.muted !== prev.muted || s.rate !== prev.rate) {
          usePlayerPrefs.getState().set({ volume: s.volume, muted: s.muted, rate: s.rate })
        }
      }),
    [store],
  )

  useFullscreenState(container, store)
  useSegments(store, segments)
  const { handlers, hidden } = useControlsVisibility(store)
  const onKeyDown = useKeyboard(engine, store, container, {
    onBack,
    onNext: next ? onNext : undefined,
  })

  const ctx = useMemo<PlayerContextValue>(
    () => ({ store, engine, time, source, container }),
    [store, engine, time, source],
  )

  return (
    <PlayerContext.Provider value={ctx}>
      <div
        ref={container}
        tabIndex={0}
        role="region"
        aria-label="Video player"
        onKeyDown={onKeyDown}
        {...handlers}
        {...stylex.props(styles.root, hidden && styles.idle, style)}
      >
        <div {...stylex.props(styles.stage)}>
          <video
            ref={videoRef}
            playsInline
            preload="auto"
            onClick={() => togglePlayback(engine, store)}
            onDoubleClick={() => toggleFullscreen(container.current)}
            {...stylex.props(styles.video)}
          />
          <Subtitles />
          <CenterFlash />
          <Spinner />
          <TopBar title={title} subtitle={subtitle} onBack={onBack} />
          <Controls
            segments={segments}
            next={next}
            onNext={onNext}
            thumbnailAt={thumbnailAt}
            onAudioChange={(id) => onAudioChange?.(id, engine.snapshot())}
            onSubtitleChange={(id) => onSubtitleChange?.(id, engine.snapshot())}
            onQualityChange={(id) => onQualityChange?.(id, engine.snapshot())}
          />
          <SegmentAction segments={segments} next={next} onNext={onNext} />
          <EndedOverlay next={next} onNext={onNext} onBack={onBack} />
          <ErrorOverlay onBack={onBack} />
        </div>
      </div>
    </PlayerContext.Provider>
  )
}

const styles = stylex.create({
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    color: player.text,
    fontFamily: player.font,
    overflow: 'hidden',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    outline: 'none',
  },
  idle: {
    cursor: 'none',
  },
  stage: {
    position: 'absolute',
    inset: 0,
  },
  video: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: '#000',
  },
})
