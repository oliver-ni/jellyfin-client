import * as stylex from '@stylexjs/stylex'
import { Card } from '@/components/Card'
import { media } from '@/theme/media'
import * as komga from './api'

/** A chapter as a poster card that opens the reader: the series cover, the chapter under it, the
 * bookmark as a progress bar. */
export function ChapterCard({ book, width }: { book: komga.Book; width?: number }) {
  const progress =
    book.progress && !book.progress.completed ? book.progress.page / book.pagesCount : 0
  return (
    <Card
      link={{ to: '/read/$book', params: { book: book.id } }}
      image={{ url: komga.seriesCover(book.seriesId) }}
      name={book.seriesTitle}
      subtitle={book.title}
      width={width}
    >
      {progress > 0 && (
        <div {...stylex.props(media.progressTrack)}>
          <div {...stylex.props(media.progressBar)} style={{ width: `${progress * 100}%` }} />
        </div>
      )}
    </Card>
  )
}
