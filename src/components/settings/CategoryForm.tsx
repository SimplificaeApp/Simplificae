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
  const isEditing = Boolean(initialData && initialData.id)
  const actionFn = isEditing ? updateCategory.bind(null, initialData!.id) : createCategory
  const [state, formAction, pending] = useActionState(actionFn, initialState)

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState(initialData?.icon || '💰')
  const [categoryKind, setCategoryKind] = useState<'expense' | 'income' | 'investment'>(
    initialData?.is_investment ? 'investment' : (initialData?.type === 'income' ? 'income' : 'expense')
  )
  const [isFixed, setIsFixed] = useState(initialData?.is_fixed || false)
  const [budgetAmount, setBudgetAmount] = useState(() => {
    if (initialData?.budget_amount) {
      const val = Number(initialData.budget_amount)
      if (val > 0) {
        return val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      }
    }
    return ''
  })

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 0) {
      value = (parseInt(value, 10) / 100).toFixed(2).replace('.', ',')
      value = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }
    setBudgetAmount(value)
  }

  useEffect(() => {
    if (state.success && onSuccess) {
      onSuccess()
    }
  }, [state.success, onSuccess])

  const effectiveType = categoryKind === 'income' ? 'income' : 'expense'
  const effectiveIsInvestment = categoryKind === 'investment'

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <input type="hidden" name="icon" value={selectedEmoji} />
      <input type="hidden" name="type" value={effectiveType} />
      <input type="hidden" name="is_investment" value={effectiveIsInvestment ? 'true' : 'false'} />
      
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
            placeholder={categoryKind === 'investment' ? 'Ex: Ações, Tesouro Direto, Reserva...' : (categoryKind === 'income' ? 'Ex: Salário, Freelance...' : 'Ex: Mercado, Aluguel...')}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 font-medium"
          />
        </div>
      </div>

      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600">
          Tipo da Categoria
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setCategoryKind('expense')
              if (selectedEmoji === '💎' || selectedEmoji === '💰') setSelectedEmoji('💸')
            }}
            className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              categoryKind === 'expense'
                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="text-base">💸</span>
            <span>Despesa</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategoryKind('income')
              if (selectedEmoji === '💸' || selectedEmoji === '💎') setSelectedEmoji('💰')
            }}
            className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              categoryKind === 'income'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="text-base">💰</span>
            <span>Receita</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategoryKind('investment')
              if (selectedEmoji === '💸' || selectedEmoji === '💰') setSelectedEmoji('💎')
            }}
            className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
              categoryKind === 'investment'
                ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-xs ring-1 ring-purple-400'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="text-base">💎</span>
            <span>Investimento</span>
          </button>
        </div>
      </div>

      {/* Orçamento Mensal / Meta */}
      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="budget_amount">
          {categoryKind === 'investment'
            ? '🎯 Meta de Aporte Mensal'
            : (categoryKind === 'income' ? 'Expectativa de Receita Mensal' : 'Orçamento / Teto Mensal')}
        </label>
        <div className="relative flex items-center">
          <span className="absolute left-4 font-bold text-slate-400 text-sm">R$</span>
          <input
            id="budget_amount"
            name="budget_amount"
            type="text"
            inputMode="numeric"
            value={budgetAmount}
            onChange={handleBudgetChange}
            placeholder="0,00"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
          />
        </div>
        {categoryKind === 'investment' && (
          <p className="text-[11px] text-purple-600 font-medium mt-1">
            Esta meta define o valor planejado de investimento no ciclo mensal da aba Planos.
          </p>
        )}
      </div>

      {/* Opções extras apenas para Despesas comuns */}
      {categoryKind === 'expense' && (
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
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={pending}
        className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] disabled:opacity-70"
      >
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditing ? 'Atualizar Categoria' : 'Criar Categoria')}
      </motion.button>
    </form>
  )
}

