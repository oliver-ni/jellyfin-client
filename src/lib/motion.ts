import { animate, type TargetAndTransition, type Transition, type Variants } from 'motion/react'

/**
 * Spring presets, duration-based and critically damped so everything settles on the same
 * beat. Retargeting mid-flight blends rather than restarting.
 */
export const springs = {
  /** Hover/press feedback, toggles. */
  snappy: { type: 'spring', duration: 0.22, bounce: 0 } satisfies Transition,
  /** Content reveals, tab indicators. */
  gentle: { type: 'spring', duration: 0.3, bounce: 0 } satisfies Transition,
  /** Shared-element morphs between routes. */
  morph: { type: 'spring', duration: 0.28, bounce: 0 } satisfies Transition,
  /** Slight overshoot for state flips (favorite, watched). */
  bouncy: { type: 'spring', duration: 0.32, bounce: 0.3 } satisfies Transition,
} as const

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: springs.gentle },
}

export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: springs.gentle },
}

/** Exit target for `AnimatePresence`; exits are quicker than entrances. */
export const vanish: TargetAndTransition = { opacity: 0, transition: { duration: 0.15 } }

export const stagger = (delayChildren = 0.03, start = 0): Variants => ({
  hidden: {},
  show: { transition: { delayChildren: start, staggerChildren: delayChildren } },
})

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export type MorphShape = 'poster' | 'landscape'

/**
 * Shared-element handoff between routes: a card hands its rect to the detail hero it opens,
 * and the hero hands its rect back to whichever card it returns to. Rects are viewport
 * coordinates, so the morph is independent of scroll changes between routes.
 */
export interface MorphSource {
  itemId: string
  shape: MorphShape
  rect: Rect
  /** Image the origin was showing, used as an instant stand-in while the target loads. */
  src: string | null
}

const SOURCE_TTL = 1500

let pending: (MorphSource & { expires: number; pressed: boolean }) | null = null

let lastPointerTarget: EventTarget | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => (lastPointerTarget = e.target), { capture: true })
}

/**
 * Offer `el` as the morph origin. The element the user pressed always wins; anything else
 * (a second card for the same item, or a history navigation) only counts while on screen.
 */
export function offerMorphSource(el: Element, source: Omit<MorphSource, 'rect'>) {
  const rect = rectOf(el)
  if (rect.width === 0) return
  const pressed = lastPointerTarget instanceof Node && el.contains(lastPointerTarget)
  const now = performance.now()
  if (pending && pending.pressed && !pressed && pending.expires > now) return
  if (!pressed && !inViewport(rect)) return
  pending = { ...source, rect, pressed, expires: now + SOURCE_TTL }
}

export const inViewport = (r: Rect) =>
  r.y < window.innerHeight && r.y + r.height > 0 && r.x < window.innerWidth && r.x + r.width > 0

/** Claim the pending handoff if it is for this item and shape and still fresh. */
export function takeMorphSource(itemId: string, shape: MorphShape): MorphSource | null {
  if (!pending) return null
  if (pending.expires < performance.now()) {
    pending = null
    return null
  }
  if (pending.itemId !== itemId || pending.shape !== shape) return null
  const s = pending
  pending = null
  return s
}

export function rectOf(el: Element): Rect {
  const { x, y, width, height } = el.getBoundingClientRect()
  return { x, y, width, height }
}

/** Same slot, ignoring hover scale: compare centres, not corners. */
const near = (a: Rect, b: Rect) =>
  Math.abs(a.x + a.width / 2 - (b.x + b.width / 2)) < 4 &&
  Math.abs(a.y + a.height / 2 - (b.y + b.height / 2)) < 4

let layer: HTMLDivElement | null = null

/** Fixed, pointer-transparent layer above the page for route ghosts and morph flyers. */
export function overlayLayer(): HTMLDivElement {
  if (layer) return layer
  layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  Object.assign(layer.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '40',
    overflow: 'hidden',
    pointerEvents: 'none',
  })
  document.body.append(layer)
  return layer
}

/**
 * Hide the origin of `source` inside any outgoing-page ghost so it doesn't linger while its
 * target is already animating. Called by the target once it exists, never earlier, so there
 * is no frame where neither is visible.
 */
export function concealMorphOrigin(source: MorphSource) {
  if (!layer) return
  for (const el of layer.querySelectorAll<HTMLElement>(`[data-morph="${source.itemId}"]`)) {
    if (near(rectOf(el), source.rect)) el.style.visibility = 'hidden'
  }
}

/**
 * Fly a stand-in image from `source.rect` to `target`'s rect above everything, then hand
 * back. Used when the target sits inside stacking contexts and can't be lifted itself.
 */
export function flyMorph(source: MorphSource, target: HTMLElement, onDone: () => void) {
  const to = rectOf(target)
  const flyer = document.createElement('div')
  Object.assign(flyer.style, {
    position: 'absolute',
    left: `${to.x}px`,
    top: `${to.y}px`,
    width: `${to.width}px`,
    height: `${to.height}px`,
    borderRadius: getComputedStyle(target).borderRadius,
    overflow: 'hidden',
    transformOrigin: '0 0',
    backgroundColor: '#000',
    willChange: 'transform',
  })
  if (source.src) {
    const img = document.createElement('img')
    img.src = source.src
    img.alt = ''
    img.decoding = 'sync'
    Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover' })
    flyer.append(img)
  }
  overlayLayer().append(flyer)
  const controls = playMorph(flyer, source.rect, to)
  let done = false
  const finish = () => {
    if (done) return
    done = true
    flyer.remove()
    onDone()
  }
  controls.then(finish)
  return () => {
    controls.stop()
    finish()
  }
}

const IDENTITY = 'translate(0px, 0px) scale(1, 1)'

/**
 * Snap `el` (laid out at `to`) so it visually sits at `from`, then spring it home. Animates
 * the whole `transform` so the browser can run it off the main thread: the destination page
 * is still rendering and decoding images while this plays, and per-frame JS would stutter.
 */
export function playMorph(el: HTMLElement, from: Rect, to: Rect) {
  const start = `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.width / to.width}, ${from.height / to.height})`
  el.style.transformOrigin = '0 0'
  el.style.transform = start
  const controls = animate(el, { transform: [start, IDENTITY] }, springs.morph)
  return {
    then: (onDone: () => void) => controls.then(onDone),
    /** Stop and clear the inline transform so `el` can be measured again untouched. */
    stop: () => {
      controls.stop()
      el.style.transform = ''
    },
  }
}
