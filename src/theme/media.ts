import * as stylex from '@stylexjs/stylex'
import { colors, motion, radii, space } from './tokens.stylex'

/** Pieces layered over artwork: the image itself, the hover scrim, badges and progress. */
export const media = stylex.create({
  fill: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  /** Scrim that appears when the nearest hovered ancestor is hovered; centres its children. */
  hoverScrim: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: colors.scrim,
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover')]: 1,
    },
    transitionProperty: 'opacity',
    transitionDuration: motion.base,
    transitionTimingFunction: motion.ease,
  },
  playBadge: {
    display: 'grid',
    placeItems: 'center',
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.onMediaBg,
    color: colors.onMediaText,
  },
  /** Small pill in the top-right corner (unplayed count, watched check). */
  cornerBadge: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    display: 'grid',
    placeItems: 'center',
    minWidth: 22,
    height: 22,
    paddingInline: 6,
    fontSize: 11,
    fontWeight: 700,
    color: colors.onMediaText,
    backgroundColor: colors.onMediaBg,
    borderRadius: radii.full,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: colors.scrim,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.progress,
  },
})

/** Accent-filled play link used on heroes and episode rows. */
export const playPill = stylex.create({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
    height: 46,
    paddingInline: space.xl,
    borderRadius: radii.full,
    fontSize: 15,
    fontWeight: 600,
    color: colors.accentText,
    backgroundColor: {
      default: colors.accent,
      ':hover': colors.accentHover,
    },
    transitionProperty: 'background-color, transform',
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.ease,
    transform: {
      default: 'none',
      ':active': 'scale(0.98)',
    },
    outlineOffset: 3,
  },
  small: {
    height: 36,
    paddingInline: space.lg,
    fontSize: 14,
  },
  /** Translucent variant for secondary actions and status pills on hero art. */
  secondary: {
    color: colors.heroText,
    backgroundColor: {
      default: colors.heroSurface,
      ':hover': colors.heroSurface,
    },
    boxShadow: `inset 0 0 0 1px ${colors.heroBorder}`,
  },
})
