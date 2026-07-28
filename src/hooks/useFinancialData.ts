'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export const QUERY_KEYS = {
  transactions: ['transactions'] as const,
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
  workspaces: ['workspaces'] as const,
}

/**
  Hook for cached transactions. Queries Supabase directly on invalidation/refetch,
  and syncs initial server data seamlessly into TanStack Query.
 */
export function useTransactionsQuery(initialData?: any[]) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      queryClient.setQueryData(QUERY_KEYS.transactions, initialData)
    }
  }, [initialData, queryClient])

  return useQuery({
    queryKey: QUERY_KEYS.transactions,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('transactions')
        .select('*, category:categories(id, name, icon, color), account:accounts!transactions_account_id_fkey(id, name)')
        .order('date', { ascending: false })
        .limit(500)

      if (error) {
        console.error('Error fetching transactions client-side:', error)
        throw error
      }
      return data || []
    },
    initialData: initialData && initialData.length > 0 ? initialData : undefined,
  })
}

/**
  Hook for cached accounts and vaults.
 */
export function useAccountsQuery(initialData?: any[]) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      queryClient.setQueryData(QUERY_KEYS.accounts, initialData)
    }
  }, [initialData, queryClient])

  return useQuery({
    queryKey: QUERY_KEYS.accounts,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('accounts')
        .select('*, account_vaults(*)')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching accounts client-side:', error)
        throw error
      }
      return data || []
    },
    initialData: initialData && initialData.length > 0 ? initialData : undefined,
  })
}

/**
  Hook for cached categories.
 */
export function useCategoriesQuery(initialData?: any[]) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      queryClient.setQueryData(QUERY_KEYS.categories, initialData)
    }
  }, [initialData, queryClient])

  return useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching categories client-side:', error)
        throw error
      }
      return data || []
    },
    initialData: initialData && initialData.length > 0 ? initialData : undefined,
  })
}

/**
  Utility hook to invalidate all financial queries after data mutations (create, update, delete).
 */
export function useInvalidateFinancialData() {
  const queryClient = useQueryClient()

  return () => {
    // Only invalidate if online. If offline, the refetch will fail anyway.
    // Optimistic UI should be handled locally without invalidation.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return
    }
    
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workspaces })
  }
}
