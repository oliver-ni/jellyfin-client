import { useRouter, type ParsedLocation } from '@tanstack/react-router'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import {
  concealMorphOrigin,
  flyMorph,
  inViewport,
  layoutRect,
  offerMorphSource,
  takeMorphSource,
  type MorphShape,
  type MorphSource,
} from '@/lib/motion'

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
 * kept invisible while a stand-in flies from the origin's rect to its own, then revealed in
 * place. Visibility is set on the element directly so it can't fight an entrance animation
 * on the same node. Measuring waits a frame so the router's scroll reset has landed, and one
 * more if the target is still off screen (a deep-linked episode row scrolls itself into view
 * on mount); a target that stays off screen just appears.
 */
export function useMorphTarget(
  itemId: string | undefined,
  shape: MorphShape,
  ref: RefObject<HTMLElement | null>,
): MorphSource | null {
  const [source] = useState(() => (itemId ? takeMorphSource(itemId, shape) : null))

  useLayoutEffect(() => {
    const el = ref.current
    if (!source || !el) return
    el.style.visibility = 'hidden'
    const reveal = () => (el.style.visibility = '')
    let stop: (() => void) | undefined
    let retry = true
    const measure = () => {
      if (inViewport(layoutRect(el))) {
        concealMorphOrigin(source)
        stop = flyMorph(source, el, reveal)
      } else if (retry) {
        retry = false
        frame = requestAnimationFrame(measure)
      } else {
        reveal()
      }
    }
    let frame = requestAnimationFrame(measure)
    return () => {
      cancelAnimationFrame(frame)
      stop?.()
      reveal()
    }
  }, [source, ref])

  return source
}
