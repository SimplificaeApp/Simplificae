'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { getVaultHistory } from '@/app/actions/vaults'
import { ArrowDownCircle, ArrowUpCircle, History, PiggyBank, Plus, Minus, Loader2 } from 'lucide-react'

type Vault = {
  id: string
  name: string
  target_amount: number | null
  balance: number
  icon?: string
  color?: string
  account_id: string
}

type VaultTx = {
  id: string
  vault_id: string
  action: 'deposit' | 'withdraw'
  amount: number
  created_at: string
}

interface VaultHistoryModalProps {
  vault: Vault | null
  onClose: () => void
  onOpenAction: (vaultId: string, actionType: 'deposit' | 'withdraw') => void
}

export function VaultHistoryModal({ vault, onClose, onOpenAction }: VaultHistoryModalProps) {
  const [history, setHistory] = useState<VaultTx[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  useEffect(() => {
    if (!vault) return
    let isMounted = true
    setLoading(true)
    setError(null)

    getVaultHistory(vault.id).then(res => {
      if (!isMounted) return
      setLoading(false)
      if (res.error) {
        setError(res.error)
      } else {
        setHistory(res.history || [])
      }
    }).catch(err => {
      if (!isMounted) return
      setLoading(false)
      setError('Erro ao carregar o extrato do cofrinho.')
    })

    return () => { isMounted = false }
  }, [vault])

  if (!vault) return null

  const targetAmount = Number(vault.target_amount) || 0
  const currentBalance = Number(vault.balance) || 0
  const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((currentBalance / targetAmount) * 100)) : 0

  return (
    <Modal isOpen={Boolean(vault)} onClose={onClose} title="Extrato do Cofrinho">
      <div className="flex flex-col gap-5">
        {/* Header Hero */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white border border-emerald-100 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-xs shrink-0"
                style={{ backgroundColor: vault.color ? `${vault.color}25` : '#e2e8f0' }}
              >
                {vault.icon || '🐷'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-slate-900 text-base truncate">{vault.name}</h3>
                <p className="text-xs text-slate-500 font-medium truncate">Histórico de movimentações</p>
              </div>
            </div>
            <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-100/80 flex sm:flex-col justify-between items-baseline sm:items-end">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo Atual</div>
              <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
                {currencyFmt.format(currentBalance)}
              </div>
            </div>
          </div>

          {/* Meta & Progresso */}
          {targetAmount > 0 && (
            <div className="pt-2 border-t border-emerald-100/80 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="truncate">Meta: {currencyFmt.format(targetAmount)}</span>
                <span className="text-emerald-700 shrink-0 ml-2">{progressPercent}% atingido</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Botões Rápidos */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              onClose()
              onOpenAction(vault.id, 'deposit')
            }}
            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Guardar Dinheiro
          </button>
          <button
            onClick={() => {
              onClose()
              onOpenAction(vault.id, 'withdraw')
            }}
            className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Minus className="w-4 h-4" /> Resgatar Dinheiro
          </button>
        </div>

        {/* Histórico Lista */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            <span>Histórico de Operações</span>
            <History className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Carregando extrato...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
              <PiggyBank className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Nenhum resgate ou aporte registrado ainda.</p>
              <p className="text-[11px] text-slate-400">As movimentações futuras deste cofrinho aparecerão aqui em tempo real.</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto flex flex-col divide-y divide-slate-100 bg-white border border-slate-100 rounded-2xl">
              {history.map(tx => {
                const isDeposit = tx.action === 'deposit'
                const formattedDate = new Date(tx.created_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })

                return (
                  <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isDeposit ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {isDeposit ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {isDeposit ? 'Dinheiro Guardado (Aporte)' : 'Dinheiro Resgatado'}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400">
                          {formattedDate}
                        </div>
                      </div>
                    </div>

                    <div className={`text-xs font-black tabular-nums ${isDeposit ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {isDeposit ? '+' : '-'} {currencyFmt.format(Number(tx.amount))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
