import * as stylex from '@stylexjs/stylex'
import { motion as m, useMotionValue, useTransform } from 'motion/react'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { usePlayerContext, usePlayerState } from '../context'
import { formatTime } from '../format'
import { spring } from '../motion'
import { player } from '../tokens.stylex'
import type { Segment, Thumbnail } from '../types'

export interface ScrubberProps {
  segments?: Segment[]
  thumbnailAt?: (time: number) => Thumbnail | null
}

export function Scrubber({ segments, thumbnailAt }: ScrubberProps) {
  const { engine, time, store } = usePlayerContext()
  const duration = usePlayerState((s) => s.duration)
  const buffered = usePlayerState((s) => s.buffered)
  const currentTime = usePlayerState((s) => s.currentTime)
  const scrubbing = usePlayerState((s) => s.scrubbing)
  const root = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const hoverX = useMotionValue(0)

  const progress = useTransform(time, (t) => (duration > 0 ? Math.min(1, t / duration) : 0))
  const fillTransform = useTransform(progress, (p) => `scaleX(${p})`)
  const thumbX = useTransform(progress, (p) => `${p * 100}%`)

  const timeAt = (clientX: number) => {
    const rect = root.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return { t: 0, x: 0 }
    const x = Math.min(rect.width, Math.max(0, clientX - rect.left))
    return { t: (x / rect.width) * duration, x }
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || duration <= 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    store.setState({ scrubbing: true })
    const { t } = timeAt(e.clientX)
    time.set(t)
    store.setState({ currentTime: Math.floor(t) })
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const { t, x } = timeAt(e.clientX)
    hoverX.set(x)
    setHover(t)
    if (store.getState().scrubbing) {
      time.set(t)
      const whole = Math.floor(t)
      if (whole !== store.getState().currentTime) store.setState({ currentTime: whole })
    }
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!store.getState().scrubbing) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    const { t } = timeAt(e.clientX)
    store.setState({ scrubbing: false })
    engine.seek(t)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 30 : 5
    if (e.key === 'ArrowLeft') engine.seekBy(-step)
    else if (e.key === 'ArrowRight') engine.seekBy(step)
    else if (e.key === 'Home') engine.seek(0)
    else if (e.key === 'End') engine.seek(duration)
    else return
    e.preventDefault()
  }

  const preview = hover
  const thumb = preview != null && thumbnailAt ? thumbnailAt(preview) : null
  const hoverSegment =
    preview != null ? segments?.find((s) => preview >= s.start && preview < s.end) : undefined
  const active = scrubbing || preview != null

  return (
    <div
      ref={root}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.floor(duration)}
      aria-valuenow={currentTime}
      aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => setHover(null)}
      onKeyDown={onKeyDown}
      {...stylex.props(styles.root)}
    >
      <div {...stylex.props(styles.track, active && styles.trackActive)}>
        {buffered.map(([start, end]) =>
          duration > 0 ? (
            <div
              key={start}
              {...stylex.props(styles.buffered)}
              style={{
                left: `${(start / duration) * 100}%`,
                width: `${((end - start) / duration) * 100}%`,
              }}
            />
          ) : null,
        )}
        {segments?.map((seg) =>
          duration > 0 ? (
            <div
              key={seg.id}
              {...stylex.props(styles.segment)}
              style={{
                left: `${(seg.start / duration) * 100}%`,
                width: `${((seg.end - seg.start) / duration) * 100}%`,
              }}
            />
          ) : null,
        )}
        <m.div style={{ transform: fillTransform }} {...stylex.props(styles.fill)} />
        {segments?.map((seg) =>
          duration > 0 ? (
            <div
              key={seg.id}
              {...stylex.props(styles.divider)}
              style={{
                left: `${(seg.start / duration) * 100}%`,
                width: `${((seg.end - seg.start) / duration) * 100}%`,
              }}
            />
          ) : null,
        )}
      </div>
      <m.div
        style={{ left: thumbX }}
        {...stylex.props(styles.thumb, active && styles.thumbActive)}
      />
      {preview != null && (
        <m.div
          style={{ x: hoverX }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.snappy}
          {...stylex.props(styles.preview)}
        >
          {thumb && <ThumbnailView thumb={thumb} />}
          <span {...stylex.props(styles.previewTime)}>
            {hoverSegment && (
              <span {...stylex.props(styles.previewName)}>{hoverSegment.name} · </span>
            )}
            {formatTime(preview)}
          </span>
        </m.div>
      )}
    </div>
  )
}

function ThumbnailView({ thumb }: { thumb: Thumbnail }) {
  const ratio = thumb.width / thumb.height
  const height = 96
  const width = Math.round(height * ratio)
  const scale = height / thumb.height
  return (
    <div {...stylex.props(styles.thumbnail)} style={{ width, height }}>
      <img
        src={thumb.src}
        alt=""
        draggable={false}
        {...stylex.props(styles.thumbnailImage)}
        style={{
          transform: `translate(${-thumb.x * scale}px, ${-thumb.y * scale}px) scale(${scale})`,
        }}
      />
    </div>
  )
}

const styles = stylex.create({
  root: {
    position: 'relative',
    height: 20,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    touchAction: 'none',
    outline: 'none',
  },
  track: {
    position: 'relative',
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: player.track,
    overflow: 'hidden',
    transitionProperty: 'height',
    transitionDuration: '140ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
  },
  trackActive: {
    height: 5,
  },
  buffered: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: player.buffered,
  },
  segment: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    boxSizing: 'border-box',
    borderInlineWidth: 2,
    borderInlineStyle: 'solid',
    borderInlineColor: 'rgba(0,0,0,0.85)',
    pointerEvents: 'none',
  },
  fill: {
    position: 'absolute',
    inset: 0,
    backgroundColor: player.accent,
    transformOrigin: 'left center',
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    width: 13,
    height: 13,
    marginTop: -6.5,
    marginLeft: -6.5,
    borderRadius: '50%',
    backgroundColor: player.accent,
    boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
    pointerEvents: 'none',
    scale: 0,
    transitionProperty: 'scale',
    transitionDuration: '140ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
  },
  thumbActive: {
    scale: 1,
  },
  preview: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    marginLeft: 0,
    pointerEvents: 'none',
    translate: '-50% 0',
  },
  previewName: {
    fontWeight: 500,
    opacity: 0.75,
  },
  previewTime: {
    fontSize: 12,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    paddingInline: 8,
    paddingBlock: 3,
    borderRadius: player.radiusSm,
    color: player.text,
    backgroundColor: player.surface,
    backdropFilter: 'blur(12px)',
  },
  thumbnail: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: player.radiusMd,
    backgroundColor: '#000',
    boxShadow: player.shadow,
    outlineWidth: 1,
    outlineStyle: 'solid',
    outlineColor: player.border,
    outlineOffset: -1,
  },
  thumbnailImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    transformOrigin: 'top left',
    maxWidth: 'none',
  },
})
