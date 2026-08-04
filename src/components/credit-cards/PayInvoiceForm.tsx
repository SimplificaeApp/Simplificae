'use client'

import { useState } from 'react'
import { createTransaction } from '@/app/actions/transactions'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { enqueueMutation } from '@/lib/offlineSync'
import { useInvalidateFinancialData, QUERY_KEYS } from '@/hooks/useFinancialData'
import { useQueryClient } from '@tanstack/react-query'

interface PayInvoiceFormProps {
  workspaceId: string
  card: any
  accounts: any[]
  defaultAmount?: number
  onSuccess?: () => void
}

export function PayInvoiceForm({ workspaceId, card, accounts, defaultAmount, onSuccess }: PayInvoiceFormProps) {
  const [isPendingLocal, setIsPendingLocal] = useState(false)
  const pending = isPendingLocal
  const [localError, setLocalError] = useState<string | null>(null)
  const [amount, setAmount] = useState(() => {
    if (defaultAmount && defaultAmount > 0) {
      const valStr = defaultAmount.toFixed(2).replace('.', ',')
      return valStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }
    return ''
  })

  const router = useRouter()
  const invalidateData = useInvalidateFinancialData()
  const queryClient = useQueryClient()

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 0) {
      value = (parseInt(value, 10) / 100).toFixed(2).replace('.', ',')
      value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }
    setAmount(value)
  }

  const customAction = async (formData: FormData) => {
    setIsPendingLocal(true)
    setLocalError(null)
    const payload = Object.fromEntries(formData.entries())
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
       const newMutation = await enqueueMutation({
          actionType: 'CREATE_TRANSACTION',
          payload
       })
       toast.info('Você está offline. Pagamento da fatura salvo localmente e será sincronizado depois.')
       
       const parsedAmt = payload.amount ? Number(payload.amount.toString().replace('.', '').replace(',', '.')) : 0
       queryClient.setQueryData(QUERY_KEYS.transactions, (old: any) => {
         if (!old) return old
         const fakeTx = {
           id: newMutation.id,
           workspace_id: workspaceId,
           description: payload.description,
           amount: parsedAmt,
           type: 'transfer',
           status: 'paid_planned',
           date: payload.date || new Date().toISOString().split('T')[0],
           account_id: payload.account_id,
           destination_account_id: payload.destination_account_id
         }
         return [fakeTx, ...old]
       })
       
       if (onSuccess) onSuccess()
       setIsPendingLocal(false)
       return
    }

    try {
      const res = await createTransaction(null, formData)
      if (res?.error) {
         setLocalError(res.error)
      } else {
         invalidateData()
         router.refresh()
         if (onSuccess) onSuccess()
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('fetch') || err.message.includes('Network'))) {
        await enqueueMutation({
           actionType: 'CREATE_TRANSACTION',
           payload
        })
        toast.info('Falha na conexão. Pagamento salvo offline.')
        invalidateData()
        if (onSuccess) onSuccess()
      } else {
        setLocalError('Erro ao registrar pagamento.')
      }
    }
    setIsPendingLocal(false)
  }

  return (
    <form action={customAction} className="flex flex-col gap-5">
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <input type="hidden" name="type" value="transfer" />
      <input type="hidden" name="destination_account_id" value={card?.id} />
      <input type="hidden" name="description" value={`Pagamento Fatura ${card?.name}`} />
      
      {localError && (
        <div className="p-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl font-medium">
          {localError}
        </div>
      )}

      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="amount">
          Valor do Pagamento
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
          <input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            required
            value={amount}
            onChange={handleAmountChange}
            placeholder="0,00"
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 font-medium text-lg shadow-2xs"
          />
        </div>
      </div>

      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="account_id">
          Conta de Origem (De onde vai sair o dinheiro)
        </label>
        <div className="relative">
          <select
            id="account_id"
            name="account_id"
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 appearance-none shadow-2xs pr-10"
          >
            <option value="">Selecione a conta...</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.icon ? `${account.icon} ` : ''}{account.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>
      
      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="date">
          Data do Pagamento
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
        />
      </div>

      <motion.button
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={pending}
        className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-[0_4px_14px_0_rgb(16,185,129,0.39)] disabled:opacity-70"
      >
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Pagamento'}
      </motion.button>
    </form>
  )
}
