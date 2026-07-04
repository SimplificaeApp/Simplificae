'use client'

import { useActionState, useEffect, useState } from 'react'
import { transferToVault } from '@/app/actions/vaults'
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface VaultActionFormProps {
  vaultId: string
  actionType: 'deposit' | 'withdraw'
  onSuccess?: () => void
}

type State = { error?: string; success?: string }
const initialState: State = {}

export function VaultActionForm({ vaultId, actionType, onSuccess }: VaultActionFormProps) {
  const [state, formAction, pending] = useActionState(transferToVault, initialState)
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (state.success && onSuccess) {
      onSuccess()
    }
  }, [state.success, onSuccess])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 0) {
      value = (parseInt(value, 10) / 100).toFixed(2).replace('.', ',')
      value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }
    setAmount(value)
  }

  const isDeposit = actionType === 'deposit'

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="vault_id" value={vaultId} />
      <input type="hidden" name="action" value={actionType} />
      
      {state.error && (
        <div className="p-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl font-medium">
          {state.error}
        </div>
      )}

      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="amount">
          Valor para {isDeposit ? 'guardar' : 'resgatar'}
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
          <input
            id="amount"
            name="amount"
            type="text"
            required
            value={amount}
            onChange={handleAmountChange}
            placeholder="0,00"
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 font-medium text-lg"
          />
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={pending}
        className={`w-full mt-2 text-white font-bold py-3.5 px-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-md disabled:opacity-70 ${
          isDeposit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'
        }`}
      >
        {pending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isDeposit ? (
          <><ArrowDownCircle className="w-5 h-5" /> Guardar Dinheiro</>
        ) : (
          <><ArrowUpCircle className="w-5 h-5" /> Resgatar Dinheiro</>
        )}
      </motion.button>
    </form>
  )
}
