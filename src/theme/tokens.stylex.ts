import * as stylex from '@stylexjs/stylex'

/**
 * Design tokens. The defaults below are the "Cinema" theme (dark, near-monochrome,
 * artwork supplies the color). Other themes override these via `createTheme` in
 * `themes.stylex.ts`; components must only ever reference tokens, never raw colors.
 */
export const colors = stylex.defineVars({
  scheme: 'dark',

  bg: '#0a0a0c',
  bgElevated: '#141417',
  bgHover: '#1c1c21',
  surface: 'rgba(255, 255, 255, 0.06)',
  surfaceHover: 'rgba(255, 255, 255, 0.11)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',

  text: '#f5f5f7',
  textMuted: '#9b9ba3',
  textFaint: '#5c5c66',

  accent: '#f5f5f7',
  accentHover: '#ffffff',
  accentText: '#0a0a0c',
  progress: '#f5f5f7',
  focusRing: 'rgba(255, 255, 255, 0.55)',
  selection: 'rgba(255, 255, 255, 0.2)',

  danger: '#f87171',
  success: '#4ade80',

  scrim: 'rgba(0, 0, 0, 0.45)',
  navBg: 'rgba(10, 10, 12, 0.7)',
  navScrim: 'rgba(0, 0, 0, 0.5)',
  glow: 'rgba(255, 255, 255, 0.06)',
  skeleton: 'rgba(255, 255, 255, 0.06)',
  heroText: '#ffffff',
  heroTextMuted: 'rgba(255, 255, 255, 0.72)',
  heroSurface: 'rgba(255, 255, 255, 0.14)',
  heroBorder: 'rgba(255, 255, 255, 0.25)',
  onMediaBg: 'rgba(255, 255, 255, 0.92)',
  onMediaText: '#0a0a0c',
})

export const fonts = stylex.defineVars({
  sans: "'Inter Variable', 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
})

export const radii = stylex.defineVars({
  xs: '4px',
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  full: '9999px',
})

export const space = stylex.defineVars({
  xxs: '2px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
  xxxl: '48px',
})

export const sizes = stylex.defineVars({
  navHeight: '60px',
  pageGutter: '48px',
  pageGutterMobile: '16px',
  maxContent: '1720px',
})

export const shadows = stylex.defineVars({
  card: 'none',
  cardHover: '0 12px 32px rgba(0,0,0,0.45)',
  popover: '0 12px 40px rgba(0,0,0,0.6)',
})

export const motion = stylex.defineVars({
  fast: '120ms',
  base: '180ms',
  slow: '280ms',
  ease: 'cubic-bezier(0.2, 0, 0, 1)',
})
