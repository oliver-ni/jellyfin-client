import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { titleHead } from '@/brand'
import { Card } from '@/components/Card'
import { Notice } from '@/components/Notice'
import { RequestGroups, RequestRow } from '@/components/RequestGroups'
import { Gate } from '@/seerr/Gate'
import { Progress } from '@/components/Progress'
import { useSeerr } from '@/seerr/queries'
import { thumbnail } from '@/suwayomi/api'
import { chapters, mangaGroup, mangaProgress } from '@/suwayomi/labels'
import { suwayomiQueries } from '@/suwayomi/queries'
import { list } from '@/theme/list'

export const Route = createFileRoute('/_app/read/requests')({
  head: () => titleHead('Requests'),
  component: RequestsPage,
})

// The request service checks the Seerr session, so this page needs one like the Watch side.
function RequestsPage() {
  const session = useSeerr()
  if (session === undefined) return null
  if (session.state !== 'signedIn') return <Gate state={session.state} />
  return <RequestList />
}

// Requested manga is read in the library as its chapters arrive.
const MANGA_LINK = { to: '/read/manga' } as const

function RequestList() {
  const requests = useQuery(suwayomiQueries.requests())
  const entries = (requests.data ?? []).map((m) => {
    const bar = mangaProgress(m)
    return {
      key: String(m.id),
      group: mangaGroup(m),
      card: (
        <Card
          link={MANGA_LINK}
          image={{ url: thumbnail(m.id) }}
          name={m.title}
          subtitle={chapters(m.chapters)}
        />
      ),
      row: (
        <RequestRow link={MANGA_LINK} poster={thumbnail(m.id)} name={m.title} meta={m.source}>
          {bar ? <Progress value={bar} /> : 'Finding chapters'}
        </RequestRow>
      ),
    }
  })

  return (
    <div {...stylex.props(list.page, styles.page)}>
      <header {...stylex.props(list.head)}>
        <h1 {...stylex.props(list.title)}>Requests</h1>
        {requests.data && <span {...stylex.props(list.faint)}>{requests.data.length}</span>}
      </header>
      {requests.isError ? (
        <Notice
          title="Couldn’t load the requests"
          text="The request service may be offline."
          onRetry={() => void requests.refetch()}
        />
      ) : requests.data?.length === 0 ? (
        <Notice
          title="Nothing requested yet"
          text="Search with / for a manga the library is missing and request it."
        />
      ) : (
        <RequestGroups entries={entries} />
      )}
    </div>
  )
}

const styles = stylex.create({
  page: {
    maxWidth: 960,
  },
})
