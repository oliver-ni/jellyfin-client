import * as stylex from '@stylexjs/stylex'
import { Button, Tooltip, TooltipTrigger, type ButtonProps } from 'react-aria-components'
import { usePlayerContext } from '../context'
import { player } from '../tokens.stylex'

export interface ControlButtonProps extends Omit<ButtonProps, 'className' | 'style' | 'children'> {
  label: string
  /** Keyboard shortcut shown in the tooltip. */
  shortcut?: string
  children: React.ReactNode
  size?: 'md' | 'lg'
  active?: boolean
}

/** Icon button for the control bar, with a tooltip that stays inside the player (fullscreen-safe). */
export function ControlButton({
  label,
  shortcut,
  children,
  size = 'md',
  active,
  ...props
}: ControlButtonProps) {
  const { container } = usePlayerContext()
  return (
    <TooltipTrigger delay={600} closeDelay={0}>
      <Button
        aria-label={label}
        {...props}
        {...stylex.props(styles.button, size === 'lg' && styles.lg, active && styles.active)}
      >
        <span {...stylex.props(styles.icon)}>{children}</span>
      </Button>
      <Tooltip
        placement="top"
        offset={10}
        UNSTABLE_portalContainer={container.current ?? undefined}
        {...stylex.props(controlStyles.tooltip)}
      >
        {label}
        {shortcut && <kbd {...stylex.props(styles.kbd)}>{shortcut}</kbd>}
      </Tooltip>
    </TooltipTrigger>
  )
}

const controlStyles = stylex.create({
  tooltip: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    paddingInline: 10,
    paddingBlock: 6,
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.2,
    color: player.text,
    backgroundColor: player.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: player.border,
    borderRadius: player.radiusSm,
    boxShadow: player.shadow,
    backdropFilter: 'blur(16px)',
    whiteSpace: 'nowrap',
    // Entering: React Aria sets data-entering/data-exiting for animation hooks.
    opacity: { default: 1, '[data-entering]': 0, '[data-exiting]': 0 },
    transform: {
      default: 'translateY(0)',
      '[data-entering]': 'translateY(4px)',
      '[data-exiting]': 'translateY(4px)',
    },
    transitionProperty: 'opacity, transform',
    transitionDuration: '160ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
  },
})

const styles = stylex.create({
  button: {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    width: 40,
    height: 40,
    color: {
      default: player.textMuted,
      '[data-hovered]': player.text,
      '[data-pressed]': player.text,
    },
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: player.radiusSm,
    cursor: 'pointer',
    outlineStyle: { default: 'none', '[data-focus-visible]': 'solid' },
    outlineWidth: 2,
    outlineColor: player.focusRing,
    outlineOffset: -2,
    transitionProperty: 'color, transform',
    transitionDuration: '120ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
    transform: {
      default: 'scale(1)',
      '[data-pressed]': 'scale(0.92)',
    },
  },
  lg: {
    width: 48,
    height: 48,
  },
  active: {
    color: player.text,
    '::after': {
      content: '""',
      position: 'absolute',
      bottom: 6,
      left: '50%',
      width: 16,
      height: 2,
      marginLeft: -8,
      borderRadius: 1,
      backgroundColor: player.accent,
    },
  },
  icon: {
    display: 'grid',
    placeItems: 'center',
  },
  kbd: {
    fontFamily: 'inherit',
    fontSize: 11,
    color: player.textFaint,
    paddingInline: 5,
    paddingBlock: 1,
    borderRadius: 4,
    backgroundColor: player.surfaceHover,
  },
})
