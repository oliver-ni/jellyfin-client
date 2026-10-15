import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  BookOpenText,
  Books,
  Devices,
  FilmStrip,
  House,
  List,
  MagnifyingGlass,
  MusicNotes,
  SignOut,
  SquaresFour,
  Television,
  Tray,
} from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Dialog,
  Menu,
  MenuItem,
  MenuTrigger,
  Modal,
  ModalOverlay,
  Popover,
  Button as AriaButton,
} from 'react-aria-components'
import type { BaseItemDto } from '@/api/gen/types.gen'
import { BrandMark } from '@/components/BrandMark'
import { QuickConnectDialog } from '@/components/QuickConnectDialog'
import { SearchPalette } from '@/components/SearchPalette'
import { useRouteGhost } from '@/hooks/useRouteGhost'
import { logout } from '@/lib/auth'
import { libraryLink, type ItemLink } from '@/lib/item-link'
import { springs } from '@/lib/motion'
import { queries } from '@/lib/queries'
import { requireSession, useSession, type Session } from '@/lib/session'
import { KOMGA_URL } from '@/komga/api'
import { signOut as komgaSignOut } from '@/komga/queries'
import { signOut as seerrSignOut, useSeerr } from '@/seerr/queries'
import { glass, overlay } from '@/theme/glass'
import { menu } from '@/theme/menu'
import { focus } from '@/theme/focus'
import { text } from '@/theme/text'
import { colors, motion, radii, sizes, space } from '@/theme/tokens.stylex'

export const Route = createFileRoute('/_app')({
  beforeLoad: requireSession,
  component: AppLayout,
})

function AppLayout() {
  const session = useSession()
  const shell = useRef<HTMLDivElement>(null)
  useRouteGhost(shell, Route.id)
  if (!session) return null
  return (
    <div ref={shell} {...stylex.props(styles.shell)}>
      <SideNav session={session} />
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

function SideNav({ session }: { session: Session }) {
  const navigate = useNavigate()
  const views = useQuery(queries.views(session.userId))
  const libraries = views.data?.Items?.filter((v) => v.CollectionType !== 'playlists') ?? []
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickConnectOpen, setQuickConnectOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const seerr = useSeerr()

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

  const links = (
    <nav
      aria-label="Libraries"
      onClick={() => setDrawerOpen(false)}
      {...stylex.props(styles.links)}
    >
      <NavLink to="/" icon={<House size={18} />}>
        Home
      </NavLink>
      {seerr && seerr.state !== 'unavailable' && (
        <NavLink to="/requests" icon={<Tray size={18} />}>
          Requests
        </NavLink>
      )}
      <h2 {...stylex.props(styles.section)}>Library</h2>
      {libraries.map((lib) => (
        <NavLink key={lib.Id} {...libraryLink(lib)} icon={libraryIcon(lib.CollectionType)}>
          {lib.Name}
        </NavLink>
      ))}
      {KOMGA_URL && (
        <NavLink to="/manga" icon={<BookOpenText size={18} />}>
          Manga
        </NavLink>
      )}
    </nav>
  )

  const account = (
    <MenuTrigger>
      <AriaButton aria-label="Account" {...stylex.props(focus.ring, styles.account)}>
        <span {...stylex.props(styles.avatar)}>{session.userName.slice(0, 1).toUpperCase()}</span>
        <span {...stylex.props(text.ellipsis, styles.accountName)}>{session.userName}</span>
      </AriaButton>
      <Popover
        placement="top start"
        offset={8}
        {...stylex.props(glass.panel, overlay.popover, menu.popover)}
      >
        <Menu
          {...stylex.props(menu.list)}
          onAction={async (key) => {
            if (key === 'quick-connect') setQuickConnectOpen(true)
            if (key === 'logout') {
              await Promise.all([logout(), seerrSignOut(), komgaSignOut()])
              await navigate({ to: '/login', replace: true })
            }
          }}
        >
          <MenuItem id="quick-connect" {...stylex.props(menu.item)}>
            <span {...stylex.props(menu.check)}>
              <Devices size={14} />
            </span>
            Quick Connect
          </MenuItem>
          <MenuItem id="logout" {...stylex.props(menu.item)}>
            <span {...stylex.props(menu.check)}>
              <SignOut size={14} />
            </span>
            Sign out
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  )

  const panel = (
    <>
      <div {...stylex.props(styles.brandRow)}>
        <Link to="/" aria-label={session.serverName} {...stylex.props(focus.ring, styles.brand)}>
          <span {...stylex.props(styles.iconSlot)}>
            <BrandMark size={20} />
          </span>
          <span {...stylex.props(styles.brandName)}>{session.serverName}</span>
        </Link>
        <AriaButton
          aria-label="Search"
          onPress={() => {
            setDrawerOpen(false)
            setSearchOpen(true)
          }}
          {...stylex.props(focus.ring, styles.searchButton)}
        >
          <MagnifyingGlass size={18} />
        </AriaButton>
      </div>
      {links}
      <div {...stylex.props(styles.panelFoot)}>{account}</div>
    </>
  )

  return (
    <>
      <SearchPalette userId={session.userId} isOpen={searchOpen} onOpenChange={setSearchOpen} />
      <QuickConnectDialog
        userName={session.userName}
        isOpen={quickConnectOpen}
        onOpenChange={setQuickConnectOpen}
      />
      <aside {...stylex.props(glass.panel, styles.panel, styles.sidebar)}>{panel}</aside>

      <header {...stylex.props(styles.topBar)}>
        <AriaButton
          aria-label="Menu"
          onPress={() => setDrawerOpen(true)}
          {...stylex.props(focus.ring, glass.surface, styles.topButton)}
        >
          <List size={18} />
        </AriaButton>
        <AriaButton
          aria-label="Search"
          onPress={() => setSearchOpen(true)}
          {...stylex.props(focus.ring, glass.surface, styles.topButton, styles.topSearch)}
        >
          <MagnifyingGlass size={16} />
        </AriaButton>
      </header>
      <ModalOverlay
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        isDismissable
        {...stylex.props(styles.drawerScrim)}
      >
        <Modal {...stylex.props(glass.panel, styles.drawer)}>
          <Dialog aria-label="Menu" {...stylex.props(styles.panel, styles.drawerPanel)}>
            {panel}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  )
}

function libraryIcon(type: BaseItemDto['CollectionType']) {
  switch (type) {
    case 'movies':
      return <FilmStrip size={18} />
    case 'tvshows':
      return <Television size={18} />
    case 'music':
      return <MusicNotes size={18} />
    case 'books':
      return <Books size={18} />
    default:
      return <SquaresFour size={18} />
  }
}

type NavLinkProps = { children: ReactNode; icon: ReactNode } & (
  | { to: '/' | '/requests' | '/manga'; params?: undefined }
  | ReturnType<typeof libraryLink>
  | ItemLink
)

function NavLink({ children, icon, ...target }: NavLinkProps) {
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
          <span
            {...stylex.props(styles.iconSlot, styles.linkIcon, isActive && styles.linkLabelActive)}
          >
            {icon}
          </span>
          <span
            {...stylex.props(text.ellipsis, styles.linkLabel, isActive && styles.linkLabelActive)}
          >
            {children}
          </span>
        </>
      )}
    </Link>
  )
}

const slideIn = stylex.keyframes({
  from: { transform: 'translateX(calc(-100% - 16px))' },
  to: { transform: 'translateX(0)' },
})
const slideOut = stylex.keyframes({
  from: { transform: 'translateX(0)' },
  to: { transform: 'translateX(calc(-100% - 16px))' },
})
const fadeIn = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })
const fadeOut = stylex.keyframes({ from: { opacity: 1 }, to: { opacity: 0 } })

const HIDE_SIDEBAR = '@media (max-width: 1024px)'
const SIDEBAR_W = 240
/** Concentric with the panel: its 20px corner minus the 8px padding. */
const ROW_RADIUS = 12

const styles = stylex.create({
  shell: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: colors.bg,
  },
  sidebar: {
    position: 'fixed',
    top: space.md,
    bottom: space.md,
    left: space.md,
    zIndex: 50,
    width: SIDEBAR_W,
    display: {
      default: 'flex',
      [HIDE_SIDEBAR]: 'none',
    },
    padding: space.sm,
    borderRadius: radii.xl,
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: space.xs,
  },
  brand: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    height: 44,
    paddingInline: space.md,
    borderRadius: ROW_RADIUS,
    color: colors.text,
    textDecoration: 'none',
  },
  brandName: {
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  links: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xxs,
    minHeight: 0,
    overflowY: 'auto',
    scrollbarWidth: 'none',
  },
  section: {
    paddingInline: space.md,
    paddingTop: space.lg,
    paddingBottom: space.xs,
    fontSize: 12,
    fontWeight: 600,
    color: colors.textFaint,
  },
  link: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    minHeight: 36,
    paddingInline: space.md,
    paddingBlock: space.xs,
    borderRadius: ROW_RADIUS,
    textDecoration: 'none',
    outlineOffset: -2,
  },
  linkActive: {
    position: 'absolute',
    inset: 0,
    borderRadius: ROW_RADIUS,
    backgroundColor: colors.surfaceHover,
  },
  iconSlot: {
    width: 24,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
  },
  linkIcon: {
    position: 'relative',
    color: colors.textMuted,
  },
  linkLabel: {
    position: 'relative',
    minWidth: 0,
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
  panelFoot: {
    marginTop: 'auto',
  },
  searchButton: {
    flexShrink: 0,
    width: 32,
    height: 32,
    marginInlineEnd: 6,
    display: 'grid',
    placeItems: 'center',
    borderRadius: radii.full,
    color: {
      default: colors.textMuted,
      '[data-hovered]': colors.text,
    },
    backgroundColor: {
      default: 'transparent',
      '[data-hovered]': colors.surfaceHover,
    },
  },
  account: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: space.md,
    paddingInline: space.sm,
    paddingBlock: space.sm,
    borderRadius: ROW_RADIUS,
    textAlign: 'left',
    backgroundColor: {
      default: 'transparent',
      '[data-hovered]': colors.surface,
    },
    transitionProperty: 'background-color',
    transitionDuration: motion.fast,
  },
  avatar: {
    width: 32,
    height: 32,
    flexShrink: 0,
    display: 'grid',
    placeItems: 'center',
    fontSize: 13,
    fontWeight: 600,
    color: colors.text,
    backgroundColor: colors.surfaceHover,
    borderRadius: radii.full,
  },
  accountName: {
    minWidth: 0,
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
  },
  topBar: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    display: {
      default: 'none',
      [HIDE_SIDEBAR]: 'flex',
    },
    alignItems: 'center',
    height: sizes.navHeight,
    paddingInline: sizes.pageGutter,
    pointerEvents: 'none',
  },
  topButton: {
    pointerEvents: 'auto',
    display: 'grid',
    placeItems: 'center',
    width: sizes.navControl,
    height: sizes.navControl,
    color: colors.text,
    borderRadius: radii.full,
  },
  topSearch: {
    marginInlineStart: 'auto',
  },
  drawerScrim: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    backgroundColor: colors.scrim,
    animationName: { default: 'none', '[data-entering]': fadeIn, '[data-exiting]': fadeOut },
    animationDuration: { default: motion.base, '[data-exiting]': motion.fast },
    animationTimingFunction: motion.ease,
    animationFillMode: 'both',
  },
  drawer: {
    position: 'absolute',
    top: space.sm,
    bottom: space.sm,
    left: space.sm,
    width: `min(${SIDEBAR_W}px, calc(100vw - 2 * ${space.lg}))`,
    borderRadius: radii.xl,
    backgroundColor: colors.bgElevated,
    animationName: { default: 'none', '[data-entering]': slideIn, '[data-exiting]': slideOut },
    animationDuration: { default: motion.slow, '[data-exiting]': motion.base },
    animationTimingFunction: motion.ease,
    animationFillMode: 'both',
  },
  drawerPanel: {
    height: '100%',
    padding: space.sm,
    outline: 'none',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
})
