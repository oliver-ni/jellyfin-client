import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { getItemOptions } from '@/api/gen/@tanstack/react-query.gen'
import { useRequiredSession } from '@/hooks/useSession'
import { colors, sizes, space } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/_app/library/$libraryId')({
  component: LibraryPage,
})

function LibraryPage() {
  const { libraryId } = Route.useParams()
  const { userId } = useRequiredSession()
  const library = useQuery(getItemOptions({ path: { itemId: libraryId }, query: { userId } }))

  return (
    <div {...stylex.props(styles.page)}>
      <h1 {...stylex.props(styles.title)}>{library.data?.Name ?? ' '}</h1>
      <p {...stylex.props(styles.muted)}>Library browsing coming next.</p>
    </div>
  )
}

const styles = stylex.create({
  page: {
    paddingInline: {
      default: sizes.pageGutter,
      '@media (max-width: 720px)': sizes.pageGutterMobile,
    },
    paddingTop: `calc(${sizes.navHeight} + ${space.xl})`,
    paddingBottom: space.xl,
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  muted: {
    color: colors.textMuted,
  },
})
