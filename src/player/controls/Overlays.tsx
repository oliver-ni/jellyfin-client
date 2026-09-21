import * as stylex from '@stylexjs/stylex'
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  Pause,
  PictureInPicture,
  Play,
  SkipForward,
  SpeakerHigh,
  SpeakerX,
  Warning,
} from '@phosphor-icons/react'
import { AnimatePresence, motion as m } from 'motion/react'
import { useEffect, useState } from 'react'
import { Button } from 'react-aria-components'
import { usePlayerEngine, usePlayerState } from '../context'
import { spring } from '../motion'
import type { Flash } from '../store'
import { player } from '../tokens.stylex'
import type { NextItem } from '../types'

const FLASH_ICONS = {
  play: Play,
  pause: Pause,
  back: ArrowCounterClockwise,
  forward: ArrowClockwise,
  volume: SpeakerHigh,
  muted: SpeakerX,
} as const

/** Brief center pulse mirroring keyboard/tap actions (YouTube-style). */
export function CenterFlash() {
  const flash = usePlayerState((s) => s.flash)
  const [expiredId, setExpiredId] = useState(0)

  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(() => setExpiredId(flash.id), 500)
    return () => window.clearTimeout(id)
  }, [flash])

  const shown: Flash | null = flash && flash.id !== expiredId ? flash : null
  const Icon = shown ? FLASH_ICONS[shown.kind] : null
  return (
    <div {...stylex.props(styles.center)}>
      <AnimatePresence>
        {shown && Icon && (
          <m.div
            key={shown.id}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.25, transition: { duration: 0.3 } }}
            transition={spring.snappy}
            {...stylex.props(styles.flash)}
          >
            <Icon
              size={28}
              weight={shown.kind === 'play' || shown.kind === 'pause' ? 'fill' : 'regular'}
            />
            {shown.text && <span {...stylex.props(styles.flashText)}>{shown.text}</span>}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Spinner() {
  const waiting = usePlayerState((s) => s.waiting || s.status === 'loading')
  const paused = usePlayerState((s) => s.paused)
  const status = usePlayerState((s) => s.status)
  const show = status === 'loading' || (waiting && !paused)

  return (
    <div {...stylex.props(styles.center)}>
      <AnimatePresence>{show && <DelayedSpinner key="spinner" />}</AnimatePresence>
    </div>
  )
}

/** Mounts the ring only after a short delay so brief rebuffers don't flicker. */
function DelayedSpinner() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 350)
    return () => window.clearTimeout(id)
  }, [])
  if (!ready) return null
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.14 } }}
      transition={spring.snappy}
      {...stylex.props(styles.spinner)}
    />
  )
}

export interface EndedOverlayProps {
  next?: NextItem | null
  onNext?: () => void
  onBack?: () => void
}

export function EndedOverlay({ next, onNext, onBack }: EndedOverlayProps) {
  const engine = usePlayerEngine()
  const ended = usePlayerState((s) => s.status === 'ended')
  return (
    <AnimatePresence>
      {ended && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.14 } }}
          transition={spring.gentle}
          {...stylex.props(styles.sheet)}
        >
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.gentle, delay: 0.05 }}
            {...stylex.props(styles.endedActions)}
          >
            {next && onNext ? (
              <Button {...stylex.props(styles.bigButton, styles.bigPrimary)} onPress={onNext}>
                <SkipForward size={20} weight="fill" />
                <span>
                  <span {...stylex.props(styles.bigKicker)}>Up next</span>
                  {next.title}
                </span>
              </Button>
            ) : null}
            <Button {...stylex.props(styles.bigButton)} onPress={() => engine.play()}>
              <ArrowCounterClockwise size={20} />
              Replay
            </Button>
            {onBack && (
              <Button {...stylex.props(styles.bigButton)} onPress={onBack}>
                Back
              </Button>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

/** Covers the browser's own "playing picture-in-picture" placeholder with ours. */
export function PipOverlay() {
  const pip = usePlayerState((s) => s.pip)
  return (
    <AnimatePresence>
      {pip && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.14 } }}
          transition={spring.gentle}
          {...stylex.props(styles.sheet, styles.pipSheet)}
        >
          <div {...stylex.props(styles.card)}>
            <PictureInPicture size={28} />
            <p {...stylex.props(styles.cardText)}>Playing in picture in picture</p>
            <Button
              {...stylex.props(styles.bigButton)}
              onPress={() => void document.exitPictureInPicture()}
            >
              Bring back
            </Button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

export function ErrorOverlay({ onBack }: { onBack?: () => void }) {
  const error = usePlayerState((s) => (s.status === 'error' ? s.error : null))
  return (
    <AnimatePresence>
      {error && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={spring.gentle}
          {...stylex.props(styles.sheet)}
        >
          <div {...stylex.props(styles.card)}>
            <Warning size={28} />
            <p {...stylex.props(styles.cardText)}>{error}</p>
            {onBack && (
              <Button {...stylex.props(styles.bigButton)} onPress={onBack}>
                Back
              </Button>
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

const styles = stylex.create({
  center: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    pointerEvents: 'none',
  },
  flash: {
    gridArea: '1 / 1',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingInline: 22,
    paddingBlock: 18,
    borderRadius: 999,
    color: player.text,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'blur(8px)',
  },
  flashText: {
    fontSize: 16,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  spinner: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    borderWidth: 3,
    borderStyle: 'solid',
    borderColor: player.track,
    borderTopColor: player.accent,
    animationName: stylex.keyframes({
      from: { transform: 'rotate(0deg)' },
      to: { transform: 'rotate(360deg)' },
    }),
    animationDuration: '0.8s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
  sheet: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 3,
  },
  pipSheet: {
    backgroundColor: '#000',
    zIndex: 0,
  },
  endedActions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  bigButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    paddingInline: 20,
    paddingBlock: 14,
    fontSize: 15,
    fontWeight: 600,
    textAlign: 'left',
    color: player.text,
    backgroundColor: { default: player.control, '[data-hovered]': player.controlHover },
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: player.controlBorder,
    borderRadius: player.radiusMd,
    cursor: 'pointer',
    outlineStyle: { default: 'none', '[data-focus-visible]': 'solid' },
    outlineWidth: 2,
    outlineColor: player.focusRing,
    outlineOffset: 2,
    scale: { default: 1, '[data-pressed]': 0.97 },
    transitionProperty: 'background-color, scale',
    transitionDuration: '140ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
  },
  bigPrimary: {
    color: player.accentText,
    backgroundColor: { default: player.accent, '[data-hovered]': player.accent },
    borderColor: 'transparent',
  },
  bigKicker: {
    display: 'block',
    fontSize: 14,
    fontWeight: 500,
    opacity: 0.7,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    maxWidth: 420,
    padding: 32,
    textAlign: 'center',
    color: player.text,
  },
  cardText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.5,
    color: player.textMuted,
  },
})
