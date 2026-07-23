'use client'

import { useState, useTransition } from 'react'
import { Wallet, Plus, Trash2, Edit3, Settings, Eye, EyeOff } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { AccountForm } from './AccountForm'
import { VaultForm } from './VaultForm'
import { VaultActionForm } from './VaultActionForm'
import { motion } from 'framer-motion'
import { deleteAccount, editAccountBalance, toggleAccountHidden } from '@/app/actions/accounts'
import { deleteVault, editVaultBalance, toggleVaultHidden } from '@/app/actions/vaults'
import { toast } from 'sonner'
import { usePrivacy } from '@/components/providers/PrivacyProvider'

type Vault = { id: string; name: string; target_amount: number | null; balance: number; icon?: string; color?: string; account_id: string }
type Account = { id: string; name: string; type: string; initial_balance: number; icon?: string; color?: string; account_vaults?: Vault[] }

export function AccountsClient({
  workspaceId,
  accounts
}: {
  workspaceId?: string
  accounts: Account[]
}) {
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [isVaultActionModalOpen, setIsVaultActionModalOpen] = useState(false)
  const [vaultActionState, setVaultActionState] = useState<{ id: string, type: 'deposit' | 'withdraw' } | null>(null)
  
  const { isUnlocked, requestUnlock } = usePrivacy()
  
  // States for Edit Modals
  const [isEditAccModalOpen, setIsEditAccModalOpen] = useState(false)
  const [editAccTarget, setEditAccTarget] = useState<Account | null>(null)
  
  const [isEditAccMetaModalOpen, setIsEditAccMetaModalOpen] = useState(false)
  const [editAccMetaTarget, setEditAccMetaTarget] = useState<Account | null>(null)

  const [isEditVaultModalOpen, setIsEditVaultModalOpen] = useState(false)
  const [editVaultTarget, setEditVaultTarget] = useState<Vault | null>(null)

  const [isPending, startTransition] = useTransition()
  const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  const handleDeleteAccount = (id: string) => {
    toast('Deseja excluir esta conta?', {
      description: 'Isso excluirá a conta e todos os cofrinhos vinculados (pode falhar se houverem transações).',
      action: {
        label: 'Sim, excluir',
        onClick: () => {
          startTransition(async () => {
            const res = await deleteAccount(id)
            if (res?.error) toast.error(res.error)
            else toast.success(res.success)
          })
        }
      },
      cancel: { label: 'Cancelar', onClick: () => { } }
    })
  }

  const handleDeleteVault = (id: string) => {
    toast('Deseja excluir este cofrinho?', {
      description: 'O saldo fictício deste cofrinho deixará de existir.',
      action: {
        label: 'Sim, excluir',
        onClick: () => {
          startTransition(async () => {
            const res = await deleteVault(id)
            if (res?.error) toast.error(res.error)
            else toast.success(res.success)
          })
        }
      },
      cancel: { label: 'Cancelar', onClick: () => { } }
    })
  }

  const handleEditAccountBalance = async (formData: FormData) => {
    const res = await editAccountBalance(null, formData)
    if (res?.error) toast.error(res.error)
    else {
      toast.success(res.success)
      setIsEditAccModalOpen(false)
    }
  }

  const handleToggleAccountHidden = (id: string, current: boolean) => {
    if (current) {
      // Trying to unhide
      requestUnlock(() => {
        startTransition(async () => {
          const res = await toggleAccountHidden(id, !current)
          if (res?.error) toast.error(res.error)
        })
      })
    } else {
      startTransition(async () => {
        const res = await toggleAccountHidden(id, !current)
        if (res?.error) toast.error(res.error)
      })
    }
  }

  const handleToggleVaultHidden = (id: string, current: boolean) => {
    if (current) {
      requestUnlock(() => {
        startTransition(async () => {
          const res = await toggleVaultHidden(id, !current)
          if (res?.error) toast.error(res.error)
        })
      })
    } else {
      startTransition(async () => {
        const res = await toggleVaultHidden(id, !current)
        if (res?.error) toast.error(res.error)
      })
    }
  }

  const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }

  return (
    <div className="flex flex-col gap-6">
      <motion.div {...fadeUp} transition={{ duration: 0.3 }} className="glass-panel p-6 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800">Minhas Contas</h2>
          <button 
            onClick={() => setIsAccountModalOpen(true)}
            className="btn-primary py-2 px-4 flex items-center gap-2 text-sm shadow-md"
          >
            <Plus className="w-4 h-4" />
            Nova Conta
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map(acc => (
            <div key={acc.id} className="border border-slate-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow group flex flex-col">
              <div className="p-4 sm:p-5 flex flex-wrap justify-between items-start gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                    style={{ backgroundColor: acc.color ? `${acc.color}15` : '#f1f5f9', color: acc.color || '#475569' }}
                  >
                    {acc.icon || '🏦'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 truncate">{acc.name}</div>
                    <div className="text-xs px-2 py-0.5 mt-1 bg-slate-100 rounded-md text-slate-500 capitalize inline-block">{acc.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <button 
                    onClick={() => handleToggleAccountHidden(acc.id, !!(acc as any).is_hidden)}
                    disabled={isPending}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                    title={(acc as any).is_hidden ? "Mostrar Conta" : "Ocultar Conta"}
                  >
                    {(acc as any).is_hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => { setEditAccMetaTarget(acc); setIsEditAccMetaModalOpen(true) }}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Editar Perfil da Conta"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setEditAccTarget(acc); setIsEditAccModalOpen(true) }}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    title="Ajustar Saldo Bruto"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteAccount(acc.id)}
                    disabled={isPending}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Excluir Conta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="px-5 pb-5">
                <div className="text-sm text-slate-500 mb-1">Saldo Bruto {(acc as any).is_hidden ? '🔒' : ''}</div>
                <div 
                  className={`text-2xl font-black text-slate-900 tabular-nums ${(acc as any).is_hidden && !isUnlocked ? 'blur-sm select-none cursor-pointer' : ''}`}
                  onClick={(acc as any).is_hidden && !isUnlocked ? () => requestUnlock() : undefined}
                >
                  {(acc as any).is_hidden && !isUnlocked ? '••••' : currencyFmt.format(acc.initial_balance)}
                </div>
              </div>

              <div className="bg-slate-50/50 flex-1 p-4 rounded-b-2xl border-t border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cofrinhos</h4>
                  <button
                    onClick={() => { setSelectedAccountId(acc.id); setIsVaultModalOpen(true) }}
                    className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>

                {acc.account_vaults && acc.account_vaults.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {acc.account_vaults.map(vault => (
                      <div key={vault.id} className="flex flex-col bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:border-emerald-100 transition-colors">
                        <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div 
                              className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm"
                              style={{ backgroundColor: vault.color ? `${vault.color}20` : '#f1f5f9' }}
                            >
                              {vault.icon || '🐷'}
                            </div>
                            <div className="font-semibold text-sm text-slate-800 truncate">
                              {vault.name} {(vault as any).is_hidden ? '🔒' : ''}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => handleToggleVaultHidden(vault.id, !!(vault as any).is_hidden)}
                              disabled={isPending}
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                              title={(vault as any).is_hidden ? "Mostrar Cofrinho" : "Ocultar Cofrinho"}
                            >
                              {(vault as any).is_hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => { setEditVaultTarget(vault); setIsEditVaultModalOpen(true) }}
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
                              title="Editar Cofrinho"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteVault(vault.id)}
                              disabled={isPending}
                              className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                              title="Excluir Cofrinho"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-end">
                          <div 
                            className={`text-sm font-bold text-slate-700 tabular-nums ${(vault as any).is_hidden && !isUnlocked ? 'blur-sm select-none cursor-pointer' : ''}`}
                            onClick={(vault as any).is_hidden && !isUnlocked ? () => requestUnlock() : undefined}
                          >
                            {(vault as any).is_hidden && !isUnlocked ? '••••' : currencyFmt.format(vault.balance)}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setVaultActionState({ id: vault.id, type: 'withdraw' }); setIsVaultActionModalOpen(true) }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-500 bg-rose-50 hover:bg-rose-100 transition-colors font-bold"
                              title="Resgatar"
                            >
                              -
                            </button>
                            <button
                              onClick={() => { setVaultActionState({ id: vault.id, type: 'deposit' }); setIsVaultActionModalOpen(true) }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-emerald-500 bg-emerald-50 hover:bg-emerald-100 transition-colors font-bold"
                              title="Guardar"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 text-center py-4">Nenhum cofrinho nesta conta.</div>
                )}
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="col-span-full p-8 text-center text-slate-400">
              Você ainda não tem nenhuma conta.
            </div>
          )}
        </div>
      </motion.div>

      {/* Account Creation Modal */}
      <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} title="Nova Conta">
        <AccountForm workspaceId={workspaceId!} onSuccess={() => setIsAccountModalOpen(false)} />
      </Modal>

      {/* Vault Creation Modal */}
      <Modal isOpen={isVaultModalOpen} onClose={() => setIsVaultModalOpen(false)} title="Novo Cofrinho">
        {selectedAccountId && <VaultForm accountId={selectedAccountId} onSuccess={() => setIsVaultModalOpen(false)} />}
      </Modal>

      {/* Vault Action (Deposit/Withdraw) Modal */}
      <Modal isOpen={isVaultActionModalOpen} onClose={() => setIsVaultActionModalOpen(false)} title={vaultActionState?.type === 'deposit' ? 'Guardar Dinheiro' : 'Resgatar Dinheiro'}>
        {vaultActionState && (
          <VaultActionForm vaultId={vaultActionState.id} actionType={vaultActionState.type} onSuccess={() => setIsVaultActionModalOpen(false)} />
        )}
      </Modal>

      {/* Account Edit Meta Modal */}
      <Modal isOpen={isEditAccMetaModalOpen} onClose={() => setIsEditAccMetaModalOpen(false)} title="Editar Conta">
        {editAccMetaTarget && (
          <AccountForm workspaceId={workspaceId!} initialData={editAccMetaTarget} onSuccess={() => setIsEditAccMetaModalOpen(false)} />
        )}
      </Modal>

      {/* Account Edit Balance Modal */}
      <Modal isOpen={isEditAccModalOpen} onClose={() => setIsEditAccModalOpen(false)} title="Ajustar Saldo da Conta">
        {editAccTarget && (
          <form action={handleEditAccountBalance} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={editAccTarget.id} />
            <input type="hidden" name="workspace_id" value={workspaceId} />
            <p className="text-sm text-slate-500">
              Você está alterando o saldo bruto da conta <strong>{editAccTarget.name}</strong>. Isso criará uma transação invisível de ajuste.
            </p>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Novo Saldo</label>
              <input
                type="text"
                name="initial_balance"
                defaultValue={editAccTarget.initial_balance.toString().replace('.', ',')}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <button type="submit" className="w-full btn-primary py-3">Salvar Novo Saldo</button>
          </form>
        )}
      </Modal>

      {/* Vault Edit Modal */}
      <Modal isOpen={isEditVaultModalOpen} onClose={() => setIsEditVaultModalOpen(false)} title="Editar Cofrinho">
        {editVaultTarget && (
          <VaultForm accountId={editVaultTarget.account_id} initialData={editVaultTarget} onSuccess={() => setIsEditVaultModalOpen(false)} />
        )}
      </Modal>
    </div>
  )
}
