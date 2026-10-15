import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { Check } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { useState } from 'react'
import { titleHead } from '@/brand'
import { DetailHero } from '@/components/DetailHero'
import { Notice } from '@/components/Notice'
import { Select } from '@/components/Select'
import { RequestButton } from '@/components/RequestButton'
import { fadeUp, stagger } from '@/lib/motion'
import { Gate } from '@/seerr/Gate'
import { seerrQueries, useSeerr } from '@/seerr/queries'
import { type MangaDetails, thumbnail } from '@/suwayomi/api'
import { MANGA_STATUS_LABEL, chapters } from '@/suwayomi/labels'
import { requestManga, suwayomiQueries } from '@/suwayomi/queries'
import { detail } from '@/theme/detail'
import { playPill } from '@/theme/media'

/** A manga on one of the request service's sources, with a request for the whole series. */
export const Route = createFileRoute('/_app/request/manga/$id')({
  params: {
    parse: ({ id }): { id: number } => {
      const n = Number(id)
      if (!Number.isInteger(n)) throw notFound()
      return { id: n }
    },
    stringify: ({ id }) => ({ id: String(id) }),
  },
  // Lands on the hero rather than a skeleton when this browser already holds a Seerr session.
  loader: ({ context: { queryClient }, params }) =>
    queryClient.getQueryData(seerrQueries.me().queryKey)
      ? queryClient.ensureQueryData(suwayomiQueries.details(params.id)).catch(() => null)
      : null,
  head: ({ loaderData }) => titleHead(loaderData?.title),
  component: MangaRequestPage,
})

function MangaRequestPage() {
  const { id } = Route.useParams()
  const session = useSeerr()
  const manga = useQuery({
    ...suwayomiQueries.details(id),
    enabled: session?.state === 'signedIn',
  })

  if (session === undefined) return <div {...stylex.props(detail.heroSkeleton)} />
  if (session.state !== 'signedIn') return <Gate state={session.state} />
  if (manga.isError) {
    return (
      <div {...stylex.props(detail.state)}>
        <Notice
          title="Couldn’t load this title"
          text="Its source may be offline."
          onRetry={() => void manga.refetch()}
        />
      </div>
    )
  }
  if (!manga.data) return <div {...stylex.props(detail.heroSkeleton)} />
  return <Details manga={manga.data} />
}

function Details({ manga: t }: { manga: MangaDetails }) {
  const [group, setGroup] = useState(t.groups[0]?.name)

  return (
    <article {...stylex.props(detail.page)}>
      <DetailHero
        tile={{ url: thumbnail(t.id) }}
        title={t.title}
        meta={[
          'Manga',
          t.authors.join(', '),
          MANGA_STATUS_LABEL[t.status],
          t.chapters > 0 && chapters(t.chapters),
          t.source,
        ]}
        genres={t.genres}
      >
        {t.inLibrary ? (
          <span {...stylex.props(playPill.base, playPill.secondary)}>
            <Check size={16} weight="bold" />
            Requested
          </span>
        ) : t.chapters === 0 ? (
          <span {...stylex.props(playPill.base, playPill.secondary)}>
            No chapters on {t.source}
          </span>
        ) : (
          <>
            <RequestButton request={() => requestManga(t.id, group)} size="lg">
              Request
            </RequestButton>
            {t.groups.length > 1 && (
              <Select
                label="Translation"
                aria-label="Translation group"
                value={group}
                options={t.groups.map((g) => ({
                  key: g.name,
                  label: `${g.name} · ${chapters(g.chapters)}`,
                }))}
                onChange={setGroup}
              />
            )}
          </>
        )}
      </DetailHero>

      <m.div
        initial="hidden"
        animate="show"
        variants={stagger(0.03, 0.1)}
        {...stylex.props(detail.body)}
      >
        {t.description && (
          <m.p variants={fadeUp} {...stylex.props(detail.overview)}>
            {t.description}
          </m.p>
        )}
      </m.div>
    </article>
  )
}
