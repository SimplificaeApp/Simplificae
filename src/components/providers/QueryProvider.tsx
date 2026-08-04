'use client'

import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

interface QueryProviderProps {
  children: React.ReactNode
}

let browserPersister: any = null
if (typeof window !== 'undefined') {
  browserPersister = createSyncStoragePersister({
    storage: window.localStorage,
    key: 'FINANCE_APP_QUERY_CACHE',
  })
}

const dummyPersister = {
  persistClient: () => undefined,
  restoreClient: () => undefined,
  removeClient: () => undefined,
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 5, // Serve instantly from cache, but revalidate after 15 seconds
            gcTime: 1000 * 60 * 60 * 24, // Keep unused data in cache for 24 hours
            refetchOnWindowFocus: 'always', // Sync background changes whenever app is re-focused
            refetchOnReconnect: true, // Sync when returning online
            refetchInterval: 1000 * 60, // Periodically revalidate in background every 60s when active
            retry: 1,
            networkMode: 'offlineFirst', // Serve offline cache smoothly
          },
        },
      })
  )

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: browserPersister || dummyPersister, maxAge: 1000 * 60 * 60 * 24 * 7 }} // 7 days max cache age
    >
      {children}
    </PersistQueryClientProvider>
  )
}
