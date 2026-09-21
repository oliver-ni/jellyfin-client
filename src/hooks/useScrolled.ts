import { useSyncExternalStore } from 'react'

function subscribe(cb: () => void) {
  window.addEventListener('scroll', cb, { passive: true })
  return () => window.removeEventListener('scroll', cb)
}

/** True once the window has scrolled past `threshold` px. */
export function useScrolled(threshold = 24) {
  return useSyncExternalStore(
    subscribe,
    () => window.scrollY > threshold,
    () => false,
  )
}
