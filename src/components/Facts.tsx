import * as stylex from '@stylexjs/stylex'
import { motion as m, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { text } from '@/theme/text'

export interface FactsProps extends Omit<HTMLMotionProps<'p'>, 'children' | 'style'> {
  /** Falsy entries are skipped. */
  items: readonly ReactNode[]
  style?: stylex.StyleXStyles
}

/** A line of short facts separated by dots, e.g. "Film · 2019 · PG-13 · 2h 3m". */
export function Facts({ items, style, ...props }: FactsProps) {
  const shown = items.filter(Boolean)
  if (shown.length === 0) return null
  return (
    <m.p {...props} {...stylex.props(styles.line, style)}>
      {shown.map((fact, i) => (
        <span key={i} {...stylex.props(styles.item)}>
          {i > 0 && <span {...stylex.props(text.dot)}>·</span>}
          {fact}
        </span>
      ))}
    </m.p>
  )
}

const styles = stylex.create({
  line: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  item: {
    display: 'inline-flex',
    alignItems: 'center',
  },
})
