import * as stylex from '@stylexjs/stylex'
import { colors, sizes, space } from './tokens.stylex'

/** Page chrome shared by the detail pages (library item, Seerr title) under `DetailHero`. */
export const detail = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxl,
    paddingBottom: space.xxxl,
  },
  heroSkeleton: {
    minHeight: 'clamp(460px, 72vh, 820px)',
    backgroundImage: `linear-gradient(to top, ${colors.bg}, ${colors.skeleton})`,
  },
  /** Content column under the hero. */
  body: {
    paddingInlineStart: sizes.gutterStart,
    paddingInlineEnd: sizes.pageGutter,
    maxWidth: sizes.maxContent,
    marginInline: 'auto',
    width: '100%',
  },
  /** `body` as a grid: one column, or with `split` a main column beside a 300px fact sheet. */
  columns: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    columnGap: space.xxxl,
    rowGap: space.xl,
    alignItems: 'start',
  },
  split: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr) 300px',
      '@media (max-width: 1024px)': 'minmax(0, 1fr)',
    },
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxl,
    minWidth: 0,
  },
  /** The fact sheet beside `main`; follows the scroll while the layout is split. */
  aside: {
    position: {
      default: 'sticky',
      '@media (max-width: 1024px)': 'static',
    },
    top: `calc(${sizes.navHeight} + ${space.lg})`,
  },
  overview: {
    fontSize: 16,
    lineHeight: 1.6,
    color: colors.textMuted,
    maxWidth: 760,
    whiteSpace: 'pre-line',
  },
  /** Wraps a `Notice` standing in for the whole page, clear of the floating header. */
  state: {
    paddingTop: sizes.navHeight,
  },
})
