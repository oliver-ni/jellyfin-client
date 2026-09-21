import * as stylex from '@stylexjs/stylex'
import { CaretDown, Check } from '@phosphor-icons/react'
import {
  Button as AriaButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  ToggleButton,
  type Key,
} from 'react-aria-components'
import { colors, radii, space } from '@/theme/tokens.stylex'
import { glass, overlay } from '@/theme/glass'
import { toolbarControl } from './toolbar-styles'

export interface FilterMenuProps<K extends Key> {
  label: string
  options: readonly { key: K; label: string }[]
  selected: readonly K[]
  onChange: (keys: K[]) => void
  emptyMessage?: string
}

/** Multi-select dropdown for a filter facet (genres, years). Shows a count badge when active. */
export function FilterMenu<K extends Key>({
  label,
  options,
  selected,
  onChange,
  emptyMessage = 'Nothing to filter by',
}: FilterMenuProps<K>) {
  const active = selected.length > 0
  return (
    <MenuTrigger>
      <AriaButton
        {...stylex.props(glass.surface, toolbarControl.trigger)}
        data-selected={active || undefined}
      >
        {label}
        {active && <span {...stylex.props(styles.badge)}>{selected.length}</span>}
        <CaretDown size={14} {...stylex.props(styles.chevron)} />
      </AriaButton>
      <Popover
        placement="bottom start"
        offset={6}
        {...stylex.props(glass.panel, overlay.popover, toolbarControl.popover)}
      >
        {options.length === 0 ? (
          <div {...stylex.props(styles.empty)}>{emptyMessage}</div>
        ) : (
          <Menu
            items={options}
            selectionMode="multiple"
            selectedKeys={selected}
            onSelectionChange={(keys) => {
              if (keys === 'all') onChange(options.map((o) => o.key))
              else onChange([...keys] as K[])
            }}
            {...stylex.props(styles.menu)}
          >
            {(opt) => (
              <MenuItem id={opt.key} textValue={opt.label} {...stylex.props(toolbarControl.item)}>
                {({ isSelected }) => (
                  <>
                    <span {...stylex.props(toolbarControl.check)}>
                      {isSelected && <Check size={14} weight="bold" />}
                    </span>
                    {opt.label}
                  </>
                )}
              </MenuItem>
            )}
          </Menu>
        )}
        {active && (
          <button type="button" onClick={() => onChange([])} {...stylex.props(styles.clear)}>
            Clear
          </button>
        )}
      </Popover>
    </MenuTrigger>
  )
}

export interface FilterToggleProps {
  children: string
  selected: boolean
  onChange: (selected: boolean) => void
}

/** Boolean filter chip (Unplayed, Favorites). */
export function FilterToggle({ children, selected, onChange }: FilterToggleProps) {
  return (
    <ToggleButton
      isSelected={selected}
      onChange={onChange}
      {...stylex.props(glass.surface, toolbarControl.trigger)}
    >
      {children}
    </ToggleButton>
  )
}

const styles = stylex.create({
  badge: {
    display: 'grid',
    placeItems: 'center',
    minWidth: 18,
    height: 18,
    paddingInline: 5,
    marginLeft: 2,
    fontSize: 11,
    fontWeight: 600,
    color: colors.accentText,
    backgroundColor: colors.accent,
    borderRadius: radii.full,
  },
  chevron: {
    opacity: 0.6,
  },
  menu: {
    outline: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  empty: {
    paddingInline: space.md,
    paddingBlock: space.sm,
    fontSize: 13,
    color: colors.textMuted,
  },
  clear: {
    width: '100%',
    marginTop: space.xs,
    paddingBlock: 7,
    fontSize: 12,
    fontWeight: 500,
    color: colors.textMuted,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: colors.border,
    borderRadius: 0,
    cursor: 'pointer',
    backgroundColor: 'transparent',
  },
})
