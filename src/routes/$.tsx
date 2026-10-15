import { createFileRoute, notFound, redirect } from '@tanstack/react-router'

const ROOTS = ['/watch', '/read', '/reader', '/play', '/login', '/web']

/** Paths from before the Watch/Read split lived at the root; they are Watch's now. */
export const Route = createFileRoute('/$')({
  beforeLoad: ({ location }) => {
    if (ROOTS.some((r) => location.pathname === r || location.pathname.startsWith(`${r}/`))) {
      throw notFound()
    }
    throw redirect({ href: `/watch${location.href}`, replace: true })
  },
})
