import { useRouter } from '@tanstack/react-router'
import { animate } from 'motion/react'
import { useEffect, type RefObject } from 'react'
import { overlayLayer } from '@/lib/motion'

const EXIT = { duration: 0.2, ease: [0.2, 0, 0, 1] } as const

/**
 * Fades out a DOM clone of the outgoing page over the incoming one, so route exits animate
 * without keeping the old React tree mounted. The header is left out while staying inside
 * `layoutRouteId`, since the real one persists.
 */
export function useRouteGhost(shell: RefObject<HTMLElement | null>, layoutRouteId: string) {
  const router = useRouter()

  useEffect(() => {
    return router.subscribe('onLoad', ({ pathChanged, toLocation }) => {
      const source = shell.current
      if (!pathChanged || !source) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

      const ghost = source.cloneNode(true) as HTMLElement
      ghost.inert = true
      const [routes] = router.getMatchedRoutes(toLocation.pathname)
      if (routes.some((r) => r.id === layoutRouteId)) {
        ghost.querySelector(':scope > header')?.remove()
      }
      for (const img of ghost.querySelectorAll('img')) img.decoding = 'sync'
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
  }, [router, shell, layoutRouteId])
}
