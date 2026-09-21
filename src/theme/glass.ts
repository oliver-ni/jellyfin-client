import * as stylex from '@stylexjs/stylex'
import { colors, motion, radii, space } from './tokens.stylex'

const popIn = stylex.keyframes({
  from: { opacity: 0, transform: 'scale(0.96)' },
  to: { opacity: 1, transform: 'scale(1)' },
})
const popOut = stylex.keyframes({
  from: { opacity: 1, transform: 'scale(1)' },
  to: { opacity: 0, transform: 'scale(0.97)' },
})

const fadeIn = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })
const fadeOut = stylex.keyframes({ from: { opacity: 1 }, to: { opacity: 0 } })
const rise = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(-8px) scale(0.98)' },
  to: { opacity: 1, transform: 'translateY(0) scale(1)' },
})
const sink = stylex.keyframes({
  from: { opacity: 1, transform: 'translateY(0) scale(1)' },
  to: { opacity: 0, transform: 'translateY(-6px) scale(0.99)' },
})

/**
 * Enter/exit motion for React Aria overlays, driven by their `data-entering`/`data-exiting`
 * states. `backdrop` + `sheet` are for `ModalOverlay` + `Modal`: a dimmed page with a glass
 * sheet near the top.
 */
export const overlay = stylex.create({
  popover: {
    transformOrigin: {
      default: 'top',
      '[data-placement="top"]': 'bottom',
      '[data-placement="left"]': 'right',
      '[data-placement="right"]': 'left',
    },
    animationName: { default: 'none', '[data-entering]': popIn, '[data-exiting]': popOut },
    animationDuration: { default: motion.base, '[data-exiting]': motion.fast },
    animationTimingFunction: motion.ease,
    animationFillMode: 'both',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: {
      default: '14vh',
      '@media (max-width: 720px)': space.lg,
    },
    paddingInline: space.md,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    animationName: { default: 'none', '[data-entering]': fadeIn, '[data-exiting]': fadeOut },
    animationDuration: { default: motion.base, '[data-exiting]': motion.fast },
    animationTimingFunction: motion.ease,
    animationFillMode: 'both',
  },
  sheet: {
    width: '100%',
    borderRadius: radii.xl,
    overflow: 'hidden',
    transformOrigin: 'top center',
    animationName: { default: 'none', '[data-entering]': rise, '[data-exiting]': sink },
    animationDuration: { default: motion.base, '[data-exiting]': motion.fast },
    animationTimingFunction: motion.ease,
    animationFillMode: 'both',
  },
})

/**
 * Floating glass surfaces: blurred, tinted, with a thin light rim. `surface` is for
 * controls that sit over artwork; `panel` is denser, for menus and popovers that hold text.
 */
export const glass = stylex.create({
  surface: {
    backgroundColor: colors.glass,
    backdropFilter: 'blur(24px) saturate(1.8)',
    boxShadow: `inset 0 0 0 1px ${colors.glassRim}, inset 0 1px 0 ${colors.glassHighlight}, 0 8px 32px ${colors.glassShadow}`,
  },
  panel: {
    backgroundColor: colors.glassStrong,
    backdropFilter: 'blur(32px) saturate(1.8)',
    boxShadow: `inset 0 0 0 1px ${colors.glassRim}, inset 0 1px 0 ${colors.glassHighlight}, 0 16px 48px ${colors.glassShadow}`,
  },
})
