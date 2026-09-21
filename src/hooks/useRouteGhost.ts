import { useRouter } from '@tanstack/react-router'
import { animate } from 'motion/react'
import { useEffect, type RefObject } from 'react'
import { overlayLayer } from '@/lib/motion'

const EXIT = { duration: 0.2, ease: [0.2, 0, 0, 1] } as const

/**
 * Route exit choreography without keeping the outgoing React tree mounted: just before the
 * router commits a new path, the outgoing page's DOM is cloned into a fixed, pointer-transparent
 * layer pinned to its current scroll offset and faded out while the new page reveals beneath it.
 * A navigation mid-fade simply layers a new ghost on top, so transitions stay interruptible.
 * Elements marked `data-morph` keep their attribute so a morph target can conceal its origin.
 */
export function useRouteGhost(page: RefObject<HTMLElement | null>) {
  const router = useRouter()

  useEffect(() => {
    return router.subscribe('onLoad', ({ pathChanged }) => {
      const source = page.current
      if (!pathChanged || !source) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const ghost = source.cloneNode(true) as HTMLElement
      ghost.inert = true
      Object.assign(ghost.style, {
        position: 'absolute',
        left: '0',
        top: `${-window.scrollY}px`,
        width: `${source.offsetWidth}px`,
        willChange: 'opacity',
      })
      overlayLayer().append(ghost)
      animate(ghost, { opacity: [1, 0] }, EXIT).then(() => ghost.remove())
    })
  }, [router, page])
}
