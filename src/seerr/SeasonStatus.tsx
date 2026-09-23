import * as stylex from '@stylexjs/stylex'
import type { Season } from './api'
import { seasonLabel } from './labels'
import { Progress } from './Progress'
import { colors, space } from '@/theme/tokens.stylex'

/** Where a season stands: how much of it the library holds, and what Seerr is doing about the rest. */
export function SeasonStatus({ season, owned = 0 }: { season: Season; owned?: number }) {
  return (
    <div {...stylex.props(styles.root)}>
      <p {...stylex.props(styles.meta)}>{seasonLabel(season, owned)}</p>
      <Progress downloads={season.downloads} titled />
    </div>
  )
}

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    width: '100%',
    maxWidth: 480,
  },
  meta: {
    fontSize: 15,
    color: colors.textMuted,
  },
})
