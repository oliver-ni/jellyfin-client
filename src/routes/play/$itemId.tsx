import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useRequiredSession } from '@/hooks/useSession'
import { itemQueries } from '@/lib/item-queries'
import { getSession } from '@/lib/session'
import { colors, radii, space } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/play/$itemId')({
  beforeLoad: ({ location }) => {
    if (!getSession()) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: PlayPage,
})

function PlayPage() {
  const { itemId } = Route.useParams()
  const { userId } = useRequiredSession()
  const item = useQuery(itemQueries.item(userId, itemId))

  return (
    <div {...stylex.props(styles.page)}>
      <Link to="/items/$itemId" params={{ itemId }} {...stylex.props(styles.back)}>
        <ArrowLeft size={16} />
        Back
      </Link>
      <p {...stylex.props(styles.title)}>{item.data?.Name ?? '\u00a0'}</p>
      <p {...stylex.props(styles.muted)}>Player coming next.</p>
    </div>
  )
}

const styles = stylex.create({
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: '#000',
    color: '#fff',
  },
  back: {
    position: 'absolute',
    top: space.lg,
    left: space.lg,
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: 500,
    borderRadius: radii.sm,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
  },
  muted: {
    color: 'rgba(255,255,255,0.5)',
  },
})
