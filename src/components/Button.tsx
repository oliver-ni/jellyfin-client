import * as stylex from '@stylexjs/stylex'
import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components'
import { focus } from '@/theme/focus'
import { colors, fonts, motion, radii, space } from '@/theme/tokens.stylex'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<AriaButtonProps, 'className' | 'style'> {
  variant?: ButtonVariant
  size?: ButtonSize
  style?: stylex.StyleXStyles
}

export function Button({ variant = 'secondary', size = 'md', style, ...props }: ButtonProps) {
  return (
    <AriaButton
      {...props}
      {...stylex.props(focus.ring, styles.base, variants[variant], sizes[size], style)}
    />
  )
}

const styles = stylex.create({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    fontFamily: fonts.sans,
    fontWeight: 600,
    lineHeight: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'solid',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    transitionProperty: 'background-color, border-color, color, transform, opacity',
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.ease,
    opacity: {
      default: 1,
      '[data-disabled]': 0.5,
    },
    cursor: {
      default: 'pointer',
      '[data-disabled]': 'not-allowed',
    },
    transform: {
      default: 'none',
      '[data-pressed]': 'scale(0.98)',
    },
  },
})

const variants = stylex.create({
  primary: {
    backgroundColor: {
      default: colors.accent,
      '[data-hovered]': colors.accentHover,
    },
    borderColor: 'transparent',
    color: colors.accentText,
  },
  secondary: {
    backgroundColor: {
      default: colors.surface,
      '[data-hovered]': colors.surfaceHover,
    },
    borderColor: colors.border,
    color: colors.text,
  },
  ghost: {
    backgroundColor: {
      default: 'transparent',
      '[data-hovered]': colors.surface,
    },
    borderColor: 'transparent',
    color: colors.textMuted,
  },
})

const sizes = stylex.create({
  sm: { height: 32, paddingInline: space.md, fontSize: 13 },
  md: { height: 40, paddingInline: space.lg, fontSize: 14 },
  lg: { height: 48, paddingInline: space.xl, fontSize: 15 },
})
