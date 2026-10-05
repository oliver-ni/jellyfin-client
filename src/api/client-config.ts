import type { CreateClientConfig } from './gen/client.gen'
import { authorizationHeader, getSession } from '../lib/session'

/** The generated client's config, derived from the stored session; re-applied on every change. */
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: getSession()?.serverUrl ?? '',
  auth: () => authorizationHeader(getSession()?.accessToken),
  querySerializer: { array: { explode: false, style: 'form' } },
})
