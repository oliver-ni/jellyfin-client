import { SkipForward, X } from '@phosphor-icons/react'
import * as stylex from '@stylexjs/stylex'
import { animate, AnimatePresence, motion as m } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Button } from 'react-aria-components'
import { usePlayerContext, usePlayerState } from '../context'
import { spring } from '../motion'
import { usePlayerPrefs } from '../store'
import { player } from '../tokens.stylex'
import type { NextItem, Segment } from '../types'

export interface SegmentActionProps {
  segments?: Segment[]
  next?: NextItem | null
  onNext?: () => void
}

const COUNTDOWN_S = 8
/** Offset above the bottom edge: clear of the control bar's scrubber when it is shown. */
const LIFT = { raised: -100, idle: -28 }

/**
 * Bottom-right prompt while the playhead is inside a segment: "Skip intro" seeks past it;
 * "Next episode" names what's up next and autoplays after a short countdown.
 */
export function SegmentAction({ segments, next, onNext }: SegmentActionProps) {
  const { engine, store } = usePlayerContext()
  const activeId = usePlayerState((s) => s.activeSegmentId)
  const controlsVisible = usePlayerState((s) => s.controlsVisible)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const found = segments?.find((s) => s.id === activeId) ?? null
  const segment = found && dismissed !== found.id ? found : null

  return (
    <AnimatePresence>
      {segment?.action === 'skip' && (
        <m.div
          key={segment.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: controlsVisible ? LIFT.raised : LIFT.idle }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.14 } }}
          transition={spring.gentle}
          {...stylex.props(styles.anchor)}
        >
          <Button
            {...stylex.props(styles.action)}
            onPress={() => {
              engine.seek(segment.end)
              store.setState({ activeSegmentId: null })
            }}
          >
            {segment.label}
            <SkipForward size={14} weight="fill" />
          </Button>
        </m.div>
      )}
      {segment?.action === 'next' && next && onNext && (
        <NextUp
          key={`next-${segment.id}`}
          next={next}
          raised={controlsVisible}
          onNext={onNext}
          onDismiss={() => setDismissed(segment.id)}
        />
      )}
    </AnimatePresence>
  )
}

interface NextUpProps {
  next: NextItem
  raised: boolean
  onNext: () => void
  onDismiss: () => void
}

function NextUp({ next, raised, onNext, onDismiss }: NextUpProps) {
  const autoplay = usePlayerPrefs((p) => p.autoplayNext)
  const fill = useRef<HTMLSpanElement>(null)

  // The button's fill is the countdown; when it completes, the next episode starts.
  useEffect(() => {
    const el = fill.current
    if (!el || !autoplay) return
    let live = true
    const controls = animate(el, { scaleX: [0, 1] }, { duration: COUNTDOWN_S, ease: 'linear' })
    controls.then(() => live && onNext())
    return () => {
      live = false
      controls.stop()
    }
  }, [autoplay, onNext])

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: raised ? LIFT.raised : LIFT.idle }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.14 } }}
      transition={spring.gentle}
      {...stylex.props(styles.anchor, styles.nextRow)}
    >
      <div {...stylex.props(styles.nextText)}>
        <span {...stylex.props(styles.nextKicker)}>Up next</span>
        <span {...stylex.props(styles.nextTitle)}>
          {next.subtitle && <span {...stylex.props(styles.nextSub)}>{next.subtitle} · </span>}
          {next.title}
        </span>
      </div>
      <Button {...stylex.props(styles.action)} onPress={onNext}>
        {autoplay && <span ref={fill} {...stylex.props(styles.countdown)} />}
        <span {...stylex.props(styles.actionLabel)}>Next episode</span>
        <SkipForward size={14} weight="fill" {...stylex.props(styles.actionLabel)} />
      </Button>
      <Button {...stylex.props(styles.dismiss)} onPress={onDismiss} aria-label="Dismiss">
        <X size={14} weight="bold" />
      </Button>
    </m.div>
  )
}

const styles = stylex.create({
  anchor: {
    position: 'absolute',
    right: 24,
    bottom: 0,
    zIndex: 2,
  },
  action: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingInline: 14,
    fontFamily: player.font,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.01em',
    color: player.accentText,
    backgroundColor: player.accent,
    borderWidth: 0,
    borderRadius: player.radiusSm,
    boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
    overflow: 'hidden',
    cursor: 'pointer',
    outlineStyle: { default: 'none', '[data-focus-visible]': 'solid' },
    outlineWidth: 2,
    outlineColor: player.focusRing,
    outlineOffset: 2,
    scale: { default: 1, '[data-hovered]': 1.02, '[data-pressed]': 0.98 },
    transitionProperty: 'scale',
    transitionDuration: '160ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
  },
  actionLabel: {
    position: 'relative',
    zIndex: 1,
  },
  countdown: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.14)',
    transformOrigin: 'left center',
    transform: 'scaleX(0)',
  },
  nextRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    maxWidth: 'calc(100vw - 48px)',
  },
  nextText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 1,
    minWidth: 0,
    textAlign: 'right',
    textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.5)',
  },
  nextKicker: {
    fontSize: 12,
    fontWeight: 500,
    color: player.textFaint,
  },
  nextTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: player.text,
    maxWidth: 360,
    textWrap: 'balance',
  },
  nextSub: {
    fontWeight: 500,
    color: player.textMuted,
  },
  dismiss: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    color: { default: player.textMuted, '[data-hovered]': player.text },
    backgroundColor: { default: 'transparent', '[data-hovered]': player.control },
    borderWidth: 0,
    borderRadius: '50%',
    cursor: 'pointer',
    outlineStyle: { default: 'none', '[data-focus-visible]': 'solid' },
    outlineWidth: 2,
    outlineColor: player.focusRing,
    outlineOffset: 2,
    transitionProperty: 'background-color, color',
    transitionDuration: '120ms',
  },
})
