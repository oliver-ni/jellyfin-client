import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Check, MagnifyingGlass, PlugsConnected, SignOut } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
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
import { SearchPalette } from '@/components/SearchPalette'
import { useRouteGhost } from '@/hooks/useRouteGhost'
import { logout } from '@/lib/auth'
import { libraryLink } from '@/lib/item-link'
import { springs } from '@/lib/motion'
import { queries } from '@/lib/queries'
import { getSession, useSession, type Session } from '@/lib/session'
import { THEMES, setThemeId, useTheme } from '@/lib/theme'
import { brandMark } from '@/brand'
import { ConnectDialog } from '@/seerr/ConnectDialog'
import { signOut as seerrSignOut, useSeerr } from '@/seerr/queries'
import { glass, overlay } from '@/theme/glass'
import { menu } from '@/theme/menu'
import { focus } from '@/theme/focus'
import { colors, motion, radii, sizes, space } from '@/theme/tokens.stylex'

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
  const shell = useRef<HTMLDivElement>(null)
  useRouteGhost(shell, Route.id)
  if (!session) return null
  return (
    <div ref={shell} {...stylex.props(styles.shell)}>
      <TopNav session={session} />
      <main {...stylex.props(styles.main)}>
        <Outlet />
      </main>
    </div>
  )
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  )
}

function TopNav({ session }: { session: Session }) {
  const navigate = useNavigate()
  const theme = useTheme()
  const views = useQuery(queries.views(session.userId))
  const libraries = views.data?.Items?.filter((v) => v.CollectionType !== 'playlists') ?? []
  const [searchOpen, setSearchOpen] = useState(false)
  const seerr = useSeerr()
  const [connectOpen, setConnectOpen] = useState(false)

  useEffect(() => {
    if (searchOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      if (isTypingTarget(e.target)) return
      e.preventDefault()
      setSearchOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [searchOpen])

  return (
    <header {...stylex.props(styles.nav)}>
      <SearchPalette userId={session.userId} isOpen={searchOpen} onOpenChange={setSearchOpen} />
      <ConnectDialog
        userName={session.userName}
        isOpen={connectOpen}
        onOpenChange={setConnectOpen}
      />
      <Link
        to="/"
        aria-label={session.serverName}
        {...stylex.props(focus.ring, glass.surface, styles.brand)}
      >
        <span aria-hidden="true">{brandMark}</span>
      </Link>
      <nav aria-label="Libraries" {...stylex.props(glass.surface, styles.links)}>
        <NavLink to="/">Home</NavLink>
        {libraries.map((lib) => (
          <NavLink key={lib.Id} {...libraryLink(lib)}>
            {lib.Name}
          </NavLink>
        ))}
        {seerr?.state === 'signedIn' && <NavLink to="/requests">Requests</NavLink>}
      </nav>
      <div {...stylex.props(styles.right)}>
        <AriaButton
          aria-label="Search"
          onPress={() => setSearchOpen(true)}
          {...stylex.props(focus.ring, glass.surface, styles.search)}
        >
          <MagnifyingGlass size={16} />
          <span {...stylex.props(styles.searchLabel)}>Search</span>
          <kbd {...stylex.props(styles.kbd)}>/</kbd>
        </AriaButton>
        <MenuTrigger>
          <AriaButton
            aria-label="Account"
            {...stylex.props(focus.ring, glass.surface, styles.avatar)}
          >
            {session.userName.slice(0, 1).toUpperCase()}
          </AriaButton>
          <Popover
            placement="bottom end"
            offset={8}
            {...stylex.props(glass.panel, overlay.popover, menu.popover)}
          >
            <div {...stylex.props(styles.menuHeader)}>
              <span {...stylex.props(styles.menuUser)}>{session.userName}</span>
              <span {...stylex.props(styles.menuServer)}>
                {session.serverName}
                {seerr?.state === 'signedIn' && ' · Seerr'}
              </span>
            </div>
            <div {...stylex.props(menu.separator)} />
            <Menu
              {...stylex.props(menu.list)}
              onAction={async (key) => {
                if (key === 'seerr-connect') setConnectOpen(true)
                if (key === 'logout') {
                  await Promise.all([logout(), seerrSignOut()])
                  await navigate({ to: '/login', replace: true })
                }
              }}
            >
              <MenuSection
                selectionMode="single"
                selectedKeys={[theme.id]}
                shouldCloseOnSelect={false}
                onSelectionChange={(keys) => {
                  if (keys === 'all') return
                  const [next] = keys
                  setThemeId(next)
                }}
                {...stylex.props(menu.list)}
              >
                <Header {...stylex.props(menu.header)}>Theme</Header>
                {THEMES.map((t) => (
                  <MenuItem key={t.id} id={t.id} {...stylex.props(menu.item)}>
                    {({ isSelected }) => (
                      <>
                        <span {...stylex.props(menu.check)}>
                          {isSelected && <Check size={14} weight="bold" />}
                        </span>
                        {t.label}
                      </>
                    )}
                  </MenuItem>
                ))}
              </MenuSection>
              <Separator {...stylex.props(menu.separator)} />
              <MenuSection {...stylex.props(menu.list)}>
                {seerr?.state === 'signedOut' && (
                  <MenuItem id="seerr-connect" {...stylex.props(menu.item)}>
                    <span {...stylex.props(menu.check)}>
                      <PlugsConnected size={14} />
                    </span>
                    Connect Seerr
                  </MenuItem>
                )}
                <MenuItem id="logout" {...stylex.props(menu.item)}>
                  <span {...stylex.props(menu.check)}>
                    <SignOut size={14} />
                  </span>
                  Sign out
                </MenuItem>
              </MenuSection>
            </Menu>
          </Popover>
        </MenuTrigger>
      </div>
    </header>
  )
}

type NavLinkProps = { children: ReactNode } & (
  | { to: '/' | '/requests'; params?: undefined }
  | ReturnType<typeof libraryLink>
)

function NavLink({ children, ...target }: NavLinkProps) {
  const link = target.params
    ? target
    : ({ to: target.to, activeOptions: { exact: true, includeSearch: false } } as const)
  return (
    <Link {...link} {...stylex.props(focus.ring, styles.link)}>
      {({ isActive }) => (
        <>
          {isActive && (
            <m.span
              layoutId="nav-active"
              transition={springs.gentle}
              {...stylex.props(styles.linkActive)}
            />
          )}
          <span {...stylex.props(styles.linkLabel, isActive && styles.linkLabelActive)}>
            {children}
          </span>
        </>
      )}
    </Link>
  )
}

const styles = stylex.create({
  shell: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: colors.bg,
  },
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
    height: sizes.navHeight,
    paddingInline: sizes.pageGutter,
    pointerEvents: 'none',
  },
  brand: {
    pointerEvents: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: sizes.navControl,
    height: sizes.navControl,
    fontSize: 18,
    lineHeight: 1,
    borderRadius: radii.full,
  },
  links: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: space.xxs,
    height: sizes.navControl,
    padding: space.xs,
    borderRadius: radii.full,
    position: {
      default: 'static',
      '@media (max-width: 720px)': 'fixed',
    },
    bottom: {
      default: 'auto',
      '@media (max-width: 720px)': `calc(${space.lg} + env(safe-area-inset-bottom))`,
    },
    left: {
      default: 'auto',
      '@media (max-width: 720px)': '50%',
    },
    translate: {
      default: 'none',
      '@media (max-width: 720px)': '-50% 0',
    },
    maxWidth: {
      default: 'none',
      '@media (max-width: 720px)': `calc(100vw - 2 * ${sizes.pageGutter})`,
    },
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  link: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    height: '100%',
    paddingInline: space.md,
    borderRadius: radii.full,
    whiteSpace: 'nowrap',
    outlineOffset: -2,
  },
  linkActive: {
    position: 'absolute',
    inset: 0,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHover,
    boxShadow: `inset 0 1px 0 ${colors.glassHighlight}`,
  },
  linkLabel: {
    position: 'relative',
    fontSize: 14,
    fontWeight: 500,
    color: {
      default: colors.textMuted,
      ':hover': colors.text,
    },
    transitionProperty: 'color',
    transitionDuration: motion.fast,
    transitionTimingFunction: motion.ease,
  },
  linkLabelActive: {
    color: colors.text,
  },
  right: {
    pointerEvents: 'auto',
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: space.sm,
  },
  search: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
    height: sizes.navControl,
    minWidth: {
      default: 220,
      '@media (max-width: 720px)': sizes.navControl,
    },
    paddingInline: {
      default: space.lg,
      '@media (max-width: 720px)': 0,
    },
    justifyContent: {
      default: 'flex-start',
      '@media (max-width: 720px)': 'center',
    },
    color: {
      default: colors.textMuted,
      '[data-hovered]': colors.text,
    },
    borderRadius: radii.full,
    fontSize: 14,
    transitionProperty: 'color',
    transitionDuration: motion.fast,
  },
  searchLabel: {
    flex: 1,
    textAlign: 'left',
    display: {
      default: 'inline',
      '@media (max-width: 720px)': 'none',
    },
  },
  kbd: {
    fontFamily: 'inherit',
    fontSize: 12,
    lineHeight: 1,
    color: colors.textMuted,
    minWidth: 20,
    paddingBlock: 3,
    textAlign: 'center',
    borderRadius: radii.xs,
    boxShadow: `inset 0 0 0 1px ${colors.glassRim}`,
    display: {
      default: 'inline-block',
      '@media (max-width: 720px)': 'none',
    },
  },
  avatar: {
    width: sizes.navControl,
    height: sizes.navControl,
    display: 'grid',
    placeItems: 'center',
    fontSize: 13,
    fontWeight: 600,
    color: colors.text,
    borderRadius: radii.full,
  },
  menuHeader: {
    display: 'flex',
    flexDirection: 'column',
    paddingInline: space.md,
    paddingBlock: space.sm,
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
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: {
      default: 0,
      '@media (max-width: 720px)': `calc(${sizes.navControl} + 2 * ${space.lg})`,
    },
  },
})
