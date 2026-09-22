import * as stylex from '@stylexjs/stylex'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowRight } from '@phosphor-icons/react'
import { motion as m } from 'motion/react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Button as AriaButton, Form } from 'react-aria-components'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { AuthError, login, probeServer, type Server } from '@/lib/auth'
import { fadeUp, stagger } from '@/lib/motion'
import { getSession, normalizeServerUrl } from '@/lib/session'
import * as seerr from '@/seerr/queries'
import { titleHead } from '@/brand'
import { focus } from '@/theme/focus'
import { glass } from '@/theme/glass'
import { playPill } from '@/theme/media'
import { colors, radii, sizes, space } from '@/theme/tokens.stylex'

const RECENT_SERVER_KEY = 'jf.recentServer'
/** A build made for one server skips the address step entirely. */
const FIXED_SERVER = import.meta.env.VITE_JELLYFIN_URL
  ? normalizeServerUrl(import.meta.env.VITE_JELLYFIN_URL)
  : null

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: '/' })
  },
  head: () => titleHead('Sign in'),
  component: LoginPage,
})

const host = (url: string) => url.replace(/^https?:\/\//, '')
const messageOf = (err: unknown) =>
  err instanceof AuthError ? err.message : 'Something went wrong'

function LoginPage() {
  const navigate = useNavigate()
  const { redirect: redirectTo } = Route.useSearch()
  const [serverUrl, setServerUrl] = useState<string | null>(FIXED_SERVER)
  const [pickingServer, setPickingServer] = useState(false)
  const probe = useQuery({
    queryKey: ['server', serverUrl],
    queryFn: () => probeServer(serverUrl ?? ''),
    enabled: serverUrl !== null,
    staleTime: Infinity,
    retry: false,
    persister: undefined,
  })
  // A fixed server is signed into straight away; its name catches up when the probe answers.
  const server: Server | null =
    probe.data ??
    (FIXED_SERVER ? { serverUrl: FIXED_SERVER, serverName: host(FIXED_SERVER), version: '' } : null)

  const signIn = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      if (!server) return
      await login(server, username, password)
      localStorage.setItem(RECENT_SERVER_KEY, server.serverUrl)
      void seerr.signIn(username, password).catch(() => null)
    },
    onSuccess: () =>
      redirectTo
        ? navigate({ href: redirectTo, replace: true })
        : navigate({ to: '/', replace: true }),
  })

  return (
    <main {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.glow)} />
      <span {...stylex.props(glass.surface, styles.brand)}>
        <BrandMark />
      </span>
      {server && !pickingServer ? (
        <CredentialsStep
          key={server.serverUrl}
          server={server}
          busy={signIn.isPending}
          error={signIn.error ? messageOf(signIn.error) : null}
          onSubmit={signIn.mutate}
          onChangeServer={FIXED_SERVER ? undefined : () => setPickingServer(true)}
        />
      ) : (
        <ServerStep
          initial={serverUrl ?? localStorage.getItem(RECENT_SERVER_KEY) ?? ''}
          busy={probe.isFetching}
          error={probe.error ? messageOf(probe.error) : null}
          onSubmit={(url) => {
            if (url === serverUrl) void probe.refetch()
            else setServerUrl(url)
            setPickingServer(false)
            signIn.reset()
          }}
        />
      )}
    </main>
  )
}

interface StepProps {
  busy: boolean
  error: string | null
}

interface ServerStepProps extends StepProps {
  initial: string
  onSubmit: (url: string) => void
}

function ServerStep({ initial, busy, error, onSubmit }: ServerStepProps) {
  const [input, setInput] = useState(initial)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(normalizeServerUrl(input))
  }
  return (
    <Step
      eyebrow="Connect to"
      title="Jellyfin"
      subtitle="The address of the server you watch from."
    >
      <Form onSubmit={submit} {...stylex.props(styles.form)}>
        <TextField
          label="Server address"
          placeholder="jellyfin.example.com"
          value={input}
          onChange={setInput}
          autoFocus
          isRequired
          type="text"
          autoComplete="url"
          inputStyle={styles.input}
        />
        <Submit label={busy ? 'Connecting…' : 'Continue'} isDisabled={busy || !input} />
      </Form>
      <Alert message={error} />
    </Step>
  )
}

interface CredentialsStepProps extends StepProps {
  server: Server
  onSubmit: (credentials: { username: string; password: string }) => void
  onChangeServer?: () => void
}

function CredentialsStep({ server, busy, error, onSubmit, onChangeServer }: CredentialsStepProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ username, password })
  }
  const subtitle = [host(server.serverUrl), server.version && `Jellyfin ${server.version}`]
    .filter(Boolean)
    .join(' · ')
  return (
    <Step eyebrow="Sign in to" title={server.serverName} subtitle={subtitle}>
      <Form onSubmit={submit} {...stylex.props(styles.form)}>
        <TextField
          label="Username"
          value={username}
          onChange={setUsername}
          autoFocus
          isRequired
          autoComplete="username"
          inputStyle={styles.input}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          inputStyle={styles.input}
        />
        <Submit label={busy ? 'Signing in…' : 'Sign in'} isDisabled={busy || !username} />
      </Form>
      <Alert message={error} />
      {onChangeServer && (
        <m.div variants={fadeUp}>
          <Button variant="ghost" size="sm" onPress={onChangeServer} style={styles.changeServer}>
            Use a different server
          </Button>
        </m.div>
      )}
    </Step>
  )
}

function Submit({ label, isDisabled }: { label: string; isDisabled: boolean }) {
  return (
    <m.div variants={fadeUp}>
      <AriaButton
        type="submit"
        isDisabled={isDisabled}
        {...stylex.props(focus.ring, playPill.base, styles.submit)}
      >
        {label}
        <ArrowRight size={16} weight="bold" />
      </AriaButton>
    </m.div>
  )
}

function Alert({ message }: { message: string | null }) {
  return (
    <p role="alert" {...stylex.props(styles.error)}>
      {message}
    </p>
  )
}

interface StepLayoutProps {
  eyebrow: string
  title: string
  subtitle: string
  children: ReactNode
}

function Step({ eyebrow, title, subtitle, children }: StepLayoutProps) {
  return (
    <m.section
      variants={stagger(0.04)}
      initial="hidden"
      animate="show"
      {...stylex.props(styles.step)}
    >
      <m.span variants={fadeUp} {...stylex.props(styles.eyebrow)}>
        {eyebrow}
      </m.span>
      <m.h1 variants={fadeUp} {...stylex.props(styles.title)}>
        {title}
      </m.h1>
      <m.p variants={fadeUp} {...stylex.props(styles.subtitle)}>
        {subtitle}
      </m.p>
      {children}
    </m.section>
  )
}

const styles = stylex.create({
  page: {
    position: 'relative',
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    paddingInline: sizes.pageGutter,
    paddingTop: sizes.navHeight,
    paddingBottom: {
      default: 'clamp(48px, 12vh, 128px)',
      '@media (max-width: 720px)': `calc(${space.xxl} + env(safe-area-inset-bottom))`,
    },
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    left: '-10%',
    bottom: '-30%',
    width: '70vw',
    height: '80vh',
    backgroundImage: `radial-gradient(ellipse at 30% 80%, ${colors.glow} 0%, transparent 60%)`,
    pointerEvents: 'none',
  },
  brand: {
    position: 'absolute',
    top: `calc((${sizes.navHeight} - ${sizes.navControl}) / 2)`,
    left: sizes.pageGutter,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: sizes.navControl,
    height: sizes.navControl,
    fontSize: 18,
    lineHeight: 1,
    borderRadius: radii.full,
  },
  step: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 720,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.textMuted,
  },
  title: {
    marginTop: space.sm,
    fontSize: 'clamp(40px, 5vw, 64px)',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    lineHeight: 1.02,
    color: colors.text,
    textWrap: 'balance',
    overflowWrap: 'anywhere',
  },
  subtitle: {
    marginTop: space.md,
    fontSize: 15,
    color: colors.textMuted,
  },
  form: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: space.md,
    marginTop: space.xxl,
  },
  input: {
    height: 46,
    minWidth: 240,
    paddingInline: space.lg,
    borderRadius: radii.full,
  },
  submit: {
    borderWidth: 0,
    fontFamily: 'inherit',
    cursor: {
      default: 'pointer',
      '[data-disabled]': 'default',
    },
    opacity: {
      default: 1,
      '[data-disabled]': 0.4,
    },
  },
  error: {
    minHeight: 20,
    marginTop: space.md,
    fontSize: 14,
    color: colors.danger,
  },
  changeServer: {
    marginTop: space.sm,
    marginInlineStart: `calc(-1 * ${space.md})`,
  },
})
