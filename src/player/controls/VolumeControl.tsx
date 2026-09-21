import * as stylex from '@stylexjs/stylex'
import { SpeakerHigh, SpeakerLow, SpeakerX } from '@phosphor-icons/react'
import { useState } from 'react'
import { Slider, SliderThumb, SliderTrack } from 'react-aria-components'
import { usePlayerEngine, usePlayerState } from '../context'
import { player } from '../tokens.stylex'
import { ControlButton } from './ControlButton'

export function VolumeControl() {
  const engine = usePlayerEngine()
  const volume = usePlayerState((s) => s.volume)
  const muted = usePlayerState((s) => s.muted)
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const effective = muted ? 0 : volume
  const Icon = effective === 0 ? SpeakerX : effective < 0.5 ? SpeakerLow : SpeakerHigh
  const expanded = open || focused

  return (
    <div
      {...stylex.props(styles.root)}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onWheel={(e) => {
        e.preventDefault()
        engine.setVolume(volume + (e.deltaY < 0 ? 0.05 : -0.05))
      }}
    >
      <ControlButton
        label={muted ? 'Unmute' : 'Mute'}
        shortcut="M"
        onPress={() => engine.toggleMuted()}
      >
        <Icon size={22} />
      </ControlButton>
      <div {...stylex.props(styles.sliderWrap, expanded && styles.sliderOpen)}>
        <Slider
          aria-label="Volume"
          value={Math.round(effective * 100)}
          minValue={0}
          maxValue={100}
          step={1}
          onChange={(v) => engine.setVolume((Array.isArray(v) ? v[0] : v) / 100)}
          {...stylex.props(styles.slider)}
        >
          <SliderTrack {...stylex.props(styles.track)}>
            {({ state }) => (
              <>
                <div
                  {...stylex.props(styles.fill)}
                  style={{ width: `${state.getThumbPercent(0) * 100}%` }}
                />
                <SliderThumb {...stylex.props(styles.thumb)} />
              </>
            )}
          </SliderTrack>
        </Slider>
      </div>
    </div>
  )
}

const styles = stylex.create({
  root: {
    display: 'flex',
    alignItems: 'center',
  },
  sliderWrap: {
    width: 0,
    overflow: 'hidden',
    opacity: 0,
    transitionProperty: 'width, opacity',
    transitionDuration: '200ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
  },
  sliderOpen: {
    width: 96,
    opacity: 1,
  },
  slider: {
    display: 'flex',
    alignItems: 'center',
    width: 80,
    height: 40,
    marginInline: 8,
    touchAction: 'none',
  },
  track: {
    position: 'relative',
    width: '100%',
    height: 20,
    display: 'flex',
    alignItems: 'center',
    '::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      right: 0,
      height: 3,
      borderRadius: 2,
      backgroundColor: player.track,
    },
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: player.accent,
  },
  thumb: {
    top: '50%',
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: player.accent,
    boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
    outlineStyle: { default: 'none', '[data-focus-visible]': 'solid' },
    outlineWidth: 2,
    outlineColor: player.focusRing,
    outlineOffset: 2,
    transitionProperty: 'scale',
    transitionDuration: '120ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
    scale: { default: 1, '[data-dragging]': 1.15 },
  },
})
