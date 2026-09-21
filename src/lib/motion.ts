import { animate, type MotionValue, type Transition, type Variants } from 'motion/react'

/** Spring presets. Retargeting mid-flight blends rather than restarting. */
export const springs = {
  /** Hover/press feedback, toggles. */
  snappy: { type: 'spring', stiffness: 700, damping: 40, mass: 0.8 } satisfies Transition,
  /** Content reveals, tab indicators. */
  gentle: { type: 'spring', stiffness: 260, damping: 32, mass: 1 } satisfies Transition,
  /** Shared-element morphs between routes. */
  morph: { type: 'spring', stiffness: 240, damping: 32, mass: 1 } satisfies Transition,
  /** Overshooting pop for state flips (favorite, watched). */
  bouncy: { type: 'spring', stiffness: 520, damping: 16, mass: 0.9 } satisfies Transition,
} as const

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: springs.gentle },
}

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35, ease: [0.2, 0, 0, 1] } },
}

export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: springs.gentle },
}

export const stagger = (delayChildren = 0.04, start = 0): Variants => ({
  hidden: {},
  show: { transition: { delayChildren: start, staggerChildren: delayChildren } },
})

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Handoff from a clicked card to the detail hero it navigates to. Rects are viewport
 * coordinates: the hero measures itself the same way, so the morph is independent of the
 * scroll reset that happens between routes.
 */
export interface MorphSource {
  itemId: string
  shape: 'poster' | 'landscape'
  rect: Rect
  /** Image the card was showing, used as an instant placeholder while hi-res loads. */
  src: string | null
}

let pending: MorphSource | null = null

export function setMorphSource(source: MorphSource) {
  pending = source
}

export function takeMorphSource(itemId: string): MorphSource | null {
  if (pending?.itemId !== itemId) return null
  const s = pending
  pending = null
  return s
}

export interface MorphValues {
  x: MotionValue<number>
  y: MotionValue<number>
  scaleX: MotionValue<number>
  scaleY: MotionValue<number>
}

/** Snap `values` so `to` visually sits at `from`, then spring them home. Origin is top-left. */
export function playMorph(values: MorphValues, from: Rect, to: Rect) {
  values.x.jump(from.x - to.x)
  values.y.jump(from.y - to.y)
  values.scaleX.jump(from.width / to.width)
  values.scaleY.jump(from.height / to.height)
  const controls = [
    animate(values.x, 0, springs.morph),
    animate(values.y, 0, springs.morph),
    animate(values.scaleX, 1, springs.morph),
    animate(values.scaleY, 1, springs.morph),
  ]
  return () => controls.forEach((c) => c.stop())
}
