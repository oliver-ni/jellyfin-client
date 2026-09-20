import * as stylex from '@stylexjs/stylex'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Form } from 'react-aria-components'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { AuthError, login, probeServer } from '@/lib/auth'
import { getSession } from '@/lib/session'
import { colors, radii, space } from '@/theme/tokens.stylex'

const RECENT_SERVER_KEY = 'jf.recentServer'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: () => {
    if (getSession()) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

type Step =
  | { kind: 'server' }
  | { kind: 'credentials'; serverUrl: string; serverName: string; version: string }

function LoginPage() {
  const navigate = useNavigate()
  const { redirect: redirectTo } = Route.useSearch()
  const [step, setStep] = useState<Step>({ kind: 'server' })
  const [serverInput, setServerInput] = useState(
    () => localStorage.getItem(RECENT_SERVER_KEY) ?? '',
  )
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onConnect(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const { serverUrl, info } = await probeServer(serverInput)
      localStorage.setItem(RECENT_SERVER_KEY, serverUrl)
      setStep({
        kind: 'credentials',
        serverUrl,
        serverName: info.ServerName ?? serverUrl,
        version: info.Version ?? '',
      })
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault()
    if (step.kind !== 'credentials') return
    setBusy(true)
    setError(null)
    try {
      await login(step, username, password)
      if (redirectTo) await navigate({ href: redirectTo, replace: true })
      else await navigate({ to: '/', replace: true })
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <main {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.glow)} />
      <section {...stylex.props(styles.card)}>
        <header {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.logo)} />
          {step.kind === 'server' ? (
            <>
              <h1 {...stylex.props(styles.title)}>Connect to Jellyfin</h1>
              <p {...stylex.props(styles.subtitle)}>Enter the address of your server.</p>
            </>
          ) : (
            <>
              <h1 {...stylex.props(styles.title)}>{step.serverName}</h1>
              <p {...stylex.props(styles.subtitle)}>
                {step.serverUrl.replace(/^https?:\/\//, '')}
                {step.version ? ` · v${step.version}` : ''}
              </p>
            </>
          )}
        </header>

        {step.kind === 'server' ? (
          <Form onSubmit={onConnect} {...stylex.props(styles.form)}>
            <TextField
              label="Server address"
              placeholder="jellyfin.example.com"
              value={serverInput}
              onChange={setServerInput}
              autoFocus
              isRequired
              type="text"
              autoComplete="url"
            />
            {error && <p {...stylex.props(styles.error)}>{error}</p>}
            <Button type="submit" variant="primary" size="lg" isDisabled={busy || !serverInput}>
              {busy ? 'Connecting…' : 'Continue'}
            </Button>
          </Form>
        ) : (
          <Form onSubmit={onLogin} {...stylex.props(styles.form)}>
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
            {error && <p {...stylex.props(styles.error)}>{error}</p>}
            <Button type="submit" variant="primary" size="lg" isDisabled={busy || !username}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {
                setStep({ kind: 'server' })
                setError(null)
              }}
            >
              <ArrowLeft size={14} />
              Change server
            </Button>
          </Form>
        )}
      </section>
    </main>
  )
}

const styles = stylex.create({
  page: {
    position: 'relative',
    minHeight: '100dvh',
    display: 'grid',
    placeItems: 'center',
    padding: space.xl,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: '-20%',
    left: '50%',
    width: 800,
    height: 600,
    transform: 'translateX(-50%)',
    backgroundImage:
      'radial-gradient(ellipse at center, rgba(167,139,250,0.18) 0%, rgba(167,139,250,0) 60%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: space.xl,
    padding: space.xxl,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.border,
    borderRadius: radii.xl,
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
  },
  logo: {
    width: 40,
    height: 40,
    marginBottom: space.md,
    borderRadius: radii.md,
    backgroundImage: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
})
