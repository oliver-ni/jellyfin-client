import * as stylex from '@stylexjs/stylex'
import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Dialog, Form, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { approveQuickConnect } from '@/lib/quick-connect'
import { glass, overlay } from '@/theme/glass'
import { colors, space } from '@/theme/tokens.stylex'

export interface QuickConnectDialogProps {
  userName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

/** Approves the Quick Connect code a Jellyfin app is showing, signing that device in as the current user. */
export function QuickConnectDialog({ userName, isOpen, onOpenChange }: QuickConnectDialogProps) {
  const [code, setCode] = useState('')
  const approve = useMutation({ mutationFn: () => approveQuickConnect(code) })
  const close = () => {
    onOpenChange(false)
    setCode('')
    approve.reset()
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    approve.mutate()
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
              Quick Connect
            </Heading>
            {approve.isSuccess ? (
              <>
                <p {...stylex.props(styles.text)}>
                  Approved — the device is signing in as{' '}
                  <strong {...stylex.props(styles.strong)}>{userName}</strong>.
                </p>
                <div {...stylex.props(styles.actions)}>
                  <Button variant="primary" onPress={close} autoFocus>
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p {...stylex.props(styles.text)}>
                  Choose Quick Connect in the Jellyfin app on the other device and enter the code it
                  shows. That device signs in as{' '}
                  <strong {...stylex.props(styles.strong)}>{userName}</strong>.
                </p>
                <TextField
                  label="Code"
                  value={code}
                  onChange={setCode}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  isRequired
                  autoFocus
                />
                {approve.error && (
                  <p role="alert" {...stylex.props(styles.error)}>
                    {approve.error.message}
                  </p>
                )}
                <div {...stylex.props(styles.actions)}>
                  <Button variant="ghost" onPress={close}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" isPending={approve.isPending}>
                    {approve.isPending ? 'Approving…' : 'Approve'}
                  </Button>
                </div>
              </>
            )}
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
  error: {
    fontSize: 13,
    color: colors.danger,
    marginTop: `calc(-1 * ${space.sm})`,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: space.sm,
  },
})
