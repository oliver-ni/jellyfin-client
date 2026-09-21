import * as stylex from '@stylexjs/stylex'
import { ToggleButton, type ToggleButtonProps } from 'react-aria-components'
import { colors, motion, radii } from '@/theme/tokens.stylex'

export interface IconToggleProps extends Omit<
  ToggleButtonProps,
  'className' | 'style' | 'children'
> {
  'aria-label': string
  children: React.ReactNode
  /** Frosted glass look for use over artwork. */
  onMedia?: boolean
}

/** Round icon toggle (favorite, watched, ...). */
export function IconToggle({ onMedia, children, ...props }: IconToggleProps) {
  return (
    <ToggleButton {...props} {...stylex.props(styles.base, onMedia ? styles.media : styles.plain)}>
      {children}
    </ToggleButton>
  )
}

const styles = stylex.create({
  base: {
    display: 'grid',
    placeItems: 'center',
    width: 46,
    height: 46,
    borderRadius: radii.full,
    borderWidth: 1,
    borderStyle: 'solid',
    cursor: 'pointer',
    transitionProperty: 'background-color, color, border-color, transform',
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.ease,
    transform: {
      default: 'none',
      '[data-pressed]': 'scale(0.94)',
    },
    outlineStyle: { default: 'none', '[data-focus-visible]': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 3,
  },
  media: {
    color: {
      default: colors.heroText,
      '[data-selected]': colors.accentText,
    },
    backgroundColor: {
      default: colors.heroSurface,
      '[data-hovered]': colors.heroBorder,
      '[data-selected]': colors.accent,
    },
    borderColor: {
      default: colors.heroBorder,
      '[data-selected]': colors.accent,
    },
    backdropFilter: 'blur(12px)',
  },
  plain: {
    color: {
      default: colors.textMuted,
      '[data-hovered]': colors.text,
      '[data-selected]': colors.accentText,
    },
    backgroundColor: {
      default: colors.surface,
      '[data-hovered]': colors.surfaceHover,
      '[data-selected]': colors.accent,
    },
    borderColor: {
      default: colors.border,
      '[data-selected]': colors.accent,
    },
  },
})
