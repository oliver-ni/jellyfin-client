import { client } from '@/api/gen/client.gen'
import { authenticateUserByName, getPublicSystemInfo } from '@/api/gen/sdk.gen'
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
    if (data) {
      return { serverUrl, serverName: data.ServerName ?? serverUrl }
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

export async function login(server: Server, username: string, password: string) {
  const { serverUrl, serverName } = server
  const { data, error, response } = await authenticateUserByName({
    baseUrl: serverUrl,
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
  await clearPersistedQueries()
  applySession({
    serverUrl,
    serverName,
    userId: data.User.Id,
    userName: data.User.Name ?? username,
    accessToken: data.AccessToken,
  })
}

export async function logout() {
  applySession(null)
  await clearPersistedQueries()
}
