import { authorizeQuickConnect } from '@/api/gen/sdk.gen'

export class QuickConnectError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const messages: Record<number, string> = {
  401: 'Quick Connect is turned off on this server',
  404: 'No device is waiting with that code',
}

/**
 * Approves a pending Quick Connect code as the signed-in user; the device that showed the code
 * then receives its own session. Rejects with a `QuickConnectError` when Jellyfin refuses.
 */
export async function approveQuickConnect(code: string): Promise<void> {
  const { data, error, response } = await authorizeQuickConnect({ query: { code: code.trim() } })
  if (error || !data) {
    const status = response?.status ?? 0
    throw new QuickConnectError(status, messages[status] ?? 'Jellyfin refused the code')
  }
}
