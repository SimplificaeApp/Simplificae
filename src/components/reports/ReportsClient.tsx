'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  DollarSign, X, BarChart3, Receipt, ArrowUpDown
} from 'lucide-react'
import dynamic from 'next/dynamic'

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-50 rounded-xl animate-pulse" />,
})

type Transaction = {
  id: string
  description: string
  amount: number
  type: string
  date: string
  status?: string
  category_id?: string
  account_id?: string
  destination_account_id?: string
  ignore_in_cashflow?: boolean
  category?: { id: string; name: string; icon?: string; color?: string } | null
}
type Category = { id: string; name: string; type: string; icon?: string; color?: string }
type Account = {
  id: string
  name: string
  icon: string
  color: string
  type: string
  initial_balance: number
}

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const CHART_COLORS = [
  '#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444', '#64748b',
  '#06b6d4', '#84cc16', '#a855f7', '#f97316', '#0ea5e9',
]

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
  const [drillDown, setDrillDown] = useState<{
    title: string
    transactions: Transaction[]
    type: 'expense' | 'income'
    total: number
  } | null>(null)
  const [canClose, setCanClose] = useState(false)

  useEffect(() => {
    if (drillDown) {
      const timer = setTimeout(() => setCanClose(true), 400)
      return () => { clearTimeout(timer); setCanClose(false) }
    } else {
      setCanClose(false)
    }
  }, [drillDown])

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1) }
    else setSelectedMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1) }
    else setSelectedMonth(m => m + 1)
  }

  const filteredTx = useMemo(() => {
    return transactions.filter(t => {
      if (t.status === 'pending') return false // Lançamentos futuros não entram no relatório
      if (t.status !== 'posted' && t.status !== 'paid_planned') return false
      if (selectedAccount !== 'all' && t.account_id !== selectedAccount) return false
      if (selectedCategory !== 'all' && t.category_id !== selectedCategory) return false
      if (t.ignore_in_cashflow) return false
      
      // Matches Dashboard: O pagamento da fatura (transferência) entra, despesas do cartão em si saem
      const account = accounts.find(a => a.id === t.account_id)
      if (account?.type === 'credit_card') return false
      
      return true
    })
  }, [transactions, selectedAccount, selectedCategory])

  const monthlyTx = useMemo(() => {
    return filteredTx.filter(t => {
      const d = new Date(t.date + 'T12:00:00')
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
    })
  }, [filteredTx, selectedMonth, selectedYear])

  const dre = useMemo(() => {
    const incomes = monthlyTx.filter(t => t.type === 'income')
    const expenses = monthlyTx.filter(t => {
      if (t.type === "expense") return true;
      if (t.type === "transfer") {
        const destAcc = accounts.find(a => a.id === t.destination_account_id);
        if (destAcc?.type === 'credit_card') return true;
      }
      return false;
    })
    const totalIncome = incomes.reduce((a, t) => a + Number(t.amount), 0)
    const totalExpense = expenses.reduce((a, t) => a + Number(t.amount), 0)

    const catBreakdown = new Map<string, { name: string; icon: string; color: string; total: number; transactions: Transaction[] }>()
    expenses.forEach(t => {
      const key = t.category?.name || 'Sem Categoria'
      const existing = catBreakdown.get(key)
      if (existing) {
        existing.total += Number(t.amount)
        existing.transactions.push(t)
      } else {
        catBreakdown.set(key, {
          name: key, icon: t.category?.icon || '🏷️', color: t.category?.color || '#64748b',
          total: Number(t.amount), transactions: [t],
        })
      }
    })

    const incBreakdown = new Map<string, { name: string; icon: string; color: string; total: number; transactions: Transaction[] }>()
    incomes.forEach(t => {
      const key = t.category?.name || 'Sem Categoria'
      const existing = incBreakdown.get(key)
      if (existing) {
        existing.total += Number(t.amount)
        existing.transactions.push(t)
      } else {
        incBreakdown.set(key, {
          name: key, icon: t.category?.icon || '💰', color: t.category?.color || '#10b981',
          total: Number(t.amount), transactions: [t],
        })
      }
    })

    return {
      totalIncome, totalExpense,
      result: totalIncome - totalExpense,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
      expensesByCategory: Array.from(catBreakdown.values()).sort((a, b) => b.total - a.total),
      incomesByCategory: Array.from(incBreakdown.values()).sort((a, b) => b.total - a.total),
    }
  }, [monthlyTx])

  // 12-month evolution
  const evolutionData = useMemo(() => {
    const months: string[] = []
    const incomes: number[] = []
    const expenses: number[] = []
    const results: number[] = []

    for (let i = 11; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const monthTx = filteredTx.filter(t => {
        const td = new Date(t.date + 'T12:00:00')
        return td.getMonth() === m && td.getFullYear() === y
      })
      const inc = monthTx.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount), 0)
      const exp = monthTx.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount), 0)
      months.push(`${MONTHS_SHORT[m]}/${String(y).slice(2)}`)
      incomes.push(inc)
      expenses.push(exp)
      results.push(inc - exp)
    }
    return { months, incomes, expenses, results }
  }, [filteredTx, selectedMonth, selectedYear])

  const evolutionOption = useMemo(() => ({
    grid: { top: 20, right: 20, bottom: 48, left: 0, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12, padding: [10, 14],
      textStyle: { color: '#334155', fontSize: 12, fontFamily: 'inherit' },
      extraCssText: 'z-index: 40;',
      formatter: (params: any[]) => {
        const inc = params.find((p: any) => p.seriesName === 'Receitas')?.value || 0
        const exp = params.find((p: any) => p.seriesName === 'Despesas')?.value || 0
        const res = inc - exp
        const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        const margin = inc > 0 ? ((inc - exp) / inc * 100).toFixed(1) : '0.0'
        return `<div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px">${params[0].axisValue}</div>` +
          `<div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:3px"><span>Receitas</span><span style="color:#10b981;font-weight:800">${fmt(inc)}</span></div>` +
          `<div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:3px"><span>Despesas</span><span style="color:#f43f5e;font-weight:800">${fmt(exp)}</span></div>` +
          `<div style="border-top:1px solid #f1f5f9;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;gap:20px;margin-bottom:3px"><span>Resultado</span><span style="color:${res >= 0 ? '#10b981' : '#f43f5e'};font-weight:900">${res >= 0 ? '+' : ''}${fmt(res)}</span></div>` +
          `<div style="display:flex;justify-content:space-between;gap:20px"><span>Margem</span><span style="color:#6366f1;font-weight:700">${margin}%</span></div>`
      }
    },
    legend: { bottom: 4, textStyle: { color: '#64748b', fontSize: 11, fontFamily: 'inherit' }, icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 20 },
    xAxis: {
      type: 'category', data: evolutionData.months,
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'inherit' },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value', axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'inherit', formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v) },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
    },
    series: [
      {
        name: 'Receitas', type: 'bar',
        data: evolutionData.incomes,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#34d399' }] }, borderRadius: [5, 5, 0, 0] },
        barMaxWidth: 28, animationDuration: 1000, animationEasing: 'elasticOut'
      },
      {
        name: 'Despesas', type: 'bar',
        data: evolutionData.expenses,
        itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#f43f5e' }, { offset: 1, color: '#fb7185' }] }, borderRadius: [5, 5, 0, 0] },
        barMaxWidth: 28, animationDuration: 1200, animationEasing: 'elasticOut'
      },
      {
        name: 'Resultado', type: 'line',
        data: evolutionData.results,
        smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { color: '#6366f1', width: 2.5 },
        itemStyle: { color: '#6366f1', borderWidth: 2, borderColor: '#fff' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(99,102,241,0.15)' }, { offset: 1, color: 'rgba(99,102,241,0)' }] } },
        animationDuration: 1400, animationEasing: 'cubicOut'
      }
    ]
  }), [evolutionData])

  // Donut Despesas option
  const donutExpenseOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12, padding: [10, 14],
      textStyle: { color: '#334155', fontSize: 12, fontFamily: 'inherit' },
      extraCssText: 'z-index: 40;',
      formatter: (p: any) => {
        const cat = dre.expensesByCategory.find(c => c.name === p.name)
        const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:18px">${cat?.icon || '🏷️'}</span><span style="font-weight:700">${p.name}</span></div>` +
          `<div style="font-size:16px;font-weight:900;color:#0f172a;margin-bottom:4px">${fmt(p.value)}</div>` +
          `<div style="font-size:11px;color:#94a3b8">${p.percent.toFixed(1)}% das despesas</div>` +
          `<div style="font-size:10px;color:#6366f1;margin-top:6px;font-weight:600">Clique para ver detalhes →</div>`
      }
    },
    legend: { type: 'scroll', orient: 'horizontal', bottom: 0, textStyle: { color: '#64748b', fontSize: 11, fontFamily: 'inherit' }, icon: 'circle', itemWidth: 8, itemHeight: 8 },
    series: [{
      type: 'pie', radius: ['46%', '70%'], center: ['50%', '42%'],
      padAngle: 4, itemStyle: { borderRadius: 6 }, label: { show: false },
      emphasis: { scale: true, scaleSize: 10, itemStyle: { shadowBlur: 20, shadowOffsetY: 8, shadowColor: 'rgba(0,0,0,0.18)' } },
      data: dre.expensesByCategory.map((d, i) => ({ name: d.name, value: d.total, itemStyle: { color: d.color || CHART_COLORS[i % CHART_COLORS.length] } })),
      animationType: 'expansion', animationDuration: 1000, animationEasing: 'cubicOut'
    }]
  }), [dre.expensesByCategory])

  // Donut Receitas option
  const donutIncomeOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12, padding: [10, 14],
      textStyle: { color: '#334155', fontSize: 12, fontFamily: 'inherit' },
      extraCssText: 'z-index: 40;',
      formatter: (p: any) => {
        const cat = dre.incomesByCategory.find(c => c.name === p.name)
        const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:18px">${cat?.icon || '💰'}</span><span style="font-weight:700">${p.name}</span></div>` +
          `<div style="font-size:16px;font-weight:900;color:#0f172a;margin-bottom:4px">${fmt(p.value)}</div>` +
          `<div style="font-size:11px;color:#94a3b8">${p.percent.toFixed(1)}% das receitas</div>` +
          `<div style="font-size:10px;color:#6366f1;margin-top:6px;font-weight:600">Clique para ver detalhes →</div>`
      }
    },
    legend: { type: 'scroll', orient: 'horizontal', bottom: 0, textStyle: { color: '#64748b', fontSize: 11, fontFamily: 'inherit' }, icon: 'circle', itemWidth: 8, itemHeight: 8 },
    series: [{
      type: 'pie', radius: ['46%', '70%'], center: ['50%', '42%'],
      padAngle: 4, itemStyle: { borderRadius: 6 }, label: { show: false },
      emphasis: { scale: true, scaleSize: 10, itemStyle: { shadowBlur: 20, shadowOffsetY: 8, shadowColor: 'rgba(0,0,0,0.18)' } },
      data: dre.incomesByCategory.map((d, i) => ({ name: d.name, value: d.total, itemStyle: { color: d.color || CHART_COLORS[i % CHART_COLORS.length] } })),
      animationType: 'expansion', animationDuration: 1000, animationEasing: 'cubicOut'
    }]
  }), [dre.incomesByCategory])

  // Ranking horizontal bar option
  const rankingOption = useMemo(() => {
    const data = [...dre.expensesByCategory].slice(0, 8).reverse()
    return {
      grid: { top: 8, right: 90, bottom: 8, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'none' },
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 12, padding: [10, 14],
        textStyle: { color: '#334155', fontSize: 12, fontFamily: 'inherit' },
        formatter: (params: any[]) => {
          const cat = data.find(d => d.name === params[0].name)
          const pct = dre.totalExpense > 0 ? (params[0].value / dre.totalExpense * 100).toFixed(1) : '0'
          const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span style="font-size:16px">${cat?.icon || '🏷️'}</span><span style="font-weight:700">${params[0].name}</span></div>` +
            `<div style="font-size:15px;font-weight:900;color:#0f172a;margin-bottom:2px">${fmt(params[0].value)}</div>` +
            `<div style="font-size:10px;color:#94a3b8">${pct}% do total de despesas</div>`
        }
      },
      xAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 10, fontFamily: 'inherit', formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v) }, splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } } },
      yAxis: { type: 'category', data: data.map(d => d.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#475569', fontSize: 12, fontFamily: 'inherit' } },
      series: [{
        type: 'bar',
        data: data.map((d, i) => ({
          value: d.total,
          itemStyle: { color: d.color || CHART_COLORS[i % CHART_COLORS.length], borderRadius: [0, 6, 6, 0], opacity: 0.9 },
          label: {
            show: true, position: 'right',
            formatter: (p: any) => p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            color: '#475569', fontSize: 11, fontWeight: 700, fontFamily: 'inherit'
          }
        })),
        barMaxWidth: 22,
        emphasis: { itemStyle: { opacity: 1 } },
        animationDuration: 1000, animationEasing: 'cubicOut'
      }]
    }
  }, [dre.expensesByCategory, dre.totalExpense])

  const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-500 mt-1">Análise profunda da sua saúde financeira.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
          >
            <option value="all">Todas as Contas</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
          >
            <option value="all">Todas as Categorias</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Month Navigator */}
      <div className="glass-panel rounded-2xl p-4 mb-6 flex items-center justify-center gap-3">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="text-center min-w-[200px]">
          <span className="text-lg font-black text-slate-800">{MONTHS[selectedMonth]}</span>{' '}
          <span className="text-lg text-slate-400 font-medium">{selectedYear}</span>
        </div>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* KPI Cards */}
      <motion.div {...fadeUp} transition={{ duration: 0.3 }} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border-t-2 border-emerald-400">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">Receitas</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 tabular-nums truncate">{currencyFmt.format(dre.totalIncome)}</div>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">{dre.incomesByCategory.length} fonte{dre.incomesByCategory.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-5 border-t-2 border-rose-400">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">Despesas</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600 tabular-nums truncate">{currencyFmt.format(dre.totalExpense)}</div>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">{dre.expensesByCategory.length} categoria{dre.expensesByCategory.length !== 1 ? 's' : ''}</p>
        </div>

        <div className={`glass-panel rounded-2xl p-4 sm:p-5 border-t-2 ${dre.result >= 0 ? 'border-emerald-400' : 'border-rose-400'}`}>
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${dre.result >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <DollarSign className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${dre.result >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">Resultado</span>
          </div>
          <div className={`text-lg sm:text-xl font-black tabular-nums truncate ${dre.result >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {dre.result >= 0 ? '+' : ''}{currencyFmt.format(dre.result)}
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1">{monthlyTx.length} transações</p>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-5 border-t-2 border-indigo-400">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">Poupança</span>
          </div>
          <div className={`text-lg sm:text-xl font-black tabular-nums truncate ${dre.savingsRate >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            {dre.savingsRate.toFixed(1)}%
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">
            {dre.savingsRate >= 20 ? '✅ Excelente' : dre.savingsRate >= 10 ? '⚠️ Moderado' : dre.savingsRate >= 0 ? '⚠️ Baixo' : '🚨 Negativo'}
          </p>
        </div>
      </motion.div>

      {/* Evolution Chart */}
      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.1 }} className="glass-panel rounded-2xl p-5 md:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            Evolução Mensal <span className="text-slate-400 font-medium text-sm">(12 meses)</span>
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Receitas</span>
            <span className="flex items-center gap-1.5 text-rose-500 font-semibold"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />Despesas</span>
            <span className="flex items-center gap-1.5 text-indigo-600 font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />Resultado</span>
          </div>
        </div>
        <div className="h-72 md:h-80">
          <ReactECharts option={evolutionOption} style={{ height: '100%', width: '100%' }} />
        </div>
      </motion.div>

      {/* Donuts + Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        {/* Donut Despesas */}
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.15 }} className="glass-panel rounded-2xl p-5 md:p-6">
          <h3 className="font-bold text-slate-800 mb-0.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />Despesas por Categoria
          </h3>
          <p className="text-xs text-slate-400 mb-3">Clique para ver transações</p>
          {dre.expensesByCategory.length > 0 ? (
            <div className="h-60 md:h-64">
              <ReactECharts
                option={donutExpenseOption}
                style={{ height: '100%', width: '100%' }}
                onEvents={{
                  click: (params: any) => {
                    if (params.event && params.event.event) {
                      params.event.event.stopPropagation();
                    }
                    const cat = dre.expensesByCategory.find(c => c.name === params.name)
                    if (cat) setDrillDown({ title: `${cat.icon} ${cat.name}`, transactions: cat.transactions, type: 'expense', total: cat.total })
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center gap-2">
              <Receipt className="w-10 h-10 text-slate-200" />
              <p className="text-sm text-slate-400">Nenhuma despesa registrada</p>
            </div>
          )}
        </motion.div>

        {/* Donut Receitas */}
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.18 }} className="glass-panel rounded-2xl p-5 md:p-6">
          <h3 className="font-bold text-slate-800 mb-0.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />Receitas por Categoria
          </h3>
          <p className="text-xs text-slate-400 mb-3">Clique para ver transações</p>
          {dre.incomesByCategory.length > 0 ? (
            <div className="h-60 md:h-64">
              <ReactECharts
                option={donutIncomeOption}
                style={{ height: '100%', width: '100%' }}
                onEvents={{
                  click: (params: any) => {
                    if (params.event && params.event.event) {
                      params.event.event.stopPropagation();
                    }
                    const cat = dre.incomesByCategory.find(c => c.name === params.name)
                    if (cat) setDrillDown({ title: `${cat.icon} ${cat.name}`, transactions: cat.transactions, type: 'income', total: cat.total })
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center gap-2">
              <Receipt className="w-10 h-10 text-slate-200" />
              <p className="text-sm text-slate-400">Nenhuma receita registrada</p>
            </div>
          )}
        </motion.div>

        {/* Ranking */}
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.21 }} className="glass-panel rounded-2xl p-5 md:p-6">
          <h3 className="font-bold text-slate-800 mb-0.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />Ranking de Gastos
          </h3>
          <p className="text-xs text-slate-400 mb-3">Top 8 categorias do mês</p>
          {dre.expensesByCategory.length > 0 ? (
            <div className="h-60 md:h-64">
              <ReactECharts option={rankingOption} style={{ height: '100%', width: '100%' }} />
            </div>
          ) : (
            <div className="h-60 flex flex-col items-center justify-center gap-2">
              <BarChart3 className="w-10 h-10 text-slate-200" />
              <p className="text-sm text-slate-400">Sem dados disponíveis</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Category Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.22 }} className="glass-panel rounded-2xl p-5 md:p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />Detalhamento — Despesas
          </h3>
          {dre.expensesByCategory.length > 0 ? (
            <div className="flex flex-col gap-2">
              {dre.expensesByCategory.map((cat, i) => {
                const pct = dre.totalExpense > 0 ? (cat.total / dre.totalExpense) * 100 : 0
                return (
                  <button
                    key={cat.name}
                    onClick={() => setDrillDown({ title: `${cat.icon} ${cat.name}`, transactions: cat.transactions, type: 'expense', total: cat.total })}
                    className="flex items-center gap-3 w-full text-left hover:bg-slate-50 rounded-xl p-2.5 -mx-2 transition-colors group"
                  >
                    <span className="text-lg w-8 text-center shrink-0">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-semibold text-slate-700 truncate group-hover:text-slate-900">{cat.name}</span>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-xs font-bold text-slate-400">{pct.toFixed(0)}%</span>
                          <span className="text-sm font-black text-slate-800 tabular-nums">{currencyFmt.format(cat.total)}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.04 }}
                          className="h-full rounded-full" style={{ backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma despesa registrada.</p>
          )}
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.25 }} className="glass-panel rounded-2xl p-5 md:p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />Detalhamento — Receitas
          </h3>
          {dre.incomesByCategory.length > 0 ? (
            <div className="flex flex-col gap-2">
              {dre.incomesByCategory.map((cat, i) => {
                const pct = dre.totalIncome > 0 ? (cat.total / dre.totalIncome) * 100 : 0
                return (
                  <button
                    key={cat.name}
                    onClick={() => setDrillDown({ title: `${cat.icon} ${cat.name}`, transactions: cat.transactions, type: 'income', total: cat.total })}
                    className="flex items-center gap-3 w-full text-left hover:bg-slate-50 rounded-xl p-2.5 -mx-2 transition-colors group"
                  >
                    <span className="text-lg w-8 text-center shrink-0">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-semibold text-slate-700 truncate group-hover:text-slate-900">{cat.name}</span>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-xs font-bold text-slate-400">{pct.toFixed(0)}%</span>
                          <span className="text-sm font-black text-slate-800 tabular-nums">{currencyFmt.format(cat.total)}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.04 }}
                          className="h-full rounded-full" style={{ backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma receita registrada.</p>
          )}
        </motion.div>
      </div>

      {/* Drill-down Drawer */}
      <AnimatePresence>
        {drillDown && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); if (canClose) setDrillDown(null); }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-slate-800 text-lg leading-tight">{drillDown.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {drillDown.transactions.length} transação{drillDown.transactions.length !== 1 ? 'ões' : ''} ·{' '}
                    <span className={`font-bold ${drillDown.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {drillDown.type === 'expense' ? '-' : '+'}{currencyFmt.format(drillDown.total)}
                    </span>
                  </p>
                </div>
                <button onClick={() => setDrillDown(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {[...drillDown.transactions]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{t.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' })}
                        </p>
                      </div>
                      <span className={`text-sm font-black tabular-nums ml-4 shrink-0 ${drillDown.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {drillDown.type === 'expense' ? '-' : '+'}{currencyFmt.format(Number(t.amount))}
                      </span>
                    </div>
                  ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
