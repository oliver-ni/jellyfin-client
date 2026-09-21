import type { MotionValue } from 'motion/react'
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { PlayerEngine } from './engine'
import type { PlayerState, PlayerStore } from './store'
import type { PlayerSource } from './types'

export interface PlayerContextValue {
  store: PlayerStore
  engine: PlayerEngine
  /** Smooth playhead in seconds, updated every frame while playing. */
  time: MotionValue<number>
  source: PlayerSource
  container: React.RefObject<HTMLDivElement | null>
}

export const PlayerContext = createContext<PlayerContextValue | null>(null)

export function usePlayerContext(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('Player components must be rendered inside <Player>.')
  return ctx
}

export function usePlayerState<T>(selector: (state: PlayerState) => T): T {
  return useStore(usePlayerContext().store, selector)
}

export function usePlayerEngine(): PlayerEngine {
  return usePlayerContext().engine
}
