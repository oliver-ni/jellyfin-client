import { useRouter } from '@tanstack/react-router'
import { useMotionValue } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import {
  concealMorphOrigin,
  flyMorph,
  inViewport,
  offerMorphSource,
  rectOf,
  takeMorphSource,
  type MorphShape,
} from '@/lib/motion'

/**
 * Lets a card hand its rect to the page that replaces it whenever that page is this item's,
 * whether the card was clicked or the route arrived via history, so forward and back
 * navigations morph alike. Measured before the navigation commits, while the card is still
 * where the user sees it.
 */
export function useMorphHandoff(
  itemId: string | undefined,
  shape: MorphShape,
  ref: RefObject<HTMLElement | null>,
  src: string | null | undefined,
) {
  const router = useRouter()
  const latest = useRef({ itemId, shape, src })
  useEffect(() => {
    latest.current = { itemId, shape, src }
  }, [itemId, shape, src])
  useEffect(
    () =>
      router.subscribe('onBeforeNavigate', ({ toLocation }) => {
        const { itemId, shape, src } = latest.current
        const el = ref.current
        if (!el || !itemId) return
        const { pathname, search } = toLocation
        const opensThisItem =
          pathname === `/items/${itemId}` || ('episode' in search && search.episode === itemId)
        if (opensThisItem) offerMorphSource(el, { itemId, shape, src: src ?? null })
      }),
    [ref, router],
  )
}

/**
 * Lets a card receive the shared-element handoff from the page that navigated here (the
 * detail hero, on back-navigation). The card's media is hidden while a stand-in flies from the
 * hero's rect to the card's, then revealed in place. Measuring waits a frame so the router's
 * scroll restoration has landed first; a card that ends up off screen just appears.
 */
export function useMorphTarget(
  itemId: string | undefined,
  shape: MorphShape,
  ref: RefObject<HTMLElement | null>,
) {
  const [source] = useState(() => (itemId ? takeMorphSource(itemId, shape) : null))
  const opacity = useMotionValue(1)

  useLayoutEffect(() => {
    if (!source) return
    opacity.jump(0)
    let stop: (() => void) | undefined
    const frame = requestAnimationFrame(() => {
      const el = ref.current
      if (!el || !inViewport(rectOf(el))) {
        opacity.jump(1)
        return
      }
      concealMorphOrigin(source)
      stop = flyMorph(source, el, () => opacity.jump(1))
    })
    return () => {
      cancelAnimationFrame(frame)
      stop?.()
      opacity.jump(1)
    }
  }, [source, ref, opacity])

  return { morphing: source !== null, opacity }
}
