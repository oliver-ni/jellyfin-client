import * as stylex from '@stylexjs/stylex'
import type { Download } from './api'
import { progress } from './labels'
import { colors, radii, space } from '@/theme/tokens.stylex'

/** Percentage, time left and a thin bar for what Radarr/Sonarr is pulling; nothing when idle. */
export function Progress({ downloads }: { downloads: Download[] }) {
  const p = progress(downloads)
  if (!p) return null
  return (
    <span {...stylex.props(styles.root)}>
      <span {...stylex.props(styles.text)}>{p.text}</span>
      <span {...stylex.props(styles.track)}>
        <span {...stylex.props(styles.bar)} style={{ width: `${p.fraction * 100}%` }} />
      </span>
    </span>
  )
}

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    width: '100%',
  },
  text: {
    fontSize: 13,
    color: colors.textMuted,
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
  },
})
