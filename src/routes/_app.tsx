import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { LogOut, Search } from 'lucide-react'
import { Menu, MenuItem, MenuTrigger, Popover, Button as AriaButton } from 'react-aria-components'
import { getUserViewsOptions } from '@/api/gen/@tanstack/react-query.gen'
import { useSession } from '@/hooks/useSession'
import { logout } from '@/lib/auth'
import { getSession, type Session } from '@/lib/session'
import { colors, motion, radii, shadows, sizes, space } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/_app')({
  beforeLoad: ({ location }) => {
    if (!getSession()) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  const session = useSession()
  if (!session) return null
  return (
    <div {...stylex.props(styles.shell)}>
      <TopNav session={session} />
      <main {...stylex.props(styles.main)}>
        <Outlet />
      </main>
    </div>
  )
}

function TopNav({ session }: { session: Session }) {
  const navigate = useNavigate()
  const views = useQuery(getUserViewsOptions({ query: { userId: session.userId } }))
  const libraries = views.data?.Items?.filter((v) => v.CollectionType !== 'playlists') ?? []

  return (
    <header {...stylex.props(styles.nav)}>
      <div {...stylex.props(styles.navInner)}>
        <nav {...stylex.props(styles.links)}>
          <Link to="/" {...stylex.props(styles.brand)} activeOptions={{ exact: true }}>
            <span {...stylex.props(styles.brandMark)} />
          </Link>
          <Link
            to="/"
            activeOptions={{ exact: true }}
            {...stylex.props(styles.link)}
            activeProps={{ className: stylex.props(styles.link, styles.linkActive).className }}
          >
            Home
          </Link>
          {libraries.map((lib) => (
            <Link
              key={lib.Id}
              to="/library/$libraryId"
              params={{ libraryId: lib.Id ?? '' }}
              {...stylex.props(styles.link)}
              activeProps={{ className: stylex.props(styles.link, styles.linkActive).className }}
            >
              {lib.Name}
            </Link>
          ))}
        </nav>
        <div {...stylex.props(styles.right)}>
          <button
            type="button"
            aria-label="Search"
            {...stylex.props(styles.iconButton, styles.searchButton)}
          >
            <Search size={16} />
            <span {...stylex.props(styles.searchHint)}>Search</span>
            <kbd {...stylex.props(styles.kbd)}>⌘K</kbd>
          </button>
          <MenuTrigger>
            <AriaButton aria-label="Account" {...stylex.props(styles.avatar)}>
              {session.userName.slice(0, 1).toUpperCase()}
            </AriaButton>
            <Popover placement="bottom end" offset={8} {...stylex.props(styles.popover)}>
              <Menu
                {...stylex.props(styles.menu)}
                onAction={async (key) => {
                  if (key === 'logout') {
                    await logout()
                    await navigate({ to: '/login', replace: true })
                  }
                }}
              >
                <MenuItem id="user" isDisabled {...stylex.props(styles.menuHeader)}>
                  <span {...stylex.props(styles.menuUser)}>{session.userName}</span>
                  <span {...stylex.props(styles.menuServer)}>{session.serverName}</span>
                </MenuItem>
                <MenuItem id="logout" {...stylex.props(styles.menuItem)}>
                  <LogOut size={14} />
                  Sign out
                </MenuItem>
              </Menu>
            </Popover>
          </MenuTrigger>
        </div>
      </div>
    </header>
  )
}

const styles = stylex.create({
  shell: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
  },
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    height: sizes.navHeight,
    backgroundColor: 'rgba(11, 12, 15, 0.72)',
    backdropFilter: 'blur(16px) saturate(1.4)',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
  },
  navInner: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingInline: {
      default: sizes.pageGutter,
      '@media (max-width: 720px)': sizes.pageGutterMobile,
    },
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
  },
  brand: {
    display: 'grid',
    placeItems: 'center',
    marginRight: space.md,
    borderRadius: radii.sm,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
  },
  brandMark: {
    width: 24,
    height: 24,
    borderRadius: radii.sm,
    backgroundImage: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
  },
  link: {
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    paddingInline: space.md,
    fontSize: 14,
    fontWeight: 500,
    color: {
      default: colors.textMuted,
      ':hover': colors.text,
    },
    backgroundColor: {
      default: 'transparent',
      ':hover': colors.surface,
    },
    borderRadius: radii.sm,
    transitionProperty: 'color, background-color',
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.ease,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
  },
  linkActive: {
    color: colors.text,
    backgroundColor: colors.surfaceHover,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
  },
  iconButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
    height: 34,
    paddingInline: space.md,
    color: colors.textMuted,
    backgroundColor: {
      default: colors.surface,
      ':hover': colors.surfaceHover,
    },
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.border,
    borderRadius: radii.md,
    fontSize: 13,
    transitionProperty: 'background-color, color',
    transitionDuration: motion.fast,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
  },
  searchButton: {
    minWidth: {
      default: 220,
      '@media (max-width: 720px)': 'auto',
    },
  },
  searchHint: {
    flex: 1,
    textAlign: 'left',
    display: {
      default: 'inline',
      '@media (max-width: 720px)': 'none',
    },
  },
  kbd: {
    fontFamily: 'inherit',
    fontSize: 11,
    color: colors.textFaint,
    paddingInline: 5,
    paddingBlock: 1,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.border,
    borderRadius: 4,
    display: {
      default: 'inline',
      '@media (max-width: 720px)': 'none',
    },
  },
  avatar: {
    width: 34,
    height: 34,
    display: 'grid',
    placeItems: 'center',
    fontSize: 13,
    fontWeight: 700,
    color: colors.accentText,
    backgroundImage: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
    borderRadius: radii.full,
    outlineStyle: { default: 'none', '[data-focus-visible]': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 2,
  },
  popover: {
    minWidth: 200,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    boxShadow: shadows.popover,
    padding: space.xs,
    outline: 'none',
  },
  menu: {
    outline: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  menuHeader: {
    display: 'flex',
    flexDirection: 'column',
    paddingInline: space.md,
    paddingBlock: space.sm,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.border,
    marginBottom: space.xs,
    outline: 'none',
    cursor: 'default',
  },
  menuUser: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
  },
  menuServer: {
    fontSize: 12,
    color: colors.textMuted,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    paddingInline: space.md,
    paddingBlock: space.sm,
    fontSize: 14,
    color: colors.text,
    borderRadius: radii.sm,
    cursor: 'pointer',
    outline: 'none',
    backgroundColor: {
      default: 'transparent',
      '[data-focused]': colors.surfaceHover,
    },
  },
  main: {
    flex: 1,
  },
})
