import * as stylex from '@stylexjs/stylex'
import { ArrowLeft } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import type { ReactNode } from 'react'
import { usePlayerState } from '../context'
import { spring } from '../motion'
import { player } from '../tokens.stylex'
import { ControlButton } from './ControlButton'

export interface TopBarProps {
  title?: ReactNode
  subtitle?: ReactNode
  onBack?: () => void
}

export function TopBar({ title, subtitle, onBack }: TopBarProps) {
  const visible = usePlayerState((s) => s.controlsVisible)
  return (
    <m.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -12 }}
      transition={spring.gentle}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
      {...stylex.props(styles.bar)}
    >
      <div {...stylex.props(styles.row)}>
        {onBack && (
          <ControlButton label="Back" shortcut="Esc" size="lg" onPress={onBack}>
            <ArrowLeft size={22} weight="bold" />
          </ControlButton>
        )}
        {(title || subtitle) && (
          <div {...stylex.props(styles.titles)}>
            {subtitle && <div {...stylex.props(styles.subtitle)}>{subtitle}</div>}
            {title && <h1 {...stylex.props(styles.title)}>{title}</h1>}
          </div>
        )}
      </div>
    </m.div>
  )
}

const styles = stylex.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingBottom: 72,
    paddingInline: 20,
    backgroundImage: player.scrimTop,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  titles: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: 500,
    color: player.textMuted,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
})
