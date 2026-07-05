'use client'

import { useState, useActionState, useEffect, startTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createTransaction, updateTransaction, deleteTransaction } from '@/app/actions/transactions'
import { ArrowRight, Loader2, TrendingUp, TrendingDown, ArrowRightLeft, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface Category {
  id: string
  name: string
  type: string
  icon?: string
}

interface Account {
  id: string
  name: string
}

interface TransactionFormProps {
  workspaceId: string
  categories: Category[]
  accounts: Account[]
  onSuccess?: () => void
  defaultType?: 'income' | 'expense' | 'transfer'
  defaultAccountId?: string
  isCreditCard?: boolean
  isPlanningMode?: boolean
  initialData?: any
}

type State = { error?: string; success?: string }
const initialState: State = {}

export function TransactionForm({ workspaceId, categories, accounts, onSuccess, defaultType = 'expense', defaultAccountId, isCreditCard, isPlanningMode, initialData }: TransactionFormProps) {
  const actionToUse = initialData ? updateTransaction.bind(null, initialData.id) : createTransaction
  const [state, formAction, pending] = useActionState(actionToUse, initialState)
  
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>(initialData?.type || defaultType)
  const [amount, setAmount] = useState(() => {
    if (initialData?.amount) {
      return Number(initialData.amount).toFixed(2).replace('.', ',')
    }
    return ''
  })
  const [isPlanned, setIsPlanned] = useState(initialData?.status === 'pending' || false)
  const [installments, setInstallments] = useState(1) // Cannot easily edit installments count of existing tx
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  // Efeito para fechar o modal caso a transação seja salva
  useEffect(() => {
    if (state.success && onSuccess) {
      router.refresh()
      onSuccess()
    }
  }, [state.success, onSuccess, router])

  const handleDelete = () => {
    if (!initialData) return
    toast('Tem certeza que deseja excluir esta transação?', {
      action: {
        label: 'Sim, excluir',
        onClick: () => {
          setIsDeleting(true)
          startTransition(async () => {
            const res = await deleteTransaction(initialData.id)
            setIsDeleting(false)
            if (res?.error) toast.error(res.error)
            else {
              toast.success('Transação excluída!')
              if (onSuccess) onSuccess()
            }
          })
        }
      },
      cancel: { label: 'Cancelar', onClick: () => {} }
    })
  }

  // Formata o input de valor para moeda R$
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 0) {
      value = (parseInt(value, 10) / 100).toFixed(2).replace('.', ',')
      value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }
    setAmount(value)
  }

  // Filtra as categorias ativas de acordo com a aba selecionada
  const activeCategories = categories.filter(c => c.type === type)

  const isExpense = type === 'expense'
  const isTransfer = type === 'transfer'

  let focusRingClass = 'focus:ring-emerald-500/20 focus:border-emerald-500'
  if (isExpense) focusRingClass = 'focus:ring-rose-500/20 focus:border-rose-500'
  if (isTransfer) focusRingClass = 'focus:ring-blue-500/20 focus:border-blue-500'

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="status" value={isPlanningMode ? 'pending' : (isPlanned ? 'pending' : 'posted')} />
      <input type="hidden" name="installments" value={installments} />
      
      {state.error && (
        <div className="p-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl font-medium">
          {state.error}
        </div>
      )}

      {/* Tabs Type Selector */}
      {!isCreditCard && (
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
              isExpense ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingDown className="w-4 h-4" /> Despesa
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
              type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Receita
          </button>
          {!isPlanningMode && (
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
                isTransfer ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" /> Transferência
            </button>
          )}
        </div>
      )}

      {/* Valor Input Gigante */}
      <div className="flex flex-col items-center justify-center py-4">
        <label className="text-sm font-bold text-slate-500 mb-1">Valor da Transação</label>
        <div className="flex items-center text-4xl font-black text-slate-800">
          <span className="text-2xl text-slate-400 mr-1">R$</span>
          <input 
            type="text" 
            name="amount"
            value={amount}
            onChange={handleAmountChange}
            placeholder="0,00"
            required
            className="w-40 bg-transparent outline-none text-center placeholder-slate-300"
          />
        </div>
      </div>

      <div className={`grid grid-cols-1 ${!isPlanningMode ? 'sm:grid-cols-2' : ''} gap-4`}>
        {!isPlanningMode && (
          <div className="group">
            <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-slate-900" htmlFor="account_id">
              {isTransfer ? 'Conta de Origem' : 'Conta'}
            </label>
            <select
              id="account_id"
              name="account_id"
              required
              defaultValue={initialData?.account_id || defaultAccountId || ""}
              className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 transition-all duration-200 ${focusRingClass}`}
            >
              <option value="">Selecione...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        )}

        {isTransfer ? (
          <div className="group">
            <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-slate-900" htmlFor="destination_account_id">
              Conta de Destino
            </label>
            <select
              id="destination_account_id"
              name="destination_account_id"
              required={isTransfer}
              defaultValue={initialData?.destination_account_id || ""}
              className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 transition-all duration-200 ${focusRingClass}`}
            >
              <option value="">Selecione...</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="group">
            <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-slate-900" htmlFor="category_id">
              Categoria
            </label>
            <select
              id="category_id"
              name="category_id"
              required={!isTransfer}
              defaultValue={initialData?.category_id || ""}
              className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 transition-all duration-200 ${focusRingClass}`}
            >
              <option value="">Selecione...</option>
              {activeCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-slate-900" htmlFor="description">
          Descrição
        </label>
        <input
          id="description"
          name="description"
          type="text"
          required
          defaultValue={initialData?.description || ""}
          placeholder={isTransfer ? "Ex: Transferência para Poupança" : "Ex: Almoço Restaurante XYZ"}
          className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all duration-200 ${focusRingClass}`}
        />
      </div>

      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-slate-900" htmlFor="date">
          Data
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]}
          className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 transition-all duration-200 ${focusRingClass}`}
        />
      </div>

      {!isTransfer && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isCreditCard && !isPlanningMode ? (
            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors">
              <input 
                type="checkbox" 
                checked={isPlanned}
                onChange={(e) => setIsPlanned(e.target.checked)}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" 
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">Lançamento Futuro</span>
                <span className="text-xs text-slate-500">Ainda não foi {isExpense ? 'pago' : 'recebido'}</span>
              </div>
            </label>
          ) : (
            <input type="hidden" name={isCreditCard ? "status" : ""} value="posted" />
          )}
          
          <div className={`group ${isCreditCard || isPlanningMode ? 'col-span-1 sm:col-span-2' : ''} ${initialData ? 'hidden' : ''}`}>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-slate-900" htmlFor="installments">
              Parcelas
            </label>
            <select
              id="installments"
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
              className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 transition-all duration-200 ${focusRingClass}`}
            >
              <option value={1}>À vista (1x)</option>
              {[2,3,4,5,6,7,8,9,10,11,12,24,36,48,60].map(n => {
                const cleanAmount = amount ? amount.replace(/\./g, '').replace(',', '.') : '0';
                const installmentValue = parseFloat(cleanAmount) / n;
                const formattedValue = installmentValue > 0 ? `(R$ ${installmentValue.toFixed(2).replace('.', ',')})` : '';
                return <option key={n} value={n}>{n}x {formattedValue}</option>
              })}
            </select>
          </div>
        </div>
      )}

      {!isTransfer && !isCreditCard && !isPlanningMode && (
        <label className="flex items-center gap-3 p-3 mt-1 border border-slate-200 rounded-xl bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors">
          <input 
            type="checkbox" 
            name="ignore_in_cashflow"
            defaultChecked={initialData?.ignore_in_cashflow}
            className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300" 
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800">Ignorar no Fluxo de Caixa</span>
            <span className="text-xs text-slate-500">Ex: Saldo inicial, ajustes contábeis</span>
          </div>
        </label>
      )}

      <div className="flex items-center gap-3 mt-4">
        {initialData && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending || isDeleting}
            className="p-3 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50"
            title="Excluir Transação"
          >
            {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
          </button>
        )}
        
        <motion.button
          type="submit"
          disabled={pending || isDeleting}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={`flex-1 py-3 px-6 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isExpense ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 hover:shadow-rose-600/40' : 
            isTransfer ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 hover:shadow-blue-600/40' :
            'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 hover:shadow-emerald-600/40'
          }`}
        >
          {pending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Salvando...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {initialData ? 'Salvar Alterações' : `Salvar ${isExpense ? 'Despesa' : isTransfer ? 'Transferência' : 'Receita'}`}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </motion.button>
      </div>
    </form>
  )
}
