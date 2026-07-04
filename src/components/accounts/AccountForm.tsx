'use client'

import { useActionState, useEffect, useState } from 'react'
import { createAccount, updateAccount } from '@/app/actions/accounts'
import { ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const EmojiPicker = dynamic(
  () => import('emoji-picker-react').then(mod => mod.default),
  { ssr: false, loading: () => <div className="p-4 text-center text-sm text-slate-400">Carregando emojis...</div> }
)

const ACCOUNT_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#64748b', '#0f172a'
]

interface AccountFormProps {
  workspaceId: string
  initialData?: any
  onSuccess?: () => void
}

type State = { error?: string; success?: string }
const initialState: State = {}

export function AccountForm({ workspaceId, initialData, onSuccess }: AccountFormProps) {
  const action = initialData ? updateAccount : createAccount
  const [state, formAction, pending] = useActionState(action, initialState)
  
  const [balance, setBalance] = useState(() => {
    if (initialData?.initial_balance) {
      return (initialData.initial_balance).toFixed(2).replace('.', ',')
    }
    return ''
  })
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState(initialData?.icon || '🏦')
  const [selectedColor, setSelectedColor] = useState(initialData?.color || ACCOUNT_COLORS[0])
  const [accountType, setAccountType] = useState(initialData?.type || 'checking')

  useEffect(() => {
    if (state.success && onSuccess) {
      onSuccess()
    }
  }, [state.success, onSuccess])

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 0) {
      value = (parseInt(value, 10) / 100).toFixed(2).replace('.', ',')
      value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }
    setBalance(value)
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {initialData && <input type="hidden" name="id" value={initialData.id} />}
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <input type="hidden" name="icon" value={selectedEmoji} />
      <input type="hidden" name="color" value={selectedColor} />
      
      {state.error && (
        <div className="p-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl font-medium">
          {state.error}
        </div>
      )}

      <div className="flex gap-4 items-end">
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Ícone</label>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-14 h-12 flex items-center justify-center text-2xl border border-slate-200 rounded-xl transition-colors shadow-sm"
            style={{ backgroundColor: `${selectedColor}15`, borderColor: `${selectedColor}30` }}
          >
            {selectedEmoji}
          </button>
          
          {showEmojiPicker && (
            <div className="absolute top-14 left-0 z-50 shadow-2xl">
              <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
              <div className="relative">
                <EmojiPicker 
                  onEmojiClick={(e) => {
                    setSelectedEmoji(e.emoji)
                    setShowEmojiPicker(false)
                  }}
                  searchDisabled
                  skinTonesDisabled
                  width={300}
                  height={400}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 group">
          <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="name">
            Nome da Conta
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={initialData?.name}
            placeholder="Ex: Nubank, Carteira Física"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
          />
        </div>
      </div>

      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Cor
        </label>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-full transition-transform ${selectedColor === color ? 'scale-110 ring-2 ring-offset-2 ring-slate-800' : 'hover:scale-110'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="type">
          Tipo
        </label>
        <select
          id="type"
          name="type"
          required
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
        >
          <option value="checking">Conta Corrente</option>
          <option value="savings">Poupança / Investimento</option>
          <option value="wallet">Carteira (Dinheiro Físico)</option>
        </select>
      </div>

      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="initial_balance">
          Saldo Inicial
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
          <input
            id="initial_balance"
            name="initial_balance"
            type="text"
            value={balance}
            onChange={handleBalanceChange}
            placeholder="0,00"
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 font-medium"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
          <input type="checkbox" name="include_in_dashboard" value="true" defaultChecked={initialData ? initialData.include_in_dashboard : true} className="w-5 h-5 accent-emerald-500" />
          <span className="text-sm font-medium text-slate-700">Incluir saldo no Dashboard</span>
        </label>
        
        <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
          <input type="checkbox" name="is_hidden" value="true" defaultChecked={initialData ? initialData.is_hidden : false} className="w-5 h-5 accent-emerald-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-700">Ocultar Saldo (Privacidade)</span>
            <span className="text-xs text-slate-500">Exige PIN para visualizar o saldo desta conta.</span>
          </div>
        </label>
      </div>

      <motion.button
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={pending}
        className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] disabled:opacity-70"
      >
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : (initialData ? 'Salvar Alterações' : 'Criar Conta')}
      </motion.button>
    </form>
  )
}
