'use client'

import { useActionState, useEffect, useState } from 'react'
import { createCategory } from '@/app/actions/categories'
import { ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

// Como o Next.js lida com emoji picker as vezes precisa de lazy loading
const EmojiPicker = dynamic(
  () => import('emoji-picker-react').then(mod => mod.default),
  { ssr: false, loading: () => <div className="p-4 text-center text-sm text-slate-400">Carregando emojis...</div> }
)

interface CategoryFormProps {
  workspaceId: string
  onSuccess?: () => void
}

type State = { error?: string; success?: string }
const initialState: State = {}

export function CategoryForm({ workspaceId, onSuccess }: CategoryFormProps) {
  const [state, formAction, pending] = useActionState(createCategory, initialState)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState('💰')

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
            placeholder="Ex: Salário, Assinaturas..."
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
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
        >
          <option value="expense">Despesa (Saída)</option>
          <option value="income">Receita (Entrada)</option>
        </select>
      </div>

      <motion.button
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={pending}
        className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] disabled:opacity-70"
      >
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar Categoria'}
      </motion.button>
    </form>
  )
}
