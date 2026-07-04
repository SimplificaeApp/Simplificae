'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface PrivacyContextType {
  isUnlocked: boolean
  globalBlur: boolean
  toggleGlobalBlur: () => void
  requestUnlock: (onSuccess?: () => void) => void
  lock: () => void
}

const PrivacyContext = createContext<PrivacyContextType>({
  isUnlocked: false,
  globalBlur: false,
  toggleGlobalBlur: () => {},
  requestUnlock: () => {},
  lock: () => {}
})

export function usePrivacy() {
  return useContext(PrivacyContext)
}

export function PrivacyProvider({ 
  children,
  userPin
}: { 
  children: React.ReactNode,
  userPin?: string | null
}) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [globalBlur, setGlobalBlur] = useState(false)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [error, setError] = useState('')
  const [unlockCallback, setUnlockCallback] = useState<(() => void) | null>(null)

  const router = useRouter()

  const requestUnlock = useCallback((onSuccess?: () => void) => {
    if (!userPin) {
      toast.info('Cadastre um PIN nos Ajustes para usar a privacidade.', {
        action: {
          label: 'Ir para Ajustes',
          onClick: () => router.push('/settings')
        }
      })
      return
    }
    if (isUnlocked) {
      if (onSuccess) onSuccess()
      return
    }
    
    if (onSuccess) {
      setUnlockCallback(() => onSuccess)
    } else {
      setUnlockCallback(null)
    }
    
    setIsModalOpen(true)
    setPinInput('')
    setError('')
  }, [userPin, isUnlocked, router])

  const toggleGlobalBlur = useCallback(() => {
    setGlobalBlur(prev => !prev)
  }, [])

  const lock = useCallback(() => {
    setIsUnlocked(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pinInput === userPin) {
      setIsUnlocked(true)
      setIsModalOpen(false)
      setPinInput('')
      if (unlockCallback) {
        unlockCallback()
        setUnlockCallback(null)
      }
    } else {
      setError('PIN incorreto')
      setPinInput('')
    }
  }

  // Tenta focar no input quando abrir
  useEffect(() => {
    if (isModalOpen) {
      const input = document.getElementById('pin_input')
      if (input) input.focus()
    }
  }, [isModalOpen])

  return (
    <PrivacyContext.Provider value={{ isUnlocked, globalBlur, toggleGlobalBlur, requestUnlock, lock }}>
      {children}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Desbloquear Privacidade">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">
            Digite seu PIN de 4 dígitos para visualizar os saldos ocultos.
          </p>

          <div className="flex flex-col gap-2">
            <input
              id="pin_input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              required
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full text-center tracking-[1em] text-2xl px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
            />
            {error && <span className="text-sm text-rose-600 font-medium text-center">{error}</span>}
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl flex justify-center items-center transition-all shadow-lg shadow-emerald-500/20"
          >
            Desbloquear
          </button>
        </form>
      </Modal>
    </PrivacyContext.Provider>
  )
}
