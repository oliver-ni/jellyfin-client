import * as stylex from '@stylexjs/stylex'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

/** Toolbar dropdown/chip trigger; compose over `glass.surface`. Each control is its own capsule. */
export const toolbarControl = stylex.create({
  trigger: {
    pointerEvents: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xs,
    height: 36,
    paddingInline: space.md,
    fontSize: 13,
    fontWeight: 500,
    color: {
      default: colors.textMuted,
      '[data-hovered]': colors.text,
      '[data-pressed]': colors.text,
    },
    backgroundColor: {
      default: colors.glass,
      '[data-hovered]': colors.glassStrong,
      '[data-pressed]': colors.glassStrong,
    },
    borderRadius: radii.full,
    borderWidth: 0,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transitionProperty: 'color, background-color, transform',
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.ease,
    transform: { default: 'none', '[data-pressed]': 'scale(0.97)' },
  },
  selected: {
    color: colors.accentText,
    backgroundColor: { default: colors.accent, '[data-hovered]': colors.accentHover },
  },
})
