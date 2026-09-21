import * as stylex from '@stylexjs/stylex'
import type { QueryClient } from '@tanstack/react-query'
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { useLayoutEffect } from 'react'
import { useThemeId } from '@/hooks/useTheme'
import { themeStyles } from '@/lib/theme'
import { colors, fonts } from '@/theme/tokens.stylex'

export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
})

function Root() {
  const themeId = useThemeId()

  // Theme vars go on <body> so portalled content (popovers, dialogs) inherits them too.
  useLayoutEffect(() => {
    const { className } = stylex.props(themeStyles(themeId), styles.body)
    document.body.className = className ?? ''
  }, [themeId])

  return (
    <div {...stylex.props(styles.root)}>
      <Outlet />
    </div>
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
})
