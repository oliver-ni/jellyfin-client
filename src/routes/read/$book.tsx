import * as stylex from '@stylexjs/stylex'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CaretRight } from '@phosphor-icons/react'
import { AnimatePresence, motion as m } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { titleHead } from '@/brand'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import * as komga from '@/komga/api'
import { invalidateProgress, komgaQueries } from '@/komga/queries'
import { vanish } from '@/lib/motion'
import { requireSession } from '@/lib/session'
import { glass } from '@/theme/glass'
import { focus } from '@/theme/focus'
import { text } from '@/theme/text'
import { colors, fonts, radii, sizes, space } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/read/$book')({
  beforeLoad: requireSession,
  // The reader opens on the bookmark, which this browser may just have moved, so the book is
  // fetched afresh on every entry; without `gcTime: 0` the router would show the cached match
  // (and so the stale bookmark) while that fetch ran.
  gcTime: 0,
  loader: ({ context: { queryClient }, params }) =>
    queryClient.fetchQuery({ ...komgaQueries.book(params.book), staleTime: 0 }).catch(() => null),
  head: ({ loaderData }) =>
    titleHead(loaderData ? `${loaderData.title} · ${loaderData.seriesTitle}` : null),
  component: ReaderPage,
})

function ReaderPage() {
  const { book: id } = Route.useParams()
  const book = useQuery(komgaQueries.book(id))
  const series = useQuery({
    ...komgaQueries.seriesById(book.data?.seriesId ?? ''),
    enabled: !!book.data,
  })
  const pages = useQuery(komgaQueries.pages(id))

  useEffect(() => () => void invalidateProgress(), [id])

  if (book.isError || pages.isError) {
    return (
      <div {...stylex.props(styles.root, styles.state)}>
        <Notice title="Couldn’t open this chapter" onRetry={() => void book.refetch()}>
          <Link to="/manga" {...stylex.props(focus.ring, styles.stateLink)}>
            Back to manga
          </Link>
        </Notice>
      </div>
    )
  }
  if (!book.data || !pages.data || !series.data) return <div {...stylex.props(styles.root)} />
  return (
    <Reader key={id} book={book.data} direction={series.data.readingDirection} pages={pages.data} />
  )
}

interface ReaderProps {
  book: komga.Book
  direction: komga.ReadingDirection | null
  pages: komga.Page[]
}

/**
 * Pages one at a time, fit to the screen, stepped with the arrow keys or by tapping either edge
 * (the back edge is on the right for right-to-left series, which is manga's default); vertical
 * and webtoon series scroll as one strip instead. The bookmark follows the page shown.
 */
function Reader({ book, direction, pages }: ReaderProps) {
  const navigate = useNavigate()
  const strip = direction === 'vertical' || direction === 'webtoon'
  const rtl = direction !== 'ltr' && !strip
  const count = pages.length
  const start = book.progress && !book.progress.completed ? book.progress.page : 1
  const [page, setPage] = useState(Math.min(Math.max(start, 1), count))
  const [chrome, setChrome] = useState(false)
  const next = useQuery(komgaQueries.nextBook(book.id))

  const progress = useMutation({
    mutationFn: (p: komga.Progress) => komga.setProgress(book.id, p),
  })
  const save = progress.mutate
  useEffect(() => {
    const t = setTimeout(() => save({ page, completed: page === count }), 400)
    return () => clearTimeout(t)
  }, [page, count, save])

  const step = useCallback(
    (delta: number) => setPage((p) => Math.min(Math.max(p + delta, 1), count)),
    [count],
  )
  const openNext = () => {
    if (next.data) void navigate({ to: '/read/$book', params: { book: next.data.id } })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')
        void navigate({ to: '/manga/$series', params: { series: book.seriesId } })
      if (strip) return
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
      const back = rtl ? 'ArrowRight' : 'ArrowLeft'
      if (e.key === forward || e.key === ' ' || e.key === 'PageDown') step(1)
      if (e.key === back || e.key === 'PageUp') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [strip, rtl, step, navigate, book.seriesId])

  // The next two pages decode while this one is read.
  useEffect(() => {
    if (strip) return
    for (const n of [page + 1, page + 2]) {
      if (n <= count) new Image().src = komga.pageImage(book.id, n)
    }
  }, [strip, page, count, book.id])

  const atEnd = page === count

  return (
    <div {...stylex.props(styles.root)}>
      {strip ? (
        <Strip
          book={book}
          pages={pages}
          start={start}
          onPage={setPage}
          onTap={() => setChrome((c) => !c)}
        />
      ) : (
        <div {...stylex.props(styles.stage)}>
          <img
            key={page}
            src={komga.pageImage(book.id, page)}
            alt={`Page ${page}`}
            {...stylex.props(styles.pageImage)}
          />
          <button
            type="button"
            aria-label={rtl ? 'Next page' : 'Previous page'}
            onClick={() => step(rtl ? 1 : -1)}
            {...stylex.props(styles.zone, styles.zoneLeft)}
          />
          <button
            type="button"
            aria-label="Show controls"
            onClick={() => setChrome((c) => !c)}
            {...stylex.props(styles.zone, styles.zoneCentre)}
          />
          <button
            type="button"
            aria-label={rtl ? 'Previous page' : 'Next page'}
            onClick={() => step(rtl ? -1 : 1)}
            {...stylex.props(styles.zone, styles.zoneRight)}
          />
        </div>
      )}

      <AnimatePresence>
        {(chrome || atEnd) && (
          <m.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={vanish}
            {...stylex.props(glass.surface, styles.bar)}
          >
            <Link
              to="/manga/$series"
              params={{ series: book.seriesId }}
              aria-label="Back to series"
              {...stylex.props(focus.ring, styles.barButton)}
            >
              <ArrowLeft size={18} />
            </Link>
            <div {...stylex.props(styles.barTitle)}>
              <span {...stylex.props(text.ellipsis, styles.barSeries)}>{book.seriesTitle}</span>
              <span {...stylex.props(text.ellipsis, styles.barChapter)}>{book.title}</span>
            </div>
            <span {...stylex.props(styles.barCount)}>
              {page} / {count}
            </span>
            {atEnd && next.data && (
              <Button variant="primary" size="sm" onPress={openNext}>
                Next chapter <CaretRight size={14} weight="bold" />
              </Button>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface StripProps {
  book: komga.Book
  pages: komga.Page[]
  start: number
  onPage: (page: number) => void
  onTap: () => void
}

/** All pages stacked; the page most on screen is the bookmark. */
function Strip({ book, pages, start, onPage, onTap }: StripProps) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    el.children[start - 1]?.scrollIntoView()
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (top) onPage(Number((top.target as HTMLElement).dataset.page))
      },
      { threshold: [0.25, 0.5, 0.75] },
    )
    for (const child of el.children) observer.observe(child)
    return () => observer.disconnect()
  }, [start, onPage, pages.length])

  return (
    <div ref={root} onClick={onTap} {...stylex.props(styles.strip)}>
      {pages.map((p) => (
        <img
          key={p.number}
          data-page={p.number}
          src={komga.pageImage(book.id, p.number)}
          alt={`Page ${p.number}`}
          loading="lazy"
          style={p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : undefined}
          {...stylex.props(styles.stripImage)}
        />
      ))}
    </div>
  )
}

const styles = stylex.create({
  root: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#000',
    color: colors.text,
    fontFamily: fonts.sans,
    overflow: 'hidden',
  },
  state: {
    display: 'grid',
    placeItems: 'center',
  },
  stateLink: {
    fontSize: 14,
    color: colors.textMuted,
  },
  stage: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
  },
  pageImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    userSelect: 'none',
  },
  zone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    border: 'none',
    background: 'transparent',
    padding: 0,
    cursor: 'pointer',
    outline: 'none',
  },
  zoneLeft: { left: 0, width: '30%' },
  zoneCentre: { left: '30%', width: '40%', cursor: 'default' },
  zoneRight: { right: 0, width: '30%' },
  strip: {
    position: 'absolute',
    inset: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  stripImage: {
    width: 'min(100%, 900px)',
    display: 'block',
    backgroundColor: colors.skeleton,
  },
  bar: {
    position: 'absolute',
    top: space.md,
    insetInline: space.md,
    marginInline: 'auto',
    width: 'fit-content',
    maxWidth: `calc(100% - 2 * ${space.md})`,
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    height: 64,
    paddingInlineStart: space.md,
    paddingInlineEnd: space.lg,
    borderRadius: radii.full,
  },
  barButton: {
    display: 'grid',
    placeItems: 'center',
    width: sizes.navControl,
    height: sizes.navControl,
    borderRadius: radii.full,
    color: colors.text,
    backgroundColor: { default: 'transparent', ':hover': colors.surfaceHover },
  },
  barTitle: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  barSeries: {
    fontSize: 11,
    color: colors.textMuted,
  },
  barChapter: {
    fontSize: 14,
    fontWeight: 600,
  },
  barCount: {
    fontSize: 13,
    fontVariantNumeric: 'tabular-nums',
    color: colors.textMuted,
    whiteSpace: 'nowrap',
  },
})
