import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { titleHead } from '@/brand'
import { Notice } from '@/components/Notice'
import { AuthError } from '@/lib/auth'
import { finishSso, seedWebCredentials } from '@/lib/sso'
import { focus } from '@/theme/focus'
import { colors } from '@/theme/tokens.stylex'

/** Where the SSO plugin's page ends up, as jellyfin-web's would; see src/lib/sso.ts. */
export const Route = createFileRoute('/web/index.html')({
  loader: async () => {
    if (window.parent !== window) {
      seedWebCredentials()
      return
    }
    const to = await finishSso()
    throw to ? redirect({ href: to, replace: true }) : redirect({ to: '/', replace: true })
  },
  head: () => titleHead('Signing in'),
  component: () => null,
  errorComponent: ({ error }) => (
    <main {...stylex.props(styles.page)}>
      <Notice
        title="Couldn’t sign in"
        text={error instanceof AuthError ? error.message : 'Something went wrong'}
      >
        <Link to="/login" {...stylex.props(focus.ring, styles.link)}>
          Back to sign in
        </Link>
      </Notice>
    </main>
  ),
})

const styles = stylex.create({
  page: {
    minHeight: '100dvh',
    display: 'grid',
    placeItems: 'center',
  },
  link: {
    color: colors.textMuted,
    textDecoration: 'underline',
    textUnderlineOffset: 3,
  },
})
