import * as stylex from '@stylexjs/stylex'
import { colors, motion } from './tokens.stylex'

const popIn = stylex.keyframes({
  from: { opacity: 0, transform: 'scale(0.96)' },
  to: { opacity: 1, transform: 'scale(1)' },
})
const popOut = stylex.keyframes({
  from: { opacity: 1, transform: 'scale(1)' },
  to: { opacity: 0, transform: 'scale(0.97)' },
})

/** Enter/exit motion for React Aria popovers, driven by its `data-entering`/`data-exiting` states. */
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
