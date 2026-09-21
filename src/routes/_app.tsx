import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Check, LogOut, Search } from 'lucide-react'
import { useRef } from 'react'
import {
  Header,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
  Separator,
  Button as AriaButton,
} from 'react-aria-components'
import { getUserViewsOptions } from '@/api/gen/@tanstack/react-query.gen'
import { useRouteGhost } from '@/hooks/useRouteGhost'
import { useScrolled } from '@/hooks/useScrolled'
import { useSession } from '@/hooks/useSession'
import { useThemeId } from '@/hooks/useTheme'
import { logout } from '@/lib/auth'
import { getSession, type Session } from '@/lib/session'
import { THEMES, setThemeId, type ThemeId } from '@/lib/theme'
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
  const page = useRef<HTMLElement>(null)
  useRouteGhost(page)
  if (!session) return null
  return (
    <div {...stylex.props(styles.shell)}>
      <TopNav session={session} />
      <main ref={page} {...stylex.props(styles.main)}>
        <Outlet />
      </main>
    </div>
  )
}

function TopNav({ session }: { session: Session }) {
  const navigate = useNavigate()
  const scrolled = useScrolled()
  const themeId = useThemeId()
  const views = useQuery(getUserViewsOptions({ query: { userId: session.userId } }))
  const libraries = views.data?.Items?.filter((v) => v.CollectionType !== 'playlists') ?? []

  return (
    <header {...stylex.props(styles.nav, scrolled && styles.navScrolled)}>
      <div {...stylex.props(styles.navInner)}>
        <nav {...stylex.props(styles.links)}>
          <Link to="/" {...stylex.props(styles.brand)} activeOptions={{ exact: true }}>
            <span {...stylex.props(styles.brandMark)} />
            <span {...stylex.props(styles.brandName)}>{session.serverName}</span>
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
              <div {...stylex.props(styles.menuHeader)}>
                <span {...stylex.props(styles.menuUser)}>{session.userName}</span>
                <span {...stylex.props(styles.menuServer)}>{session.serverName}</span>
              </div>
              <div {...stylex.props(styles.separator)} />
              <Menu
                {...stylex.props(styles.menu)}
                onAction={async (key) => {
                  if (key === 'logout') {
                    await logout()
                    await navigate({ to: '/login', replace: true })
                  }
                }}
              >
                <MenuSection
                  selectionMode="single"
                  selectedKeys={[themeId]}
                  shouldCloseOnSelect={false}
                  onSelectionChange={(keys) => {
                    if (keys === 'all') return
                    const [next] = keys
                    if (typeof next === 'string') setThemeId(next as ThemeId)
                  }}
                  {...stylex.props(styles.menuSection)}
                >
                  <Header {...stylex.props(styles.sectionLabel)}>Theme</Header>
                  {THEMES.map((t) => (
                    <MenuItem key={t.id} id={t.id} {...stylex.props(styles.menuItem)}>
                      {({ isSelected }) => (
                        <>
                          <span {...stylex.props(styles.check)}>
                            {isSelected && <Check size={14} />}
                          </span>
                          {t.label}
                        </>
                      )}
                    </MenuItem>
                  ))}
                </MenuSection>
                <Separator {...stylex.props(styles.separator)} />
                <MenuSection {...stylex.props(styles.menuSection)}>
                  <MenuItem id="logout" {...stylex.props(styles.menuItem)}>
                    <span {...stylex.props(styles.check)}>
                      <LogOut size={14} />
                    </span>
                    Sign out
                  </MenuItem>
                </MenuSection>
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
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    height: sizes.navHeight,
    backgroundColor: 'transparent',
    backgroundImage: `linear-gradient(to bottom, ${colors.navScrim}, transparent)`,
    backgroundOrigin: 'border-box',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    transitionProperty: 'background-color, border-color',
    transitionDuration: motion.slow,
    transitionTimingFunction: motion.ease,
  },
  navScrolled: {
    backgroundColor: colors.navBg,
    backgroundImage: 'none',
    backdropFilter: 'blur(20px) saturate(1.4)',
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
    marginRight: space.lg,
    color: colors.text,
    borderRadius: radii.sm,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 4,
  },
  brandMark: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
  },
  brandName: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    display: {
      default: 'inline',
      '@media (max-width: 720px)': 'none',
    },
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
    fontWeight: 600,
    color: colors.text,
    backgroundColor: {
      default: colors.surface,
      '[data-hovered]': colors.surfaceHover,
    },
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.borderStrong,
    backdropFilter: 'blur(12px)',
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
  menuSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  menuHeader: {
    display: 'flex',
    flexDirection: 'column',
    paddingInline: space.md,
    paddingBlock: space.sm,
  },
  sectionLabel: {
    paddingInline: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xs,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  separator: {
    height: 1,
    marginBlock: space.xs,
    backgroundColor: colors.border,
  },
  check: {
    display: 'grid',
    placeItems: 'center',
    width: 16,
    color: colors.textMuted,
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
    display: 'flex',
    flexDirection: 'column',
  },
})
