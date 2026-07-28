'use client'

import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity, // Keep cached data fresh indefinitely unless explicitly invalidated
            gcTime: 1000 * 60 * 60 * 24, // Keep unused data in cache for 24 hours
            refetchOnWindowFocus: true, // Revalidate when user returns to app tab
            refetchOnReconnect: true, // Revalidate when internet connection is restored
            retry: 1,
            networkMode: 'offlineFirst', // Allow queries and mutations to be paused when offline instead of failing
          },
        },
      })
  )

  const [persister, setPersister] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storagePersister = createSyncStoragePersister({
        storage: window.localStorage,
        key: 'FINANCE_APP_QUERY_CACHE',
      })
      setPersister(storagePersister)
    }
  }, [])

  if (!persister) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }} // 7 days max cache age
    >
      {children}
    </PersistQueryClientProvider>
  )
}
