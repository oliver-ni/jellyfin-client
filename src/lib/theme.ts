import type * as stylex from '@stylexjs/stylex'
import { amberTheme, lightTheme, violetTheme } from '@/theme/themes.stylex'
import type { colors } from '@/theme/tokens.stylex'

export type ColorTheme = stylex.Theme<typeof colors>

export type ThemeId = 'cinema' | 'violet' | 'amber' | 'light'

export interface ThemeInfo {
  id: ThemeId
  label: string
  /** `null` means the base token values from `tokens.stylex.ts`. */
  theme: ColorTheme | null
}

export const THEMES: readonly ThemeInfo[] = [
  { id: 'cinema', label: 'Cinema', theme: null },
  { id: 'violet', label: 'Violet', theme: violetTheme },
  { id: 'amber', label: 'Amber', theme: amberTheme },
  { id: 'light', label: 'Light', theme: lightTheme },
]

const STORAGE_KEY = 'jf.theme'
const listeners = new Set<() => void>()

function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value)
}

let current: ThemeId = (() => {
  const stored = localStorage.getItem(STORAGE_KEY)
  return isThemeId(stored) ? stored : 'cinema'
})()

export function getThemeId(): ThemeId {
  return current
}

export function setThemeId(id: ThemeId) {
  if (id === current) return
  current = id
  localStorage.setItem(STORAGE_KEY, id)
  for (const l of listeners) l()
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function themeStyles(id: ThemeId): ColorTheme | null {
  return THEMES.find((t) => t.id === id)?.theme ?? null
}
