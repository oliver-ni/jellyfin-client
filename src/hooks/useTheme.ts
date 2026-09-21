import { useSyncExternalStore } from 'react'
import { getThemeId, subscribeTheme } from '@/lib/theme'

export function useThemeId() {
  return useSyncExternalStore(subscribeTheme, getThemeId, getThemeId)
}
