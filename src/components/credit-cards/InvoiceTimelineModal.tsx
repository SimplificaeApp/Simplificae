import { useState } from 'react'
import { ChevronDown, ChevronUp, ShoppingBag, ArrowRightLeft, CreditCard } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface InvoiceTimelineModalProps {
  card: any
}

export function InvoiceTimelineModal({ card }: InvoiceTimelineModalProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  if (!card || !card.calc) return null
  
  const { cycles, totals, txs } = card.calc

  const items = [
    {
      title: 'Fatura Anterior',
      total: totals.previous,
      status: totals.previous === 0 ? 'Paga' : 'Fechada',
      start: cycles.previous.start,
      end: cycles.previous.end,
      due: cycles.previous.dueDate,
      color: totals.previous === 0 ? 'text-emerald-500' : 'text-rose-500',
      bg: totals.previous === 0 ? 'bg-emerald-50' : 'bg-rose-50',
      transactions: txs.previous || []
    },
    {
      title: 'Fatura Atual',
      total: totals.current,
      status: 'Aberta',
      start: cycles.current.start,
      end: cycles.current.end,
      due: cycles.current.dueDate,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      transactions: txs.current || []
    },
    {
      title: 'Próxima Fatura',
      total: totals.next,
      status: 'Futura',
      start: cycles.next.start,
      end: cycles.next.end,
      due: cycles.next.dueDate,
      color: 'text-slate-500',
      bg: 'bg-slate-50',
      transactions: txs.next || []
    }
  ]

  const toggleExpand = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null)
    } else {
      setExpandedIndex(index)
    }
  }

  const getTxIcon = (tx: any) => {
    if (tx.type === 'transfer') return <ArrowRightLeft className="w-4 h-4" />
    if (tx.category?.icon) return <span className="text-sm">{tx.category.icon}</span>
    return <ShoppingBag className="w-4 h-4" />
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item, i) => {
        const isExpanded = expandedIndex === i
        return (
        <div key={i} className={`rounded-xl border border-slate-200 ${item.bg} overflow-hidden transition-all`}>
          <div 
            className="p-4 cursor-pointer hover:bg-black/5 transition-colors"
            onClick={() => toggleExpand(i)}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  {item.title}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </h4>
              <p className="text-xs text-slate-500 font-medium">Vence em {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(item.due)}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-md bg-white shadow-sm ${item.color}`}>
              {item.status}
            </span>
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 my-2">
            R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          
            <div className="text-xs text-slate-400 mt-2">
              Período: {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(item.start)} a {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(item.end)}
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-200/50 bg-white/50"
              >
                {item.transactions.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    Nenhum lançamento nesta fatura.
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-slate-100">
                    {item.transactions.map((tx: any) => (
                      <div key={tx.id} className="p-3 flex items-center justify-between">
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
                              {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(tx.date))}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )})}
    </div>
  )
}
