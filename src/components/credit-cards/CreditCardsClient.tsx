'use client'

import { useState } from 'react'
import { Plus, CreditCard, Settings, Receipt, PlusCircle, ArrowRightLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { Modal } from '@/components/ui/Modal'
import { CreditCardForm } from './CreditCardForm'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { PayInvoiceForm } from './PayInvoiceForm'
import { InvoiceTimelineModal } from './InvoiceTimelineModal'
import { calculateCardBalances } from '@/lib/creditCardUtils'

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
  
  const [editingCard, setEditingCard] = useState<any>(null)
  const [selectedCard, setSelectedCard] = useState<any>(null)

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
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${usedPercentage}%`, backgroundColor: usedPercentage > 90 ? '#ef4444' : usedPercentage > 75 ? '#f59e0b' : '#10b981' }}></div>
                </div>
              </div>
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
        <InvoiceTimelineModal card={selectedCard} />
      </Modal>
    </>
  )
}
