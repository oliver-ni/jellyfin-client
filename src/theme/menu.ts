import * as stylex from '@stylexjs/stylex'
import { colors, radii, space } from './tokens.stylex'

/** Shared styles for React Aria menus, listboxes and their popovers. Compose `popover` over `glass.panel`. */
export const menu = stylex.create({
  popover: {
    minWidth: 180,
    maxHeight: 360,
    overflowY: 'auto',
    borderRadius: radii.lg,
    padding: space.xs,
    outline: 'none',
  },
  list: {
    outline: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
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
  header: {
    paddingInline: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xs,
    fontSize: 12,
    fontWeight: 500,
    color: colors.textFaint,
  },
  separator: {
    height: 1,
    marginBlock: space.xs,
    backgroundColor: colors.border,
  },
})
