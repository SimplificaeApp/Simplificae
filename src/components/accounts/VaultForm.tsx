'use client'

import { useState } from 'react'
import { createVault, updateVault } from '@/app/actions/vaults'
import { ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { enqueueMutation } from '@/lib/offlineSync'
import { useInvalidateFinancialData, QUERY_KEYS } from '@/hooks/useFinancialData'
import { useQueryClient } from '@tanstack/react-query'

const EmojiPicker = dynamic(
  () => import('emoji-picker-react').then(mod => mod.default),
  { ssr: false, loading: () => <div className="p-4 text-center text-sm text-slate-400">Carregando emojis...</div> }
)

const VAULT_COLORS = [
  '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', 
  '#f43f5e', '#6366f1', '#14b8a6', '#64748b', '#0f172a'
]

interface VaultFormProps {
  accountId: string
  initialData?: any
  onSuccess?: () => void
}

export function VaultForm({ accountId, initialData, onSuccess }: VaultFormProps) {
  const isEditing = Boolean(initialData && initialData.id)
  const actionToUse = isEditing ? updateVault : createVault
  const [isPendingLocal, setIsPendingLocal] = useState(false)
  const pending = isPendingLocal
  const [localError, setLocalError] = useState<string | null>(null)

  const router = useRouter()
  const invalidateData = useInvalidateFinancialData()
  const queryClient = useQueryClient()
  
  const [target, setTarget] = useState(() => {
    if (initialData?.target_amount) {
      return (initialData.target_amount).toFixed(2).replace('.', ',')
    }
    return ''
  })
  
  const [balance, setBalance] = useState(() => {
    if (initialData?.balance) {
      return (initialData.balance).toFixed(2).replace('.', ',')
    }
    return ''
  })
  
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState(initialData?.icon || '🐷')
  const [selectedColor, setSelectedColor] = useState(initialData?.color || VAULT_COLORS[0])
  const [includeInDashboard, setIncludeInDashboard] = useState<boolean>(
    initialData?.include_in_dashboard !== undefined ? initialData.include_in_dashboard : true
  )
  const [isHidden, setIsHidden] = useState<boolean>(initialData?.is_hidden || false)

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 0) {
      value = (parseInt(value, 10) / 100).toFixed(2).replace('.', ',')
      value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }
    setTarget(value)
  }

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 0) {
      value = (parseInt(value, 10) / 100).toFixed(2).replace('.', ',')
      value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    }
    setBalance(value)
  }

  const customAction = async (formData: FormData) => {
    setIsPendingLocal(true)
    setLocalError(null)
    const payload = Object.fromEntries(formData.entries())
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
       const newMutation = await enqueueMutation({
          actionType: isEditing ? 'UPDATE_VAULT' : 'CREATE_VAULT',
          payload: { ...payload, id: initialData?.id }
       })
       toast.info('Você está offline. Cofrinho salvo localmente e será sincronizado depois.')
       
       queryClient.setQueryData(QUERY_KEYS.accounts, (old: any) => {
         if (!old) return old
         const parsedBal = payload.balance ? Number(payload.balance.toString().replace('.', '').replace(',', '.')) : 0
         const parsedTarget = payload.target_amount ? Number(payload.target_amount.toString().replace('.', '').replace(',', '.')) : null
         
         return old.map((a: any) => {
           if (a.id !== accountId) return a
           const vaults = a.account_vaults || []
           if (isEditing) {
             const updatedVaults = vaults.map((v: any) => v.id === initialData.id ? {
               ...v,
               name: payload.name,
               balance: parsedBal,
               target_amount: parsedTarget,
               icon: payload.icon,
               color: payload.color,
               include_in_dashboard: payload.include_in_dashboard === 'true',
               is_hidden: payload.is_hidden === 'true'
             } : v)
             return { ...a, account_vaults: updatedVaults }
           } else {
             const fakeVault = {
               id: newMutation.id,
               account_id: accountId,
               name: payload.name,
               balance: parsedBal,
               target_amount: parsedTarget,
               icon: payload.icon,
               color: payload.color,
               include_in_dashboard: payload.include_in_dashboard === 'true',
               is_hidden: payload.is_hidden === 'true'
             }
             return { ...a, account_vaults: [...vaults, fakeVault] }
           }
         })
       })
       
       if (onSuccess) onSuccess()
       setIsPendingLocal(false)
       return
    }

    try {
      const res = await actionToUse(null, formData)
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
           actionType: isEditing ? 'UPDATE_VAULT' : 'CREATE_VAULT',
           payload: { ...payload, id: initialData?.id }
        })
        toast.info('Falha na conexão. Cofrinho salvo offline e será sincronizado depois.')
        invalidateData()
        if (onSuccess) onSuccess()
      } else {
        setLocalError('Erro ao salvar cofrinho.')
      }
    }
    setIsPendingLocal(false)
  }

  return (
    <form action={customAction} className="flex flex-col gap-5">
      {initialData && <input type="hidden" name="id" value={initialData.id} />}
      <input type="hidden" name="account_id" value={accountId} />
      <input type="hidden" name="icon" value={selectedEmoji} />
      <input type="hidden" name="color" value={selectedColor} />
      <input type="hidden" name="include_in_dashboard" value={includeInDashboard ? 'true' : 'false'} />
      <input type="hidden" name="is_hidden" value={isHidden ? 'true' : 'false'} />
      
      {localError && (
        <div className="p-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl font-medium">
          {localError}
        </div>
      )}

      <div className="flex gap-4 items-end">
        <div className="relative">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Ícone</label>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-14 h-12 flex items-center justify-center text-2xl border border-slate-200 rounded-xl transition-colors shadow-sm"
            style={{ backgroundColor: `${selectedColor}15`, borderColor: `${selectedColor}30` }}
          >
            {selectedEmoji}
          </button>
          
          {showEmojiPicker && (
            <div className="absolute top-14 left-0 z-50 shadow-2xl">
              <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
              <div className="relative">
                <EmojiPicker 
                  onEmojiClick={(e) => {
                    setSelectedEmoji(e.emoji)
                    setShowEmojiPicker(false)
                  }}
                  searchDisabled
                  skinTonesDisabled
                  width={300}
                  height={400}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 group">
          <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="name">
            Nome do Cofrinho
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={initialData?.name}
            placeholder="Ex: Reserva de Emergência, Viagem..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200"
          />
        </div>
      </div>

      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-2">
          Cor
        </label>
        <div className="flex flex-wrap gap-2">
          {VAULT_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-full transition-transform ${selectedColor === color ? 'scale-110 ring-2 ring-offset-2 ring-slate-800' : 'hover:scale-110'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="balance">
          {initialData ? 'Saldo do Cofrinho' : 'Saldo Inicial'}
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
          <input
            id="balance"
            name="balance"
            type="text"
            inputMode="numeric"
            value={balance}
            onChange={handleBalanceChange}
            placeholder="0,00"
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 font-medium"
          />
        </div>
      </div>

      <div className="group">
        <label className="block text-sm font-bold text-slate-700 mb-1.5 transition-colors group-focus-within:text-emerald-600" htmlFor="target_amount">
          Meta (Opcional)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
          <input
            id="target_amount"
            name="target_amount"
            type="text"
            inputMode="numeric"
            value={target}
            onChange={handleTargetChange}
            placeholder="0,00"
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-200 font-medium"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 group">
        <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
          <input
            type="checkbox"
            checked={includeInDashboard}
            onChange={(e) => setIncludeInDashboard(e.target.checked)}
            className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-700">Incluir no Saldo Consolidado</span>
            <span className="text-xs text-slate-500">Se marcado, o saldo deste cofrinho será somado ao saldo total da conta no Dashboard.</span>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
          <input
            type="checkbox"
            checked={isHidden}
            onChange={(e) => setIsHidden(e.target.checked)}
            className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-700">Ocultar Saldo (Privacidade)</span>
            <span className="text-xs text-slate-500">Exige PIN para visualizar o saldo deste cofrinho.</span>
          </div>
        </label>
      </div>

      <motion.button
        whileHover={{ scale: 1.01, y: -1 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={pending}
        className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] disabled:opacity-70"
      >
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : (initialData ? 'Salvar Alterações' : 'Criar Cofrinho')}
      </motion.button>
    </form>
  )
}
