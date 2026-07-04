'use client'

import { useState, useMemo, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, TrendingUp, TrendingDown, ArrowRightLeft,
  Trash2, Filter, CalendarDays, ChevronLeft, ChevronRight
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from './TransactionForm'
import { deleteTransaction } from '@/app/actions/transactions'
import { toast } from 'sonner'
import { EyeOff } from 'lucide-react'

type Transaction = {
  id: string
  description: string
  amount: number
  type: string
  date: string
  status: string
  category?: { id: string; name: string; icon?: string; color?: string } | null
  account?: { id: string; name: string } | null
}
type Category = { id: string; name: string; type: string; icon?: string }
type Account = { id: string; name: string; icon?: string; color?: string }

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isPending, startTransition] = useTransition()

  const filteredTx = useMemo(() => {
    return transactions.filter(t => {
      // Filter by month/year
      const txDate = new Date(t.date + 'T12:00:00')
      if (txDate.getMonth() !== selectedMonth || txDate.getFullYear() !== selectedYear) return false

      // Filter by type
      if (typeFilter !== 'all' && t.type !== typeFilter) return false

      // Filter by search
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false

      return true
    })
  }, [transactions, search, typeFilter, selectedMonth, selectedYear])

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, Transaction[]> = {}
    
    // Sort all transactions first by date descending, then by id descending (as proxy for created_at if created_at is missing)
    const sortedTx = [...filteredTx].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return b.id.localeCompare(a.id)
    })

    sortedTx.forEach(t => {
      const dateKey = t.date
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(t)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filteredTx])

  const handleDelete = (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return
    startTransition(async () => {
      const res = await deleteTransaction(id)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('Transação excluída!')
      }
    })
  }

  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(y => y - 1)
    } else {
      setSelectedMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(y => y + 1)
    } else {
      setSelectedMonth(m => m + 1)
    }
  }

  const monthTotal = useMemo(() => {
    // Only include transactions that are NOT ignored in cashflow
    const validTx = filteredTx.filter(t => !(t as any).ignore_in_cashflow)
    const inc = validTx.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
    const exp = validTx.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
    return { income: inc, expense: exp, balance: inc - exp }
  }, [filteredTx])

  return (
    <>
      {/* Page Header */}
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

      {/* Month Navigator & KPIs */}
      <div className="glass-panel rounded-2xl p-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
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

        {/* Mini KPIs - Wrap on small screens */}
        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-slate-500">Receitas:</span>
            <span className="font-bold text-emerald-600 tabular-nums">{currencyFmt.format(monthTotal.income)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span className="text-slate-500">Despesas:</span>
            <span className="font-bold text-rose-600 tabular-nums">{currencyFmt.format(monthTotal.expense)}</span>
          </div>
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 mt-1 sm:mt-0">
            <span className="text-slate-500">Saldo:</span>
            <span className={`font-bold tabular-nums ${monthTotal.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {currencyFmt.format(monthTotal.balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {(['all', 'income', 'expense', 'transfer'] as const).map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                typeFilter === f
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'income' ? 'Receitas' : f === 'expense' ? 'Despesas' : 'Transf.'}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {grouped.length === 0 ? (
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {grouped.map(([dateKey, txs]) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </span>
                  </div>

                  {/* Transactions for this date */}
                  {txs.map(t => {
                    const isIncome = t.type === 'income'
                    const isTransfer = t.type === 'transfer'
                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 hover:bg-slate-50/80 transition-colors group"
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
                              {(t as any).ignore_in_cashflow && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                  <EyeOff className="w-3 h-3" /> Ignorado
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              {t.category?.name || (isTransfer ? 'Transferência' : '')}
                              {t.account?.name && ` · ${t.account.name}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`font-bold text-sm tabular-nums whitespace-nowrap ${
                            (t as any).ignore_in_cashflow ? 'text-slate-400 line-through' :
                            isTransfer ? 'text-blue-600' : isIncome ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {isIncome ? '+' : isTransfer ? '' : '-'} {currencyFmt.format(Number(t.amount))}
                          </div>
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={isPending}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title="Nova Transação"
      >
        <TransactionForm
          workspaceId={workspaceId}
          categories={categories}
          accounts={accounts}
          onSuccess={() => setIsTxModalOpen(false)}
        />
      </Modal>
    </>
  )
}
