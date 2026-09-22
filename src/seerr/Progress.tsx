import * as stylex from '@stylexjs/stylex'
import type { Download } from './api'
import { progress } from './labels'
import { text } from '@/theme/text'
import { colors, radii, space } from '@/theme/tokens.stylex'

/**
 * State, percentage, time left and a thin bar for what Radarr/Sonarr is pulling; nothing when
 * idle. `titled` also names the releases, for where there's room.
 */
export function Progress({ downloads, titled }: { downloads: Download[]; titled?: boolean }) {
  const p = progress(downloads)
  if (!p) return null
  return (
    <span {...stylex.props(styles.root)}>
      {titled &&
        downloads.map((d) => (
          <span key={d.title} {...stylex.props(text.ellipsis, styles.title)}>
            {d.title}
          </span>
        ))}
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
  title: {
    fontSize: 13,
    color: colors.text,
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
