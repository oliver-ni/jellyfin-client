import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { requestable, type Season } from './api'
import { AVAILABILITY_ICON, AVAILABILITY_LABEL, seasonLabel } from './labels'
import { Progress } from './Progress'
import { statusPill } from '@/theme/status'
import { colors, space } from '@/theme/tokens.stylex'

/**
 * The line over a season's episodes: how much of it is here, and to the right what Seerr is
 * doing about the rest — its download, its state, or the caller's `request` when it's still open.
 */
export function SeasonHeader({
  season,
  owned = 0,
  request,
}: {
  season: Season
  owned?: number
  request?: ReactNode
}) {
  return (
    <div {...stylex.props(styles.root)}>
      <p {...stylex.props(styles.meta)}>{seasonLabel(season, owned)}</p>
      {season.downloads.length > 0 ? (
        <Progress downloads={season.downloads} episodeCount={season.episodeCount} />
      ) : requestable(season.availability) ? (
        request
      ) : (
        <StatePill availability={season.availability} />
      )}
    </div>
  )
}

function StatePill({ availability }: { availability: Season['availability'] }) {
  const Icon = AVAILABILITY_ICON[availability]
  const label = AVAILABILITY_LABEL[availability]
  if (!Icon || !label) return null
  return (
    <span {...stylex.props(statusPill.base)}>
      <Icon size={14} weight="bold" aria-hidden />
      {label}
    </span>
  )
}

const styles = stylex.create({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.md,
    minHeight: 32,
  },
  meta: {
    fontSize: 15,
    color: colors.textMuted,
  },
})
