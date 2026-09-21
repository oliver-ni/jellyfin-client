import * as stylex from '@stylexjs/stylex'
import { useState, type FormEvent } from 'react'
import { Dialog, Form, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { glass, overlay } from '@/theme/glass'
import { colors, space } from '@/theme/tokens.stylex'
import { SeerrError } from './api'
import { signIn } from './queries'

export interface ConnectDialogProps {
  userName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

/** Signs this browser in to Seerr as the current Jellyfin user; only the password is asked. */
export function ConnectDialog({ userName, isOpen, onOpenChange }: ConnectDialogProps) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    onOpenChange(false)
    setPassword('')
    setError(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await signIn(userName, password)
      close()
    } catch (err) {
      setError(
        err instanceof SeerrError && err.status === 401
          ? 'Seerr didn’t accept that password'
          : 'Couldn’t reach Seerr',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => !open && close()}
      isDismissable
      {...stylex.props(overlay.backdrop)}
    >
      <Modal {...stylex.props(glass.panel, overlay.sheet, styles.modal)}>
        <Dialog {...stylex.props(styles.dialog)}>
          <Form onSubmit={submit} {...stylex.props(styles.form)}>
            <Heading slot="title" {...stylex.props(styles.title)}>
              Connect Seerr
            </Heading>
            <p {...stylex.props(styles.text)}>
              Sign in as <strong {...stylex.props(styles.strong)}>{userName}</strong> with your
              Jellyfin password to search for and request titles your library doesn’t have.
            </p>
            <TextField
              label="Password"
              type="password"
              name="password"
              value={password}
              onChange={setPassword}
              isRequired
              isInvalid={error !== null}
              errorMessage={error ?? undefined}
              autoFocus
            />
            <div {...stylex.props(styles.actions)}>
              <Button variant="ghost" onPress={close}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isPending={busy}>
                {busy ? 'Connecting…' : 'Connect'}
              </Button>
            </div>
          </Form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

const styles = stylex.create({
  modal: {
    maxWidth: 420,
  },
  dialog: {
    outline: 'none',
    padding: space.xl,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  text: {
    fontSize: 14,
    lineHeight: 1.5,
    color: colors.textMuted,
    marginTop: `calc(-1 * ${space.sm})`,
  },
  strong: {
    fontWeight: 600,
    color: colors.text,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: space.sm,
  },
})
