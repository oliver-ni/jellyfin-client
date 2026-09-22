import * as stylex from '@stylexjs/stylex'
import { Plus } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { motion as m } from 'motion/react'
import { Button } from '@/components/Button'
import { fadeUp } from '@/lib/motion'
import { requestable, type Season, type TvDetails } from './api'
import { AVAILABILITY_LABEL } from './labels'
import { Progress } from './Progress'
import { requestTitle } from './queries'
import { colors, space } from '@/theme/tokens.stylex'

/** A season the library lacks: where Seerr has it, and the request that would fetch it. */
export function MissingSeason({ title, season }: { title: TvDetails; season: Season }) {
  const request = useMutation({ mutationFn: () => requestTitle(title, [season.number]) })
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
        <div {...stylex.props(styles.actions)}>
          <Button variant="primary" isPending={request.isPending} onPress={() => request.mutate()}>
            <Plus size={16} weight="bold" />
            {request.isPending ? 'Requesting…' : `Request ${season.name.toLowerCase()}`}
          </Button>
          {request.isError && <span {...stylex.props(styles.error)}>{request.error.message}</span>}
        </div>
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
  actions: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
})
