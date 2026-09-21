import { client } from '@/api/gen/client.gen'
import { authenticateUserByName, getPublicSystemInfo } from '@/api/gen/sdk.gen'
import { clearPersistedQueries } from './query'
import {
  authorizationHeader,
  getSession,
  normalizeServerUrl,
  setSession,
  subscribeSession,
  type Session,
} from './session'

function applySessionToClient(session: Session | null) {
  client.setConfig({
    baseUrl: session?.serverUrl ?? '',
    auth: () => authorizationHeader(session?.accessToken),
    querySerializer: { array: { explode: false, style: 'form' } },
  })
}

applySessionToClient(getSession())
subscribeSession(() => applySessionToClient(getSession()))

export class AuthError extends Error {
  readonly status: number | undefined

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

export async function probeServer(input: string) {
  const serverUrl = normalizeServerUrl(input)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const { data, response } = await getPublicSystemInfo({
      baseUrl: serverUrl,
      signal: controller.signal,
    })
    if (data) return { serverUrl, info: data }
    const status = response?.status
    throw new AuthError(
      status
        ? `Server responded with ${status}`
        : controller.signal.aborted
          ? 'Timed out connecting to server'
          : 'Could not reach server (check the URL and CORS)',
      status,
    )
  } finally {
    clearTimeout(timeout)
  }
}

export async function login(
  server: { serverUrl: string; serverName: string },
  username: string,
  password: string,
) {
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
      status,
    )
  }
  const session: Session = {
    serverUrl,
    serverName,
    userId: data.User.Id,
    userName: data.User.Name ?? username,
    accessToken: data.AccessToken,
  }
  await clearPersistedQueries()
  setSession(session)
  return session
}

export async function logout() {
  setSession(null)
  await clearPersistedQueries()
}
