'use client'

import { useActionState, useEffect, useState } from 'react'
import { createCategory, updateCategory } from '@/app/actions/categories'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const EmojiPicker = dynamic(
  () => import('emoji-picker-react').then(mod => mod.default),
  { ssr: false, loading: () => <div className="p-4 text-center text-sm text-slate-400">Carregando emojis...</div> }
)

interface CategoryFormProps {
  workspaceId: string
  initialData?: {
    id: string
    name: string
    type: string
    icon?: string
    color?: string
    budget_amount?: number
    is_fixed?: boolean
    is_investment?: boolean
  } | null
  onSuccess?: () => void
}

type State = { error?: string; success?: string }
const initialState: State = {}

export function CategoryForm({ workspaceId, initialData, onSuccess }: CategoryFormProps) {
  const actionFn = initialData ? updateCategory.bind(null, initialData.id) : createCategory
  const [state, formAction, pending] = useActionState(actionFn, initialState)

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState(initialData?.icon || '💰')
  const [type, setType] = useState(initialData?.type || 'expense')
  const [isFixed, setIsFixed] = useState(initialData?.is_fixed || false)
  const [isInvestment, setIsInvestment] = useState(initialData?.is_investment || false)
  const [budgetAmount, setBudgetAmount] = useState(
    initialData?.budget_amount ? String(initialData.budget_amount) : ''
  )

  useEffect(() => {
    if (state.success && onSuccess) {
      onSuccess()
    }
  }, [state.success, onSuccess])

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <input type="hidden" name="icon" value={selectedEmoji} />
      
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
            className="w-14 h-12 flex items-center justify-center text-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors"
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
            Nome da Categoria
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={initialData?.name || ''}
            placeholder="Ex: Salário, Mercado, Aluguel..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
          />
        </div>
      </div>

      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="type">
          Tipo de Fluxo
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
        >
          <option value="expense">Despesa (Saída)</option>
          <option value="income">Receita (Entrada)</option>
        </select>
      </div>

      {/* Orçamento Mensal / Meta */}
      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="budget_amount">
          {type === 'income' ? 'Expectativa de Receita Mensal (R$)' : 'Orçamento / Teto Mensal (R$)'}
        </label>
        <input
          id="budget_amount"
          name="budget_amount"
          type="number"
          step="0.01"
          min="0"
          value={budgetAmount}
          onChange={(e) => setBudgetAmount(e.target.value)}
          placeholder="Ex: 1500.00 (Deixe 0 para sem limite)"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
        />
      </div>

      {/* Opções extras para Despesas */}
      {type === 'expense' && (
        <div className="flex flex-col gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Classificação do Gasto</label>
          
          <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              name="is_fixed"
              checked={isFixed}
              onChange={(e) => setIsFixed(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span>Despesa Fixa (ex: Aluguel, Internet, Assinaturas)</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              name="is_investment"
              checked={isInvestment}
              onChange={(e) => setIsInvestment(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
            />
            <span>É um Investimento / Aporte (ex: Ações, Tesouro, Reserva)</span>
          </label>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={pending}
        className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] disabled:opacity-70"
      >
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : (initialData ? 'Atualizar Categoria' : 'Criar Categoria')}
      </motion.button>
    </form>
  )
}

