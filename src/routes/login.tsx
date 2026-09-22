import * as stylex from '@stylexjs/stylex'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { motion as m } from 'motion/react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Form } from 'react-aria-components'
import { titleHead } from '@/brand'
import { BrandMark } from '@/components/BrandMark'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { AuthError, login, probeServer, type Server } from '@/lib/auth'
import { fadeUp, stagger } from '@/lib/motion'
import { getSession, normalizeServerUrl } from '@/lib/session'
import * as seerr from '@/seerr/queries'
import { glass } from '@/theme/glass'
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
    (FIXED_SERVER ? { serverUrl: FIXED_SERVER, serverName: host(FIXED_SERVER) } : null)

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
      title="Connect to Jellyfin"
      subtitle="The address of the server you watch from."
      error={error}
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
        />
        <Submit label={busy ? 'Connecting…' : 'Continue'} isDisabled={busy || !input} />
      </Form>
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
  return (
    <Step
      title="Sign in"
      subtitle={host(server.serverUrl)}
      error={error}
      footer={
        onChangeServer && (
          <Button variant="ghost" size="sm" onPress={onChangeServer}>
            Use a different server
          </Button>
        )
      }
    >
      <Form onSubmit={submit} {...stylex.props(styles.form)}>
        <TextField
          label="Username"
          value={username}
          onChange={setUsername}
          autoFocus
          isRequired
          autoComplete="username"
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <Submit label={busy ? 'Signing in…' : 'Sign in'} isDisabled={busy || !username} />
      </Form>
    </Step>
  )
}

function Submit({ label, isDisabled }: { label: string; isDisabled: boolean }) {
  return (
    <m.div variants={fadeUp} {...stylex.props(styles.submit)}>
      <Button type="submit" variant="primary" size="lg" isDisabled={isDisabled} style={styles.wide}>
        {label}
      </Button>
    </m.div>
  )
}

interface StepLayoutProps {
  title: string
  subtitle: string
  error: string | null
  footer?: ReactNode
  children: ReactNode
}

function Step({ title, subtitle, error, footer, children }: StepLayoutProps) {
  return (
    <m.section
      variants={stagger(0.04)}
      initial="hidden"
      animate="show"
      {...stylex.props(styles.step)}
    >
      <m.span variants={fadeUp} {...stylex.props(glass.surface, styles.brand)}>
        <BrandMark />
      </m.span>
      <m.h1 variants={fadeUp} {...stylex.props(styles.title)}>
        {title}
      </m.h1>
      <m.p variants={fadeUp} {...stylex.props(styles.subtitle)}>
        {subtitle}
      </m.p>
      {children}
      <p role="alert" {...stylex.props(styles.error)}>
        {error}
      </p>
      {footer && <m.div variants={fadeUp}>{footer}</m.div>}
    </m.section>
  )
}

const styles = stylex.create({
  page: {
    minHeight: '100dvh',
    display: 'grid',
    placeItems: 'center',
    paddingInline: sizes.pageGutter,
    paddingBlock: space.xxl,
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  brand: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    fontSize: 20,
    lineHeight: 1,
    borderRadius: radii.full,
  },
  title: {
    marginTop: space.xl,
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: colors.text,
    textAlign: 'center',
    textWrap: 'balance',
  },
  subtitle: {
    marginTop: space.xs,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    width: '100%',
    marginTop: space.xl,
  },
  submit: {
    marginTop: space.xs,
  },
  wide: {
    width: '100%',
  },
  error: {
    minHeight: 20,
    marginTop: space.md,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
  },
})
