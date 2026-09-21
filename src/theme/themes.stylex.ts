import * as stylex from '@stylexjs/stylex'
import { colors } from './tokens.stylex'

/** Purple accent on the same dark base. */
export const violetTheme = stylex.createTheme(colors, {
  accent: '#a78bfa',
  accentHover: '#b8a1fb',
  accentText: '#0b0c0f',
  progress: '#a78bfa',
  focusRing: 'rgba(167, 139, 250, 0.6)',
  selection: 'rgba(167, 139, 250, 0.35)',
  glow: 'rgba(167, 139, 250, 0.16)',
})

/** Warm, slightly lifted blacks with an amber accent. */
export const amberTheme = stylex.createTheme(colors, {
  bg: '#0e0c0a',
  bgElevated: '#181512',
  bgHover: '#211d18',
  navBg: 'rgba(14, 12, 10, 0.7)',
  onMediaBg: '#f5b544',
  onMediaText: '#140f05',
  accent: '#f5b544',
  accentHover: '#ffc45c',
  accentText: '#140f05',
  progress: '#f5b544',
  focusRing: 'rgba(245, 181, 68, 0.6)',
  selection: 'rgba(245, 181, 68, 0.3)',
  glow: 'rgba(245, 181, 68, 0.12)',
})

export const lightTheme = stylex.createTheme(colors, {
  scheme: 'light',
  bg: '#f5f5f7',
  bgElevated: '#ffffff',
  bgHover: '#ececf0',
  surface: 'rgba(0, 0, 0, 0.05)',
  surfaceHover: 'rgba(0, 0, 0, 0.09)',
  border: 'rgba(0, 0, 0, 0.08)',
  borderStrong: 'rgba(0, 0, 0, 0.16)',
  text: '#111114',
  textMuted: '#6b6b74',
  textFaint: '#a0a0a8',
  accent: '#111114',
  accentHover: '#000000',
  accentText: '#ffffff',
  progress: '#111114',
  focusRing: 'rgba(0, 0, 0, 0.45)',
  selection: 'rgba(0, 0, 0, 0.15)',
  scrim: 'rgba(0, 0, 0, 0.35)',
  navBg: 'rgba(245, 245, 247, 0.75)',
  navScrim: 'rgba(255, 255, 255, 0.55)',
  heroText: '#111114',
  heroTextMuted: 'rgba(0, 0, 0, 0.62)',
  heroSurface: 'rgba(255, 255, 255, 0.35)',
  heroBorder: 'rgba(0, 0, 0, 0.18)',
  glow: 'rgba(0, 0, 0, 0.04)',
  skeleton: 'rgba(0, 0, 0, 0.06)',
})
