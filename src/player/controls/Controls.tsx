import * as stylex from '@stylexjs/stylex'
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  CornersIn,
  CornersOut,
  Pause,
  PictureInPicture,
  Play,
  SkipForward,
  SlidersHorizontal,
  Subtitles,
  Waveform,
} from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { usePlayerContext, usePlayerState } from '../context'
import { formatTime } from '../format'
import { toggleFullscreen } from '../hooks'
import { spring } from '../motion'
import { usePlayerPrefs } from '../store'
import { player } from '../tokens.stylex'
import type { NextItem, Segment, Thumbnail } from '../types'
import { ControlButton } from './ControlButton'
import { NONE_KEY, OptionSection, PlayerMenuList, PlayerMenuTrigger, ToggleSection } from './Menus'
import { Scrubber } from './Scrubber'
import { VolumeControl } from './VolumeControl'

export interface ControlsProps {
  segments?: Segment[]
  next?: NextItem | null
  thumbnailAt?: (time: number) => Thumbnail | null
  onNext?: () => void
  onAudioChange?: (id: string) => void
  onSubtitleChange?: (id: string | null) => void
  onQualityChange?: (id: string) => void
}

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const SUBTITLE_SIZES = [
  { id: '0.85', label: 'Small' },
  { id: '1', label: 'Default' },
  { id: '1.25', label: 'Large' },
]

export function Controls({
  segments,
  next,
  thumbnailAt,
  onNext,
  onAudioChange,
  onSubtitleChange,
  onQualityChange,
}: ControlsProps) {
  const { engine, store, source, container } = usePlayerContext()
  const visible = usePlayerState((s) => s.controlsVisible)
  const paused = usePlayerState((s) => s.paused)
  const currentTime = usePlayerState((s) => s.currentTime)
  const duration = usePlayerState((s) => s.duration)
  const fullscreen = usePlayerState((s) => s.fullscreen)
  const pip = usePlayerState((s) => s.pip)
  const rate = usePlayerState((s) => s.rate)
  const audioTrackId = usePlayerState((s) => s.audioTrackId)
  const subtitleTrackId = usePlayerState((s) => s.subtitleTrackId)
  const prefs = usePlayerPrefs()

  const pipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document
  const hasHours = duration >= 3600

  return (
    <m.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 16 }}
      transition={spring.gentle}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
      onPointerEnter={() => store.setState({ hoveringControls: true })}
      onPointerLeave={() => store.setState({ hoveringControls: false })}
      {...stylex.props(styles.bar)}
    >
      <Scrubber segments={segments} thumbnailAt={thumbnailAt} />
      <div {...stylex.props(styles.row)}>
        <div {...stylex.props(styles.group)}>
          <ControlButton
            label={paused ? 'Play' : 'Pause'}
            shortcut="Space"
            size="lg"
            onPress={() => engine.toggle()}
          >
            <PlayPauseIcon paused={paused} />
          </ControlButton>
          <div {...stylex.props(styles.wideOnly)}>
            <ControlButton label="Back 10 seconds" shortcut="J" onPress={() => engine.seekBy(-10)}>
              <ArrowCounterClockwise size={20} />
            </ControlButton>
            <ControlButton
              label="Forward 10 seconds"
              shortcut="L"
              onPress={() => engine.seekBy(10)}
            >
              <ArrowClockwise size={20} />
            </ControlButton>
          </div>
          {next && onNext && (
            <ControlButton label={`Next: ${next.title}`} shortcut="⇧N" onPress={onNext}>
              <SkipForward size={20} weight="fill" />
            </ControlButton>
          )}
          <div {...stylex.props(styles.wideOnly)}>
            <VolumeControl />
          </div>
          <div {...stylex.props(styles.time)}>
            <span>{formatTime(currentTime, hasHours)}</span>
            <span {...stylex.props(styles.timeSep)}>/</span>
            <span {...stylex.props(styles.timeTotal)}>{formatTime(duration, hasHours)}</span>
          </div>
        </div>

        <div {...stylex.props(styles.group)}>
          {source.audioTracks.length > 1 && (
            <PlayerMenuTrigger
              id="audio"
              menu={
                <PlayerMenuList label="Audio">
                  <OptionSection
                    title="Audio"
                    options={source.audioTracks.map((t) => ({ id: t.id, label: t.label }))}
                    selected={audioTrackId}
                    onSelect={(id) => onAudioChange?.(id)}
                  />
                </PlayerMenuList>
              }
            >
              <ControlButton label="Audio">
                <Waveform size={22} />
              </ControlButton>
            </PlayerMenuTrigger>
          )}
          {source.subtitleTracks.length > 0 && (
            <PlayerMenuTrigger
              id="subtitles"
              menu={
                <PlayerMenuList label="Subtitles">
                  <OptionSection
                    title="Subtitles"
                    none="Off"
                    options={source.subtitleTracks.map((t) => ({ id: t.id, label: t.label }))}
                    selected={subtitleTrackId}
                    onSelect={(id) => onSubtitleChange?.(id === NONE_KEY ? null : id)}
                  />
                  <OptionSection
                    title="Size"
                    options={SUBTITLE_SIZES}
                    selected={String(prefs.subtitleScale)}
                    onSelect={(id) => prefs.set({ subtitleScale: Number(id) })}
                  />
                </PlayerMenuList>
              }
            >
              <ControlButton label="Subtitles" shortcut="C" active={subtitleTrackId !== null}>
                <Subtitles size={22} />
              </ControlButton>
            </PlayerMenuTrigger>
          )}
          <PlayerMenuTrigger
            id="settings"
            menu={
              <PlayerMenuList label="Settings">
                <OptionSection
                  title="Speed"
                  options={RATES.map((r) => ({
                    id: String(r),
                    label: r === 1 ? 'Normal' : `${r}×`,
                  }))}
                  selected={String(rate)}
                  onSelect={(id) => engine.setRate(Number(id))}
                />
                {source.qualityOptions && source.qualityOptions.length > 1 && (
                  <OptionSection
                    title="Quality"
                    options={source.qualityOptions}
                    selected={source.qualityId ?? null}
                    onSelect={(id) => onQualityChange?.(id)}
                  />
                )}
                {next && (
                  <ToggleSection
                    label="Autoplay next episode"
                    checked={prefs.autoplayNext}
                    onChange={(autoplayNext) => prefs.set({ autoplayNext })}
                  />
                )}
                {source.deliveryLabel && (
                  <div {...stylex.props(styles.delivery)}>{source.deliveryLabel}</div>
                )}
              </PlayerMenuList>
            }
          >
            <ControlButton label="Settings" active={rate !== 1}>
              <SlidersHorizontal size={22} />
            </ControlButton>
          </PlayerMenuTrigger>
          {pipSupported && (
            <div {...stylex.props(styles.wideOnly)}>
              <ControlButton
                label={pip ? 'Exit picture in picture' : 'Picture in picture'}
                onPress={() => {
                  const video = engine.video
                  if (!video) return
                  if (document.pictureInPictureElement) void document.exitPictureInPicture()
                  else void video.requestPictureInPicture().catch(() => undefined)
                }}
              >
                <PictureInPicture size={20} />
              </ControlButton>
            </div>
          )}
          <ControlButton
            label={fullscreen ? 'Exit full screen' : 'Full screen'}
            shortcut="F"
            onPress={() => toggleFullscreen(container.current)}
          >
            {fullscreen ? <CornersIn size={22} /> : <CornersOut size={22} />}
          </ControlButton>
        </div>
      </div>
    </m.div>
  )
}

function PlayPauseIcon({ paused }: { paused: boolean }) {
  return (
    <span {...stylex.props(styles.playIcon)}>
      <m.span
        initial={false}
        animate={{ opacity: paused ? 1 : 0, scale: paused ? 1 : 0.6 }}
        transition={spring.snappy}
        {...stylex.props(styles.playLayer)}
      >
        <Play size={26} weight="fill" />
      </m.span>
      <m.span
        initial={false}
        animate={{ opacity: paused ? 0 : 1, scale: paused ? 0.6 : 1 }}
        transition={spring.snappy}
        {...stylex.props(styles.playLayer)}
      >
        <Pause size={26} weight="fill" />
      </m.span>
    </span>
  )
}

const styles = stylex.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    paddingInline: 20,
    paddingBottom: 12,
    paddingTop: 80,
    backgroundImage: player.scrimBottom,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
  },
  wideOnly: {
    display: { default: 'contents', '@media (max-width: 600px)': 'none' },
  },
  time: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 5,
    marginLeft: 10,
    fontSize: 13,
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
    color: player.text,
    whiteSpace: 'nowrap',
  },
  timeSep: {
    color: player.textFaint,
  },
  timeTotal: {
    color: player.textMuted,
  },
  delivery: {
    paddingInline: 14,
    paddingBlock: 10,
    fontSize: 12,
    color: player.textFaint,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: player.border,
  },
  playIcon: {
    position: 'relative',
    display: 'grid',
    width: 26,
    height: 26,
  },
  playLayer: {
    gridArea: '1 / 1',
    display: 'grid',
    placeItems: 'center',
  },
})
