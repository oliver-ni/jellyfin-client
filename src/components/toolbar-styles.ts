import * as stylex from '@stylexjs/stylex'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

/**
 * Shared styles for toolbar dropdowns/chips and their popovers. Compose `trigger` over
 * `glass.surface` and `popover` over `glass.panel`; each control is its own capsule.
 */
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
      '[data-selected]': colors.text,
    },
    backgroundColor: {
      default: colors.glass,
      '[data-hovered]': colors.glassStrong,
      '[data-pressed]': colors.glassStrong,
      '[data-selected]': colors.glassStrong,
    },
    borderRadius: radii.full,
    borderWidth: 0,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transitionProperty: 'color, background-color, transform',
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.ease,
    transform: { default: 'none', '[data-pressed]': 'scale(0.97)' },
    outlineStyle: { default: 'none', '[data-focus-visible]': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 2,
  },
  popover: {
    minWidth: 180,
    maxHeight: 360,
    overflowY: 'auto',
    borderRadius: radii.lg,
    padding: space.xs,
    outline: 'none',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingInline: space.md,
    paddingBlock: 7,
    fontSize: 13,
    color: colors.text,
    borderRadius: radii.sm,
    cursor: 'pointer',
    outline: 'none',
    backgroundColor: {
      default: 'transparent',
      '[data-focused]': colors.surfaceHover,
    },
  },
  check: {
    display: 'grid',
    placeItems: 'center',
    width: 16,
    color: colors.textMuted,
  },
})
