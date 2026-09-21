import { useMotionValue } from 'motion/react'
import { useLayoutEffect, useState, type RefObject } from 'react'
import { concealMorphOrigin, flyMorph, takeMorphSource, type MorphShape } from '@/lib/motion'

/**
 * Lets a card receive the shared-element handoff from the page that navigated here (the
 * detail hero, on back-navigation). The card's media is hidden while a stand-in flies from the
 * hero's rect to the card's, then revealed in place. Measuring waits a frame so the router's
 * scroll restoration has landed first.
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
      if (!el) {
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
