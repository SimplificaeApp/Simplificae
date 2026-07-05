'use client'

import { useState } from 'react'
import { Plus, CreditCard, Settings, Receipt, PlusCircle, ArrowRightLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { CreditCardForm } from './CreditCardForm'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { PayInvoiceForm } from './PayInvoiceForm'
import { InvoiceTimelineModal } from './InvoiceTimelineModal'
import { calculateCardBalances, getInvoiceForOffset } from '@/lib/creditCardUtils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useMemo } from 'react'

interface CreditCardsClientProps {
  workspaceId: string
  creditCards: any[]
  allAccounts: any[]
  categories: any[]
  transactions: any[]
}

export function CreditCardsClient({ workspaceId, creditCards, allAccounts, categories, transactions }: CreditCardsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isTransactionOpen, setIsTransactionOpen] = useState(false)
  const [isPayInvoiceOpen, setIsPayInvoiceOpen] = useState(false)
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)
  
  const [editingCard, setEditingCard] = useState<any>(null)
  const [selectedCard, setSelectedCard] = useState<any>(null)
  const [editingTx, setEditingTx] = useState<any>(null)
  const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false)
  const [barChartOffset, setBarChartOffset] = useState(0)
  const [chartDetailsModal, setChartDetailsModal] = useState<{ title: string, transactions: any[] } | null>(null)

  const barData = useMemo(() => {
    if (!creditCards.length) return []
    const data = []
    for (let i = barChartOffset - 5; i <= barChartOffset; i++) {
      let total = 0
      let monthLabel = ''
      const txsForMonth: any[] = []
      
      for (const card of creditCards) {
        const inv = getInvoiceForOffset(card, transactions, i)
        total += inv.total
        txsForMonth.push(...inv.transactions)
        
        if (!monthLabel) {
          const d = new Date()
          d.setMonth(d.getMonth() + i)
          monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d)
        }
      }
      data.push({
        name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        Total: total,
        transactions: txsForMonth
      })
    }
    return data
  }, [creditCards, transactions, barChartOffset])

  const donutData = useMemo(() => {
    if (!creditCards.length) return []
    const catMap = new Map<string, { name: string, value: number, color: string, transactions: any[] }>()
    for (const card of creditCards) {
      const inv = getInvoiceForOffset(card, transactions, 0)
      for (const tx of inv.transactions) {
        if (tx.type === 'expense' && tx.account_id === card.id) {
          const catName = tx.category?.name || 'Sem Categoria'
          const catColor = tx.category?.color || '#94a3b8'
          const existing = catMap.get(catName)
          if (existing) {
            existing.value += Number(tx.amount)
            existing.transactions.push(tx)
          } else {
            catMap.set(catName, { name: catName, value: Number(tx.amount), color: catColor, transactions: [tx] })
          }
        }
      }
    }
    return Array.from(catMap.values()).sort((a,b) => b.value - a.value).slice(0,5)
  }, [creditCards, transactions])

  const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 p-3 rounded-xl shadow-lg">
          <p className="text-sm font-bold text-slate-700 mb-1">{label}</p>
          <p className="text-sm font-black text-rose-600">
            {currencyFmt.format(payload[0].value)}
          </p>
        </div>
      )
    }
    return null
  }

  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 p-3 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}></div>
            <p className="text-sm font-bold text-slate-700">{data.name}</p>
          </div>
          <p className="text-sm font-black text-slate-900">
            {currencyFmt.format(data.value)}
          </p>
        </div>
      )
    }
    return null
  }

  const handleOpenNew = () => {
    setEditingCard(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (card: any) => {
    setEditingCard(card)
    setIsModalOpen(true)
  }

  const handleOpenDetails = (card: any) => {
    const calc = calculateCardBalances(card, transactions)
    setSelectedCard({ ...card, calc })
    setIsDetailsOpen(true)
  }

  const handleOpenTransaction = () => {
    setIsDetailsOpen(false)
    setIsTransactionOpen(true)
  }

  const handleOpenPayInvoice = () => {
    setIsDetailsOpen(false)
    setIsPayInvoiceOpen(true)
  }

  const handleOpenTimeline = () => {
    setIsDetailsOpen(false)
    setIsTimelineOpen(true)
  }

  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Meus Cartões</h1>
          <p className="text-slate-500">Gerencie seus cartões de crédito e faturas</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOpenNew}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Novo Cartão
        </motion.button>
      </div>

      {creditCards.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div {...fadeUp} className="glass-panel p-6 rounded-2xl flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">Evolução das Faturas</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setBarChartOffset(prev => prev - 1)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button 
                  onClick={() => setBarChartOffset(0)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors px-2"
                >
                  Hoje
                </button>
                <button 
                  onClick={() => setBarChartOffset(prev => prev + 1)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
            <div className="h-64 md:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={barData} 
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false}
                    width={35}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))} 
                  />
                  <RechartsTooltip 
                    content={<CustomBarTooltip />} 
                    cursor={{ fill: '#f1f5f9' }} 
                    wrapperStyle={{ 
                      pointerEvents: 'none', 
                      zIndex: 100,
                      visibility: chartDetailsModal ? 'hidden' : 'visible'
                    }} 
                  />
                  <Bar 
                    dataKey="Total" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={50} 
                    cursor="pointer"
                    onClick={(data: any) => {
                      const payload = data.payload || data
                      setChartDetailsModal({ title: `Faturas de ${payload.name}`, transactions: payload.transactions || [] })
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl flex flex-col">
            <h3 className="font-bold text-slate-800 mb-6">Gastos por Categoria (Fatura Atual)</h3>
            <div className="h-64 md:h-72 w-full">
              {donutData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      strokeWidth={0}
                      onClick={(_, index) => {
                        const payload = donutData[index]
                        if (payload) {
                          setChartDetailsModal({ title: `Gastos: ${payload.name}`, transactions: payload.transactions || [] })
                        }
                      }}
                    >
                      {donutData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} cursor="pointer" />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      content={<CustomDonutTooltip />} 
                      wrapperStyle={{ 
                        pointerEvents: 'none', 
                        zIndex: 100,
                        visibility: chartDetailsModal ? 'hidden' : 'visible'
                      }} 
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  Nenhum gasto na fatura atual.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {creditCards.length === 0 ? (
        <motion.div {...fadeUp} className="text-center py-20 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 mb-2 font-medium">Você ainda não tem nenhum cartão de crédito cadastrado.</p>
          <p className="text-sm text-slate-400">Clique no botão acima para adicionar seu primeiro cartão.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {creditCards.map(card => {
            const calc = calculateCardBalances(card, transactions)
            const limit = Number(card.credit_limit || 0)
            const usedPercentage = limit > 0 ? Math.min(100, (calc.totals.totalDebt / limit) * 100) : 0
            
            return (
            <motion.div 
              key={card.id} 
              {...fadeUp}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col group cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all relative"
              onClick={() => handleOpenDetails(card)}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); handleOpenEdit(card); }}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-6 pr-8">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                  style={{ backgroundColor: `${card.color}15`, border: `1px solid ${card.color}30` }}
                >
                  {card.icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-emerald-600 transition-colors">{card.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Vence dia {card.due_day || '--'} • Fecha dia {card.closing_day || '--'}
                  </p>
                </div>
              </div>
              
              <div className="mt-auto">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500 font-medium">Limite Utilizado</span>
                  <span className="font-bold text-slate-700">R$ {calc.totals.totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-slate-400 font-normal">/ R$ {limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-4">
                  <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${usedPercentage}%`, backgroundColor: usedPercentage > 90 ? '#ef4444' : usedPercentage > 75 ? '#f59e0b' : '#10b981' }}></div>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedCardId(expandedCardId === card.id ? null : card.id)
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                >
                  {expandedCardId === card.id ? 'Ocultar faturas' : 'Ver faturas'}
                  <motion.div animate={{ rotate: expandedCardId === card.id ? 180 : 0 }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </motion.div>
                </button>
              </div>

              {expandedCardId === card.id && (
                <div 
                  className="mt-4 pt-4 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <InvoiceTimelineModal 
                    card={{ ...card, calc }} 
                    transactions={transactions}
                    onEditTransaction={(tx) => {
                      setEditingTx(tx)
                      setIsEditTransactionOpen(true)
                    }}
                  />
                </div>
              )}
            </motion.div>
          )})}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCard ? 'Editar Cartão' : 'Novo Cartão'}
      >
        <CreditCardForm
          workspaceId={workspaceId}
          initialData={editingCard}
          onSuccess={() => setIsModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedCard ? `Opções: ${selectedCard.name}` : 'Detalhes do Cartão'}
      >
        {selectedCard && (
          <div className="flex flex-col gap-3">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-2">
              <p className="text-sm text-slate-500 font-medium mb-1">Fatura Atual (estimativa)</p>
              <h2 className="text-3xl font-black text-slate-800">R$ {selectedCard.calc?.totals.current.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</h2>
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>Limite: R$ {Number(selectedCard.credit_limit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span>Disponível: R$ {Math.max(0, Number(selectedCard.credit_limit || 0) - (selectedCard.calc?.totals.totalDebt || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button 
              onClick={handleOpenTransaction}
              className="w-full flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Adicionar Despesa</h4>
                <p className="text-xs text-slate-500">Lançar compra neste cartão</p>
              </div>
            </button>

            <button 
              onClick={handleOpenPayInvoice}
              className="w-full flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Pagar Fatura</h4>
                <p className="text-xs text-slate-500">Registrar pagamento da fatura</p>
              </div>
            </button>

            <button 
              onClick={handleOpenTimeline}
              className="w-full flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Ver Faturas</h4>
                <p className="text-xs text-slate-500">Histórico e faturas futuras</p>
              </div>
            </button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isTransactionOpen}
        onClose={() => setIsTransactionOpen(false)}
        title="Nova Despesa no Cartão"
      >
        <TransactionForm 
          workspaceId={workspaceId}
          categories={categories}
          accounts={allAccounts}
          onSuccess={() => setIsTransactionOpen(false)}
          defaultType="expense"
          defaultAccountId={selectedCard?.id}
          isCreditCard={true}
        />
      </Modal>

      <Modal
        isOpen={isPayInvoiceOpen}
        onClose={() => setIsPayInvoiceOpen(false)}
        title="Pagar Fatura"
      >
        <PayInvoiceForm
          workspaceId={workspaceId}
          card={selectedCard}
          accounts={allAccounts.filter(a => a.type !== 'credit_card')}
          onSuccess={() => setIsPayInvoiceOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        title={`Faturas: ${selectedCard?.name}`}
      >
        <InvoiceTimelineModal 
          card={selectedCard} 
          transactions={transactions}
          onEditTransaction={(tx) => {
            setEditingTx(tx)
            setIsEditTransactionOpen(true)
          }}
        />
      </Modal>

      <Modal
        isOpen={isEditTransactionOpen}
        onClose={() => setIsEditTransactionOpen(false)}
        title="Editar Despesa do Cartão"
      >
        <TransactionForm 
          workspaceId={workspaceId}
          categories={categories}
          accounts={allAccounts}
          onSuccess={() => setIsEditTransactionOpen(false)}
          isCreditCard={true}
          initialData={editingTx}
        />
      </Modal>

      <Modal
        isOpen={!!chartDetailsModal}
        onClose={() => setChartDetailsModal(null)}
        title={chartDetailsModal?.title || 'Detalhes'}
      >
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2 pb-2">
          {chartDetailsModal?.transactions.map(tx => (
            <div key={tx.id} className="flex justify-between items-center p-3 bg-white hover:bg-slate-50 transition-colors rounded-xl border border-slate-200 shadow-sm gap-2">
               <div className="flex items-center gap-3 min-w-0 flex-1">
                 <div 
                   className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0"
                   style={{ 
                     backgroundColor: `${tx.category?.color || '#94a3b8'}15`, 
                     border: `1px solid ${tx.category?.color || '#94a3b8'}30` 
                   }}
                 >
                   {tx.category?.icon || '🏷️'}
                 </div>
                 <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 text-sm truncate">{tx.description}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR')} 
                      {tx.category?.name ? ` • ${tx.category.name}` : ''}
                      {allAccounts.find(a => a.id === tx.account_id) ? ` • ${allAccounts.find(a => a.id === tx.account_id)?.name}` : ''}
                    </p>
                 </div>
               </div>
               <span className="font-bold text-slate-700 whitespace-nowrap ml-2 shrink-0">
                 R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
               </span>
            </div>
          ))}
          {chartDetailsModal?.transactions.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-4">Nenhuma transação encontrada.</p>
          )}
        </div>
      </Modal>
    </>
  )
}
