import * as stylex from '@stylexjs/stylex'
import { colors, radii, space } from './tokens.stylex'

/** Read-only status pills beside a season or title: a state, or a download and how far along it is. */
export const statusPill = stylex.create({
  base: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
    height: 32,
    paddingInline: space.md,
    borderRadius: radii.full,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    color: colors.textMuted,
    backgroundColor: colors.surface,
    boxShadow: `inset 0 0 0 1px ${colors.border}`,
    overflow: 'hidden',
  },
  lg: {
    height: 46,
    paddingInline: space.xl,
    fontSize: 15,
  },
})
