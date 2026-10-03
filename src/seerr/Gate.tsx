import * as stylex from '@stylexjs/stylex'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import { useRequiredSession } from '@/lib/session'
import { detail } from '@/theme/detail'
import { colors } from '@/theme/tokens.stylex'
import { connect } from './queries'

/**
 * What stands in for a Seerr page while this browser has no Seerr session to load it with. A
 * session is normally made from the Jellyfin one unasked (see `connect`), so being signed out
 * means that failed: Seerr admits Jellyfin users only when allowed to, or Quick Connect is off.
 */
export function Gate({ state }: { state: 'unavailable' | 'signedOut' }) {
  const { userName } = useRequiredSession()
  const retry = useMutation({ mutationFn: connect })
  return (
    <div {...stylex.props(detail.state)}>
      {state === 'unavailable' ? (
        <Notice
          title="Seerr isn’t available"
          text="Requests need a Seerr server connected to this client."
        />
      ) : (
        <Notice
          title="Seerr didn’t let you in"
          text={`Seerr has to admit ${userName}’s Jellyfin account before you can see what’s available and request titles. Ask whoever runs it, then try again.`}
        >
          <Button variant="primary" onPress={() => retry.mutate()} isPending={retry.isPending}>
            {retry.isPending ? 'Connecting…' : 'Try again'}
          </Button>
          {retry.error && (
            <p role="alert" {...stylex.props(styles.error)}>
              Still no luck
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
