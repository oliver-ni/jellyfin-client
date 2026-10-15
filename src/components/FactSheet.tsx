import * as stylex from '@stylexjs/stylex'
import { ArrowUpRight } from '@phosphor-icons/react'
import { focus } from '@/theme/focus'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

export interface Fact {
  label: string
  value: React.ReactNode
}

export interface WebLink {
  label: string
  url: string
}

/** Values stacked one per line. */
export function FactLines({ values }: { values: readonly string[] }) {
  return (
    <span {...stylex.props(styles.lines)}>
      {values.map((v) => (
        <span key={v}>{v}</span>
      ))}
    </span>
  )
}

export function FactLinks({ items }: { items: readonly WebLink[] }) {
  return (
    <span {...stylex.props(styles.links)}>
      {items.map((l) => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noreferrer"
          {...stylex.props(focus.ring, styles.link)}
        >
          {l.label}
          <ArrowUpRight size={12} />
        </a>
      ))}
    </span>
  )
}

/** `column` stacks facts for a sidebar; `grid` flows them across the page width. */
export function FactSheet({
  rows,
  layout = 'column',
}: {
  rows: Fact[]
  layout?: 'column' | 'grid'
}) {
  if (rows.length === 0) return null
  return (
    <dl {...stylex.props(styles.sheet, layout === 'grid' && styles.grid)}>
      {rows.map((f) => (
        <div key={f.label} {...stylex.props(styles.row)}>
          <dt {...stylex.props(styles.label)}>{f.label}</dt>
          <dd {...stylex.props(styles.value)}>{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

const styles = stylex.create({
  sheet: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: space.lg,
    margin: 0,
  },
  grid: {
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    columnGap: space.xxl,
    alignItems: 'start',
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: colors.textFaint,
  },
  value: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
    color: colors.text,
  },
  lines: {
    display: 'flex',
    flexDirection: 'column',
  },
  links: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.xxs,
    color: {
      default: colors.textMuted,
      ':hover': colors.text,
    },
    borderRadius: radii.xs,
    transitionProperty: 'color',
    transitionDuration: motion.fast,
  },
})
