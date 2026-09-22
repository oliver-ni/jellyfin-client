import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { Navigate, createFileRoute, notFound } from '@tanstack/react-router'
import { Check, Prohibit } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { useState } from 'react'
import { DetailHero } from '@/components/DetailHero'
import { Notice } from '@/components/Notice'
import { SeasonTabs } from '@/components/SeasonTabs'
import { titleLink } from '@/lib/item-link'
import { fadeUp, stagger } from '@/lib/motion'
import { defaultSeason, seasonEntries } from '@/lib/seasons'
import * as seerr from '@/seerr/api'
import { Gate } from '@/seerr/Gate'
import { AVAILABILITY_LABEL, MEDIA_TYPE_LABEL } from '@/seerr/labels'
import { MissingSeason } from '@/seerr/MissingSeason'
import { Progress } from '@/seerr/Progress'
import { seerrQueries, useSeerr } from '@/seerr/queries'
import { RequestButton } from '@/seerr/RequestButton'
import { detail } from '@/theme/detail'
import { playPill } from '@/theme/media'
import { space } from '@/theme/tokens.stylex'

/**
 * A film or series the library lacks, as Seerr knows it. Titles Seerr has matched to a
 * library item send the visitor on to that item's page, which carries the request state.
 */
export const Route = createFileRoute('/_app/request/$type/$tmdbId')({
  params: {
    parse: ({ type, tmdbId }): { type: seerr.MediaType; tmdbId: number } => {
      const id = Number(tmdbId)
      if ((type !== 'movie' && type !== 'tv') || !Number.isInteger(id)) throw notFound()
      return { type, tmdbId: id }
    },
    stringify: ({ type, tmdbId }) => ({ type, tmdbId: String(tmdbId) }),
  },
  // Lands on the hero rather than a skeleton when this browser already holds a Seerr session.
  loader: ({ context: { queryClient }, params }) =>
    queryClient.getQueryData(seerrQueries.me().queryKey)
      ? queryClient
          .ensureQueryData(seerrQueries.title(params.type, params.tmdbId))
          .catch(() => null)
      : null,
  component: RequestPage,
})

function RequestPage() {
  const { type, tmdbId } = Route.useParams()
  const session = useSeerr()
  const title = useQuery({
    ...seerrQueries.title(type, tmdbId),
    enabled: session?.state === 'signedIn',
  })

  if (session === undefined) return <div {...stylex.props(detail.heroSkeleton)} />
  if (session.state !== 'signedIn') return <Gate state={session.state} />
  if (title.isError) {
    return (
      <div {...stylex.props(detail.state)}>
        <Notice
          title="Couldn’t load this title"
          text="Seerr may be signed out or offline."
          onRetry={() => void title.refetch()}
        />
      </div>
    )
  }
  if (!title.data) return <div {...stylex.props(detail.heroSkeleton)} />
  const t = title.data
  if (t.jellyfinId) return <Navigate {...titleLink(t.jellyfinId, t.name)} replace />

  return (
    <article {...stylex.props(detail.page)}>
      <DetailHero
        backdrop={t.backdrop ? { url: t.backdrop } : null}
        tile={t.poster ? { url: t.poster } : null}
        title={t.name}
        tagline={t.tagline}
        meta={[
          MEDIA_TYPE_LABEL[t.type],
          t.year,
          t.type === 'movie'
            ? t.runtimeMinutes && `${t.runtimeMinutes} min`
            : `${t.seasons.length} ${t.seasons.length === 1 ? 'season' : 'seasons'}`,
        ]}
        rating={t.rating}
        genres={t.genres}
      >
        <HeroAction title={t} />
      </DetailHero>

      <m.div
        initial="hidden"
        animate="show"
        variants={stagger(0.03, 0.1)}
        {...stylex.props(detail.body, styles.body)}
      >
        {t.overview && (
          <m.p variants={fadeUp} {...stylex.props(detail.overview)}>
            {t.overview}
          </m.p>
        )}
        {t.type === 'movie' ? (
          <m.div variants={fadeUp} {...stylex.props(styles.progress)}>
            <Progress downloads={t.downloads} />
          </m.div>
        ) : (
          <m.section variants={fadeUp}>
            <Seasons title={t} />
          </m.section>
        )}
      </m.div>
    </article>
  )
}

/**
 * The title-level action: a film's request or its state; for a series, one request covering
 * every open season when there are several (single seasons are requested from their tab).
 */
function HeroAction({ title }: { title: seerr.MovieDetails | seerr.TvDetails }) {
  if (title.type === 'tv') {
    const open = seerr.openSeasons(title)
    return open.length > 1 ? (
      <RequestButton title={title} seasons={open.map((s) => s.number)} size="lg">
        Request all {open.length} seasons
      </RequestButton>
    ) : null
  }
  if (seerr.requestable(title.availability)) {
    return (
      <RequestButton title={title} seasons={[]} size="lg">
        Request
      </RequestButton>
    )
  }
  const label = AVAILABILITY_LABEL[title.availability]
  if (!label) return null
  return (
    <span {...stylex.props(playPill.base, playPill.secondary)}>
      {title.availability === 'blocklisted' ? (
        <Prohibit size={16} weight="bold" />
      ) : (
        <Check size={16} weight="bold" />
      )}
      {label}
    </span>
  )
}

/** Every season as a tab, each with its state and a request where Seerr still allows one. */
function Seasons({ title }: { title: seerr.TvDetails }) {
  const entries = seasonEntries([], title)
  const [selected, setSelected] = useState<number>()
  const active = defaultSeason(entries, selected)
  if (!active) return null
  return (
    <SeasonTabs entries={entries} selected={active} onSelect={setSelected}>
      {(entry) =>
        entry.kind === 'missing' && <MissingSeason title={entry.title} season={entry.season} />
      }
    </SeasonTabs>
  )
}

const styles = stylex.create({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxl,
  },
  progress: {
    maxWidth: 480,
  },
})
