import * as stylex from '@stylexjs/stylex'
import type { Progress as Value } from './labels'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

/**
 * A state over a thin bar: `Downloading episodes 3–5` over `42% · 12m left`, or `16 of 24
 * episodes` over what's coming for the rest. `title` is the tooltip, for release names.
 */
export function Progress({ value, title, size }: { value: Value; title?: string; size?: 'lg' }) {
  return (
    <span title={title} {...stylex.props(styles.root, size === 'lg' && styles.lg)}>
      {value.label}
      <span {...stylex.props(styles.detail)}>{value.detail}</span>
      <span {...stylex.props(styles.track)}>
        <span {...stylex.props(styles.bar)} style={{ width: `${value.fraction * 100}%` }} />
        {value.coming ? (
          <span
            {...stylex.props(styles.bar, styles.coming)}
            style={{ width: `${value.coming * 100}%` }}
          />
        ) : null}
      </span>
    </span>
  )
}

const styles = stylex.create({
  root: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: space.xxs,
    minWidth: 220,
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    color: colors.textMuted,
  },
  lg: {
    minWidth: 320,
    fontSize: 15,
  },
  detail: {
    marginBottom: space.xs,
  },
  track: {
    display: 'flex',
    width: '100%',
    height: 3,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
    overflow: 'hidden',
  },
  bar: {
    display: 'block',
    height: '100%',
    flexShrink: 0,
    backgroundColor: colors.progress,
    transitionProperty: 'width',
    transitionDuration: motion.slow,
    transitionTimingFunction: motion.ease,
  },
  coming: {
    opacity: 0.35,
  },
})
