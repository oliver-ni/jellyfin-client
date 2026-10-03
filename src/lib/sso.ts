import { AuthError, loginWithToken, type Server } from './auth'
import { getDeviceId } from './session'

/**
 * Sign-in through the server's SSO plugin (9p4/jellyfin-plugin-sso). Its OpenID flow ends on a
 * page written for jellyfin-web: it loads `/web/index.html` in a frame so jellyfin-web fills in its
 * localStorage, posts the flow's state to `/sso/OID/Auth/<provider>` with the device id found
 * there, writes the token back into that storage, and goes to `/web/index.html`.
 *
 * This client plays jellyfin-web's part. The deployment proxies `/sso/*` on this origin to the
 * server with the Host header kept, so the plugin builds its URLs on this origin and the page runs
 * here; the `/web/index.html` route then seeds the storage when it is the frame, and picks up the
 * token when it is the page.
 */

/** Set only with `VITE_JELLYFIN_URL`: the `/sso` proxy can only point at one server. */
export const SSO_PROVIDER =
  (import.meta.env.VITE_JELLYFIN_URL && import.meta.env.VITE_SSO_PROVIDER) || null

const PENDING_KEY = 'jf.sso'
// jellyfin-web's keys, which the plugin's page reads and writes.
const WEB_DEVICE_ID_KEY = '_deviceId2'
const WEB_CREDENTIALS_KEY = 'jellyfin_credentials'

/** Carried across the redirects in localStorage. */
interface Pending {
  server: Server
  redirect?: string
}

interface WebCredentials {
  Servers: { Id: string; AccessToken?: string; UserId?: string }[]
}

function pending(): Pending | null {
  const raw = localStorage.getItem(PENDING_KEY)
  return raw ? (JSON.parse(raw) as Pending) : null
}

/** Leaves for the provider; `redirect` is where to land once signed in. */
export function startSso(server: Server, redirect?: string) {
  localStorage.setItem(PENDING_KEY, JSON.stringify({ server, redirect } satisfies Pending))
  localStorage.setItem(WEB_DEVICE_ID_KEY, getDeviceId())
  window.location.assign(`/sso/OID/start/${SSO_PROVIDER}`)
}

/** In the plugin's frame: what jellyfin-web would have left in localStorage. */
export function seedWebCredentials() {
  const flow = pending()
  if (!flow) return
  const credentials: WebCredentials = { Servers: [{ Id: flow.server.serverId }] }
  localStorage.setItem(WEB_CREDENTIALS_KEY, JSON.stringify(credentials))
}

/** On the page the plugin ends at: signs in with the token it left, and says where to go. */
export async function finishSso(): Promise<string | undefined> {
  const flow = pending()
  const raw = localStorage.getItem(WEB_CREDENTIALS_KEY)
  for (const key of [PENDING_KEY, WEB_CREDENTIALS_KEY, WEB_DEVICE_ID_KEY]) {
    localStorage.removeItem(key)
  }
  const token = raw ? (JSON.parse(raw) as WebCredentials).Servers[0]?.AccessToken : undefined
  if (!flow || !token) throw new AuthError('Sign-in didn’t complete')
  await loginWithToken(flow.server, token)
  return flow.redirect
}
