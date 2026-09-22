import { redirect } from '@tanstack/react-router'
import { createStore, useStore } from 'zustand'

const SESSION_KEY = 'jf.session'
const DEVICE_ID_KEY = 'jf.deviceId'

const CLIENT_NAME = 'Jellyfin Client'
const CLIENT_VERSION = __APP_VERSION__

export interface Session {
  serverUrl: string
  serverName: string
  userId: string
  userName: string
  accessToken: string
}

const stored = localStorage.getItem(SESSION_KEY)
const store = createStore<Session | null>(() => (stored ? (JSON.parse(stored) as Session) : null))

export const getSession = store.getState
export const useSession = () => useStore(store)

export function setSession(session: Session | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
  store.setState(session, true)
}

/** Route `beforeLoad` that sends signed-out visitors to the login page and back afterwards. */
export function requireSession({ location }: { location: { href: string } }) {
  if (!getSession()) throw redirect({ to: '/login', search: { redirect: location.href } })
}

/** For routes under `_app`, whose `beforeLoad` guarantees a session. */
export function useRequiredSession(): Session {
  const session = useSession()
  if (!session) throw new Error('No active session')
  return session
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

function deviceName(): string {
  const ua = navigator.userAgent
  const browser = /Firefox\//.test(ua)
    ? 'Firefox'
    : /Edg\//.test(ua)
      ? 'Edge'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser'
  const os = /Mac OS/.test(ua)
    ? 'macOS'
    : /Windows/.test(ua)
      ? 'Windows'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : ''
  return os ? `${browser} on ${os}` : browser
}

export function authorizationHeader(token?: string): string {
  const parts = [
    `Client="${CLIENT_NAME}"`,
    `Device="${deviceName().replace(/"/g, '')}"`,
    `DeviceId="${getDeviceId()}"`,
    `Version="${CLIENT_VERSION}"`,
  ]
  if (token) parts.push(`Token="${token}"`)
  return `MediaBrowser ${parts.join(', ')}`
}

export function normalizeServerUrl(input: string): string {
  let url = input.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  return url
}
