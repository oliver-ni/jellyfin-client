import { Outlet, createFileRoute } from '@tanstack/react-router'
import { Gate } from '@/komga/Gate'
import { useKomga } from '@/komga/queries'

/** Everything under Read is Komga's, so one gate here stands in for all of it until signed in. */
export const Route = createFileRoute('/_app/read')({
  component: ReadLayout,
})

function ReadLayout() {
  const state = useKomga()
  if (!state) return null
  if (state.state !== 'signedIn') return <Gate state={state.state} />
  return <Outlet />
}
