import * as stylex from '@stylexjs/stylex'
import type { Download } from './api'
import { progress } from './labels'
import { text } from '@/theme/text'
import { colors, radii, space } from '@/theme/tokens.stylex'

/**
 * What Radarr/Sonarr is pulling: state, percentage and time left over a thin bar; nothing when
 * idle. `titled` also names the releases, on the same line, for where there's room.
 */
export function Progress({ downloads, titled }: { downloads: Download[]; titled?: boolean }) {
  const p = progress(downloads)
  if (!p) return null
  return (
    <span {...stylex.props(styles.root)}>
      <span {...stylex.props(styles.line)}>
        {titled && (
          <span {...stylex.props(styles.titles)}>
            {downloads.map((d) => (
              <span key={d.title} {...stylex.props(text.ellipsis)}>
                {d.title}
              </span>
            ))}
          </span>
        )}
        <span {...stylex.props(styles.text)}>{p.text}</span>
      </span>
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
    fontSize: 13,
  },
  line: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: space.md,
  },
  titles: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    color: colors.text,
  },
  text: {
    marginLeft: 'auto',
    whiteSpace: 'nowrap',
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
