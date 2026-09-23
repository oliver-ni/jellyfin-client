import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { motion as m } from 'motion/react'
import { BlurImage } from '@/components/BlurImage'
import { Notice } from '@/components/Notice'
import { formatDate } from '@/lib/format'
import { fadeUp, stagger } from '@/lib/motion'
import type { Episode, Season, TvDetails } from './api'
import { seerrQueries } from './queries'
import { RequestButton } from './RequestButton'
import { SeasonHeader } from './SeasonHeader'
import { episode as ep } from '@/theme/episode'
import { media } from '@/theme/media'
import { text } from '@/theme/text'
import { colors, space } from '@/theme/tokens.stylex'

/**
 * A season the library lacks, laid out like one it has: TMDB's episodes, dimmed and unplayable,
 * under a header carrying the request or where Seerr has got to with it.
 */
export function MissingSeason({ title, season }: { title: TvDetails; season: Season }) {
  const episodes = useQuery(seerrQueries.episodes(title.tmdbId, season.number))
  return (
    <div {...stylex.props(styles.root)}>
      <SeasonHeader
        season={season}
        sonarrId={title.sonarrId}
        request={
          <RequestButton title={title} seasons={[season.number]} size="sm">
            Request
          </RequestButton>
        }
      />
      {episodes.isPending ? (
        <div {...stylex.props(ep.skeleton)} />
      ) : episodes.isError ? (
        <Notice title="Couldn’t load episodes" onRetry={() => void episodes.refetch()} />
      ) : (
        <m.ol
          key={season.number}
          initial="hidden"
          animate="show"
          variants={stagger()}
          {...stylex.props(ep.list)}
        >
          {episodes.data.map((e) => (
            <MissingEpisode key={e.number} episode={e} />
          ))}
        </m.ol>
      )}
    </div>
  )
}

function MissingEpisode({ episode }: { episode: Episode }) {
  const aired = formatDate(episode.airDate)
  return (
    <m.li variants={fadeUp} {...stylex.props(ep.row, styles.row)}>
      <span {...stylex.props(ep.still, styles.still)}>
        <BlurImage src={episode.still} alt="" style={media.fill} />
      </span>
      <div {...stylex.props(ep.body)}>
        <p {...stylex.props(ep.heading)}>
          <span {...stylex.props(ep.number)}>{episode.number}</span>
          <span {...stylex.props(ep.title, styles.title)}>{episode.name}</span>
        </p>
        {aired && <p {...stylex.props(ep.sub)}>{aired}</p>}
        {episode.overview && <p {...stylex.props(ep.overview, text.clamp2)}>{episode.overview}</p>}
      </div>
    </m.li>
  )
}

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
  },
  row: {
    opacity: 0.6,
  },
  still: {
    filter: 'grayscale(1)',
  },
  title: {
    color: colors.textMuted,
  },
})
