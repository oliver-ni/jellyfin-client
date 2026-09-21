import { QueryClient } from '@tanstack/react-query'
import {
  experimental_createQueryPersister,
  type AsyncStorage,
  type PersistedQuery,
} from '@tanstack/query-persist-client-core'
import { createStore, del, entries, get, set } from 'idb-keyval'

const store = createStore('jellyfin-client', 'queries')

const storage: AsyncStorage<PersistedQuery> = {
  getItem: (key) => get<PersistedQuery>(key, store),
  setItem: (key, value) => set(key, value, store),
  removeItem: (key) => del(key, store),
  entries: () => entries<string, PersistedQuery>(store),
}

const persister = experimental_createQueryPersister<PersistedQuery>({
  storage,
  serialize: (q) => q,
  deserialize: (q) => q,
  maxAge: 1000 * 60 * 60 * 24 * 7,
  buster: __APP_VERSION__,
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1,
      refetchOnWindowFocus: false,
      persister: persister.persisterFn,
    },
  },
})

export async function clearPersistedQueries() {
  queryClient.clear()
  await persister.removeQueries()
}
