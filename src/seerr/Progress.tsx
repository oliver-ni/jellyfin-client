import * as stylex from '@stylexjs/stylex'
import type { Download } from './api'
import { progress } from './labels'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

/**
 * What Radarr/Sonarr is pulling — `Downloading · 42% · 12m left` — over a thin bar; nothing when
 * idle. Release names sit in the tooltip.
 */
export function Progress({ downloads, size }: { downloads: Download[]; size?: 'lg' }) {
  const p = progress(downloads)
  if (!p) return null
  return (
    <span
      title={downloads.map((d) => d.title).join('\n')}
      {...stylex.props(styles.root, size === 'lg' && styles.lg)}
    >
      {p.text}
      <span {...stylex.props(styles.track)}>
        <span {...stylex.props(styles.bar)} style={{ width: `${p.fraction * 100}%` }} />
      </span>
    </span>
  )
}

const styles = stylex.create({
  root: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: space.xs,
    width: 220,
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    color: colors.textMuted,
  },
  lg: {
    width: 320,
    fontSize: 15,
  },
  track: {
    width: '100%',
    height: 3,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
    overflow: 'hidden',
  },
  bar: {
    display: 'block',
    height: '100%',
    backgroundColor: colors.progress,
    transitionProperty: 'width',
    transitionDuration: motion.slow,
    transitionTimingFunction: motion.ease,
  },
})
