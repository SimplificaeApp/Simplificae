'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, ArrowRight, X, Bot, Mic, MicOff, MessageSquare } from 'lucide-react'
import { parseNaturalLanguageTransaction } from '@/app/actions/ai'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AiFloatingButton({
  workspaceId,
  categories,
  accounts
}: {
  workspaceId: string
  categories: any[]
  accounts: any[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine)
      const handleOnline = () => setIsOffline(false)
      const handleOffline = () => { setIsOffline(true); setIsOpen(false); }
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])
  
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [aiPreFillData, setAiPreFillData] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleAiSubmit = async () => {
    if (!aiInput.trim()) return
    setIsAiLoading(true)
    
    const today = new Date().toISOString().split('T')[0]
    const res = await parseNaturalLanguageTransaction(aiInput, accounts, categories, today)
    
    setIsAiLoading(false)
    if (res.success && res.data) {
      setAiInput('')
      setIsOpen(false)
      setAiPreFillData(res.data)
      setIsTxModalOpen(true)
      toast.success('Transação interpretada! Revise e salve.')
    } else {
      toast.error(res.error || 'Não foi possível interpretar o texto.')
    }
  }

  const handleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      toast.error('Seu navegador não suporta entrada por voz.')
      return
    }
    const r = new SR()
    r.lang = 'pt-BR'
    r.onstart = () => setIsListening(true)
    r.onend = () => setIsListening(false)
    r.onresult = (e: any) => {
      setAiInput(e.results[0][0].transcript)
      inputRef.current?.focus()
    }
    r.start()
  }

  if (pathname === '/assistant' || isOffline) return null

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-4">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 20, scale: 0.9, filter: 'blur(10px)' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white/95 backdrop-blur-xl border border-violet-100 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.3)] p-5 rounded-3xl w-[calc(100vw-48px)] sm:w-[380px] overflow-hidden relative"
            >
              {/* Decorative gradient background */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500" />
              
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-200">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-slate-800 font-bold text-sm leading-none mb-1">Nova Transação IA</h3>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Criação Rápida</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Link
                    href="/assistant"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2.5 py-1.5 rounded-lg transition-colors group"
                    title="Abrir Chat Completo"
                  >
                    <MessageSquare className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    <span>Chat</span>
                  </Link>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="relative group/ai">
                <div className="flex gap-2 items-center bg-slate-50 border border-slate-200 rounded-2xl p-1.5 pl-2 focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100/50 transition-all">
                  
                  <button
                    type="button"
                    onClick={handleVoice}
                    className={`p-2 rounded-xl transition-all shrink-0 ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200'
                        : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'
                    }`}
                    title={isListening ? 'Gravando...' : 'Falar (Microfone)'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="Ex: Paguei R$50 de energia..." 
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAiSubmit()}
                    className="flex-1 min-w-0 bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none py-1.5"
                  />
                  
                  <button 
                    onClick={handleAiSubmit}
                    disabled={isAiLoading || !aiInput.trim()}
                    className={`p-2 rounded-xl transition-all shrink-0 flex items-center justify-center mr-0.5 ${
                      isAiLoading || !aiInput.trim()
                        ? 'bg-slate-200/70 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white hover:from-violet-600 hover:to-indigo-700 shadow-md shadow-violet-200'
                    }`}
                  >
                    {isAiLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-[10.5px] text-slate-400 mt-3 text-center font-medium">
                Escreva ou fale o que você gastou/recebeu.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-4 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
            isOpen 
              ? 'bg-slate-800 text-white shadow-slate-500/20 rotate-90' 
              : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-indigo-500/30'
          }`}
        >
          {/* Animated glow effect behind button */}
          {!isOpen && (
            <div className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
          )}
          
          {isOpen ? <X className="w-6 h-6" strokeWidth={2.5} /> : <Sparkles className="w-6 h-6" strokeWidth={2.5} />}
        </motion.button>
      </div>

      <Modal 
        isOpen={isTxModalOpen} 
        onClose={() => {
          setIsTxModalOpen(false)
          setAiPreFillData(null)
        }} 
        title={aiPreFillData ? "✨ Transação via IA" : "Nova Transação"}
      >
        <TransactionForm
          workspaceId={workspaceId} 
          categories={categories} 
          accounts={accounts}
          initialData={aiPreFillData}
          onSuccess={() => {
            setIsTxModalOpen(false)
            setAiPreFillData(null)
          }}
        />
      </Modal>
    </>
  )
}
