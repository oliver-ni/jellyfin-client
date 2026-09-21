import * as stylex from '@stylexjs/stylex'
import { animate, motion as m, useMotionValue } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { ToggleButton, type ToggleButtonProps } from 'react-aria-components'
import { springs } from '@/lib/motion'
import { focus } from '@/theme/focus'
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
    <ToggleButton
      {...props}
      {...stylex.props(focus.ring, styles.base, onMedia ? styles.media : styles.plain)}
    >
      {({ isSelected }) => <PopIcon selected={isSelected}>{children}</PopIcon>}
    </ToggleButton>
  )
}

/** Springs the icon from small to full size whenever `selected` flips. */
function PopIcon({ selected, children }: { selected: boolean; children: ReactNode }) {
  const scale = useMotionValue(1)
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const controls = animate(scale, [0.55, 1], springs.bouncy)
    return () => controls.stop()
  }, [selected, scale])
  return (
    <m.span style={{ scale }} {...stylex.props(styles.icon)}>
      {children}
    </m.span>
  )
}

const styles = stylex.create({
  icon: {
    display: 'grid',
    placeItems: 'center',
  },
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
