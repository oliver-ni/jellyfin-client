import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Check } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { titleHead } from '@/brand'
import { BlurImage } from '@/components/BlurImage'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import { Gate } from '@/komga/Gate'
import * as komga from '@/komga/api'
import { komgaQueries, useKomga } from '@/komga/queries'
import { fadeUp, stagger } from '@/lib/motion'
import { detail } from '@/theme/detail'
import { focus } from '@/theme/focus'
import { list } from '@/theme/list'
import { media } from '@/theme/media'
import { text } from '@/theme/text'
import { colors, radii, space } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/_app/manga_/$series')({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(komgaQueries.seriesById(params.series)).catch(() => null),
  head: ({ loaderData }) => titleHead(loaderData?.name),
  component: SeriesPage,
})

function SeriesPage() {
  const state = useKomga()
  if (!state) return null
  if (state.state !== 'signedIn') return <Gate state={state.state} />
  return <SeriesDetail />
}

function SeriesDetail() {
  const { series: id } = Route.useParams()
  const series = useQuery(komgaQueries.seriesById(id))
  const books = useQuery(komgaQueries.books(id))

  if (series.isError) {
    return (
      <div {...stylex.props(detail.state)}>
        <Notice title="Couldn’t load this series" onRetry={() => void series.refetch()} />
      </div>
    )
  }
  if (!series.data) return null
  const s = series.data
  // Where "Read" goes: the chapter with a bookmark, else the first unread, else the first.
  const chapters = books.data ?? []
  const resume =
    chapters.find((b) => b.progress && !b.progress.completed) ??
    chapters.find((b) => !b.progress?.completed) ??
    chapters[0]

  return (
    <m.div
      initial="hidden"
      animate="show"
      variants={stagger()}
      {...stylex.props(list.page, styles.page)}
    >
      <m.header variants={fadeUp} {...stylex.props(styles.head)}>
        <BlurImage src={komga.seriesCover(s.id)} alt="" style={styles.cover} />
        <div {...stylex.props(styles.about)}>
          <h1 {...stylex.props(list.title)}>{s.name}</h1>
          <p {...stylex.props(list.faint)}>
            {s.booksCount} {s.booksCount === 1 ? 'chapter' : 'chapters'}
            {s.booksReadCount > 0 && ` · ${s.booksReadCount} read`}
            {s.genres.length > 0 && ` · ${s.genres.join(', ')}`}
          </p>
          {s.summary && <p {...stylex.props(detail.overview)}>{s.summary}</p>}
          {resume && (
            <Link to="/read/$book" params={{ book: resume.id }} {...stylex.props(styles.readLink)}>
              <Button variant="primary" size="lg" style={styles.readButton}>
                {resume.progress && !resume.progress.completed ? 'Continue' : 'Read'} ·{' '}
                {resume.title}
              </Button>
            </Link>
          )}
        </div>
      </m.header>

      <m.ol variants={fadeUp} {...stylex.props(styles.chapters)}>
        {chapters.map((b) => (
          <li key={b.id}>
            <Link
              to="/read/$book"
              params={{ book: b.id }}
              {...stylex.props(focus.ring, styles.chapter)}
            >
              <span {...stylex.props(text.ellipsis, styles.chapterTitle)}>{b.title}</span>
              <span {...stylex.props(list.faint)}>
                {b.progress?.completed ? (
                  <Check size={14} weight="bold" aria-label="Read" />
                ) : b.progress ? (
                  `Page ${b.progress.page} of ${b.pagesCount}`
                ) : (
                  `${b.pagesCount} pages`
                )}
              </span>
              {b.progress && !b.progress.completed && (
                <div {...stylex.props(media.progressTrack)}>
                  <div
                    {...stylex.props(media.progressBar)}
                    style={{ width: `${(b.progress.page / b.pagesCount) * 100}%` }}
                  />
                </div>
              )}
            </Link>
          </li>
        ))}
      </m.ol>
    </m.div>
  )
}

const styles = stylex.create({
  page: {
    maxWidth: 1100,
  },
  head: {
    display: 'flex',
    gap: space.xl,
    alignItems: 'flex-start',
  },
  cover: {
    flexShrink: 0,
    width: 'clamp(120px, 22vw, 220px)',
    aspectRatio: '2 / 3',
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.skeleton,
  },
  about: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    minWidth: 0,
  },
  readLink: {
    alignSelf: 'flex-start',
    outline: 'none',
    borderRadius: radii.md,
  },
  readButton: {
    pointerEvents: 'none',
  },
  chapters: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
  },
  chapter: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    padding: `${space.md} ${space.lg}`,
    borderRadius: radii.md,
    color: colors.text,
    textDecoration: 'none',
    overflow: 'hidden',
    backgroundColor: { default: 'transparent', ':hover': colors.surface },
  },
  chapterTitle: {
    fontSize: 15,
    fontWeight: 500,
  },
})
