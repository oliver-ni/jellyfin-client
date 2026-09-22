import * as stylex from '@stylexjs/stylex'
import type { QueryClient } from '@tanstack/react-query'
import { HeadContent, Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { MotionConfig } from 'motion/react'
import { useLayoutEffect } from 'react'
import { Notice } from '@/components/Notice'
import { titleHead } from '@/brand'
import { useTheme } from '@/lib/theme'
import { focus } from '@/theme/focus'
import { colors, fonts } from '@/theme/tokens.stylex'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => titleHead(),
  component: Root,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <main {...stylex.props(styles.notFound)}>
      <Notice title="Page not found">
        <Link to="/" {...stylex.props(focus.ring, styles.link)}>
          Go home
        </Link>
      </Notice>
    </main>
  )
}

function Root() {
  const { theme } = useTheme()

  // Theme vars go on <body> so portalled content (popovers, dialogs) inherits them too.
  useLayoutEffect(() => {
    document.body.className = stylex.props(theme, styles.body).className ?? ''
  }, [theme])

  return (
    <MotionConfig reducedMotion="user">
      <HeadContent />
      <div {...stylex.props(styles.root)}>
        <Outlet />
      </div>
    </MotionConfig>
  )
}

const styles = stylex.create({
  body: {
    colorScheme: colors.scheme,
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: fonts.sans,
  },
  root: {
    minHeight: '100dvh',
  },
  notFound: {
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
