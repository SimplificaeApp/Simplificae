'use client'

import { useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import { 
  CalendarDays, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  CheckCircle2, 
  Trash2,
  CalendarCheck
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { payTransactionNew, unpayTransaction, deleteTransaction } from '@/app/actions/transactions'
import { toast } from 'sonner'

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

type Transaction = {
  id: string
  description: string
  amount: number
  type: string
  date: string
  status: string
  category?: { id: string; name: string; icon?: string; color?: string } | null
  account?: { id: string; name: string; icon?: string; color?: string } | null
}

export function PlannedClient({
  // dummy comment to force rebuild
  user,
  transactions,
  categories,
  accounts,
  workspaces
}: {
  user: any
  transactions: Transaction[]
  categories: any[]
  accounts: any[]
  workspaces: any[]
}) {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [isPending, startTransition] = useTransition()

  const pendingExpenses = transactions.filter(t => t.type === 'expense')
  const pendingIncomes = transactions.filter(t => t.type === 'income')
  
  const currentList = activeTab === 'expense' ? pendingExpenses : pendingIncomes

  const totalAmount = currentList
    .filter(t => t.status === 'pending')
    .reduce((acc, t) => acc + Number(t.amount), 0)

  const handlePay = (id: string) => {
    console.log("handlePay clicked for", id);
    startTransition(async () => {
      try {
        const res = await payTransactionNew(id)
        console.log("payTransactionNew response:", res);
        if (res?.error) toast.error(res.error)
        else toast.success(res.success)
      } catch (err) {
        console.error("payTransactionNew exception:", err);
        toast.error("Exceção: " + String(err))
      }
    })
  }

  const handleUnpay = (id: string) => {
    startTransition(async () => {
      const res = await unpayTransaction(id)
      if (res?.error) toast.error(res.error)
      else toast.success(res.success)
    })
  }

  const handleDelete = (id: string) => {
    toast('Tem certeza que deseja excluir este lançamento?', {
      action: {
        label: 'Sim, excluir',
        onClick: () => {
          startTransition(async () => {
            const res = await deleteTransaction(id)
            if (res?.error) toast.error(res.error)
            else toast.success(res.success)
          })
        }
      },
      cancel: { label: 'Cancelar', onClick: () => {} }
    })
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-emerald-600" />
            Lançamentos Futuros
          </h1>
          <p className="text-sm text-slate-500 mt-1">Organize suas contas a pagar e valores a receber.</p>
        </div>
        <button 
          onClick={() => {
            setEditingTx(null)
            setIsTxModalOpen(true)
          }}
          className="btn-primary py-2.5 px-4 flex items-center gap-2 text-sm shadow-md shadow-emerald-500/20 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Planejamento
        </button>
      </div>

      <div className="flex bg-slate-100/50 p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowDownRight className="w-4 h-4" /> A Pagar ({pendingExpenses.length})
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" /> A Receber ({pendingIncomes.length})
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-4 md:p-6 flex justify-between items-center border-b border-slate-100 bg-slate-50/50">
          <div className="font-bold text-slate-700 text-sm">
            Total {activeTab === 'expense' ? 'a pagar' : 'a receber'}
          </div>
          <div className={`text-xl font-black tabular-nums ${activeTab === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
            {currencyFmt.format(totalAmount)}
          </div>
        </div>

        {currentList.length > 0 ? (
          <div className="flex flex-col gap-3 p-4">
            {currentList.map((t) => {
              const isOverdue = new Date(t.date + 'T12:00:00') < new Date(new Date().setHours(0,0,0,0)) && t.status === 'pending'
              const isPaid = t.status === 'paid_planned'
              
              return (
                <div 
                  key={t.id} 
                  onClick={() => {
                    setEditingTx(t)
                    setIsTxModalOpen(true)
                  }}
                  className={`p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white hover:bg-slate-50 transition-colors border shadow-sm cursor-pointer ${
                    isPaid ? 'border-slate-200 opacity-60 grayscale-[0.5]' : (isOverdue ? 'border-rose-200 rounded-2xl' : 'border-slate-200 rounded-2xl')
                  } rounded-2xl`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm shrink-0"
                      style={{ 
                        backgroundColor: `${t.category?.color || '#94a3b8'}15`, 
                        border: `1px solid ${t.category?.color || '#94a3b8'}30` 
                      }}
                    >
                      {t.category?.icon || (activeTab === 'expense' ? '💸' : '💰')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className={`font-bold text-base sm:text-lg text-slate-800 truncate ${isPaid ? 'line-through' : ''}`}>{t.description}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs font-medium text-slate-500">
                        {t.category?.name && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.category.color || '#94a3b8' }}></span>
                            {t.category.name}
                          </span>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {t.account?.icon} {t.account?.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-y-3 gap-x-2 sm:gap-6 md:w-auto w-full border-t border-slate-100 md:border-0 pt-4 md:pt-0">
                    <div className="text-left md:text-right shrink-0">
                      <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5 sm:mb-1 ${isOverdue ? 'text-rose-500' : 'text-slate-400'}`}>
                        {isOverdue ? 'Atrasado' : 'Vencimento'}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-700">
                        {dateFmt.format(new Date(t.date + 'T12:00:00'))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 flex-1">
                      <div className="text-left sm:text-right">
                        <div className={`font-black tabular-nums text-base sm:text-lg whitespace-nowrap ${activeTab === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {currencyFmt.format(Number(t.amount))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(t.id)
                        }}
                        disabled={isPending}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isPaid ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUnpay(t.id)
                          }}
                          disabled={isPending}
                          className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all disabled:opacity-50"
                        >
                          Desfazer
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePay(t.id)
                          }}
                          disabled={isPending}
                          className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 ${
                            activeTab === 'expense' 
                              ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 hover:-translate-y-0.5' 
                              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 hover:-translate-y-0.5'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {activeTab === 'expense' ? 'Pagar' : 'Receber'}
                        </button>
                      )}
                    </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <CalendarCheck className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">Tudo em dia!</h3>
            <p className="text-sm text-slate-500">
              Você não tem {activeTab === 'expense' ? 'despesas' : 'receitas'} pendentes.
            </p>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isTxModalOpen} 
        onClose={() => {
          setIsTxModalOpen(false)
          setEditingTx(null)
        }}
        title={editingTx ? "Editar Planejamento" : "Novo Planejamento"}
      >
        <TransactionForm
          workspaceId={workspaces[0]?.id}
          categories={categories}
          accounts={accounts}
          isPlanningMode={true}
          initialData={editingTx}
          onSuccess={() => {
            setIsTxModalOpen(false)
            setEditingTx(null)
          }}
        />
      </Modal>
    </main>
  )
}
