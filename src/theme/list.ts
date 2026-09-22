import * as stylex from '@stylexjs/stylex'
import { colors, sizes, space } from './tokens.stylex'

/** Page chrome shared by the list pages (library, requests): a title row over a column of content. */
export const list = stylex.create({
  /** Pair with a route style setting `maxWidth`. */
  page: {
    paddingInline: sizes.pageGutter,
    paddingTop: `calc(${sizes.navHeight} + ${space.xxl})`,
    paddingBottom: space.xxxl,
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
    marginInline: 'auto',
    width: '100%',
  },
  head: {
    display: 'flex',
    alignItems: 'baseline',
    gap: space.md,
  },
  title: {
    fontSize: 'clamp(28px, 3vw, 40px)',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1.05,
  },
  /** Counts and section labels beside the title. */
  faint: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.textFaint,
    letterSpacing: '0.02em',
  },
})
