import * as stylex from '@stylexjs/stylex'
import { useInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { motion as m } from 'motion/react'
import { useEffect, useRef } from 'react'
import { titleHead } from '@/brand'
import { Notice } from '@/components/Notice'
import { SeriesCard, SERIES_W } from '@/komga/SeriesCard'
import { komgaQueries } from '@/komga/queries'
import { stagger } from '@/lib/motion'
import { list } from '@/theme/list'
import { sizes, space } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/_app/read/manga')({
  head: () => titleHead('Manga'),
  component: MangaPage,
})

function MangaPage() {
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
            <SeriesCard key={s.id} series={s} />
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
    gridTemplateColumns: `repeat(auto-fill, minmax(${SERIES_W}px, 1fr))`,
    gap: space.lg,
  },
})
