import * as stylex from '@stylexjs/stylex'
import { animate, motion as m, type AnimationPlaybackControls } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { backdropImage, logoImage } from '@/lib/images'
import { springs } from '@/lib/motion'
import { focus } from '@/theme/focus'
import { colors, radii, space } from '@/theme/tokens.stylex'
import { Hero } from './Hero'

export interface HeroSlide {
  item: BaseItemDto
  eyebrow: string
}

/** Seconds each slide stays before advancing. */
const DWELL = 8

/**
 * Rotates the home hero through `slides`. The active dot fills over the dwell time and that
 * fill *is* the timer, so pausing (hover, focus) and restarting (selecting a dot) stay in sync.
 */
export function HeroCarousel({ slides }: { slides: readonly HeroSlide[] }) {
  const [selected, setSelected] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const index = selected < slides.length ? selected : 0
  const slide = slides[index]
  const count = slides.length

  const fill = useRef<HTMLSpanElement>(null)
  const timer = useRef<AnimationPlaybackControls | null>(null)

  useEffect(() => {
    const el = fill.current
    if (!el || count < 2) return
    let live = true
    const controls = animate(el, { scaleX: [0, 1] }, { duration: DWELL, ease: 'linear' })
    timer.current = controls
    controls.then(() => live && setSelected((index + 1) % count))
    return () => {
      live = false
      controls.stop()
    }
  }, [index, count])

  const paused = hovered || focused
  useEffect(() => {
    if (paused) timer.current?.pause()
    else timer.current?.play()
  }, [paused, index])

  useEffect(() => {
    const next = slides[(index + 1) % count]?.item
    if (!next) return
    for (const url of [backdropImage(next, 1920)?.url, logoImage(next, 800)]) {
      if (url) new Image().src = url
    }
  }, [slides, index, count])

  if (!slide) return null
  return (
    <div
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => setFocused(e.currentTarget.contains(e.relatedTarget))}
    >
      <Hero item={slide.item} eyebrow={slide.eyebrow}>
        {count > 1 && (
          <div role="group" aria-label="Featured" {...stylex.props(styles.dots)}>
            {slides.map((s, i) => {
              const active = i === index
              return (
                <button
                  key={s.item.Id}
                  type="button"
                  aria-label={s.item.SeriesName ?? s.item.Name ?? ''}
                  aria-current={active || undefined}
                  onClick={() => setSelected(i)}
                  {...stylex.props(focus.ring, styles.dot)}
                >
                  <m.span
                    animate={{ width: active ? 24 : 6 }}
                    transition={springs.snappy}
                    {...stylex.props(styles.pill)}
                  >
                    {active && <span ref={fill} {...stylex.props(styles.fill)} />}
                  </m.span>
                </button>
              )
            })}
          </div>
        )}
      </Hero>
    </div>
  )
}

const styles = stylex.create({
  dots: {
    display: 'flex',
    alignItems: 'center',
  },
  dot: {
    display: 'grid',
    placeItems: 'center',
    height: 24,
    paddingInline: space.xs,
    cursor: 'pointer',
    borderRadius: radii.full,
  },
  pill: {
    display: 'block',
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.heroBorder,
    overflow: 'hidden',
  },
  fill: {
    display: 'block',
    height: '100%',
    backgroundColor: colors.heroText,
    transformOrigin: 'left',
    transform: 'scaleX(0)',
  },
})
