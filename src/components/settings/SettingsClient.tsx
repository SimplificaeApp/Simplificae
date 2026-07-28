'use client'

import { useState, useTransition } from 'react'
import { Wallet, Tags, Plus, Trash2, Edit2, CalendarDays, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

import { CategoryForm } from './CategoryForm'
import { motion } from 'framer-motion'
import { deleteCategory } from '@/app/actions/categories'
import { updatePrivacyPin, updateWorkspaceTurnoverDay } from '@/app/actions/settings'
import { toast } from 'sonner'
import { useCategoriesQuery, useInvalidateFinancialData } from '@/hooks/useFinancialData'

type Category = { 
  id: string
  name: string
  type: string
  icon?: string
  color?: string
  budget_amount?: number
  is_fixed?: boolean
  is_investment?: boolean
}

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function SettingsClient({
  workspaceId,
  workspace,
  categories: initialCategories,
  initialPin
}: {
  workspaceId?: string
  workspace?: { id: string; name: string; type: string; month_turnover_day?: number } | null
  categories: Category[]
  initialPin?: string
}) {
  const { data: cachedCategories } = useCategoriesQuery(initialCategories)
  const categories = cachedCategories || initialCategories
  const invalidateData = useInvalidateFinancialData()
  const [activeTab, setActiveTab] = useState<'categories' | 'preferences' | 'privacy'>('categories')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [isPending, startTransition] = useTransition()
  
  const [pin, setPin] = useState(initialPin || '')
  const [turnoverDay, setTurnoverDay] = useState(workspace?.month_turnover_day || 1)

  const incomes = categories.filter(c => c.type === 'income')
  const expenses = categories.filter(c => c.type === 'expense' && !c.is_investment)
  const investments = categories.filter(c => c.is_investment)

  const handleDeleteCategory = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingCategory(cat)
  }

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat)
    setIsModalOpen(true)
  }

  const handleSaveTurnoverDay = () => {
    if (!workspaceId) return
    startTransition(async () => {
      const res = await updateWorkspaceTurnoverDay(workspaceId, Number(turnoverDay))
      if (res?.error) toast.error(res.error)
      else {
        toast.success(res.success)
        invalidateData()
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-semibold text-xs sm:text-sm transition-colors border-b-2 shrink-0 ${activeTab === 'categories' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Tags className="w-4 h-4" /> Categorias & Orçamento
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-semibold text-xs sm:text-sm transition-colors border-b-2 shrink-0 ${activeTab === 'preferences' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <CalendarDays className="w-4 h-4" /> Preferências do Mês
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-semibold text-xs sm:text-sm transition-colors border-b-2 shrink-0 ${activeTab === 'privacy' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
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
        className="glass-panel p-4 sm:p-6 rounded-2xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            {activeTab === 'categories' ? 'Minhas Categorias e Orçamentos' : activeTab === 'preferences' ? 'Ciclo e Virada do Mês' : 'Privacidade e Segurança'}
          </h2>
          {activeTab === 'categories' && (
            <button 
              onClick={() => {
                setEditingCategory(null)
                setIsModalOpen(true)
              }}
              className="btn-primary py-2.5 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm w-full sm:w-auto active:scale-95 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Nova Categoria
            </button>
          )}
        </div>

        {activeTab === 'categories' && (
          <div className="flex flex-col gap-6 sm:gap-8">
            {/* Receitas */}
            <div>
              <h3 className="font-bold text-slate-700 text-xs sm:text-sm mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Receitas (Entradas)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                {incomes.map(cat => (
                  <div 
                    key={cat.id} 
                    onClick={() => handleEditCategory(cat)}
                    className="flex items-center justify-between p-3 border border-slate-200 bg-white rounded-2xl text-sm font-medium text-slate-700 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group gap-2 min-w-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-xl shrink-0">{cat.icon || '💰'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 text-xs sm:text-sm truncate leading-snug">{cat.name}</div>
                        {Boolean(cat.budget_amount) && (
                          <div className="text-[11px] text-emerald-600 font-semibold truncate">
                            Meta: {currencyFmt.format(cat.budget_amount || 0)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 active:scale-95"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteCategory(cat, e)}
                        disabled={isPending}
                        className="p-1.5 text-slate-400 hover:text-rose-600 active:scale-95"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Despesas */}
            <div>
              <h3 className="font-bold text-slate-700 text-xs sm:text-sm mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> Despesas Gerais
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                {expenses.map(cat => (
                  <div 
                    key={cat.id} 
                    onClick={() => handleEditCategory(cat)}
                    className="flex items-center justify-between p-3 border border-slate-200 bg-white rounded-2xl text-sm font-medium text-slate-700 shadow-xs hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group gap-2 min-w-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="text-xl shrink-0">{cat.icon || '🏷️'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-slate-800 text-xs sm:text-sm truncate leading-snug">{cat.name}</span>
                          {cat.is_fixed && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Fixa</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold truncate">
                          {cat.budget_amount ? `Teto: ${currencyFmt.format(cat.budget_amount)}` : 'Sem limite definido'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 active:scale-95"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteCategory(cat, e)}
                        disabled={isPending}
                        className="p-1.5 text-slate-400 hover:text-rose-600 active:scale-95"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Investimentos */}
            <div>
              <h3 className="font-bold text-slate-700 text-xs sm:text-sm mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Investimentos & Aportes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                {investments.length > 0 ? (
                  investments.map(cat => (
                    <div 
                      key={cat.id} 
                      onClick={() => handleEditCategory(cat)}
                      className="flex items-center justify-between p-3 border border-purple-200 bg-purple-50/30 rounded-2xl text-sm font-medium text-slate-700 shadow-xs hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group gap-2 min-w-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-xl shrink-0">{cat.icon || '📈'}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 text-xs sm:text-sm truncate leading-snug">{cat.name}</div>
                          <div className="text-[11px] text-purple-700 font-semibold truncate">
                            {cat.budget_amount ? `Meta: ${currencyFmt.format(cat.budget_amount)}` : 'Sem meta'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 active:scale-95"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteCategory(cat, e)}
                          disabled={isPending}
                          className="p-1.5 text-slate-400 hover:text-rose-600 active:scale-95"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 col-span-full">Nenhuma categoria marcada como investimento ainda. Ao criar ou editar uma categoria, escolha o tipo "Investimento".</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preferencias de ciclo */}
        {activeTab === 'preferences' && (
          <div className="flex flex-col gap-6 max-w-xl">
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
              <h3 className="font-bold text-slate-800 text-sm mb-1">Dia de Virada do Mês Financeiro</h3>
              <p className="text-xs text-slate-500 mb-4">
                Define em qual dia do mês o seu ciclo financeiro recomeça. Por exemplo, se você recebe dia 5, coloque 5 para que os gastos do mês sejam contados do dia 5 até o dia 4 do mês seguinte.
              </p>
              
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-700 shrink-0">Dia da Virada:</label>
                <select
                  value={turnoverDay}
                  onChange={(e) => setTurnoverDay(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>Dia {day}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSaveTurnoverDay}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-70 active:scale-95"
                >
                  {isPending ? 'Salvando...' : 'Salvar Alteração'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Privacidade */}
        {activeTab === 'privacy' && (
          <form 
            action={async (formData) => {
              const res = await updatePrivacyPin(null, formData)
              if (res?.error) toast.error(res.error)
              else {
                toast.success(res.success)
                invalidateData()
              }
            }}
            className="flex flex-col gap-4 max-w-xl"
          >
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">PIN de Proteção e Privacidade</h3>
              <p className="text-xs text-slate-500 mb-3">
                Defina um PIN numérico de 4 dígitos para proteger saldos ocultos e informações confidenciais.
              </p>
              <input 
                type="password"
                name="pin"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Ex: 1234 (Deixe vazio para remover)"
                className="w-full sm:w-64 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 text-sm"
              />
            </div>
            
            <button 
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto self-start bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl transition-all text-xs sm:text-sm disabled:opacity-70 active:scale-95"
            >
              {isPending ? 'Salvando...' : 'Salvar PIN'}
            </button>
          </form>
        )}
      </motion.div>

      {/* Category Creation / Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false)
          setEditingCategory(null)
        }}
        title={editingCategory ? `Editar Categoria: ${editingCategory.name}` : `Nova Categoria`}
      >
        <CategoryForm 
          workspaceId={workspaceId!} 
          initialData={editingCategory}
          onSuccess={() => {
            setIsModalOpen(false)
            setEditingCategory(null)
            invalidateData()
          }} 
        />
      </Modal>

      {/* Category Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        title="Excluir Categoria"
      >
        {deletingCategory && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3.5 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 text-xl">
                {deletingCategory.icon || '🗑️'}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-900 text-sm truncate">
                  Excluir "{deletingCategory.name}"?
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Esta ação não poderá ser desfeita e falhará se existirem transações vinculadas.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors text-xs active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const targetId = deletingCategory.id
                  setDeletingCategory(null)
                  startTransition(async () => {
                    const res = await deleteCategory(targetId)
                    if (res?.error) toast.error(res.error)
                    else {
                      toast.success(res.success)
                      invalidateData()
                    }
                  })
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all text-xs shadow-md disabled:opacity-70 flex items-center gap-1.5 active:scale-95"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
