'use client'

import { useState, useMemo, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, TrendingUp, TrendingDown, ArrowRightLeft,
  Trash2, CalendarDays, ChevronLeft, ChevronRight, EyeOff,
  CreditCard, ChevronDown, ChevronUp, CheckCircle2
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from './TransactionForm'
import { deleteTransaction, markAsPosted } from '@/app/actions/transactions'
import { getCreditCardCycles } from '@/lib/creditCardUtils'
import { toast } from 'sonner'

type Transaction = {
  id: string
  description: string
  amount: number
  type: string
  date: string
  status: string
  category_id?: string
  account_id?: string
  destination_account_id?: string
  ignore_in_cashflow?: boolean
  category?: { id: string; name: string; icon?: string; color?: string } | null
  account?: { id: string; name: string; type?: string } | null
}
type Category = { id: string; name: string; type: string; icon?: string }
type Account = { id: string; name: string; icon?: string; color?: string; type?: string; closing_day?: number; due_day?: number }

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function InvoiceRow({ invoice, onDelete, isPending }: { invoice: any, onDelete: (id: string) => void, isPending: boolean }) {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="border-b border-slate-100 bg-slate-50/40 rounded-xl my-2 mx-2 sm:mx-3 border overflow-hidden shadow-2xs">
      <div 
        className="flex items-center justify-between px-4 sm:px-5 py-3 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
            <CreditCard className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2 truncate">
              Fatura: {invoice.account.name}
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 shrink-0 uppercase tracking-wide">Cartão</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">
              {invoice.transactions.length} compra{invoice.transactions.length !== 1 ? 's' : ''} no mês
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 pl-2">
          <div className="font-black text-xs sm:text-sm tabular-nums text-rose-600 whitespace-nowrap">
            - {currencyFmt.format(invoice.total)}
          </div>
          <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-colors ${expanded ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:bg-slate-50'}`}>
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white border-t border-slate-100"
          >
            <div className="px-4 sm:px-5 py-2 flex flex-col divide-y divide-slate-100/70">
              {[...invoice.transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2.5 group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      {t.category?.icon ? (
                        <span className="text-sm">{t.category.icon}</span>
                      ) : (
                        <CreditCard className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">{t.description}</div>
                      <div className="text-[11px] text-slate-400 font-medium truncate">
                        {t.category?.name || 'Sem Categoria'} · {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-4">
                    <span className={`text-xs sm:text-sm font-bold tabular-nums whitespace-nowrap ${t.ignore_in_cashflow ? 'text-slate-400 line-through' : 'text-rose-600'}`}>
                      - {currencyFmt.format(Number(t.amount))}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                      disabled={isPending}
                      className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TransactionRow({ t, onDelete, onMarkPosted, isPending }: { t: any, onDelete: (id: string) => void, onMarkPosted: (id: string) => void, isPending: boolean }) {
  const isIncome = t.type === 'income'
  const isTransfer = t.type === 'transfer'
  const isPlanned = t.status === 'pending'
  
  return (
    <div
      className={`flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 border-b border-slate-50 hover:bg-slate-50/80 transition-colors group ${
        isPlanned ? 'border-l-2 border-l-amber-400 bg-amber-50/20 hover:bg-amber-50/40' : ''
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isTransfer ? 'bg-blue-50' : isIncome ? 'bg-emerald-50' : 'bg-rose-50'
        }`}>
          {t.category?.icon ? (
            <span className="text-base">{t.category.icon}</span>
          ) : isTransfer ? (
            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
          ) : isIncome ? (
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-800 text-sm truncate flex items-center gap-2">
            {t.description}
            {isPlanned && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 shrink-0">
                <CalendarDays className="w-3 h-3" /> Planejado
              </span>
            )}
            {t.ignore_in_cashflow && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 shrink-0">
                <EyeOff className="w-3 h-3" /> Ignorado
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">
            {t.category?.name || (isTransfer ? 'Transferência' : '')}
            {t.account?.name && ` · ${t.account.name}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-4">
        <div className={`font-bold text-xs sm:text-sm tabular-nums whitespace-nowrap ${
          t.ignore_in_cashflow ? 'text-slate-400 line-through' :
          isPlanned ? 'text-amber-600' :
          isTransfer ? 'text-blue-600' : isIncome ? 'text-emerald-600' : 'text-rose-600'
        }`}>
          {isIncome ? '+' : isTransfer ? '' : '-'} {currencyFmt.format(Number(t.amount))}
        </div>
        
        <div className="flex items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          {isPlanned && (
            <button
              onClick={() => onMarkPosted(t.id)}
              disabled={isPending}
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all mr-1 disabled:opacity-50"
              title="Marcar como Paga"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(t.id)}
            disabled={isPending}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function TransactionsClient({
  workspaceId,
  transactions,
  categories,
  accounts
}: {
  workspaceId: string
  transactions: Transaction[]
  categories: Category[]
  accounts: Account[]
}) {
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [accountFilter, setAccountFilter] = useState('all')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isPending, startTransition] = useTransition()

  const processedItems = useMemo(() => {
    const itemsByDate: Record<string, Transaction[]> = {}
    const invoicesByCard: Record<string, { account: Account; total: number; transactions: Transaction[] }> = {}

    transactions.forEach(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return
      if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return
      if (accountFilter !== 'all' && t.account_id !== accountFilter) return
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return

      const acc = accounts.find(a => a.id === t.account_id) || t.account
      const isCCExpense = t.type === 'expense' && (acc?.type === 'credit_card' || t.account?.type === 'credit_card')

      if (isCCExpense && acc) {
        const closingDay = (acc as any).closing_day || 1
        const dueDay = (acc as any).due_day || 10
        const cycles = getCreditCardCycles(closingDay, dueDay, new Date(t.date + 'T12:00:00'))
        const dueDate = cycles.current.dueDate

        if (dueDate.getMonth() === selectedMonth && dueDate.getFullYear() === selectedYear) {
          if (!invoicesByCard[acc.id]) {
            invoicesByCard[acc.id] = { account: acc, total: 0, transactions: [] }
          }
          invoicesByCard[acc.id].transactions.push(t)
          if (!t.ignore_in_cashflow) {
            invoicesByCard[acc.id].total += Number(t.amount)
          }
        }
      } else {
        const d = new Date(t.date + 'T12:00:00')
        if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
          if (!itemsByDate[t.date]) {
            itemsByDate[t.date] = []
          }
          itemsByDate[t.date].push(t)
        }
      }
    })

    const sortedNormalDates = Object.entries(itemsByDate).sort(([a], [b]) => b.localeCompare(a))

    return {
      invoices: Object.values(invoicesByCard),
      normalDates: sortedNormalDates,
      isEmpty: Object.keys(invoicesByCard).length === 0 && sortedNormalDates.length === 0
    }
  }, [transactions, search, typeFilter, categoryFilter, accountFilter, selectedMonth, selectedYear, accounts])

  const hasActiveFilters = search !== '' || typeFilter !== 'all' || categoryFilter !== 'all' || accountFilter !== 'all'

  const clearAllFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setCategoryFilter('all')
    setAccountFilter('all')
  }

  const handleDelete = (id: string) => {
    toast('Tem certeza que deseja excluir esta transação?', {
      action: {
        label: 'Sim, excluir',
        onClick: () => {
          startTransition(async () => {
            const res = await deleteTransaction(id)
            if (res?.error) toast.error(res.error)
            else toast.success('Transação excluída!')
          })
        }
      },
      cancel: { label: 'Cancelar', onClick: () => {} }
    })
  }

  const handleMarkAsPosted = (id: string) => {
    startTransition(async () => {
      const res = await markAsPosted(id)
      if (res?.error) toast.error(res.error)
      else toast.success(res.success || 'Transação marcada como paga!')
    })
  }

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1) }
    else setSelectedMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1) }
    else setSelectedMonth(m => m + 1)
  }

  const monthTotal = useMemo(() => {
    let inc = 0
    let exp = 0
    processedItems.normalDates.forEach(([_, list]) => {
      list.forEach(t => {
        if (!t.ignore_in_cashflow) {
          if (t.type === 'income') inc += Number(t.amount)
          if (t.type === 'expense') exp += Number(t.amount)
        }
      })
    })
    processedItems.invoices.forEach(inv => {
      exp += inv.total
    })
    return { income: inc, expense: exp, balance: inc - exp }
  }, [processedItems])

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Transações</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie todas as suas movimentações financeiras.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsTxModalOpen(true)}
          className="btn-primary flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5" /> Nova Transação
        </motion.button>
      </div>

      <div className="glass-panel rounded-2xl p-4 mb-6 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="text-center min-w-[140px]">
            <span className="font-bold text-slate-800">{MONTHS[selectedMonth]}</span>{' '}
            <span className="text-slate-500">{selectedYear}</span>
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:flex justify-center items-center gap-x-4 gap-y-3 text-sm w-full lg:w-auto mt-2 lg:mt-0">
          <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-1.5 bg-emerald-50/50 lg:bg-transparent p-2 lg:p-0 rounded-lg text-center lg:text-left">
            <span className="text-slate-500 text-xs lg:text-sm">Receitas</span>
            <span className="font-bold text-emerald-600 tabular-nums">{currencyFmt.format(monthTotal.income)}</span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-1.5 bg-rose-50/50 lg:bg-transparent p-2 lg:p-0 rounded-lg text-center lg:text-left">
            <span className="text-slate-500 text-xs lg:text-sm">Despesas</span>
            <span className="font-bold text-rose-600 tabular-nums">{currencyFmt.format(monthTotal.expense)}</span>
          </div>
          <div className="col-span-2 flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-1.5 justify-center p-2 lg:p-0 border-t lg:border-0 border-slate-100/80 text-center lg:text-left">
            <span className="text-slate-500 text-xs lg:text-sm">Saldo Final</span>
            <span className={`font-bold tabular-nums text-base lg:text-sm ${monthTotal.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {currencyFmt.format(monthTotal.balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Avançados e Elegantes */}
      <div className="glass-panel p-3.5 rounded-2xl mb-6 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Input de Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtro por Categoria */}
        <div className="relative shrink-0 min-w-[160px]">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full pl-3.5 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs appearance-none cursor-pointer"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        {/* Filtro por Conta */}
        <div className="relative shrink-0 min-w-[150px]">
          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="w-full pl-3.5 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs appearance-none cursor-pointer"
          >
            <option value="all">Todas as Contas</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        {/* Filtro por Tipo */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
          {(['all', 'income', 'expense', 'transfer'] as const).map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                typeFilter === f
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'income' ? 'Receitas' : f === 'expense' ? 'Despesas' : 'Transf.'}
            </button>
          ))}
        </div>

        {/* Botão de Limpar Filtros */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all shrink-0 text-center"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
        {processedItems.isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays className="w-12 h-12 text-slate-300 mb-4" />
            <h2 className="text-lg font-bold text-slate-700 mb-2">Nenhuma transação encontrada</h2>
            <p className="text-sm text-slate-500 max-w-sm">
              {search || typeFilter !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : `Nenhuma movimentação registrada em ${MONTHS[selectedMonth]}.`}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedMonth}-${selectedYear}-${typeFilter}-${search}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
            >
              {/* Cards MESTRE das Faturas dos Cartões de Crédito do Mês */}
              {processedItems.invoices.map(inv => (
                <InvoiceRow key={inv.account.id} invoice={inv} onDelete={handleDelete} isPending={isPending} />
              ))}

              {/* Transações de Contas Bancárias / Dinheiro organizadas por dia */}
              {processedItems.normalDates.map(([dateKey, list]) => (
                <div key={dateKey}>
                  <div className="px-5 py-2.5 bg-slate-100/50 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long', day: 'numeric', month: 'long',
                      })}
                    </span>
                  </div>

                  {list.map(t => (
                    <TransactionRow key={t.id} t={t} onDelete={handleDelete} onMarkPosted={handleMarkAsPosted} isPending={isPending} />
                  ))}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <Modal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} title="Nova Transação">
        <TransactionForm
          workspaceId={workspaceId} categories={categories} accounts={accounts}
          onSuccess={() => setIsTxModalOpen(false)}
        />
      </Modal>
    </>
  )
}
