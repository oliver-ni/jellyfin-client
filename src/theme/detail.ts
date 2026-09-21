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
    paddingInline: sizes.pageGutter,
    maxWidth: sizes.maxContent,
    marginInline: 'auto',
    width: '100%',
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
