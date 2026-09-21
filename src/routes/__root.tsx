import * as stylex from '@stylexjs/stylex'
import type { QueryClient } from '@tanstack/react-query'
import { Link, Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { MotionConfig } from 'motion/react'
import { useLayoutEffect } from 'react'
import { useThemeId } from '@/hooks/useTheme'
import { themeStyles } from '@/lib/theme'
import { focus } from '@/theme/focus'
import { colors, fonts, space } from '@/theme/tokens.stylex'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <main {...stylex.props(styles.notFound)}>
      <h1 {...stylex.props(styles.notFoundTitle)}>Page not found</h1>
      <Link to="/" {...stylex.props(focus.ring, styles.notFoundLink)}>
        Go home
      </Link>
    </main>
  )
}

function Root() {
  const themeId = useThemeId()

  // Theme vars go on <body> so portalled content (popovers, dialogs) inherits them too.
  useLayoutEffect(() => {
    const { className } = stylex.props(themeStyles(themeId), styles.body)
    document.body.className = className ?? ''
  }, [themeId])

  return (
    <MotionConfig reducedMotion="user">
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
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
  },
  notFoundTitle: {
    fontSize: 22,
    fontWeight: 700,
  },
  notFoundLink: {
    color: colors.textMuted,
    textDecoration: 'underline',
    textUnderlineOffset: 3,
  },
})
