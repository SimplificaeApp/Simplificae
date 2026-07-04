'use client'

import { useState, useTransition } from 'react'
import { Wallet, Tags, Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

import { CategoryForm } from './CategoryForm'
import { motion } from 'framer-motion'
import { deleteAccount } from '@/app/actions/accounts'
import { deleteCategory } from '@/app/actions/categories'
import { updatePrivacyPin } from '@/app/actions/settings'
import { toast } from 'sonner'

type Category = { id: string; name: string; type: string; icon?: string; color?: string }

export function SettingsClient({
  workspaceId,
  categories,
  initialPin
}: {
  workspaceId?: string
  categories: Category[]
  initialPin?: string
}) {
  const [activeTab, setActiveTab] = useState<'categories' | 'privacy'>('categories')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const [pin, setPin] = useState(initialPin || '')

  const incomes = categories.filter(c => c.type === 'income')
  const expenses = categories.filter(c => c.type === 'expense')


  const handleDeleteCategory = (id: string) => {
    if (!confirm('Tem certeza? Isso pode falhar se existirem transações vinculadas à categoria.')) return
    startTransition(async () => {
      const res = await deleteCategory(id)
      if (res?.error) toast.error(res.error)
      else toast.success(res.success)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'categories' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Tags className="w-4 h-4" /> Categorias
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'privacy' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <div className="w-4 h-4 rounded bg-current relative flex items-center justify-center opacity-80" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'}}>
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
          Privacidade
        </button>
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-panel p-6 rounded-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800">
            {activeTab === 'categories' ? 'Minhas Categorias' : 'Privacidade e Segurança'}
          </h2>
          {activeTab === 'categories' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary py-2 px-4 flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Categoria
            </button>
          )}
        </div>

        {activeTab === 'categories' && (
          <div className="flex flex-col gap-8">
            <div>
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Receitas
              </h3>
              <div className="flex flex-wrap gap-2">
                {incomes.map(cat => (
                  <div key={cat.id} className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white rounded-full text-sm font-medium text-slate-700 shadow-sm group">
                    <span>{cat.icon || '💰'}</span>
                    {cat.name}
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      disabled={isPending}
                      className="w-0 overflow-hidden group-hover:w-4 text-slate-400 hover:text-rose-600 transition-all ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Despesas
              </h3>
              <div className="flex flex-wrap gap-2">
                {expenses.map(cat => (
                  <div key={cat.id} className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white rounded-full text-sm font-medium text-slate-700 shadow-sm group">
                    <span>{cat.icon || '🏷️'}</span>
                    {cat.name}
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      disabled={isPending}
                      className="w-0 overflow-hidden group-hover:w-4 text-slate-400 hover:text-rose-600 transition-all ml-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <form 
            action={async (formData) => {
              startTransition(async () => {
                const res = await updatePrivacyPin(null, formData)
                if (res?.error) toast.error(res.error)
                else toast.success(res.success)
              })
            }} 
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">PIN de 4 dígitos</label>
              <p className="text-xs text-slate-500 mb-1">
                Configure uma senha numérica para visualizar contas e cofrinhos marcados como "Ocultos", bem como para habilitar o modo oculto no Dashboard.
              </p>
              <input
                type="password"
                name="pin"
                inputMode="numeric"
                maxLength={4}
                pattern="^$|\d{4}"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 1234 (Deixe vazio para remover)"
                className="w-full md:w-64 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
              />
            </div>
            
            <button 
              type="submit"
              disabled={isPending}
              className="w-full md:w-auto self-start bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-70"
            >
              {isPending ? 'Salvando...' : 'Salvar PIN'}
            </button>
          </form>
        )}
      </motion.div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={`Nova Categoria`}
      >
        <CategoryForm 
          workspaceId={workspaceId!} 
          onSuccess={() => setIsModalOpen(false)} 
        />
      </Modal>


    </div>
  )
}
