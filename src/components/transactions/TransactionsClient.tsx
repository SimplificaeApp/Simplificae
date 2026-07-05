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
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-b border-slate-100 bg-white">
      <div 
        className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 hover:bg-slate-50 cursor-pointer transition-colors"
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
            <div className="text-xs text-slate-500 mt-0.5">
              {invoice.transactions.length} compra{invoice.transactions.length !== 1 ? 's' : ''}
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
            className="overflow-hidden bg-slate-50/50 border-t border-slate-100"
          >
            <div className="pl-12 sm:pl-[68px] pr-4 sm:pr-5 py-2 sm:py-3 flex flex-col gap-1">
              {[...invoice.transactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      {t.category?.icon ? (
                        <span className="text-sm">{t.category.icon}</span>
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-700 flex items-center gap-2 truncate">
                        {t.description}
                        {t.ignore_in_cashflow && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-500 shrink-0">
                            <EyeOff className="w-3 h-3" /> Ignorado
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')} · {t.category?.name || 'Sem categoria'}
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
              title="Confirmar transação"
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(t.id)}
            disabled={isPending}
            title="Excluir"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-50"
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isPending, startTransition] = useTransition()

  const processedItems = useMemo(() => {
    const itemsByDate: Record<string, {
      normal: Transaction[],
      invoices: Record<string, { account: Account; total: number; transactions: Transaction[] }>
    }> = {}

    transactions.forEach(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return

      const acc = accounts.find(a => a.id === t.account_id)
      const isCCExpense = t.type === 'expense' && acc?.type === 'credit_card'

      let effectiveDate = t.date
      let targetInvoice: string | null = null

      if (isCCExpense && acc) {
        const closingDay = acc.closing_day || 1
        const dueDay = acc.due_day || 10
        const cycles = getCreditCardCycles(closingDay, dueDay, new Date(t.date + 'T12:00:00'))
        effectiveDate = cycles.current.dueDate.toISOString().split('T')[0]
        targetInvoice = acc.id
      }

      const d = new Date(effectiveDate + 'T12:00:00')
      if (d.getMonth() !== selectedMonth || d.getFullYear() !== selectedYear) return

      if (!itemsByDate[effectiveDate]) {
        itemsByDate[effectiveDate] = { normal: [], invoices: {} }
      }

      if (isCCExpense && acc && targetInvoice) {
        if (!itemsByDate[effectiveDate].invoices[targetInvoice]) {
          itemsByDate[effectiveDate].invoices[targetInvoice] = { account: acc, total: 0, transactions: [] }
        }
        itemsByDate[effectiveDate].invoices[targetInvoice].transactions.push(t)
        if (!t.ignore_in_cashflow) {
          itemsByDate[effectiveDate].invoices[targetInvoice].total += Number(t.amount)
        }
      } else {
        itemsByDate[effectiveDate].normal.push(t)
      }
    })

    return Object.entries(itemsByDate).sort(([a], [b]) => b.localeCompare(a))
  }, [transactions, search, typeFilter, selectedMonth, selectedYear, accounts])

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
      else toast.success(res.success)
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
    processedItems.forEach(([_, { normal, invoices }]) => {
      normal.forEach(t => {
        if (t.ignore_in_cashflow) return
        if (t.type === 'income') inc += Number(t.amount)
        if (t.type === 'expense') exp += Number(t.amount)
      })
      Object.values(invoices).forEach(inv => exp += inv.total)
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

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar transação..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex overflow-x-auto no-scrollbar bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
          {(['all', 'income', 'expense', 'transfer'] as const).map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
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

      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
        {processedItems.length === 0 ? (
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
              {processedItems.map(([dateKey, { normal, invoices }]) => (
                <div key={dateKey}>
                  <div className="px-5 py-2.5 bg-slate-100/50 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {new Date(dateKey + 'T12:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long', day: 'numeric', month: 'long',
                      })}
                    </span>
                  </div>

                  {Object.values(invoices).map(inv => (
                    <InvoiceRow key={inv.account.id} invoice={inv} onDelete={handleDelete} isPending={isPending} />
                  ))}

                  {normal.map(t => (
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
