import * as stylex from '@stylexjs/stylex'
import { Card } from '@/components/Card'
import { media } from '@/theme/media'
import * as komga from './api'
import { chapters } from './labels'

export const SERIES_W = 150

/** A series as a poster: its cover, chapter count, and how many chapters are still unread. */
export function SeriesCard({ series: s, width }: { series: komga.Series; width?: number }) {
  return (
    <Card
      link={{ to: '/read/manga/$series', params: { series: s.id } }}
      image={{ url: komga.seriesCover(s.id) }}
      name={s.name}
      subtitle={chapters(s.booksCount)}
      width={width}
    >
      {s.booksUnreadCount > 0 && s.booksUnreadCount < s.booksCount && (
        <span aria-label={`${s.booksUnreadCount} unread`} {...stylex.props(media.cornerBadge)}>
          {s.booksUnreadCount}
        </span>
      )}
    </Card>
  )
}
