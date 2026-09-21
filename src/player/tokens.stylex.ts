import * as stylex from '@stylexjs/stylex'

/**
 * Player design tokens. The player is always drawn over video, so the defaults are a
 * white-on-black system independent of the host app; hosts retint it with `createTheme`.
 */
export const player = stylex.defineVars({
  font: 'inherit',

  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.72)',
  textFaint: 'rgba(255, 255, 255, 0.45)',

  /** Progress fill, active menu item, slider thumb. */
  accent: '#ffffff',
  accentText: '#0a0a0c',
  buffered: 'rgba(255, 255, 255, 0.32)',
  track: 'rgba(255, 255, 255, 0.18)',

  /** Buttons over video. */
  control: 'rgba(255, 255, 255, 0.14)',
  controlHover: 'rgba(255, 255, 255, 0.24)',
  controlBorder: 'rgba(255, 255, 255, 0.22)',

  /** Menus, tooltips, next-up card. */
  surface: 'rgba(18, 18, 22, 0.86)',
  surfaceHover: 'rgba(255, 255, 255, 0.1)',
  border: 'rgba(255, 255, 255, 0.12)',
  shadow: '0 16px 48px rgba(0, 0, 0, 0.55)',

  focusRing: 'rgba(255, 255, 255, 0.6)',

  scrimTop: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0))',
  scrimBottom: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.3) 55%, rgba(0,0,0,0))',

  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '14px',

  subtitleText: '#ffffff',
  subtitleShadow: '0 0 6px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.9)',
  subtitleBg: 'transparent',
})
