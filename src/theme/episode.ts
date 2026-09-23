import * as stylex from '@stylexjs/stylex'
import { colors, radii, space } from './tokens.stylex'

export const STILL_WIDTH = 224

/** An episode row — still beside number, title, date and synopsis — shared by owned and missing seasons. */
export const episode = stylex.create({
  list: {
    display: 'flex',
    flexDirection: 'column',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: {
      default: `${STILL_WIDTH}px minmax(0, 1fr)`,
      '@media (max-width: 720px)': '128px minmax(0, 1fr)',
    },
    gap: space.lg,
    alignItems: 'start',
    paddingBlock: space.lg,
    paddingInline: space.md,
    marginInline: `calc(-1 * ${space.md})`,
    borderRadius: radii.md,
  },
  still: {
    position: 'relative',
    display: 'block',
    aspectRatio: '16 / 9',
    borderRadius: radii.xs,
    overflow: 'hidden',
    backgroundColor: colors.skeleton,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    minWidth: 0,
  },
  heading: {
    display: 'flex',
    alignItems: 'baseline',
    gap: space.sm,
    color: colors.text,
  },
  number: {
    flexShrink: 0,
    minWidth: 20,
    fontSize: 14,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    color: colors.textFaint,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  sub: {
    fontSize: 13,
    color: colors.textFaint,
  },
  overview: {
    fontSize: 14,
    lineHeight: 1.5,
    color: colors.textMuted,
    marginTop: space.xs,
  },
  skeleton: {
    height: 320,
    borderRadius: radii.md,
    backgroundColor: colors.skeleton,
  },
})
