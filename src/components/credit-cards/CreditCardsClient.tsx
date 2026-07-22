'use client'

import { useState, useMemo } from 'react'
import { Plus, CreditCard, Settings, Receipt, PlusCircle, ArrowRightLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { CreditCardForm } from './CreditCardForm'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { PayInvoiceForm } from './PayInvoiceForm'
import { InvoiceTimelineModal } from './InvoiceTimelineModal'
import { calculateCardBalances, getInvoiceForOffset } from '@/lib/creditCardUtils'
import dynamic from 'next/dynamic'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false, loading: () => <div className="h-full w-full bg-slate-50 rounded-xl animate-pulse" /> })

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

  const [selectedCategoryCardId, setSelectedCategoryCardId] = useState<string>('all')

  const barData = useMemo(() => {
    if (!creditCards.length) return { months: [], seriesData: [] }
    
    const months: string[] = []
    const cardsMap: Record<string, { card: any; values: number[] }> = {}

    creditCards.forEach(c => {
      cardsMap[c.id] = { card: c, values: [] }
    })

    for (let i = barChartOffset - 5; i <= barChartOffset; i++) {
      let monthLabel = ''
      for (const card of creditCards) {
        const inv = getInvoiceForOffset(card, transactions, i)
        cardsMap[card.id].values.push(inv.total)

        if (!monthLabel) {
          const d = new Date()
          d.setMonth(d.getMonth() + i)
          monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d)
        }
      }
      months.push(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1))
    }

    const cardColors: Record<string, string> = {
      'nubank': '#820ad1',
      'picpay': '#10b981',
      'xp': '#eab308',
      'inter': '#f97316',
      'bradesco': '#dc2626',
      'itau': '#3b82f6'
    }
    const defaultPalette = ['#820ad1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6']

    const seriesData = creditCards.map((card, idx) => {
      const lowerName = card.name.toLowerCase()
      let color = card.color
      if (!color || color === '#000000' || color === '#000' || color === '#0f172a') {
        const found = Object.keys(cardColors).find(k => lowerName.includes(k))
        color = found ? cardColors[found] : defaultPalette[idx % defaultPalette.length]
      }

      return {
        name: card.name,
        type: 'bar',
        data: cardsMap[card.id].values,
        itemStyle: {
          color,
          borderRadius: [6, 6, 0, 0]
        },
        barMaxWidth: 32
      }
    })

    return { months, seriesData }
  }, [creditCards, transactions, barChartOffset])

  const donutData = useMemo(() => {
    if (!creditCards.length) return []
    const catMap = new Map<string, { name: string, value: number, color: string, icon: string, transactions: any[] }>()

    const targetCards = selectedCategoryCardId === 'all'
      ? creditCards
      : creditCards.filter(c => c.id === selectedCategoryCardId)

    for (const card of targetCards) {
      const inv = getInvoiceForOffset(card, transactions, 0)
      for (const tx of inv.transactions) {
        if (tx.type === 'expense' && tx.account_id === card.id) {
          const catName = tx.category?.name || 'Sem Categoria'
          const catColor = tx.category?.color || '#94a3b8'
          const catIcon = tx.category?.icon || '📦'
          const existing = catMap.get(catName)
          if (existing) {
            existing.value += Number(tx.amount)
            existing.transactions.push(tx)
          } else {
            catMap.set(catName, { name: catName, value: Number(tx.amount), color: catColor, icon: catIcon, transactions: [tx] })
          }
        }
      }
    }
    return Array.from(catMap.values()).sort((a, b) => b.value - a.value)
  }, [creditCards, transactions, selectedCategoryCardId])

  const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  const barChartOption = useMemo(() => ({
    grid: { top: 36, right: 16, bottom: 24, left: 0, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      borderRadius: 12,
      padding: [10, 14],
      textStyle: { color: '#334155', fontSize: 12, fontFamily: 'inherit' },
      extraCssText: 'z-index: 40;'
    },
    legend: {
      show: true,
      top: 0,
      icon: 'circle',
      textStyle: { color: '#64748b', fontSize: 11, fontWeight: 'bold' }
    },
    xAxis: { type: 'category', data: barData.months, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'inherit' }, splitLine: { show: false } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'inherit', formatter: (v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v) }, splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } } },
    series: barData.seriesData
  }), [barData])

  const donutChartOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      borderRadius: 12,
      padding: [10, 14],
      textStyle: { color: '#334155', fontSize: 12, fontFamily: 'inherit' },
      extraCssText: 'z-index: 40;',
      formatter: (p: any) => {
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="width:10px;height:10px;border-radius:50%;background:${p.color};display:inline-block"></span><span style="font-weight:700;color:#334155">${p.data.icon || ''} ${p.name}</span></div>` +
          `<div style="font-size:15px;font-weight:900;color:#0f172a">${p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>` +
          `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${p.percent.toFixed(1)}% do total</div>`
      }
    },
    series: [{
      type: 'pie', radius: ['48%', '75%'], center: ['50%', '44%'],
      padAngle: 3, itemStyle: { borderRadius: 6 },
      label: {
        show: true,
        position: 'inside',
        formatter: (params: any) => (params.percent >= 5 ? params.data.icon : ''),
        fontSize: 14
      },
      emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 16, shadowOffsetY: 6, shadowColor: 'rgba(0,0,0,0.15)' } },
      data: donutData.map((d: any) => ({ name: d.name, value: d.value, icon: d.icon, itemStyle: { color: d.color } })),
      animationType: 'expansion', animationDuration: 1000, animationEasing: 'cubicOut'
    }]
  }), [donutData])

  const handleOpenNew = () => {
    setEditingCard(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (card: any) => {
    setEditingCard(card)
    setIsModalOpen(true)
  }

  const handleOpenDetails = (card: any) => {
    setSelectedCard(card)
    setIsDetailsOpen(true)
  }

  const handleOpenTransaction = (card: any) => {
    setSelectedCard(card)
    setIsTransactionOpen(true)
  }

  const handleOpenPayInvoice = (card: any) => {
    setSelectedCard(card)
    setIsPayInvoiceOpen(true)
  }

  const handleOpenTimeline = () => {
    setIsDetailsOpen(false)
    setIsTimelineOpen(true)
  }

  const fadeUp = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Meus Cartões</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie seus cartões de crédito e faturas</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
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
              <ReactECharts 
                option={barChartOption} 
                style={{ height: '100%', width: '100%' }}
              />
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
              <h3 className="font-bold text-slate-800">Gastos por Categoria (Fatura Atual)</h3>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setSelectedCategoryCardId('all')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    selectedCategoryCardId === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Todos
                </button>
                {creditCards.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategoryCardId(c.id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      selectedCategoryCardId === c.id ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full">
              {donutData.length > 0 ? (
                <>
                  <div className="h-56 md:h-64 w-full">
                    <ReactECharts 
                      option={donutChartOption} 
                      style={{ height: '100%', width: '100%' }}
                      onEvents={{
                        click: (params: any) => {
                          const entry = donutData.find((d: any) => d.name === params.name)
                          if (entry) setChartDetailsModal({ title: `Gastos: ${entry.name}`, transactions: entry.transactions || [] })
                        }
                      }}
                    />
                  </div>

                  {/* Legenda de Categorias Detalhada */}
                  <div className="mt-2 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {donutData.map(cat => {
                      const totalVal = donutData.reduce((acc, c) => acc + c.value, 0)
                      const pct = totalVal > 0 ? ((cat.value / totalVal) * 100).toFixed(1) : '0'
                      return (
                        <div 
                          key={cat.name} 
                          onClick={() => setChartDetailsModal({ title: `Gastos: ${cat.name}`, transactions: cat.transactions })}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 cursor-pointer transition-all border border-slate-100/80"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="text-xs shrink-0">{cat.icon}</span>
                            <span className="text-xs font-bold text-slate-700 truncate">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-black text-slate-900 tabular-nums">{currencyFmt.format(cat.value)}</span>
                            <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-md border border-slate-200">{pct}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-sm">
                  <span>Nenhum gasto na fatura atual</span>
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
            <div key={tx.id} className="flex flex-wrap justify-between items-center p-3 bg-white hover:bg-slate-50 transition-colors rounded-xl border border-slate-200 shadow-sm gap-2">
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
