import * as stylex from '@stylexjs/stylex'
import type { Download } from './api'
import { progress } from './labels'
import { statusPill } from '@/theme/status'
import { colors, motion } from '@/theme/tokens.stylex'

/**
 * What Radarr/Sonarr is pulling — `Downloading · 42% · 12m left` — as a pill that fills up as it
 * lands; nothing when idle. Release names sit in the tooltip.
 */
export function Progress({ downloads, size }: { downloads: Download[]; size?: 'lg' }) {
  const p = progress(downloads)
  if (!p) return null
  return (
    <span
      title={downloads.map((d) => d.title).join('\n')}
      {...stylex.props(statusPill.base, size === 'lg' && statusPill.lg)}
    >
      <span {...stylex.props(styles.fill)} style={{ width: `${p.fraction * 100}%` }} />
      <span {...stylex.props(styles.text)}>{p.text}</span>
    </span>
  )
}

const styles = stylex.create({
  fill: {
    position: 'absolute',
    insetBlock: 0,
    left: 0,
    backgroundColor: colors.surfaceHover,
    transitionProperty: 'width',
    transitionDuration: motion.slow,
    transitionTimingFunction: motion.ease,
  },
  text: {
    position: 'relative',
    color: colors.text,
  },
})
