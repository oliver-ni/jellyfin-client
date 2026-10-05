import { client } from '@/api/gen/client.gen'
import { authenticateUserByName, getCurrentUser, getPublicSystemInfo } from '@/api/gen/sdk.gen'
import { clearPersistedQueries } from './query'
import {
  authorizationHeader,
  getSession,
  normalizeServerUrl,
  setSession,
  type Session,
} from './session'

function applySession(session: Session | null) {
  setSession(session)
  client.setConfig({
    baseUrl: session?.serverUrl ?? '',
    auth: () => authorizationHeader(session?.accessToken),
    querySerializer: { array: { explode: false, style: 'form' } },
  })
}

applySession(getSession())

/** A failure with a message fit to show the user. */
export class AuthError extends Error {}

export interface Server {
  serverUrl: string
  serverName: string
  /** The server's own id, from its public info. */
  serverId: string
}

export async function probeServer(input: string): Promise<Server> {
  const serverUrl = normalizeServerUrl(input)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const { data, response } = await getPublicSystemInfo({
      baseUrl: serverUrl,
      signal: controller.signal,
    })
    if (data?.Id) {
      return { serverUrl, serverName: data.ServerName ?? serverUrl, serverId: data.Id }
    }
    const status = response?.status
    throw new AuthError(
      status
        ? `Server responded with ${status}`
        : controller.signal.aborted
          ? 'Timed out connecting to server'
          : 'Could not reach server (check the URL and CORS)',
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function startSession(server: Server, user: Omit<Session, 'serverUrl' | 'serverName'>) {
  await clearPersistedQueries()
  applySession({ serverUrl: server.serverUrl, serverName: server.serverName, ...user })
}

export async function login(server: Server, username: string, password: string) {
  const { data, error, response } = await authenticateUserByName({
    baseUrl: server.serverUrl,
    body: { Username: username, Pw: password },
    headers: { Authorization: authorizationHeader() },
  })
  if (error || !data?.AccessToken || !data.User?.Id) {
    const status = response?.status
    throw new AuthError(
      status === 401
        ? 'Invalid username or password'
        : `Login failed (${status ?? 'network error'})`,
    )
  }
  await startSession(server, {
    userId: data.User.Id,
    userName: data.User.Name ?? username,
    accessToken: data.AccessToken,
  })
}

/** Takes up a session from a token issued elsewhere (the SSO plugin); the user is looked up. */
export async function loginWithToken(server: Server, accessToken: string) {
  const { data, response } = await getCurrentUser({
    baseUrl: server.serverUrl,
    headers: { Authorization: authorizationHeader(accessToken) },
  })
  if (!data?.Id) {
    throw new AuthError(`Login failed (${response?.status ?? 'network error'})`)
  }
  await startSession(server, { userId: data.Id, userName: data.Name ?? '', accessToken })
}

export async function logout() {
  applySession(null)
  await clearPersistedQueries()
}
