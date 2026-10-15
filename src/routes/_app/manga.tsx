import * as stylex from '@stylexjs/stylex'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { motion as m } from 'motion/react'
import { useEffect, useRef } from 'react'
import { titleHead } from '@/brand'
import { Card } from '@/components/Card'
import { Notice } from '@/components/Notice'
import { Rail } from '@/components/Rail'
import { ChapterCard } from '@/komga/ChapterCard'
import { Gate } from '@/komga/Gate'
import * as komga from '@/komga/api'
import { komgaQueries, useKomga } from '@/komga/queries'
import { stagger } from '@/lib/motion'
import { list } from '@/theme/list'
import { media } from '@/theme/media'
import { sizes, space } from '@/theme/tokens.stylex'

const POSTER_W = 150

export const Route = createFileRoute('/_app/manga')({
  head: () => titleHead('Manga'),
  component: MangaPage,
})

function MangaPage() {
  const state = useKomga()
  if (!state) return null
  if (state.state !== 'signedIn') return <Gate state={state.state} />
  return <Library />
}

function Library() {
  const inProgress = useQuery(komgaQueries.inProgress())
  const onDeck = useQuery(komgaQueries.onDeck())
  const series = useInfiniteQuery(komgaQueries.series())
  const items = series.data?.pages.flatMap((p) => p.items) ?? []
  const total = series.data?.pages[0]?.total

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = series
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasNextPage) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div {...stylex.props(list.page, styles.page)}>
      <header {...stylex.props(list.head)}>
        <h1 {...stylex.props(list.title)}>Manga</h1>
        {total !== undefined && <span {...stylex.props(list.faint)}>{total}</span>}
      </header>

      {inProgress.data && inProgress.data.length > 0 && (
        <Rail title="Continue reading">
          {inProgress.data.map((book) => (
            <ChapterCard key={book.id} book={book} width={POSTER_W} />
          ))}
        </Rail>
      )}
      {onDeck.data && onDeck.data.length > 0 && (
        <Rail title="Up next">
          {onDeck.data.map((book) => (
            <ChapterCard key={book.id} book={book} width={POSTER_W} />
          ))}
        </Rail>
      )}

      {series.isError ? (
        <Notice title="Couldn’t load the library" onRetry={() => void series.refetch()} />
      ) : series.isSuccess && items.length === 0 ? (
        <Notice title="Nothing here yet" text="Manga shows up here as it is added." />
      ) : (
        <m.div
          initial="hidden"
          animate="show"
          variants={stagger(0.015)}
          {...stylex.props(styles.grid)}
        >
          {items.map((s) => (
            <Card
              key={s.id}
              link={{ to: '/manga/$series', params: { series: s.id } }}
              image={{ url: komga.seriesCover(s.id) }}
              name={s.name}
              subtitle={`${s.booksCount} ${s.booksCount === 1 ? 'chapter' : 'chapters'}`}
            >
              {s.booksUnreadCount > 0 && s.booksUnreadCount < s.booksCount && (
                <span
                  aria-label={`${s.booksUnreadCount} unread`}
                  {...stylex.props(media.cornerBadge)}
                >
                  {s.booksUnreadCount}
                </span>
              )}
            </Card>
          ))}
        </m.div>
      )}
      <div ref={sentinel} />
    </div>
  )
}

const styles = stylex.create({
  page: {
    maxWidth: sizes.maxContent,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${POSTER_W}px, 1fr))`,
    gap: space.lg,
  },
})
