import * as stylex from '@stylexjs/stylex'

export const colors = stylex.defineVars({
  bg: '#0b0c0f',
  bgElevated: '#12141a',
  bgHover: '#1a1d25',
  surface: 'rgba(255, 255, 255, 0.04)',
  surfaceHover: 'rgba(255, 255, 255, 0.08)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',
  text: '#f2f3f5',
  textMuted: '#9aa0ad',
  textFaint: '#5f6673',
  accent: '#a78bfa',
  accentHover: '#b8a1fb',
  accentText: '#0b0c0f',
  danger: '#f87171',
  success: '#4ade80',
  focusRing: 'rgba(167, 139, 250, 0.6)',
  overlay: 'rgba(11, 12, 15, 0.7)',
  skeleton: 'rgba(255, 255, 255, 0.06)',
})

export const fonts = stylex.defineVars({
  sans: "'Inter Variable', 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
})

export const radii = stylex.defineVars({
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
  navHeight: '56px',
  pageGutter: '40px',
  pageGutterMobile: '16px',
  maxContent: '1600px',
})

export const shadows = stylex.defineVars({
  card: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.35)',
  cardHover: '0 2px 4px rgba(0,0,0,0.5), 0 16px 40px rgba(0,0,0,0.5)',
  popover: '0 12px 40px rgba(0,0,0,0.6)',
})

export const motion = stylex.defineVars({
  fast: '120ms',
  base: '180ms',
  slow: '280ms',
  ease: 'cubic-bezier(0.2, 0, 0, 1)',
})
