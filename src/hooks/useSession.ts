import { useSyncExternalStore } from 'react'
import { getSession, subscribeSession } from '@/lib/session'

export function useSession() {
  return useSyncExternalStore(subscribeSession, getSession, getSession)
}

export function useRequiredSession() {
  const session = useSession()
  if (!session) throw new Error('No active session')
  return session
}
