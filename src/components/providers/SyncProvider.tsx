'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getPendingMutations, removeMutation, OfflineMutation } from '@/lib/offlineSync'
import { createTransaction, updateTransaction, deleteTransaction } from '@/app/actions/transactions'
import { createCategory, updateCategory, deleteCategory } from '@/app/actions/categories'
import { CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useInvalidateFinancialData } from '@/hooks/useFinancialData'
import { AnimatePresence, motion } from 'framer-motion'

interface SyncContextType {
  isOnline: boolean
  pendingCount: number
}

const SyncContext = createContext<SyncContextType>({ isOnline: true, pendingCount: 0 })

export const useSync = () => useContext(SyncContext)

// Prevent concurrent syncs across renders or rapid events
let isSyncingGlobal = false

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showSyncSuccess, setShowSyncSuccess] = useState(false)
  
  const invalidateData = useInvalidateFinancialData()

  // Verify online status and queue length
  const checkStatus = useCallback(async () => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine)
    }
    const mutations = await getPendingMutations()
    setPendingCount(mutations.length)
  }, [])

  const processQueue = useCallback(async () => {
    if (!navigator.onLine || isSyncingGlobal) return
    
    const mutations = await getPendingMutations()
    if (mutations.length === 0) return

    isSyncingGlobal = true
    setIsSyncing(true)
    let syncedAny = false

    for (const mutation of mutations) {
      try {
        let formData: FormData | null = null
        
        // Se payload for um objeto, converte para FormData
        if (mutation.payload && typeof mutation.payload === 'object' && !Array.isArray(mutation.payload)) {
          formData = new FormData()
          Object.entries(mutation.payload).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              formData!.append(key, value.toString())
            }
          })
        }

        let res: any = null

        switch (mutation.actionType) {
          case 'CREATE_TRANSACTION':
            res = await createTransaction({}, formData!)
            break
          case 'UPDATE_TRANSACTION':
            res = await updateTransaction(mutation.payload.id, {}, formData!)
            break
          case 'DELETE_TRANSACTION':
            res = await deleteTransaction(mutation.payload.id, mutation.payload.scope || 'single')
            break
          case 'CREATE_CATEGORY':
            res = await createCategory({}, formData!)
            break
          case 'UPDATE_CATEGORY':
            res = await updateCategory(mutation.payload.id, {}, formData!)
            break
          case 'DELETE_CATEGORY':
            res = await deleteCategory(mutation.payload.id)
            break
        }

        // Se a requisição não falhou por rede, remove da fila
        // Mesmo se der erro de validação, removemos para não travar a fila.
        await removeMutation(mutation.id)
        syncedAny = true

      } catch (err: any) {
        // Se for erro de rede (Failed to fetch), para de processar e espera a internet voltar
        if (err.message && (err.message.includes('fetch') || err.message.includes('Network'))) {
          break
        }
        // Se for outro erro (ex: 500 no servidor), remove para não travar
        await removeMutation(mutation.id)
      }
    }

    if (syncedAny) {
      invalidateData()
      checkStatus()
      setShowSyncSuccess(true)
      setTimeout(() => setShowSyncSuccess(false), 3000)
    }

    isSyncingGlobal = false
    setIsSyncing(false)
  }, [invalidateData, checkStatus])

  useEffect(() => {
    checkStatus()

    const handleOnline = () => {
      setIsOnline(true)
      processQueue()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
    }

    const handleMutationAdded = () => {
      checkStatus()
      // Tenta processar caso adicione mas a internet esteja de volta
      if (navigator.onLine) {
        processQueue()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('offline-mutation-added', handleMutationAdded)
    
    // Process on first load if online
    if (navigator.onLine) {
      processQueue()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('offline-mutation-added', handleMutationAdded)
    }
  }, [checkStatus, processQueue])

  return (
    <SyncContext.Provider value={{ isOnline, pendingCount }}>
      {children}
      
      {/* Offline / Sync Indicators */}
      <div className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
        
        <AnimatePresence>
          {!isOnline && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 pointer-events-auto max-w-[280px]"
            >
              <CloudOff className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-tight">Você está offline</span>
                <span className="text-[10px] text-slate-300">Suas alterações serão salvas e enviadas depois.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOnline && pendingCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 pointer-events-auto"
            >
              <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-tight">Sincronizando...</span>
                <span className="text-[10px] text-blue-100">{pendingCount} item(s) pendente(s)</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSyncSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 pointer-events-auto"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-tight">Sincronizado!</span>
                <span className="text-[10px] text-emerald-100">Tudo atualizado com a nuvem.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
      </div>
    </SyncContext.Provider>
  )
}
