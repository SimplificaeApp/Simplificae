'use client'

import { useState, useActionState, useEffect, startTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createTransaction, updateTransaction, deleteTransaction } from '@/app/actions/transactions'
import { 
  ArrowRight, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  Trash2,
  Calendar,
  Repeat,
  CreditCard,
  Infinity,
  Plus,
  Minus,
  CheckCircle,
  ChevronDown,
  Check
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Category {
  id: string
  name: string
  type: string
  icon?: string
}

interface Account {
  id: string
  name: string
  icon?: string
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

function CustomSelect({
  name,
  value,
  onChange,
  options,
  placeholder,
  required
}: {
  name: string
  value: string
  onChange: (val: string) => void
  options: { id: string; label: string; icon?: string }[]
  placeholder: string
  required?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find(o => o.id === value)

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} required={required} />
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-slate-800 text-sm flex items-center justify-between shadow-2xs transition-all ${
          isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={`truncate flex items-center gap-2 ${selectedOption ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="text-base">{selectedOption.icon}</span>}
              {selectedOption.label}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 4, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full z-50 max-h-52 overflow-y-auto bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-1.5 flex flex-col gap-1 no-scrollbar"
            >
              {options.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center font-medium">Nenhuma opção disponível</div>
              ) : (
                options.map(opt => {
                  const isSelected = opt.id === value
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChange(opt.id)
                        setIsOpen(false)
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        isSelected 
                          ? 'bg-emerald-50 text-emerald-800 font-bold' 
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {opt.icon && <span className="text-base shrink-0">{opt.icon}</span>}
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                    </button>
                  )
                })
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

type State = { error?: string; success?: string }
const initialState: State = {}

export function TransactionForm({
  workspaceId,
  categories,
  accounts,
  onSuccess,
  defaultType = 'expense',
  defaultAccountId,
  isCreditCard,
  isPlanningMode,
  initialData
}: TransactionFormProps) {
  const actionToUse = initialData ? updateTransaction.bind(null, initialData.id) : createTransaction
  const [state, formAction, pending] = useActionState(actionToUse, initialState)
  
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>(initialData?.type || defaultType)
  const [amount, setAmount] = useState(() => {
    if (initialData?.amount) {
      return Number(initialData.amount).toFixed(2).replace('.', ',')
    }
    return ''
  })
  const [categoryId, setCategoryId] = useState<string>(initialData?.category_id || '')
  const [accountId, setAccountId] = useState<string>(initialData?.account_id || defaultAccountId || '')
  const [destinationAccountId, setDestinationAccountId] = useState<string>(initialData?.destination_account_id || '')
  const [isPlanned, setIsPlanned] = useState(initialData?.status === 'pending' || false)
  
  // Frequency mode: 1 = Single, -1 = Recurring/Fixo, >1 = Installments
  const [freqMode, setFreqMode] = useState<'single' | 'recurring' | 'installment'>('single')
  const [installments, setInstallments] = useState(2)
  const [recurringMonths, setRecurringMonths] = useState(12)
  const [isIndefinite, setIsIndefinite] = useState(true)

  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (state.success && onSuccess) {
      router.refresh()
      onSuccess()
    }
  }, [state.success, onSuccess, router])

  const executeDelete = (scope: 'single' | 'future') => {
    if (!initialData) return
    setIsDeleting(true)
    startTransition(async () => {
      const res = await deleteTransaction(initialData.id, scope)
      setIsDeleting(false)
      if (res?.error) toast.error(res.error)
      else {
        toast.success(scope === 'future' ? 'Lançamento e próximos excluídos!' : 'Lançamento excluído!')
        if (onSuccess) onSuccess()
      }
    })
  }

  const handleDelete = () => {
    if (!initialData) return

    const isRecurringOrInstallment = initialData.is_recurring || initialData.installment_id

    if (isRecurringOrInstallment) {
      toast('Este é um lançamento recorrente/parcelado. Como deseja excluir?', {
        action: {
          label: 'Apenas este',
          onClick: () => executeDelete('single')
        },
        cancel: {
          label: 'Este e os próximos',
          onClick: () => executeDelete('future')
        }
      })
    } else {
      toast('Tem certeza que deseja excluir este lançamento?', {
        action: {
          label: 'Sim, excluir',
          onClick: () => executeDelete('single')
        },
        cancel: { label: 'Cancelar', onClick: () => {} }
      })
    }
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 0) {
      value = (parseInt(value, 10) / 100).toFixed(2).replace('.', ',')
      value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }
    setAmount(value)
  }

  const activeCategories = categories.filter(c => c.type === type)
  const isExpense = type === 'expense'
  const isTransfer = type === 'transfer'

  let themeBg = 'from-rose-500/10 via-rose-500/5 to-transparent border-rose-200'
  let accentColor = 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
  let focusRingClass = 'focus:ring-rose-500/20 focus:border-rose-500'

  if (type === 'income') {
    themeBg = 'from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200'
    accentColor = 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
    focusRingClass = 'focus:ring-emerald-500/20 focus:border-emerald-500'
  } else if (isTransfer) {
    themeBg = 'from-blue-500/10 via-blue-500/5 to-transparent border-blue-200'
    accentColor = 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
    focusRingClass = 'focus:ring-blue-500/20 focus:border-blue-500'
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="status" value={isPlanningMode ? 'pending' : (isPlanned ? 'pending' : 'posted')} />

      {/* Hidden inputs based on freqMode */}
      <input 
        type="hidden" 
        name="is_recurring" 
        value={freqMode === 'recurring' ? 'true' : 'false'} 
      />
      <input 
        type="hidden" 
        name="recurring_months" 
        value={isIndefinite ? 12 : recurringMonths} 
      />
      <input 
        type="hidden" 
        name="installments" 
        value={freqMode === 'installment' ? installments : 1} 
      />

      {state.error && (
        <div className="p-3 text-xs sm:text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl font-semibold flex items-center gap-2">
          <span>⚠️</span> {state.error}
        </div>
      )}

      {/* Tabs Type Selector */}
      {!isCreditCard && (
        <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 shadow-inner">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              isExpense ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingDown className="w-4 h-4" /> Despesa
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
              type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Receita
          </button>
          {!isPlanningMode && (
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                isTransfer ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" /> Transferência
            </button>
          )}
        </div>
      )}

      {/* Valor Input Hero (NUMERIC KEYPAD FOR MOBILE!) */}
      <div className={`flex flex-col items-center justify-center py-4 px-6 rounded-2xl bg-gradient-to-b ${themeBg} border shadow-sm`}>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
          {isExpense ? 'Valor da Despesa' : isTransfer ? 'Valor da Transferência' : 'Valor da Receita'}
        </label>
        <div className="flex items-center text-3xl sm:text-4xl font-black text-slate-900">
          <span className="text-xl sm:text-2xl text-slate-400 mr-1.5 font-bold">R$</span>
          <input 
            type="tel"
            inputMode="numeric"
            name="amount"
            value={amount}
            onChange={handleAmountChange}
            placeholder="0,00"
            required
            autoFocus
            className="w-48 bg-transparent outline-none text-center placeholder-slate-300 font-black tabular-nums"
          />
        </div>
      </div>

      {/* Form Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="group">
          <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="description">
            Descrição
          </label>
          <input
            id="description"
            name="description"
            type="text"
            required
            defaultValue={initialData?.description || ""}
            placeholder={isExpense ? "Ex: Aluguel Apartamento" : "Ex: Salário Mensal"}
            className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 transition-all shadow-2xs ${focusRingClass}`}
          />
        </div>

        {!isTransfer ? (
          <div className="group">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Categoria
            </label>
            <CustomSelect
              name="category_id"
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Selecione a categoria..."
              required={!isTransfer}
              options={activeCategories.map(c => ({ id: c.id, label: c.name, icon: c.icon }))}
            />
          </div>
        ) : (
          <div className="group">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Conta Destino
            </label>
            <CustomSelect
              name="destination_account_id"
              value={destinationAccountId}
              onChange={setDestinationAccountId}
              placeholder="Selecione a conta..."
              required={isTransfer}
              options={accounts.map(a => ({ id: a.id, label: a.name, icon: a.icon || '💳' }))}
            />
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 ${!isPlanningMode ? 'sm:grid-cols-2' : ''} gap-3.5`}>
        {!isPlanningMode && (
          <div className="group">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isTransfer ? 'Conta de Origem' : 'Conta'}
            </label>
            <CustomSelect
              name="account_id"
              value={accountId}
              onChange={setAccountId}
              placeholder="Selecione a conta..."
              required
              options={accounts.map(a => ({ id: a.id, label: a.name, icon: a.icon || '💳' }))}
            />
          </div>
        )}

        <div className="group">
          <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="date">
            Data de Lançamento / Vencimento
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={initialData?.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]}
            className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 transition-all shadow-2xs ${focusRingClass}`}
          />
        </div>
      </div>

      {/* SELETOR DE FREQUÊNCIA / RECORRÊNCIA (Apenas para novos lançamentos) */}
      {!isTransfer && !initialData && (
        <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
          <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <span>Frequência do Lançamento</span>
            <span className="text-[11px] font-normal text-slate-500">Defina se repete nos próximos meses</span>
          </label>

          {/* Segmented Mode Selector */}
          <div className="grid grid-cols-3 gap-1.5 bg-slate-200/60 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setFreqMode('single')}
              className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                freqMode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Pontual (1x)
            </button>
            <button
              type="button"
              onClick={() => setFreqMode('recurring')}
              className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                freqMode === 'recurring' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Repeat className="w-3.5 h-3.5 text-emerald-600" /> Fixo / Recorrente
            </button>
            <button
              type="button"
              onClick={() => setFreqMode('installment')}
              className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                freqMode === 'installment' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Parcelado
            </button>
          </div>

          {/* OPCIONAIS: MODO FIXO / RECORRENTE CUSTOMIZADO */}
          {freqMode === 'recurring' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex flex-col gap-3 pt-2 border-t border-slate-200/60"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Duração nos Próximos Meses:</span>
                <button
                  type="button"
                  onClick={() => setIsIndefinite(!isIndefinite)}
                  className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all border ${
                    isIndefinite ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <Infinity className="w-3.5 h-3.5 text-emerald-600" />
                  Indeterminado (Todo mês)
                </button>
              </div>

              {!isIndefinite && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRecurringMonths(Math.max(2, recurringMonths - 1))}
                      className="w-9 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-xl">
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={recurringMonths}
                        onChange={(e) => setRecurringMonths(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))}
                        className="w-16 text-center font-black text-slate-800 text-base outline-none bg-transparent"
                      />
                      <span className="text-xs font-bold text-slate-500">meses seguidos</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRecurringMonths(Math.min(120, recurringMonths + 1))}
                      className="w-9 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Atalhos Rápidos */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {[3, 6, 12, 24, 36].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setIsIndefinite(false)
                          setRecurringMonths(m)
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          !isIndefinite && recurringMonths === m ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m} meses
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-500 leading-tight">
                💡 O valor integral de <strong>R$ {amount || '0,00'}</strong> será lançado automaticamente nos meses futuros do seu planejamento.
              </p>
            </motion.div>
          )}

          {/* OPCIONAIS: MODO PARCELADO */}
          {freqMode === 'installment' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex flex-col gap-2 pt-2 border-t border-slate-200/60"
            >
              <label className="text-xs font-bold text-slate-700">Número de Parcelas</label>
              <select
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 transition-all ${focusRingClass}`}
              >
                {[2,3,4,5,6,7,8,9,10,11,12,18,24,36,48,60].map(n => {
                  const cleanAmount = amount ? amount.replace(/\./g, '').replace(',', '.') : '0';
                  const installmentValue = parseFloat(cleanAmount) / n;
                  const formattedValue = installmentValue > 0 ? `(R$ ${installmentValue.toFixed(2).replace('.', ',')}/mês)` : '';
                  return <option key={n} value={n}>{n}x {formattedValue}</option>
                })}
              </select>
            </motion.div>
          )}
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex items-center gap-3 mt-2">
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
          className={`flex-1 py-3.5 px-6 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${accentColor}`}
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
