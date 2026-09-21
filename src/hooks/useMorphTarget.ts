import { useRouter, type ParsedLocation } from '@tanstack/react-router'
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
  type MorphSource,
} from '@/lib/motion'

/** Whether `to` opens the page, or the expanded episode row, for `itemId`. */
export const opensItem = (to: ParsedLocation, itemId: string) =>
  to.pathname === `/items/${itemId}` || ('episode' in to.search && to.search.episode === itemId)

/**
 * Offers `ref` as the morph origin for `itemId` whenever a navigation passes `when`, measured
 * before the navigation commits so the element is still where the user sees it. Works for
 * clicks and for history navigation alike, so forward and back morph the same way.
 */
export function useMorphHandoff(
  ref: RefObject<HTMLElement | null>,
  itemId: string | undefined,
  shape: MorphShape,
  src: string | null | undefined,
  when: (to: ParsedLocation) => boolean = () => true,
) {
  const router = useRouter()
  const latest = useRef({ itemId, shape, src, when })
  useEffect(() => {
    latest.current = { itemId, shape, src, when }
  }, [itemId, shape, src, when])
  useEffect(
    () =>
      router.subscribe('onBeforeNavigate', ({ toLocation }) => {
        const { itemId, shape, src, when } = latest.current
        const el = ref.current
        if (el && itemId && when(toLocation))
          offerMorphSource(el, { itemId, shape, src: src ?? null })
      }),
    [ref, router],
  )
}

/**
 * Receives the handoff for `itemId`, if the page that navigated here offered one: `ref` is
 * hidden while a stand-in flies from the origin's rect to its own, then revealed in place.
 * Measuring waits a frame so the router's scroll reset has landed, and one more if the target
 * is still off screen (a deep-linked episode row scrolls itself into view on mount); a target
 * that stays off screen just appears.
 */
export function useMorphTarget(
  itemId: string | undefined,
  shape: MorphShape,
  ref: RefObject<HTMLElement | null>,
) {
  const [source] = useState<MorphSource | null>(() =>
    itemId ? takeMorphSource(itemId, shape) : null,
  )
  const opacity = useMotionValue(1)

  useLayoutEffect(() => {
    if (!source) return
    opacity.jump(0)
    let stop: (() => void) | undefined
    let retry = true
    const measure = () => {
      const el = ref.current
      if (el && inViewport(rectOf(el))) {
        concealMorphOrigin(source)
        stop = flyMorph(source, el, () => opacity.jump(1))
      } else if (el && retry) {
        retry = false
        frame = requestAnimationFrame(measure)
      } else {
        opacity.jump(1)
      }
    }
    let frame = requestAnimationFrame(measure)
    return () => {
      cancelAnimationFrame(frame)
      stop?.()
      opacity.jump(1)
    }
  }, [source, ref, opacity])

  return { source, opacity }
}
