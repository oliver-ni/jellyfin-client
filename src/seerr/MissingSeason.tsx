import * as stylex from '@stylexjs/stylex'
import { motion as m } from 'motion/react'
import { fadeUp } from '@/lib/motion'
import { requestable, type Season, type TvDetails } from './api'
import { RequestButton } from './RequestButton'
import { SeasonStatus } from './SeasonStatus'
import { space } from '@/theme/tokens.stylex'

/** A season the library lacks: where Seerr has it, and the request that would fetch it. */
export function MissingSeason({ title, season }: { title: TvDetails; season: Season }) {
  return (
    <m.div
      key={season.number}
      initial="hidden"
      animate="show"
      variants={fadeUp}
      {...stylex.props(styles.root)}
    >
      <SeasonStatus season={season} />
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
  },
})
