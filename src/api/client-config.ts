import type { CreateClientConfig } from './gen/client.gen'
import { authorizationHeader, getSession } from '../lib/session'

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: getSession()?.serverUrl ?? '',
  auth: () => authorizationHeader(getSession()?.accessToken),
})
