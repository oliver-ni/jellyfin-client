import * as stylex from '@stylexjs/stylex'
import { motion as m } from 'motion/react'
import { fadeUp } from '@/lib/motion'
import { requestable, type Season, type TvDetails } from './api'
import { AVAILABILITY_LABEL } from './labels'
import { Progress } from './Progress'
import { RequestButton } from './RequestButton'
import { colors, space } from '@/theme/tokens.stylex'

/** A season the library lacks: where Seerr has it, and the request that would fetch it. */
export function MissingSeason({ title, season }: { title: TvDetails; season: Season }) {
  const episodes = `${season.episodeCount} ${season.episodeCount === 1 ? 'episode' : 'episodes'}`
  return (
    <m.div
      key={season.number}
      initial="hidden"
      animate="show"
      variants={fadeUp}
      {...stylex.props(styles.root)}
    >
      <p {...stylex.props(styles.meta)}>
        {episodes} · {AVAILABILITY_LABEL[season.availability] ?? 'Not in your library'}
      </p>
      <Progress downloads={season.downloads} />
      {requestable(season.availability) && (
        <RequestButton title={title} seasons={[season.number]}>
          Request {season.name.toLowerCase()}
        </RequestButton>
      )}
    </m.div>
  )
}

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: space.md,
    maxWidth: 480,
  },
  meta: {
    fontSize: 15,
    color: colors.textMuted,
  },
})
