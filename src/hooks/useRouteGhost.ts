import { useRouter } from '@tanstack/react-router'
import { animate } from 'motion/react'
import { useEffect, type RefObject } from 'react'
import { peekMorphSource } from '@/lib/motion'

const EXIT = { duration: 0.2, ease: [0.2, 0, 0, 1] } as const

/**
 * Route exit choreography without keeping the outgoing React tree mounted: just before the
 * router commits a new path, the outgoing page's DOM is cloned into a fixed, pointer-transparent
 * layer pinned to its current scroll offset and faded out while the new page reveals beneath it.
 * A navigation mid-fade simply layers a new ghost on top, so transitions stay interruptible.
 */
export function useRouteGhost(page: RefObject<HTMLElement | null>) {
  const router = useRouter()

  useEffect(() => {
    let layer: HTMLDivElement | null = null

    const getLayer = () => {
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

    const unsubscribe = router.subscribe('onLoad', ({ pathChanged }) => {
      const source = page.current
      if (!pathChanged || !source) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const ghost = source.cloneNode(true) as HTMLElement
      ghost.inert = true
      // The element being morphed into the next page must not also fade out here. Match by
      // rect too, since the same item can appear in several rails.
      const morph = peekMorphSource()
      if (morph) {
        const selector = `[data-morph="${morph.itemId}"]`
        const origins = source.querySelectorAll<HTMLElement>(selector)
        const clones = ghost.querySelectorAll<HTMLElement>(selector)
        origins.forEach((origin, i) => {
          const r = origin.getBoundingClientRect()
          if (Math.abs(r.x - morph.rect.x) < 2 && Math.abs(r.y - morph.rect.y) < 2) {
            clones[i].style.visibility = 'hidden'
          }
        })
      }
      Object.assign(ghost.style, {
        position: 'absolute',
        left: '0',
        top: `${-window.scrollY}px`,
        width: `${source.offsetWidth}px`,
        willChange: 'opacity',
      })
      const host = getLayer()
      host.append(ghost)
      animate(ghost, { opacity: [1, 0] }, EXIT).then(() => ghost.remove())
    })

    return () => {
      unsubscribe()
      layer?.remove()
    }
  }, [router, page])
}
