import { useEffect, useMemo, useRef, type KeyboardEvent, type RefObject } from 'react'
import { useStore } from 'zustand'
import type { PlayerEngine } from './engine'
import { flash, type PlayerStore } from './store'
import type { Segment } from './types'

const IDLE_MS = 2800

/** Shows controls on pointer/keyboard activity and hides them after a pause while playing. */
export function useControlsVisibility(store: PlayerStore) {
  const timer = useRef(0)

  const api = useMemo(() => {
    const pinned = () => {
      const s = store.getState()
      return s.paused || s.waiting || s.menu !== null || s.scrubbing || s.hoveringControls
    }
    const schedule = () => {
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        if (pinned()) schedule()
        else store.setState({ controlsVisible: false })
      }, IDLE_MS)
    }
    const show = () => {
      if (!store.getState().controlsVisible) store.setState({ controlsVisible: true })
      schedule()
    }
    return {
      show,
      handlers: {
        onPointerMove: show,
        onPointerDown: show,
        onPointerLeave: () => {
          window.clearTimeout(timer.current)
          if (!pinned()) store.setState({ controlsVisible: false })
        },
        onKeyDownCapture: show,
      },
    }
  }, [store])

  // Re-arm the idle timer when something that pins the controls changes.
  useEffect(
    () =>
      store.subscribe((s, prev) => {
        if (
          s.paused !== prev.paused ||
          s.waiting !== prev.waiting ||
          s.menu !== prev.menu ||
          s.scrubbing !== prev.scrubbing ||
          s.hoveringControls !== prev.hoveringControls
        ) {
          api.show()
        }
      }),
    [store, api],
  )
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const visible = useStore(store, (s) => s.controlsVisible)
  return { handlers: api.handlers, hidden: !visible }
}

/** Play/pause from the stage or keyboard, with center feedback. */
export function togglePlayback(engine: PlayerEngine, store: PlayerStore) {
  const wasPaused = store.getState().paused
  engine.toggle()
  flash(store, wasPaused ? 'play' : 'pause')
}

export function toggleFullscreen(el: HTMLElement | null) {
  if (!el) return
  if (document.fullscreenElement) void document.exitFullscreen()
  else void el.requestFullscreen().catch(() => undefined)
}

export function useFullscreenState(container: RefObject<HTMLElement | null>, store: PlayerStore) {
  useEffect(() => {
    const onChange = () =>
      store.setState({ fullscreen: document.fullscreenElement === container.current })
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [container, store])
}

/** Tracks which segment (skip intro, next episode) the playhead is inside. */
export function useSegments(store: PlayerStore, segments: Segment[] | undefined) {
  useEffect(() => {
    if (!segments?.length) {
      store.setState({ activeSegmentId: null })
      return
    }
    const update = (t: number) => {
      const hit = segments.find((seg) => t >= seg.start && t < seg.end)
      const id = hit?.id ?? null
      if (id !== store.getState().activeSegmentId) store.setState({ activeSegmentId: id })
    }
    update(store.getState().currentTime)
    return store.subscribe((s, prev) => {
      if (s.currentTime !== prev.currentTime) update(s.currentTime)
    })
  }, [store, segments])
}

interface KeyboardActions {
  onBack?: () => void
  onNext?: () => void
}

export function useKeyboard(
  engine: PlayerEngine,
  store: PlayerStore,
  container: RefObject<HTMLElement | null>,
  actions: KeyboardActions,
) {
  return (e: KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    // Let menus, sliders and buttons handle their own keys.
    if (target !== e.currentTarget && target.closest('[role="menu"], [role="slider"], input')) {
      return
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const handled = handleKey(e.key, e.shiftKey, engine, store, container.current, actions)
    if (handled) e.preventDefault()
  }
}

function handleKey(
  key: string,
  shift: boolean,
  engine: PlayerEngine,
  store: PlayerStore,
  container: HTMLElement | null,
  actions: KeyboardActions,
): boolean {
  switch (key) {
    case ' ':
    case 'k':
      togglePlayback(engine, store)
      return true
    case 'ArrowLeft':
    case 'j': {
      const delta = key === 'j' ? 10 : shift ? 30 : 5
      engine.seekBy(-delta)
      flash(store, 'back', `${delta}`)
      return true
    }
    case 'ArrowRight':
    case 'l': {
      const delta = key === 'l' ? 10 : shift ? 30 : 5
      engine.seekBy(delta)
      flash(store, 'forward', `${delta}`)
      return true
    }
    case 'ArrowUp':
    case 'ArrowDown': {
      const v = Math.min(1, Math.max(0, store.getState().volume + (key === 'ArrowUp' ? 0.1 : -0.1)))
      engine.setVolume(v)
      flash(store, v === 0 ? 'muted' : 'volume', `${Math.round(v * 100)}%`)
      return true
    }
    case 'm':
      engine.toggleMuted()
      flash(store, engine.video?.muted ? 'muted' : 'volume')
      return true
    case 'f':
      toggleFullscreen(container)
      return true
    case 'c':
      store.setState({ menu: store.getState().menu === 'subtitles' ? null : 'subtitles' })
      return true
    case 'Home':
      engine.seek(0)
      return true
    case 'End':
      engine.seek(store.getState().duration)
      return true
    case '<':
      engine.setRate(Math.max(0.25, store.getState().rate - 0.25))
      return true
    case '>':
      engine.setRate(Math.min(3, store.getState().rate + 0.25))
      return true
    case 'n':
    case 'N':
      if (shift && actions.onNext) {
        actions.onNext()
        return true
      }
      return false
    case 'Escape':
      if (document.fullscreenElement) {
        void document.exitFullscreen()
        return true
      }
      if (store.getState().menu) {
        store.setState({ menu: null })
        return true
      }
      if (actions.onBack) {
        actions.onBack()
        return true
      }
      return false
    default:
      if (key >= '0' && key <= '9') {
        const d = store.getState().duration
        if (d > 0) engine.seek((d * Number(key)) / 10)
        return true
      }
      return false
  }
}
