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
 * Shared-element handoff between routes: a card hands its rect to the detail hero or episode
 * row it opens, and those hand their rect back to whichever card they return to. Rects are
 * viewport coordinates, so the morph is independent of scroll changes between routes.
 */
export interface MorphSource {
  itemId: string
  shape: MorphShape
  rect: Rect
  /** Image the origin was showing, used as an instant stand-in while the target loads. */
  src: string | null
}

const SOURCE_TTL = 1500

const sourceKey = (itemId: string, shape: MorphShape) => `${itemId}/${shape}`

/** Offers from the outgoing page, keyed by item and shape; each is claimed by one target. */
let pending = new Map<string, MorphSource>()
let pendingExpires = 0

let lastPress: { target: EventTarget | null; at: number } = { target: null, at: -Infinity }
if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    (e) => (lastPress = { target: e.target, at: performance.now() }),
    { capture: true },
  )
}

/**
 * Offer `el` as the morph origin. The element the user pressed is the only origin. When the
 * press was elsewhere (a nav link, the hero) nothing morphs; a navigation without a press
 * (history, keyboard) morphs from every element near the screen the next page has a target
 * for.
 */
export function offerMorphSource(el: Element, source: Omit<MorphSource, 'rect'>) {
  const now = performance.now()
  const pressed = lastPress.target instanceof Node && el.contains(lastPress.target)
  if (!pressed && now - lastPress.at < SOURCE_TTL) return
  const rect = pressed ? rectOf(el) : nearViewport(rectOf(el))
  if (!rect || rect.width === 0) return
  if (pressed || pendingExpires < now) pending = new Map()
  pendingExpires = now + SOURCE_TTL
  pending.set(sourceKey(source.itemId, source.shape), { ...source, rect })
}

export const inViewport = (r: Rect) =>
  r.y < window.innerHeight && r.y + r.height > 0 && r.x < window.innerWidth && r.x + r.width > 0

/** Shift needed to bring a span back to just outside the [0, extent] edge it lies beyond. */
const toEdge = (start: number, size: number, extent: number) =>
  start + size < 0 ? -(start + size) : start > extent ? extent - start : 0

/**
 * `r` if on screen; moved to just outside the nearest edge if it was scrolled off by less
 * than a screen, so it still flies in from the side it went; null if further than that.
 */
function nearViewport(r: Rect): Rect | null {
  const dx = toEdge(r.x, r.width, window.innerWidth)
  const dy = toEdge(r.y, r.height, window.innerHeight)
  if (Math.abs(dx) > window.innerWidth || Math.abs(dy) > window.innerHeight) return null
  return { ...r, x: r.x + dx, y: r.y + dy }
}

/** Claim the pending handoff for this item and shape, if one was offered and is still fresh. */
export function takeMorphSource(itemId: string, shape: MorphShape): MorphSource | null {
  if (pendingExpires < performance.now()) pending = new Map()
  const key = sourceKey(itemId, shape)
  const source = pending.get(key) ?? null
  pending.delete(key)
  return source
}

export function rectOf(el: Element): Rect {
  const { x, y, width, height } = el.getBoundingClientRect()
  return { x, y, width, height }
}

/**
 * Where `el` rests once every transform on it and its ancestors has played out. A morph
 * target is measured on mount, while the page around it is still sliding in, so its
 * bounding rect would be a few pixels off from where it ends up.
 */
export function layoutRect(el: HTMLElement): Rect {
  const rect = { x: 0, y: 0, width: el.offsetWidth, height: el.offsetHeight }
  for (let o: Element | null = el; o instanceof HTMLElement; o = o.offsetParent) {
    rect.x += o.offsetLeft + (o.offsetParent?.clientLeft ?? 0)
    rect.y += o.offsetTop + (o.offsetParent?.clientTop ?? 0)
  }
  for (let p = el.parentElement; p; p = p.parentElement) {
    rect.x -= p.scrollLeft
    rect.y -= p.scrollTop
  }
  return rect
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
  const to = layoutRect(target)
  const flyer = document.createElement('div')
  Object.assign(flyer.style, {
    position: 'absolute',
    left: `${to.x}px`,
    top: `${to.y}px`,
    width: `${to.width}px`,
    height: `${to.height}px`,
    borderRadius: getComputedStyle(target).borderRadius,
    boxShadow: getComputedStyle(target).boxShadow,
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
function playMorph(el: HTMLElement, from: Rect, to: Rect) {
  const start = `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.width / to.width}, ${from.height / to.height})`
  el.style.transformOrigin = '0 0'
  el.style.transform = start
  const controls = animate(el, { transform: [start, IDENTITY] }, springs.gentle)
  return {
    then: (onDone: () => void) => controls.then(onDone),
    /** Stop and clear the inline transform so `el` can be measured again untouched. */
    stop: () => {
      controls.stop()
      el.style.transform = ''
    },
  }
}
