import type * as stylex from '@stylexjs/stylex'
import { useSyncExternalStore } from 'react'
import { amberTheme, lightTheme, violetTheme } from '@/theme/themes.stylex'
import type { colors } from '@/theme/tokens.stylex'

export type ThemeId = 'cinema' | 'violet' | 'amber' | 'light'

export interface ThemeInfo {
  id: ThemeId
  label: string
  /** `null` means the base token values from `tokens.stylex.ts`. */
  theme: stylex.Theme<typeof colors> | null
}

export const THEMES: readonly ThemeInfo[] = [
  { id: 'cinema', label: 'Cinema', theme: null },
  { id: 'violet', label: 'Violet', theme: violetTheme },
  { id: 'amber', label: 'Amber', theme: amberTheme },
  { id: 'light', label: 'Light', theme: lightTheme },
]

const STORAGE_KEY = 'jf.theme'
const listeners = new Set<() => void>()

let current = THEMES.find((t) => t.id === localStorage.getItem(STORAGE_KEY)) ?? THEMES[0]

/** Unknown ids are ignored, so this can take a raw menu key. */
export function setThemeId(id: unknown) {
  const next = THEMES.find((t) => t.id === id)
  if (!next || next === current) return
  current = next
  localStorage.setItem(STORAGE_KEY, next.id)
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTheme(): ThemeInfo {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  )
}
