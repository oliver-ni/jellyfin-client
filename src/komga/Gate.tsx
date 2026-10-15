import * as stylex from '@stylexjs/stylex'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import { detail } from '@/theme/detail'
import { colors } from '@/theme/tokens.stylex'
import { connect } from './queries'

/**
 * What stands in for a manga page while this browser has no Komga session. Komga signs people
 * in itself, in a popup, so the first visit (and each one after its session expires) is a click.
 */
export function Gate({ state }: { state: 'unavailable' | 'signedOut' }) {
  const signIn = useMutation({ mutationFn: connect })
  return (
    <div {...stylex.props(detail.state)}>
      {state === 'unavailable' ? (
        <Notice title="Manga isn’t available" text="The manga server can’t be reached right now." />
      ) : (
        <Notice title="Manga" text="Sign in once more to open the manga library.">
          <Button variant="primary" onPress={() => signIn.mutate()} isPending={signIn.isPending}>
            {signIn.isPending ? 'Waiting for sign-in…' : 'Continue'}
          </Button>
          {signIn.error && (
            <p role="alert" {...stylex.props(styles.error)}>
              {signIn.error.message}
            </p>
          )}
        </Notice>
      )}
    </div>
  )
}

const styles = stylex.create({
  error: {
    fontSize: 13,
    color: colors.danger,
  },
})
