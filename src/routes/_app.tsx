import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Check, MagnifyingGlass, SignOut } from '@phosphor-icons/react'
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
import { getUserViewsOptions } from '@/api/gen/@tanstack/react-query.gen'
import { SearchPalette } from '@/components/SearchPalette'
import { useRouteGhost } from '@/hooks/useRouteGhost'
import { useSession } from '@/hooks/useSession'
import { useThemeId } from '@/hooks/useTheme'
import { logout } from '@/lib/auth'
import { springs } from '@/lib/motion'
import { getSession, type Session } from '@/lib/session'
import { THEMES, setThemeId, type ThemeId } from '@/lib/theme'
import { brandMark } from '@/brand'
import { glass, overlay } from '@/theme/glass'
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
  const themeId = useThemeId()
  const views = useQuery(getUserViewsOptions({ query: { userId: session.userId } }))
  const libraries = views.data?.Items?.filter((v) => v.CollectionType !== 'playlists') ?? []
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      if (isTypingTarget(e.target)) return
      e.preventDefault()
      setSearchOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header {...stylex.props(styles.nav)}>
      <SearchPalette userId={session.userId} isOpen={searchOpen} onOpenChange={setSearchOpen} />
      <Link to="/" aria-label={session.serverName} {...stylex.props(glass.surface, styles.brand)}>
        <span aria-hidden="true">{brandMark}</span>
      </Link>
      <nav aria-label="Libraries" {...stylex.props(glass.surface, styles.links)}>
        <NavLink to="/">Home</NavLink>
        {libraries.map((lib) => (
          <NavLink key={lib.Id} to="/library/$libraryId" libraryId={lib.Id ?? ''}>
            {lib.Name}
          </NavLink>
        ))}
      </nav>
      <div {...stylex.props(styles.right)}>
        <AriaButton
          aria-label="Search"
          onPress={() => setSearchOpen(true)}
          {...stylex.props(glass.surface, styles.search)}
        >
          <MagnifyingGlass size={16} />
          <span {...stylex.props(styles.searchLabel)}>Search</span>
          <kbd {...stylex.props(styles.kbd)}>/</kbd>
        </AriaButton>
        <MenuTrigger>
          <AriaButton aria-label="Account" {...stylex.props(glass.surface, styles.avatar)}>
            {session.userName.slice(0, 1).toUpperCase()}
          </AriaButton>
          <Popover
            placement="bottom end"
            offset={8}
            {...stylex.props(glass.panel, overlay.popover, styles.popover)}
          >
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
                          {isSelected && <Check size={14} weight="bold" />}
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
  | { to: '/'; libraryId?: undefined }
  | { to: '/library/$libraryId'; libraryId: string }
)

function NavLink({ children, ...target }: NavLinkProps) {
  const link =
    target.to === '/'
      ? ({ to: '/', activeOptions: { exact: true } } as const)
      : ({ to: '/library/$libraryId', params: { libraryId: target.libraryId } } as const)
  return (
    <Link {...link} {...stylex.props(styles.link)}>
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
    paddingInline: {
      default: sizes.pageGutter,
      '@media (max-width: 720px)': sizes.pageGutterMobile,
    },
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
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 2,
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
      '@media (max-width: 720px)': `calc(100vw - 2 * ${sizes.pageGutterMobile})`,
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
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
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
    outlineStyle: { default: 'none', '[data-focus-visible]': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 2,
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
    outlineStyle: { default: 'none', '[data-focus-visible]': 'solid' },
    outlineWidth: 2,
    outlineColor: colors.focusRing,
    outlineOffset: 2,
  },
  popover: {
    minWidth: 200,
    borderRadius: radii.lg,
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
    fontSize: 12,
    fontWeight: 500,
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
    paddingBottom: {
      default: 0,
      '@media (max-width: 720px)': `calc(${sizes.navControl} + 2 * ${space.lg})`,
    },
  },
})
