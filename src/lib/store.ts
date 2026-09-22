import { useSyncExternalStore } from 'react'

/** A module-level value plus a hook that re-renders when it is set. */
export function createStore<T>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  const get = () => value
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  return {
    get,
    set(next: T) {
      value = next
      for (const l of listeners) l()
    },
    useValue: () => useSyncExternalStore(subscribe, get, get),
  }
}
