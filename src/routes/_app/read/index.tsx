import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { titleHead } from '@/brand'
import { Rail } from '@/components/Rail'
import { ChapterCard } from '@/komga/ChapterCard'
import { SeriesCard, SERIES_W } from '@/komga/SeriesCard'
import { komgaQueries } from '@/komga/queries'
import { sizes, space } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/_app/read/')({
  head: () => titleHead('Read'),
  component: ReadHome,
})

function ReadHome() {
  const inProgress = useQuery(komgaQueries.inProgress())
  const onDeck = useQuery(komgaQueries.onDeck())
  const latest = useQuery(komgaQueries.latestSeries())
  return (
    <div {...stylex.props(styles.page)}>
      {inProgress.data && inProgress.data.length > 0 && (
        <Rail title="Continue reading">
          {inProgress.data.map((book) => (
            <ChapterCard key={book.id} book={book} width={SERIES_W} />
          ))}
        </Rail>
      )}
      {onDeck.data && onDeck.data.length > 0 && (
        <Rail title="Up next">
          {onDeck.data.map((book) => (
            <ChapterCard key={book.id} book={book} width={SERIES_W} />
          ))}
        </Rail>
      )}
      {latest.data && latest.data.length > 0 && (
        <Rail title="Recently added" link={{ to: '/read/manga' }}>
          {latest.data.map((s) => (
            <SeriesCard key={s.id} series={s} width={SERIES_W} />
          ))}
        </Rail>
      )}
    </div>
  )
}

const styles = stylex.create({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxl,
    width: '100%',
    maxWidth: sizes.maxContent,
    marginInline: 'auto',
    paddingTop: `calc(${sizes.navHeight} + ${space.lg})`,
    paddingBottom: space.xxxl,
  },
})
