import * as stylex from '@stylexjs/stylex'
import { CaretDown, Check } from '@phosphor-icons/react'
import {
  Button as AriaButton,
  Select as AriaSelect,
  ListBox,
  ListBoxItem,
  Popover,
  SelectValue,
  type Key,
} from 'react-aria-components'
import { colors } from '@/theme/tokens.stylex'
import { focus } from '@/theme/focus'
import { glass, overlay } from '@/theme/glass'
import { menu } from '@/theme/menu'
import { toolbarControl } from './toolbar-styles'

export interface SelectOption<K extends Key> {
  key: K
  label: string
}

export interface SelectProps<K extends Key> {
  /** Small label rendered before the value, e.g. "Sort". */
  label?: string
  'aria-label': string
  value: K
  options: readonly SelectOption<K>[]
  onChange: (key: K) => void
}

/** Compact text-style dropdown ("Sort  Recently added ⌄") for toolbars. */
export function Select<K extends Key>({
  label,
  value,
  options,
  onChange,
  ...rest
}: SelectProps<K>) {
  return (
    <AriaSelect
      aria-label={rest['aria-label']}
      selectedKey={value}
      onSelectionChange={(k) => {
        if (k != null) onChange(k as K)
      }}
      {...stylex.props(styles.root)}
    >
      <AriaButton {...stylex.props(focus.ring, glass.surface, toolbarControl.trigger)}>
        {label && <span {...stylex.props(styles.label)}>{label}</span>}
        <SelectValue {...stylex.props(styles.value)} />
        <CaretDown size={14} {...stylex.props(styles.chevron)} />
      </AriaButton>
      <Popover
        placement="bottom start"
        offset={6}
        {...stylex.props(glass.panel, overlay.popover, menu.popover)}
      >
        <ListBox items={options} {...stylex.props(menu.list)}>
          {(opt) => (
            <ListBoxItem id={opt.key} textValue={opt.label} {...stylex.props(menu.item)}>
              {({ isSelected }) => (
                <>
                  <span {...stylex.props(menu.check)}>
                    {isSelected && <Check size={14} weight="bold" />}
                  </span>
                  {opt.label}
                </>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaSelect>
  )
}

const styles = stylex.create({
  root: {
    display: 'inline-flex',
  },
  label: {
    color: colors.textFaint,
  },
  value: {
    color: 'inherit',
  },
  chevron: {
    opacity: 0.6,
  },
})
