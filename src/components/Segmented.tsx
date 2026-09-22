import * as stylex from '@stylexjs/stylex'
import { motion as m } from 'motion/react'
import { useId } from 'react'
import { ToggleButton, ToggleButtonGroup, type Key } from 'react-aria-components'
import { springs } from '@/lib/motion'
import { focus } from '@/theme/focus'
import { glass } from '@/theme/glass'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

export interface SegmentedProps<K extends Key> {
  label: string
  options: readonly { key: K; label: string }[]
  selected: K
  onChange: (key: K) => void
}

/** Glass capsule picking one of a few options; one tab stop, arrow keys move between them. */
export function Segmented<K extends Key>({
  label,
  options,
  selected,
  onChange,
}: SegmentedProps<K>) {
  const pill = useId()
  return (
    <ToggleButtonGroup
      aria-label={label}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[selected]}
      onSelectionChange={(keys) => {
        const next = options.find((o) => keys.has(o.key))
        if (next) onChange(next.key)
      }}
      {...stylex.props(glass.surface, styles.group)}
    >
      {options.map((o) => (
        <ToggleButton
          key={o.key}
          id={o.key}
          {...stylex.props(focus.ring, styles.option, o.key === selected && styles.selected)}
        >
          {o.key === selected && (
            <m.span
              layoutId={pill}
              layoutCrossfade={false}
              transition={springs.gentle}
              {...stylex.props(styles.pill)}
            />
          )}
          <span {...stylex.props(styles.label)}>{o.label}</span>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}

const styles = stylex.create({
  group: {
    display: 'inline-flex',
    padding: 3,
    borderRadius: radii.full,
  },
  option: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    height: 30,
    paddingInline: space.md,
    fontSize: 13,
    fontWeight: 500,
    color: {
      default: colors.textMuted,
      '[data-hovered]': colors.text,
    },
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: radii.full,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transitionProperty: 'color',
    transitionDuration: motion.fast,
  },
  selected: {
    color: {
      default: colors.accentText,
      '[data-hovered]': colors.accentText,
    },
  },
  pill: {
    position: 'absolute',
    inset: 0,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  label: {
    position: 'relative',
  },
})
