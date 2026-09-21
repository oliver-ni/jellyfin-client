import * as stylex from '@stylexjs/stylex'
import { useState } from 'react'
import { Button } from '@/components/Button'
import { Notice } from '@/components/Notice'
import { useRequiredSession } from '@/lib/session'
import { detail } from '@/theme/detail'
import { ConnectDialog } from './ConnectDialog'

/** What stands in for a Seerr page while this browser has no Seerr session to load it with. */
export function Gate({ state }: { state: 'unavailable' | 'signedOut' }) {
  const { userName } = useRequiredSession()
  const [connectOpen, setConnectOpen] = useState(false)
  return (
    <div {...stylex.props(detail.state)}>
      {state === 'unavailable' ? (
        <Notice
          title="Seerr isn’t available"
          text="Requests need a Seerr server connected to this client."
        />
      ) : (
        <Notice
          title="Connect Seerr to request titles"
          text="Sign in with your Jellyfin password to see whether titles are available and request them."
        >
          <Button variant="primary" onPress={() => setConnectOpen(true)}>
            Connect Seerr
          </Button>
          <ConnectDialog userName={userName} isOpen={connectOpen} onOpenChange={setConnectOpen} />
        </Notice>
      )}
    </div>
  )
}
