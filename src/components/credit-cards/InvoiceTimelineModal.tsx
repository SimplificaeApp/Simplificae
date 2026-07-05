import { useState } from 'react'
import { ChevronLeft, ChevronRight, ShoppingBag, ArrowRightLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getInvoiceForOffset } from '@/lib/creditCardUtils'

interface InvoiceTimelineModalProps {
  card: any
  transactions: any[]
  onEditTransaction?: (tx: any) => void
}

export function InvoiceTimelineModal({ card, transactions, onEditTransaction }: InvoiceTimelineModalProps) {
  const [offsetMonth, setOffsetMonth] = useState(0) 

  if (!card) return null
  
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOffsetMonth(offsetMonth - 1)
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOffsetMonth(offsetMonth + 1)
  }

  const item = getInvoiceForOffset(card, transactions || [], offsetMonth)

  const getTxIcon = (tx: any) => {
    if (tx.type === 'transfer') return <ArrowRightLeft className="w-4 h-4" />
    if (tx.category?.icon) return <span className="text-sm">{tx.category.icon}</span>
    return <ShoppingBag className="w-4 h-4" />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-xl border border-slate-200 ${item.bg} overflow-hidden transition-all relative`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <button 
              onClick={handlePrev} 
              className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-500" />
            </button>
            
            <div className="text-center flex-1">
              <h4 className="font-bold text-slate-800">{item.title}</h4>
              <p className="text-xs text-slate-500 font-medium">Vence em {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(item.due)}</p>
            </div>
            
            <button 
              onClick={handleNext}
              className="p-1.5 rounded-full hover:bg-black/5 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          
          <div className="text-center my-4">
            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md bg-white shadow-sm ${item.color} mb-2 inline-block`}>
              {item.status}
            </span>
            <h2 className="text-3xl font-black text-slate-800">
              R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
            <div className="text-xs text-slate-400 mt-2">
              Período: {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(item.start)} a {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(item.end)}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/50 bg-white/50 min-h-[150px]">
          {item.transactions.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              Nenhum lançamento nesta fatura.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {item.transactions.map((tx: any) => (
                <div 
                  key={tx.id} 
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onEditTransaction) onEditTransaction(tx)
                  }}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: tx.type === 'transfer' ? '#10b981' : (tx.category?.color || '#94a3b8') }}
                    >
                      {getTxIcon(tx)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{tx.description}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(tx.date + 'T12:00:00'))}
                        {tx.type === 'transfer' && ' • Pagamento'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${tx.type === 'transfer' ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {tx.type === 'transfer' ? '+' : '-'} R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
