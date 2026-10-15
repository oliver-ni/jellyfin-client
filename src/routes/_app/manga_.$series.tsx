import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { BookOpen, Check } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { titleHead } from '@/brand'
import { DetailHero } from '@/components/DetailHero'
import { Notice } from '@/components/Notice'
import { Gate } from '@/komga/Gate'
import * as komga from '@/komga/api'
import { komgaQueries, useKomga } from '@/komga/queries'
import { fadeUp, stagger } from '@/lib/motion'
import { detail } from '@/theme/detail'
import { episode as ep } from '@/theme/episode'
import { focus } from '@/theme/focus'
import { media, playPill } from '@/theme/media'
import { text } from '@/theme/text'
import { colors, motion, radii, space } from '@/theme/tokens.stylex'

const STATUS: Record<string, string> = {
  ONGOING: 'Ongoing',
  ENDED: 'Completed',
  HIATUS: 'On hiatus',
  ABANDONED: 'Abandoned',
}

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
  if (!series.data) return <div {...stylex.props(detail.heroSkeleton)} />
  const s = series.data
  const cover = { url: komga.seriesCover(s.id) }
  // Where "Read" goes: the chapter with a bookmark, else the first unread, else the first.
  const chapters = books.data ?? []
  const resume =
    chapters.find((b) => b.progress && !b.progress.completed) ??
    chapters.find((b) => !b.progress?.completed) ??
    chapters[0]

  return (
    <article {...stylex.props(detail.page)}>
      <DetailHero
        backdrop={cover}
        tile={cover}
        title={s.name}
        meta={[
          'Manga',
          STATUS[s.status],
          `${s.booksCount} ${s.booksCount === 1 ? 'chapter' : 'chapters'}`,
          s.booksReadCount > 0 && `${s.booksReadCount} read`,
        ]}
        genres={s.genres}
      >
        {resume && (
          <Link
            to="/read/$book"
            params={{ book: resume.id }}
            {...stylex.props(focus.ring, playPill.base)}
          >
            <BookOpen size={18} weight="fill" />
            {resume.progress && !resume.progress.completed ? 'Continue' : 'Read'} · {resume.title}
          </Link>
        )}
      </DetailHero>

      <m.div
        initial="hidden"
        animate="show"
        variants={stagger(0.03, 0.1)}
        {...stylex.props(detail.body, styles.body)}
      >
        {s.summary && (
          <m.p variants={fadeUp} {...stylex.props(detail.overview)}>
            {s.summary}
          </m.p>
        )}
        {books.isError ? (
          <Notice title="Couldn’t load chapters" onRetry={() => void books.refetch()} />
        ) : books.isPending ? (
          <div {...stylex.props(ep.skeleton)} />
        ) : (
          <m.ol variants={stagger()} {...stylex.props(ep.list)}>
            {chapters.map((b) => (
              <ChapterRow key={b.id} book={b} />
            ))}
          </m.ol>
        )}
      </m.div>
    </article>
  )
}

function ChapterRow({ book }: { book: komga.Book }) {
  const done = book.progress?.completed ?? false
  const page = !done && book.progress ? book.progress.page : 0
  return (
    <m.li variants={fadeUp}>
      <Link
        to="/read/$book"
        params={{ book: book.id }}
        {...stylex.props(focus.ring, styles.row, done && styles.rowRead)}
      >
        <span {...stylex.props(ep.number)}>{book.number}</span>
        <span {...stylex.props(text.ellipsis, styles.title)}>{book.title}</span>
        <span {...stylex.props(ep.sub, styles.status)}>
          {done ? (
            <Check size={14} weight="bold" aria-label="Read" />
          ) : page > 0 ? (
            `Page ${page} of ${book.pagesCount}`
          ) : (
            `${book.pagesCount} pages`
          )}
        </span>
        {page > 0 && (
          <span {...stylex.props(media.progressTrack, styles.track)}>
            <span
              {...stylex.props(media.progressBar, styles.bar)}
              style={{ width: `${(page / book.pagesCount) * 100}%` }}
            />
          </span>
        )}
      </Link>
    </m.li>
  )
}

const styles = stylex.create({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxl,
  },
  row: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: space.lg,
    paddingBlock: space.md,
    paddingInline: space.md,
    marginInline: `calc(-1 * ${space.md})`,
    borderRadius: radii.md,
    color: colors.text,
    textDecoration: 'none',
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.surface,
    },
    transitionProperty: 'background-color',
    transitionDuration: motion.fast,
  },
  rowRead: {
    color: colors.textMuted,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  status: {
    display: 'inline-flex',
    alignItems: 'center',
    fontVariantNumeric: 'tabular-nums',
  },
  track: {
    left: space.md,
    right: space.md,
    height: 2,
  },
  bar: {
    display: 'block',
  },
})
