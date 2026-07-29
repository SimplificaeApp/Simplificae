'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PiggyBank, Download, X, Share } from 'lucide-react'

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registrado:', reg.scope)
        })
        .catch((err) => {
          console.error('[PWA] Erro no SW:', err)
        })
    }

    if (typeof window === 'undefined') return

    // Check if already in standalone mode
    const inStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
    setIsStandalone(inStandalone)

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const iosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIos(iosDevice)

    // If on iOS and not standalone, show iOS banner if not dismissed
    const dismissed = sessionStorage.getItem('pwa_dismissed')
    if (iosDevice && !inStandalone && !dismissed) {
      setShowInstallBanner(true)
    }

    // Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!inStandalone && !dismissed) {
        setShowInstallBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log('[PWA] Resultado da instalação:', outcome)
    setDeferredPrompt(null)
    setShowInstallBanner(false)
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    sessionStorage.setItem('pwa_dismissed', 'true')
  }

  if (isStandalone || !showInstallBanner) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-slate-900/95 backdrop-blur-xl text-white p-4 rounded-2xl shadow-2xl border border-slate-700/60"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-md">
              <PiggyBank className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Instalar o FluxoAÊ</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Adicione à tela inicial para usar como um aplicativo nativo.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIos ? (
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 flex items-center gap-2 bg-slate-800/50 p-2.5 rounded-xl">
            <Share className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Toque em <strong>Compartilhar</strong> e selecione <strong>Adicionar à Tela de Início</strong>.
            </span>
          </div>
        ) : (
          deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition-all shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              Instalar Aplicativo
            </button>
          )
        )}
      </motion.div>
    </AnimatePresence>
  )
}
