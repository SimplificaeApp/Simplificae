'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  BarChart3, PieChart as PieChartIcon, DollarSign, Filter
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts'

type Transaction = {
  id: string
  description: string
  amount: number
  type: string
  date: string
  category_id?: string
  account_id?: string
  ignore_in_cashflow?: boolean
  category?: { id: string; name: string; icon?: string; color?: string } | null
}
type Category = { id: string; name: string; type: string; icon?: string; color?: string }
type Account = { id: string; name: string; icon?: string; color?: string }

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  
  const inc = payload.find((p: any) => p.dataKey === 'Receitas')?.value || 0
  const exp = payload.find((p: any) => p.dataKey === 'Despesas')?.value || 0
  const margin = inc > 0 ? ((inc - exp) / inc) * 100 : 0
  const result = inc - exp

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-3 shadow-xl min-w-[160px]">
      <p className="text-xs font-bold text-slate-500 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between items-center mb-1 gap-4">
          <span className="text-xs font-medium text-slate-600">{p.name}</span>
          <span className="text-sm font-bold" style={{ color: p.color }}>
            {currencyFmt.format(p.value)}
          </span>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center gap-4">
        <span className="text-xs font-medium text-slate-500">Resultado</span>
        <span className={`text-sm font-black ${result >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {result >= 0 ? '+' : ''}{currencyFmt.format(result)}
        </span>
      </div>
      <div className="flex justify-between items-center gap-4 mt-1">
        <span className="text-xs font-medium text-slate-500">Margem</span>
        <span className={`text-xs font-bold ${margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {margin.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

export function ReportsClient({
  transactions,
  categories,
  accounts,
}: {
  transactions: Transaction[]
  categories: Category[]
  accounts: Account[]
}) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1) }
    else setSelectedMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1) }
    else setSelectedMonth(m => m + 1)
  }

  // Filter transactions
  const filteredTx = useMemo(() => {
    return transactions.filter(t => {
      if (selectedAccount !== 'all' && t.account_id !== selectedAccount) return false
      if (selectedCategory !== 'all' && t.category_id !== selectedCategory) return false
      if (t.ignore_in_cashflow) return false
      return true
    })
  }, [transactions, selectedAccount, selectedCategory])

  // Monthly transactions for DRE
  const monthlyTx = useMemo(() => {
    return filteredTx.filter(t => {
      const d = new Date(t.date + 'T12:00:00')
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    })
  }, [filteredTx, selectedMonth, selectedYear])

  // DRE breakdown
  const dre = useMemo(() => {
    const incomes = monthlyTx.filter(t => t.type === 'income')
    const expenses = monthlyTx.filter(t => t.type === 'expense')
    const totalIncome = incomes.reduce((a, t) => a + Number(t.amount), 0)
    const totalExpense = expenses.reduce((a, t) => a + Number(t.amount), 0)

    // Group expenses by category
    const catBreakdown = new Map<string, { name: string; icon: string; color: string; total: number }>()
    expenses.forEach(t => {
      const key = t.category?.name || 'Sem Categoria'
      const existing = catBreakdown.get(key)
      if (existing) {
        existing.total += Number(t.amount)
      } else {
        catBreakdown.set(key, {
          name: key,
          icon: t.category?.icon || '🏷️',
          color: t.category?.color || '#64748b',
          total: Number(t.amount),
        })
      }
    })

    // Group incomes by category
    const incBreakdown = new Map<string, { name: string; icon: string; color: string; total: number }>()
    incomes.forEach(t => {
      const key = t.category?.name || 'Sem Categoria'
      const existing = incBreakdown.get(key)
      if (existing) {
        existing.total += Number(t.amount)
      } else {
        incBreakdown.set(key, {
          name: key,
          icon: t.category?.icon || '💰',
          color: t.category?.color || '#10b981',
          total: Number(t.amount),
        })
      }
    })

    return {
      totalIncome,
      totalExpense,
      result: totalIncome - totalExpense,
      expensesByCategory: Array.from(catBreakdown.values()).sort((a, b) => b.total - a.total),
      incomesByCategory: Array.from(incBreakdown.values()).sort((a, b) => b.total - a.total),
    }
  }, [monthlyTx])

  // 6-month evolution bar chart
  const evolutionData = useMemo(() => {
    const data: { month: string; Receitas: number; Despesas: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const monthTx = filteredTx.filter(t => {
        const td = new Date(t.date + 'T12:00:00')
        return td.getMonth() === m && td.getFullYear() === y
      })
      data.push({
        month: `${MONTHS_SHORT[m]}/${String(y).slice(2)}`,
        Receitas: monthTx.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0),
        Despesas: monthTx.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0),
      })
    }
    return data
  }, [filteredTx, selectedMonth, selectedYear])

  const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-500 mt-1">Analise sua saúde financeira com visões detalhadas.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">Todas as Contas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Month Navigator */}
      <div className="glass-panel rounded-2xl p-4 mb-6 flex items-center justify-center gap-3">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="text-center min-w-[180px]">
          <span className="text-lg font-bold text-slate-800">{MONTHS[selectedMonth]}</span>{' '}
          <span className="text-lg text-slate-500">{selectedYear}</span>
        </div>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* DRE Summary Cards */}
      <motion.div {...fadeUp} transition={{ duration: 0.3 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold text-slate-500">(+) Receitas</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 tabular-nums">{currencyFmt.format(dre.totalIncome)}</div>
        </div>
        <div className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <span className="text-sm font-semibold text-slate-500">(-) Despesas</span>
          </div>
          <div className="text-2xl font-black text-rose-600 tabular-nums">{currencyFmt.format(dre.totalExpense)}</div>
        </div>
        <div className={`glass-panel rounded-2xl p-5 ${dre.result >= 0 ? 'ring-1 ring-emerald-200' : 'ring-1 ring-rose-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dre.result >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <DollarSign className={`w-4 h-4 ${dre.result >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
            </div>
            <span className="text-sm font-semibold text-slate-500">(=) Resultado</span>
          </div>
          <div className={`text-2xl font-black tabular-nums ${dre.result >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {currencyFmt.format(dre.result)}
          </div>
        </div>
      </motion.div>

      {/* Evolution Bar Chart */}
      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.1 }} className="glass-panel rounded-2xl p-5 md:p-6 mb-8">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-400" />
          Evolução Mensal (6 meses)
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evolutionData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" iconSize={8} />
              <Bar dataKey="Receitas" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Bar dataKey="Despesas" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* DRE Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Expenses by Category */}
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.15 }} className="glass-panel rounded-2xl p-5 md:p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Despesas por Categoria
          </h3>
          {dre.expensesByCategory.length > 0 ? (
            <div className="flex flex-col gap-3">
              {dre.expensesByCategory.map((cat, i) => {
                const pct = dre.totalExpense > 0 ? (cat.total / dre.totalExpense) * 100 : 0
                return (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-slate-700 truncate">{cat.name}</span>
                        <span className="text-sm font-bold text-slate-800 tabular-nums ml-2">{currencyFmt.format(cat.total)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma despesa registrada.</p>
          )}
        </motion.div>

        {/* Incomes by Category */}
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.2 }} className="glass-panel rounded-2xl p-5 md:p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Receitas por Categoria
          </h3>
          {dre.incomesByCategory.length > 0 ? (
            <div className="flex flex-col gap-3">
              {dre.incomesByCategory.map((cat, i) => {
                const pct = dre.totalIncome > 0 ? (cat.total / dre.totalIncome) * 100 : 0
                return (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="text-lg w-8 text-center">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-slate-700 truncate">{cat.name}</span>
                        <span className="text-sm font-bold text-slate-800 tabular-nums ml-2">{currencyFmt.format(cat.total)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400 w-10 text-right">{pct.toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma receita registrada.</p>
          )}
        </motion.div>
      </div>
    </>
  )
}
