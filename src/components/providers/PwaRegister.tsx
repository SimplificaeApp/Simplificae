'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado com sucesso no escopo:', reg.scope)
        })
        .catch((err) => {
          console.error('[PWA] Falha ao registrar Service Worker:', err)
        })
    }
  }, [])

  return null
}
