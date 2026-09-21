import * as stylex from '@stylexjs/stylex'
import { colors } from './tokens.stylex'

/** Keyboard-only focus ring; works for plain elements and React Aria components. */
export const focus = stylex.create({
  ring: {
    outlineStyle: { default: 'none', ':focus-visible': 'solid', '[data-focus-visible]': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 2,
  },
})
