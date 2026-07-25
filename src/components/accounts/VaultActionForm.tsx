'use client'

import { useActionState, useEffect, useState } from 'react'
import { transferToVault } from '@/app/actions/vaults'
import { ArrowDownCircle, ArrowUpCircle, Check, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

interface VaultActionFormProps {
  vaultId: string
  actionType: 'deposit' | 'withdraw'
  categories?: any[]
  onSuccess?: () => void
}

type State = { error?: string; success?: string }
const initialState: State = {}

export function VaultActionForm({ vaultId, actionType, categories = [], onSuccess }: VaultActionFormProps) {
  const [state, formAction, pending] = useActionState(transferToVault, initialState)
  const [amount, setAmount] = useState('')
  const [createTransaction, setCreateTransaction] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')

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
  const investmentCategories = categories.filter((c: any) => c.is_investment)

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
            inputMode="numeric"
            pattern="[0-9]*"
            required
            value={amount}
            onChange={handleAmountChange}
            placeholder="0,00"
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 font-medium text-lg"
          />
        </div>
      </div>

      {isDeposit && (
        <div className="flex flex-col gap-3 p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              name="create_transaction"
              value="true"
              checked={createTransaction}
              onChange={(e) => {
                const checked = e.target.checked
                setCreateTransaction(checked)
                if (checked && !selectedCategoryId && investmentCategories.length > 0) {
                  setSelectedCategoryId(investmentCategories[0].id)
                }
              }}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-bold text-slate-800">
              Contabilizar como Investimento / Aporte no Planejamento
            </span>
          </label>

          {createTransaction && (
            <div className="flex flex-col gap-2 pt-1 border-t border-emerald-100/80">
              <input type="hidden" name="category_id" value={selectedCategoryId || (investmentCategories[0]?.id || '')} />

              {investmentCategories.length > 1 ? (
                <>
                  <span className="text-xs font-bold text-slate-700">Selecione a categoria do investimento:</span>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    {investmentCategories.map((c: any) => {
                      const isSelected = (selectedCategoryId || investmentCategories[0]?.id) === c.id
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(c.id)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-[1.01]'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100'
                              }`}
                              style={!isSelected && c.color ? { backgroundColor: `${c.color}20` } : undefined}
                            >
                              {c.icon || '💎'}
                            </span>
                            <span className="font-bold text-xs truncate">{c.name}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : investmentCategories.length === 1 ? (
                <div className="p-3 rounded-xl bg-emerald-600 text-white flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-sm shrink-0">
                      {investmentCategories[0].icon || '💎'}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider">Destino do Aporte</div>
                      <div className="font-bold text-xs truncate">{investmentCategories[0].name}</div>
                    </div>
                  </div>
                  <Check className="w-4 h-4 text-white shrink-0" />
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col gap-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <Sparkles className="w-4 h-4 text-amber-600" /> Nenhuma Categoria de Investimento
                  </div>
                  <p className="text-amber-800/90 leading-relaxed">
                    Vá em <strong>Configurações ➔ Categorias</strong> e marque a caixinha <em>"É um Investimento / Aporte"</em> nas suas categorias de investimento.
                  </p>
                </div>
              )}

              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Isso criará uma transação para abater na sua meta de investimentos no Planejamento.
              </p>
            </div>
          )}
        </div>
      )}

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
