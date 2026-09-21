import * as stylex from '@stylexjs/stylex'
import { Check } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import {
  Header,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
  type Key,
} from 'react-aria-components'
import { usePlayerContext, usePlayerState } from '../context'
import type { PlayerMenu } from '../store'
import { player } from '../tokens.stylex'

interface PlayerMenuTriggerProps {
  id: Exclude<PlayerMenu, null>
  /** The `ControlButton` that opens the menu. */
  children: ReactNode
  menu: ReactNode
}

/** Wraps a control button with a popover menu tracked in the player store (one open at a time). */
export function PlayerMenuTrigger({ id, children, menu }: PlayerMenuTriggerProps) {
  const { store, container } = usePlayerContext()
  const open = usePlayerState((s) => s.menu === id)
  return (
    <MenuTrigger
      isOpen={open}
      onOpenChange={(next) => {
        if (next) store.setState({ menu: id })
        else if (store.getState().menu === id) store.setState({ menu: null })
      }}
    >
      {children}
      <Popover
        placement="top end"
        offset={14}
        UNSTABLE_portalContainer={container.current ?? undefined}
        {...stylex.props(menuStyles.popover)}
      >
        {menu}
      </Popover>
    </MenuTrigger>
  )
}

interface Option {
  id: string
  label: string
  detail?: string
}

interface OptionSectionProps {
  title: string
  options: Option[]
  selected: string | null
  onSelect: (id: string) => void
  /** Rendered as the first option; selecting it calls `onSelect(NONE_KEY)`. */
  none?: string
}

export const NONE_KEY = '__none__'

export function OptionSection({ title, options, selected, onSelect, none }: OptionSectionProps) {
  const items = none ? [{ id: NONE_KEY, label: none }, ...options] : options
  const selectedKey = selected ?? (none ? NONE_KEY : null)
  return (
    <MenuSection
      selectionMode="single"
      selectedKeys={selectedKey ? [selectedKey] : []}
      onSelectionChange={(keys) => {
        if (keys === 'all') return
        const key = keys.values().next().value as Key | undefined
        if (key != null) onSelect(String(key))
      }}
      {...stylex.props(styles.section)}
    >
      <Header {...stylex.props(styles.header)}>{title}</Header>
      {items.map((opt) => (
        <MenuItem key={opt.id} id={opt.id} textValue={opt.label} {...stylex.props(styles.item)}>
          {({ isSelected }) => (
            <>
              <span {...stylex.props(styles.check, isSelected && styles.checkOn)}>
                <Check size={14} weight="bold" />
              </span>
              <span {...stylex.props(styles.itemLabel)}>{opt.label}</span>
              {opt.detail && <span {...stylex.props(styles.detail)}>{opt.detail}</span>}
            </>
          )}
        </MenuItem>
      ))}
    </MenuSection>
  )
}

export function PlayerMenuList({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Menu aria-label={label} {...stylex.props(styles.menu)}>
      {children}
    </Menu>
  )
}

const menuStyles = stylex.create({
  popover: {
    minWidth: 240,
    maxWidth: 360,
    maxHeight: 'min(60vh, 480px)',
    display: 'flex',
    flexDirection: 'column',
    color: player.text,
    fontFamily: player.font,
    backgroundColor: player.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: player.border,
    borderRadius: player.radiusLg,
    boxShadow: player.shadow,
    backdropFilter: 'blur(24px) saturate(1.4)',
    overflow: 'hidden',
    transformOrigin: 'bottom right',
    opacity: { default: 1, '[data-entering]': 0, '[data-exiting]': 0 },
    transform: {
      default: 'translateY(0) scale(1)',
      '[data-entering]': 'translateY(6px) scale(0.98)',
      '[data-exiting]': 'translateY(6px) scale(0.98)',
    },
    transitionProperty: 'opacity, transform',
    transitionDuration: { default: '200ms', '[data-exiting]': '140ms' },
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
  },
})

const styles = stylex.create({
  menu: {
    outline: 'none',
    overflowY: 'auto',
    paddingBlock: 6,
  },
  section: {
    paddingBlock: 4,
    borderTopWidth: { default: 1, ':first-child': 0 },
    borderTopStyle: 'solid',
    borderTopColor: player.border,
  },
  header: {
    paddingInline: 14,
    paddingBlock: 8,
    fontSize: 12,
    fontWeight: 500,
    color: player.textFaint,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginInline: 6,
    paddingInline: 8,
    paddingBlock: 8,
    fontSize: 14,
    lineHeight: 1.25,
    borderRadius: player.radiusSm,
    cursor: 'pointer',
    outline: 'none',
    color: { default: player.textMuted, '[data-selected]': player.text },
    backgroundColor: {
      default: 'transparent',
      '[data-focused]': player.surfaceHover,
      '[data-pressed]': player.surfaceHover,
    },
  },
  check: {
    display: 'grid',
    placeItems: 'center',
    width: 16,
    color: player.accent,
    opacity: 0,
    scale: 0.6,
    transitionProperty: 'opacity, scale',
    transitionDuration: '140ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
  },
  checkOn: {
    opacity: 1,
    scale: 1,
  },
  itemLabel: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  detail: {
    fontSize: 12,
    color: player.textFaint,
    whiteSpace: 'nowrap',
  },
})
