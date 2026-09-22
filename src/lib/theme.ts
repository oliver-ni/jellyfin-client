import type * as stylex from '@stylexjs/stylex'
import { createStore } from '@/lib/store'
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
const store = createStore(
  THEMES.find((t) => t.id === localStorage.getItem(STORAGE_KEY)) ?? THEMES[0],
)

export const useTheme = store.useValue

/** Unknown ids are ignored, so this can take a raw menu key. */
export function setThemeId(id: unknown) {
  const next = THEMES.find((t) => t.id === id)
  if (!next || next === store.get()) return
  localStorage.setItem(STORAGE_KEY, next.id)
  store.set(next)
}
