'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  CheckCircle2,
  Trash2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  PiggyBank,
  AlertTriangle,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  ArrowRightLeft,
  Settings2,
  Edit2,
  Sliders,
  Check,
  Repeat
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Modal } from '@/components/ui/Modal'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { CategoryForm } from '@/components/settings/CategoryForm'
import { payTransactionNew, unpayTransaction, deleteTransaction } from '@/app/actions/transactions'
import { updateWorkspaceTurnoverDay } from '@/app/actions/settings'
import { toast } from 'sonner'

// Dynamic load for ECharts
const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-slate-50/50 rounded-2xl animate-pulse flex items-center justify-center text-xs text-slate-400">Carregando gráfico...</div>
})

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })

type Category = {
  id: string
  name: string
  type: string
  icon?: string
  color?: string
  budget_amount?: number
  is_fixed?: boolean
  is_investment?: boolean
}

type Transaction = {
  id: string
  description: string
  amount: number
  type: string
  date: string
  status: string
  category_id?: string
  account_id?: string
  installment_id?: string
  is_recurring?: boolean
  category?: Category | null
  account?: { id: string; name: string; icon?: string; color?: string; type?: string } | null
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function PlannedClient({
  user,
  transactions = [],
  categories = [],
  accounts = [],
  workspaces = [],
  workspace
}: {
  user: any
  transactions: Transaction[]
  categories: Category[]
  accounts: any[]
  workspaces: any[]
  workspace?: any
}) {
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth()) // 0 - 11

  const [viewMode, setViewMode] = useState<'overview' | 'fixed' | 'categories' | 'transactions'>('overview')
  const [pendingFilter, setPendingFilter] = useState<'all' | 'expense' | 'income'>('all')

  // Modals & Popovers
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [viewCategoryDetail, setViewCategoryDetail] = useState<Category | null>(null)
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)
  const [isTurnoverModalOpen, setIsTurnoverModalOpen] = useState(false)
  const [tempTurnoverDay, setTempTurnoverDay] = useState(workspace?.month_turnover_day || 1)
  const [kpiModal, setKpiModal] = useState<{ title: string; type: 'income' | 'fixed' | 'variable' | 'investments' } | null>(null)
  const [chartCostFilter, setChartCostFilter] = useState<'all' | 'fixed' | 'variable'>('all')

  const [isPending, startTransition] = useTransition()

  const turnoverDay = workspace?.month_turnover_day || 1

  // Dismiss ECharts tooltips when tapping anywhere outside the chart canvas
  useEffect(() => {
    const handleDismissTooltips = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.echarts-for-react')) {
        const doms = document.querySelectorAll('.echarts-for-react')
        doms.forEach(dom => {
          const instance = (dom as any).echartsInstance
          if (instance) {
            try {
              instance.dispatchAction({ type: 'hideTip' })
            } catch (err) { }
          }
        })
      }
    }

    document.addEventListener('pointerdown', handleDismissTooltips)
    return () => {
      document.removeEventListener('pointerdown', handleDismissTooltips)
    }
  }, [])

  // Calculation of cycle start & end date based on turnoverDay
  const cyclePeriod = useMemo(() => {
    if (turnoverDay === 1) {
      const startDate = new Date(selectedYear, selectedMonth, 1, 0, 0, 0)
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59)
      return { startDate, endDate }
    } else {
      const startDate = new Date(selectedYear, selectedMonth, turnoverDay, 0, 0, 0)
      const endDate = new Date(selectedYear, selectedMonth + 1, turnoverDay - 1, 23, 59, 59)
      return { startDate, endDate }
    }
  }, [selectedYear, selectedMonth, turnoverDay])

  // Filter transactions within the selected cycle period, sorted from most recent to oldest
  const cycleTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const txDate = new Date(t.date + 'T12:00:00')
        return txDate >= cyclePeriod.startDate && txDate <= cyclePeriod.endDate
      })
      .sort((a, b) => new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime())
  }, [transactions, cyclePeriod])

  // Split categories
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories])
  const fixedCategories = useMemo(() => categories.filter(c => c.type === 'expense' && c.is_fixed && !c.is_investment), [categories])
  const variableCategories = useMemo(() => categories.filter(c => c.type === 'expense' && !c.is_fixed && !c.is_investment), [categories])
  const investmentCategories = useMemo(() => categories.filter(c => c.is_investment), [categories])

  // Calculate actual spending per category in this cycle
  const spentPerCategory = useMemo(() => {
    const map: Record<string, number> = {}
    cycleTransactions.forEach(t => {
      if (t.category_id && t.type === 'expense') {
        map[t.category_id] = (map[t.category_id] || 0) + Number(t.amount)
      }
    })
    return map
  }, [cycleTransactions])

  // Metrics
  const metrics = useMemo(() => {
    const plannedIncome = incomeCategories.reduce((acc, c) => acc + Number(c.budget_amount || 0), 0)
    const realizedIncome = cycleTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + Number(t.amount), 0)

    const fixedCategoryIds = new Set(fixedCategories.map(c => c.id))
    const investmentCategoryIds = new Set(investmentCategories.map(c => c.id))

    let spentFixed = 0
    let spentVariable = 0
    let spentInvestments = 0

    cycleTransactions.forEach(t => {
      if (t.type !== 'expense') return
      const isInvest = t.category_id && investmentCategoryIds.has(t.category_id)
      const isFix = Boolean(t.is_recurring) || Boolean(t.category_id && fixedCategoryIds.has(t.category_id))

      if (isInvest) {
        spentInvestments += Number(t.amount)
      } else if (isFix) {
        spentFixed += Number(t.amount)
      } else {
        spentVariable += Number(t.amount)
      }
    })

    const plannedFixedBase = fixedCategories.reduce((acc, c) => acc + Number(c.budget_amount || 0), 0)
    const plannedFixed = Math.max(plannedFixedBase, spentFixed)

    const plannedVariable = variableCategories.reduce((acc, c) => acc + Number(c.budget_amount || 0), 0)
    const plannedInvestments = investmentCategories.reduce((acc, c) => acc + Number(c.budget_amount || 0), 0)

    const totalPlannedOutflow = plannedFixed + plannedVariable + plannedInvestments
    const totalSpentOutflow = spentFixed + spentVariable + spentInvestments
    const effectiveIncome = realizedIncome > 0 ? realizedIncome : plannedIncome
    const remainingBalance = effectiveIncome - totalSpentOutflow

    return {
      plannedIncome,
      realizedIncome,
      plannedFixed,
      spentFixed,
      plannedVariable,
      spentVariable,
      plannedInvestments,
      spentInvestments,
      totalPlannedOutflow,
      totalSpentOutflow,
      remainingBalance,
    }
  }, [incomeCategories, fixedCategories, variableCategories, investmentCategories, cycleTransactions])

  // Filtragem de dados especificamente para os gráficos com base no chartCostFilter
  const filteredSpentPerCategory = useMemo(() => {
    const fixedCategoryIds = new Set(fixedCategories.map(c => c.id))
    const map: Record<string, number> = {}

    cycleTransactions.forEach(t => {
      if (t.category_id && t.type === 'expense') {
        const isFix = Boolean(t.is_recurring) || Boolean(t.category_id && fixedCategoryIds.has(t.category_id))
        if (chartCostFilter === 'fixed' && !isFix) return
        if (chartCostFilter === 'variable' && isFix) return

        map[t.category_id] = (map[t.category_id] || 0) + Number(t.amount)
      }
    })
    return map
  }, [cycleTransactions, chartCostFilter, fixedCategories])

  // Category Legend Data for HTML Legend Grid
  const categoryLegendData = useMemo(() => {
    const data: { id: string; name: string; icon: string; value: number; color: string; percent: number }[] = []
    const palette = ['#6366f1', '#f59e0b', '#10b981', '#f43f5e', '#a855f7', '#06b6d4', '#ec4899', '#64748b']
    let total = 0
    categories.forEach(c => {
      total += filteredSpentPerCategory[c.id] || 0
    })
    if (total === 0) total = 1

    categories.forEach((c, idx) => {
      const val = filteredSpentPerCategory[c.id] || 0
      if (val > 0) {
        data.push({
          id: c.id,
          name: c.name,
          icon: c.icon || '📌',
          value: val,
          color: c.color || palette[idx % palette.length],
          percent: Math.round((val / total) * 100)
        })
      }
    })
    data.sort((a, b) => b.value - a.value)
    return data
  }, [categories, filteredSpentPerCategory])

  // Chart Options - Top 5 Maiores Categorias de Gasto (Limpo sem números sobrepostos no eixo X)
  const topCategoriesChartOption = useMemo(() => {
    const catSpending: { name: string; value: number }[] = []
    categories.forEach(c => {
      const val = filteredSpentPerCategory[c.id] || 0
      if (val > 0) {
        catSpending.push({ name: `${c.icon || '📌'} ${c.name}`, value: val })
      }
    })
    catSpending.sort((a, b) => a.value - b.value)
    const top5 = catSpending.slice(-5)

    return {
      tooltip: {
        trigger: 'axis',
        confiner: true,
        axisPointer: { type: 'shadow' },
        extraCssText: 'z-index: 100; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;',
        position: function (point: number[], params: any, dom: any, rect: any, size: any) {
          let x = point[0] + 15
          let y = point[1] - (size.contentSize[1] / 2)
          if (x + size.contentSize[0] > size.viewSize[0]) {
            x = point[0] - size.contentSize[0] - 15
          }
          if (x < 10) x = 10
          if (y < 10) y = 10
          return [x, y]
        },
        formatter: (params: any[]) => `${params[0].name}: <strong>${currencyFmt.format(params[0].value)}</strong>`
      },
      grid: { left: '3%', right: '25%', bottom: '2%', top: '2%', containLabel: true },
      xAxis: { show: false }, // OCULTA OS NÚMEROS SOBREPOSTOS DO EIXO X!
      yAxis: { type: 'category', data: top5.map(i => i.name), axisLabel: { color: '#475569', fontSize: 10, fontWeight: 'bold' } },
      series: [
        {
          type: 'bar',
          data: top5.map(i => i.value),
          itemStyle: {
            color: (params: any) => {
              const colors = ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3']
              return colors[params.dataIndex % colors.length]
            },
            borderRadius: [0, 6, 6, 0]
          },
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => currencyFmt.format(params.value),
            color: '#334155',
            fontSize: 10,
            fontWeight: 'bold'
          }
        }
      ]
    }
  }, [categories, spentPerCategory])


  // Chart Options - ECharts Donut Chart (Distribuição por Categoria Real com Ícones nas Fatias)
  const donutChartOption = useMemo(() => {
    const data = categoryLegendData.map(item => ({
      name: `${item.icon} ${item.name}`,
      value: item.value,
      icon: item.icon,
      itemStyle: { color: item.color }
    }))

    return {
      tooltip: {
        trigger: 'item',
        confiner: true,
        hideDelay: 2000,
        extraCssText: 'z-index: 100; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;',
        position: function (point: number[], params: any, dom: any, rect: any, size: any) {
          let x = point[0] + 15
          let y = point[1] - (size.contentSize[1] / 2)
          if (x + size.contentSize[0] > size.viewSize[0]) {
            x = point[0] - size.contentSize[0] - 15
          }
          if (x < 10) x = 10
          if (y < 10) y = 10
          return [x, y]
        },
        formatter: (params: any) => `<strong>${params.name}</strong><br/>${currencyFmt.format(params.value)} (${params.percent}%)`
      },
      legend: { show: false },
      series: [
        {
          name: 'Categoria',
          type: 'pie',
          radius: ['48%', '78%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            position: 'inside', // RENDERIZA O ÍCONE DIRETO DENTRO DA FATIA!
            formatter: (params: any) => (params.percent >= 5 ? (params.data.icon || '') : ''),
            fontSize: 13
          },
          labelLine: { show: false },
          data: data.length > 0 ? data : [{ value: 1, name: 'Sem dados', itemStyle: { color: '#e2e8f0' } }]
        }
      ]
    }
  }, [categoryLegendData])

  // Chart Options - ECharts Bar Chart (Planejado vs Realizado)
  const barChartOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'axis',
        confiner: true,
        axisPointer: { type: 'shadow' },
        extraCssText: 'z-index: 100; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;',
        position: function (point: number[], params: any, dom: any, rect: any, size: any) {
          let x = point[0] + 15
          let y = point[1] - (size.contentSize[1] / 2)
          if (x + size.contentSize[0] > size.viewSize[0]) {
            x = point[0] - size.contentSize[0] - 15
          }
          if (x < 10) x = 10
          if (y < 10) y = 10
          return [x, y]
        },
        formatter: (params: any[]) => {
          let str = `<strong>${params[0].name}</strong><br/>`
          params.forEach(p => {
            str += `${p.marker} ${p.seriesName}: <strong>${currencyFmt.format(p.value)}</strong><br/>`
          })
          return str
        }
      },
      legend: {
        top: '0%',
        right: '0%',
        icon: 'circle',
        textStyle: { color: '#64748b', fontSize: 10, fontWeight: 'bold' }
      },
      grid: { left: '3%', right: '3%', bottom: '5%', top: '18%', containLabel: true },
      xAxis: {
        type: 'category',
        data: ['Receitas', 'Fixos', 'Variáveis', 'Aportes'],
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold' }
      },
      yAxis: {
        type: 'value',
        splitNumber: 3,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 9,
          formatter: (val: number) => `R$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`
        }
      },
      series: [
        {
          name: 'Teto',
          type: 'bar',
          barGap: 0,
          itemStyle: { color: '#cbd5e1', borderRadius: [4, 4, 0, 0] },
          data: [
            metrics.plannedIncome,
            metrics.plannedFixed,
            metrics.plannedVariable,
            metrics.plannedInvestments
          ]
        },
        {
          name: 'Gasto',
          type: 'bar',
          itemStyle: {
            color: (params: any) => {
              const colors = ['#10b981', '#f43f5e', '#f59e0b', '#a855f7']
              return colors[params.dataIndex]
            },
            borderRadius: [4, 4, 0, 0]
          },
          data: [
            metrics.realizedIncome,
            metrics.spentFixed,
            metrics.spentVariable,
            metrics.spentInvestments
          ]
        }
      ]
    }
  }, [metrics])

  // Chart Options - ECharts Radar (Raio-X de Saúde Financeira)
  const radarChartOption = useMemo(() => {
    const inc = metrics.plannedIncome || metrics.realizedIncome || 1
    const fixPct = Math.min(100, Math.round((metrics.spentFixed / inc) * 100))
    const varPct = Math.min(100, Math.round((metrics.spentVariable / inc) * 100))
    const invPct = Math.min(100, Math.round((metrics.spentInvestments / inc) * 100))
    const freePct = Math.max(0, Math.min(100, Math.round((metrics.remainingBalance / inc) * 100)))

    return {
      tooltip: {
        confiner: true,
        extraCssText: 'z-index: 100; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;',
        position: function (point: number[], params: any, dom: any, rect: any, size: any) {
          let x = point[0] + 15
          let y = point[1] - (size.contentSize[1] / 2)
          if (x + size.contentSize[0] > size.viewSize[0]) {
            x = point[0] - size.contentSize[0] - 15
          }
          if (x < 10) x = 10
          if (y < 10) y = 10
          return [x, y]
        }
      },
      radar: {
        indicator: [
          { name: 'Fixos (≤50%)', max: 100 },
          { name: 'Variáveis (≤30%)', max: 100 },
          { name: 'Aportes (≥15%)', max: 100 },
          { name: 'Saldo Livre (≥10%)', max: 100 }
        ],
        radius: '65%',
        shape: 'polygon',
        axisName: { color: '#475569', fontSize: 10, fontWeight: 'bold' },
        splitLine: { lineStyle: { color: ['#e2e8f0', '#cbd5e1'] } },
        splitArea: { areaStyle: { color: ['rgba(241, 245, 249, 0.5)', 'rgba(255, 255, 255, 0.8)'] } }
      },
      series: [
        {
          name: 'Equilíbrio Mensal',
          type: 'radar',
          data: [
            {
              value: [fixPct, varPct, invPct, freePct],
              name: 'Seu Orçamento',
              areaStyle: { color: 'rgba(16, 185, 129, 0.25)' },
              lineStyle: { color: '#10b981', width: 2 },
              itemStyle: { color: '#10b981' }
            }
          ]
        }
      ]
    }
  }, [metrics])

  // Filter pending transactions for the list
  const pendingTransactions = useMemo(() => {
    return cycleTransactions.filter(t => {
      if (pendingFilter === 'expense') return t.type === 'expense'
      if (pendingFilter === 'income') return t.type === 'income'
      return true
    })
  }, [cycleTransactions, pendingFilter])

  const creditCardAccountsMap = useMemo(() => {
    const map: Record<string, any> = {}
    accounts.forEach(acc => {
      if (acc.type === 'credit_card') map[acc.id] = acc
    })
    return map
  }, [accounts])

  const { creditCardGroups, standardTransactions } = useMemo(() => {
    const groups: Record<string, { card: any; transactions: Transaction[]; total: number; isPaid: boolean }> = {}
    const standard: Transaction[] = []

    pendingTransactions.forEach(t => {
      const card = t.account_id ? creditCardAccountsMap[t.account_id] : null
      if (card && t.type === 'expense') {
        if (!groups[card.id]) {
          groups[card.id] = { card, transactions: [], total: 0, isPaid: false }
        }
        groups[card.id].transactions.push(t)
        groups[card.id].total += Number(t.amount)
      } else {
        standard.push(t)
      }
    })

    Object.values(groups).forEach(g => {
      g.isPaid = g.transactions.length > 0 && g.transactions.every(t => t.status === 'paid_planned')
    })

    return { creditCardGroups: Object.values(groups), standardTransactions: standard }
  }, [pendingTransactions, creditCardAccountsMap])

  const kpiModalTransactions = useMemo(() => {
    if (!kpiModal) return []
    const fixedCategoryIds = new Set(fixedCategories.map(c => c.id))
    const investmentCategoryIds = new Set(investmentCategories.map(c => c.id))

    return cycleTransactions.filter(t => {
      if (kpiModal.type === 'income') return t.type === 'income'
      if (t.type !== 'expense') return false

      const isInvest = t.category_id && investmentCategoryIds.has(t.category_id)
      const isFix = Boolean(t.is_recurring) || Boolean(t.category_id && fixedCategoryIds.has(t.category_id))

      if (kpiModal.type === 'investments') return isInvest
      if (kpiModal.type === 'fixed') return isFix && !isInvest
      if (kpiModal.type === 'variable') return !isFix && !isInvest

      return true
    })
  }, [kpiModal, cycleTransactions, fixedCategories, investmentCategories])

  const { kpiCreditCardGroups, kpiStandardTransactions } = useMemo(() => {
    const groups: Record<string, { card: any; transactions: Transaction[]; total: number }> = {}
    const standard: Transaction[] = []

    kpiModalTransactions.forEach(t => {
      const card = t.account_id ? creditCardAccountsMap[t.account_id] : null
      if (card && t.type === 'expense') {
        if (!groups[card.id]) {
          groups[card.id] = { card, transactions: [], total: 0 }
        }
        groups[card.id].transactions.push(t)
        groups[card.id].total += Number(t.amount)
      } else {
        standard.push(t)
      }
    })

    return { kpiCreditCardGroups: Object.values(groups), kpiStandardTransactions: standard }
  }, [kpiModalTransactions, creditCardAccountsMap])

  // Lista unificada de Contas Fixas e Recorrentes
  const fixedBillsList = useMemo(() => {
    const fixedCategoryIds = new Set(fixedCategories.map(c => c.id))
    const map: Record<string, {
      id: string
      description: string
      amount: number
      category: Category | null
      account: any
      occurrences: number
      startDate: string
      endDate: string
      lastTransaction: Transaction
      isCategoryFixed: boolean
    }> = {}

    transactions.forEach(t => {
      if (t.type !== 'expense') return
      const isCatFix = Boolean(t.category_id && fixedCategoryIds.has(t.category_id))
      const isRec = Boolean(t.is_recurring)
      if (!isCatFix && !isRec) return

      const key = `${t.description.toLowerCase().trim()}_${t.category_id || 'no_cat'}`
      if (!map[key]) {
        map[key] = {
          id: t.id,
          description: t.description,
          amount: Number(t.amount),
          category: t.category || null,
          account: t.account || null,
          occurrences: 0,
          startDate: t.date,
          endDate: t.date,
          lastTransaction: t,
          isCategoryFixed: isCatFix
        }
      }

      map[key].occurrences += 1
      if (t.date < map[key].startDate) map[key].startDate = t.date
      if (t.date > map[key].endDate) {
        map[key].endDate = t.date
        map[key].lastTransaction = t
      }
    })

    return Object.values(map).sort((a, b) => b.amount - a.amount)
  }, [transactions, fixedCategories])

  const totalFixedMonthly = useMemo(() => {
    return fixedBillsList.reduce((acc, item) => acc + item.amount, 0)
  }, [fixedBillsList])

  // Handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const handleSaveTurnoverDay = () => {
    if (!workspace?.id) return
    startTransition(async () => {
      const res = await updateWorkspaceTurnoverDay(workspace.id, Number(tempTurnoverDay))
      if (res?.error) toast.error(res.error)
      else {
        toast.success(res.success)
        setIsTurnoverModalOpen(false)
      }
    })
  }

  const handlePay = (id: string) => {
    startTransition(async () => {
      try {
        const res = await payTransactionNew(id)
        if (res?.error) toast.error(res.error)
        else toast.success(res.success)
      } catch (err) {
        toast.error("Erro ao processar pagamento.")
      }
    })
  }

  const handleUnpay = (id: string) => {
    startTransition(async () => {
      const res = await unpayTransaction(id)
      if (res?.error) toast.error(res.error)
      else toast.success(res.success)
    })
  }

  const handleDelete = (id: string) => {
    toast('Tem certeza que deseja excluir este lançamento?', {
      action: {
        label: 'Sim, excluir',
        onClick: () => {
          startTransition(async () => {
            const res = await deleteTransaction(id)
            if (res?.error) toast.error(res.error)
            else toast.success(res.success)
          })
        }
      },
      cancel: { label: 'Cancelar', onClick: () => { } }
    })
  }

  const formatCycleRange = () => {
    const sDay = String(cyclePeriod.startDate.getDate()).padStart(2, '0')
    const sMonth = MONTH_NAMES[cyclePeriod.startDate.getMonth()].slice(0, 3)
    const eDay = String(cyclePeriod.endDate.getDate()).padStart(2, '0')
    const eMonth = MONTH_NAMES[cyclePeriod.endDate.getMonth()].slice(0, 3)
    return `${sDay} ${sMonth} - ${eDay} ${eMonth}`
  }

  return (
    <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full flex flex-col gap-4 sm:gap-6">
      {/* Header Interativo Responsivo */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
                <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              Planejamento & Orçamento
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Controle seu salário, limites de gastos e contas do ciclo.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingTx(null)
              setIsTxModalOpen(true)
            }}
            className="hidden sm:flex btn-primary py-2.5 px-4 items-center gap-2 text-sm shadow-md shadow-emerald-500/20 hover:-translate-y-0.5 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
        </div>

        {/* Linha de Controles Mobile: Virada + Mês + Botão Adicionar */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 justify-between w-full">
          {/* Botão de Ajuste do Dia da Virada */}
          <button
            onClick={() => {
              setTempTurnoverDay(turnoverDay)
              setIsTurnoverModalOpen(true)
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-sm active:scale-95 shrink-0"
            title="Alterar o dia de virada do mês"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Virada: <strong>Dia {turnoverDay}</strong></span>
          </button>

          {/* Seletor de Período / Mês */}
          <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-xl p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors active:scale-95"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-2 text-center">
              <span className="font-extrabold text-xs sm:text-sm text-slate-800 block leading-tight">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">
                {formatCycleRange()}
              </span>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors active:scale-95"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setEditingTx(null)
              setIsTxModalOpen(true)
            }}
            className="sm:hidden btn-primary py-2 px-3 flex items-center gap-1 text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo
          </button>
        </div>
      </div>

      {/* Tabs de Navegação da Tela (Scrollable em telas pequenas) */}
      <div className="flex border-b border-slate-200/80 gap-1 sm:gap-2 overflow-x-auto whitespace-nowrap pb-0.5 no-scrollbar">
        <button
          onClick={() => setViewMode('overview')}
          className={`flex items-center gap-1.5 px-3.5 sm:px-5 py-2.5 font-bold text-xs sm:text-sm transition-all border-b-2 shrink-0 ${viewMode === 'overview' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Visão Geral & Gráficos
        </button>
        <button
          onClick={() => setViewMode('fixed')}
          className={`flex items-center gap-1.5 px-3.5 sm:px-5 py-2.5 font-bold text-xs sm:text-sm transition-all border-b-2 shrink-0 ${viewMode === 'fixed' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Contas Fixas ({fixedBillsList.length})
        </button>
        <button
          onClick={() => setViewMode('categories')}
          className={`flex items-center gap-1.5 px-3.5 sm:px-5 py-2.5 font-bold text-xs sm:text-sm transition-all border-b-2 shrink-0 ${viewMode === 'categories' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          <PieIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Limites por Categoria ({categories.length})
        </button>
        <button
          onClick={() => setViewMode('transactions')}
          className={`flex items-center gap-1.5 px-3.5 sm:px-5 py-2.5 font-bold text-xs sm:text-sm transition-all border-b-2 shrink-0 ${viewMode === 'transactions' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Contas do Ciclo ({cycleTransactions.length})
        </button>
      </div>

      {/* Grid de Cards Principais (2 cols no mobile, 4 cols no desktop) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4"
      >
        {/* Card 1: Receita / Salário */}
        <div
          onClick={() => setKpiModal({ title: 'Receita Prevista', type: 'income' })}
          className="glass-panel p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between border-l-4 border-l-emerald-500 hover:shadow-lg transition-all cursor-pointer active:scale-[0.98] group"
        >
          <div>
            <div className="flex justify-between items-center mb-1 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Receita Prevista</span>
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-base sm:text-2xl font-black text-slate-800 truncate">
              {currencyFmt.format(metrics.plannedIncome || metrics.realizedIncome)}
            </div>
          </div>
          <div className="mt-2 sm:mt-4 pt-2 border-t border-slate-100 text-[10px] sm:text-xs text-slate-500 flex justify-between items-center">
            <span>Realizado:</span>
            <strong className="text-emerald-600 font-bold">{currencyFmt.format(metrics.realizedIncome)}</strong>
          </div>
        </div>

        {/* Card 2: Custos Fixos */}
        <div
          onClick={() => setKpiModal({ title: 'Custos Fixos', type: 'fixed' })}
          className="glass-panel p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between border-l-4 border-l-rose-500 hover:shadow-lg transition-all cursor-pointer active:scale-[0.98] group"
        >
          <div>
            <div className="flex justify-between items-center mb-1 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Custos Fixos</span>
              <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 shrink-0 group-hover:translate-y-0.5 transition-transform" />
            </div>
            <div className="text-base sm:text-2xl font-black text-slate-800 truncate">
              {currencyFmt.format(metrics.spentFixed)}
            </div>
          </div>
          <div className="mt-2 sm:mt-4 pt-2 border-t border-slate-100 text-[10px] sm:text-xs text-slate-500 flex justify-between items-center">
            <span>Teto:</span>
            <strong className="text-slate-700 font-bold">{currencyFmt.format(metrics.plannedFixed)}</strong>
          </div>
        </div>

        {/* Card 3: Custos Variáveis */}
        <div
          onClick={() => setKpiModal({ title: 'Custos Variáveis', type: 'variable' })}
          className="glass-panel p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between border-l-4 border-l-amber-500 hover:shadow-lg transition-all cursor-pointer active:scale-[0.98] group"
        >
          <div>
            <div className="flex justify-between items-center mb-1 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Custos Variáveis</span>
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-base sm:text-2xl font-black text-slate-800 truncate">
              {currencyFmt.format(metrics.spentVariable)}
            </div>
          </div>
          <div className="mt-2 sm:mt-4 pt-2 border-t border-slate-100 text-[10px] sm:text-xs text-slate-500 flex justify-between items-center">
            <span>Teto:</span>
            <strong className="text-slate-700 font-bold">{currencyFmt.format(metrics.plannedVariable)}</strong>
          </div>
        </div>

        {/* Card 4: Investimentos */}
        <div
          onClick={() => setKpiModal({ title: 'Investimentos', type: 'investments' })}
          className="glass-panel p-3.5 sm:p-5 rounded-2xl flex flex-col justify-between border-l-4 border-l-purple-500 hover:shadow-lg transition-all cursor-pointer active:scale-[0.98] group"
        >
          <div>
            <div className="flex justify-between items-center mb-1 sm:mb-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">Investimentos</span>
              <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-base sm:text-2xl font-black text-purple-700 truncate">
              {currencyFmt.format(metrics.spentInvestments)}
            </div>
          </div>
          <div className="mt-2 sm:mt-4 pt-2 border-t border-slate-100 text-[10px] sm:text-xs text-slate-500 flex justify-between items-center">
            <span>Meta:</span>
            <strong className="text-purple-900 font-bold">{currencyFmt.format(metrics.plannedInvestments)}</strong>
          </div>
        </div>
      </motion.div>

      {/* Saldo Restante Banner */}
      <div className={`p-3.5 sm:p-5 rounded-2xl flex flex-row items-center justify-between gap-3 shadow-sm border ${metrics.remainingBalance >= 0
          ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/30'
          : 'bg-gradient-to-r from-rose-500/10 via-red-500/5 to-transparent border-rose-500/30'
        }`}>
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${metrics.remainingBalance >= 0 ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate">Saldo Livre Previsto</h3>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">Sobram após gastos e aportes</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-base sm:text-2xl font-black tabular-nums ${metrics.remainingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {currencyFmt.format(metrics.remainingBalance)}
          </div>
        </div>
      </div>

      {/* ÁREA PRINCIPAL BASEADA NA TAB SELECIONADA */}

      {/* 1. VISÃO GERAL & GRÁFICOS MASSAS */}
      {viewMode === 'overview' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-4 sm:gap-6"
        >
          {/* Seletor de Filtro de Custos para os Gráficos */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3.5 rounded-2xl glass-panel border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20 shadow-xs">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-xs sm:text-sm text-slate-800">Filtro dos Gráficos:</span>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
              <button
                onClick={() => setChartCostFilter('all')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${chartCostFilter === 'all' ? 'bg-white text-indigo-600 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <span>🌐 Todos os Custos</span>
              </button>
              <button
                onClick={() => setChartCostFilter('fixed')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${chartCostFilter === 'fixed' ? 'bg-white text-rose-600 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <span>📌 Apenas Fixos</span>
              </button>
              <button
                onClick={() => setChartCostFilter('variable')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${chartCostFilter === 'variable' ? 'bg-white text-amber-600 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                <span>🛒 Apenas Variáveis</span>
              </button>
            </div>
          </div>

          {/* Linha 1 de Gráficos: 1. Top Gastos & 2. Distribuição por Categoria */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Gráfico 1: Top 5 Maiores Gastos (Left 6 cols) */}
            <div className="lg:col-span-6 glass-panel p-4 sm:p-6 rounded-2xl flex flex-col gap-3 overflow-hidden">
              <div>
                <h3 className="font-black text-slate-800 text-base sm:text-lg flex items-center gap-2">
                  <span className="text-indigo-500">🏆</span>
                  Top 5 Maiores Gastos do Ciclo
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">Categorias que mais consumiram recursos no mês</p>
              </div>
              <div className="h-72 sm:h-80 w-full pt-2">
                <ReactECharts notMerge={true} lazyUpdate={true} option={topCategoriesChartOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            {/* Gráfico 2: Distribuição Donut Chart + Legenda (Right 6 cols) */}
            <div className="lg:col-span-6 glass-panel p-4 sm:p-6 rounded-2xl flex flex-col gap-3 overflow-hidden">
              <div>
                <h3 className="font-black text-slate-800 text-base sm:text-lg flex items-center gap-2">
                  <PieIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  Distribuição por Categoria
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">Divisão dos recursos gastos no mês</p>
              </div>
              <div className="h-56 sm:h-64 w-full pt-1">
                <ReactECharts notMerge={true} lazyUpdate={true} option={donutChartOption} style={{ height: '100%', width: '100%' }} />
              </div>

              {/* Lista Detalhada de Categorias */}
              <div className="flex flex-col gap-1 pt-2 border-t border-slate-100 max-h-48 overflow-y-auto pr-0.5">
                {categoryLegendData.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setViewCategoryDetail(categories.find(c => c.id === item.id) || null)}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/60 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black tabular-nums text-slate-800">{currencyFmt.format(item.value)}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md w-9 text-center">{item.percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Linha 2 de Gráficos: 3. Planejado vs Realizado & 4. Raio-X de Saúde */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Gráfico 3: Planejado vs Realizado (Left 7 cols) */}
            <div className="lg:col-span-7 glass-panel p-4 sm:p-6 rounded-2xl flex flex-col gap-3 overflow-hidden">
              <div>
                <h3 className="font-black text-slate-800 text-base sm:text-lg flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                  Planejado vs Realizado
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">Comparação entre seu teto e o gasto real no ciclo</p>
              </div>
              <div className="h-72 sm:h-80 w-full pt-2">
                <ReactECharts notMerge={true} lazyUpdate={true} option={barChartOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            {/* Gráfico 4: Raio-X de Saúde Financeira (Right 5 cols) */}
            <div className="lg:col-span-5 glass-panel p-4 sm:p-6 rounded-2xl flex flex-col gap-3 overflow-hidden">
              <div>
                <h3 className="font-black text-slate-800 text-base sm:text-lg flex items-center gap-2">
                  <span className="text-emerald-500">🕸️</span>
                  Raio-X de Saúde Financeira
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">Equilíbrio dos 4 pilares: Fixos, Variáveis, Aportes e Saldo Livre</p>
              </div>
              <div className="h-72 sm:h-80 w-full pt-2">
                <ReactECharts notMerge={true} lazyUpdate={true} option={radarChartOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 2. CONTAS FIXAS & RECORRENTES */}
      {viewMode === 'fixed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-4 sm:gap-6"
        >
          {/* Header Banner de Custos Fixos */}
          <div className="glass-panel p-4 sm:p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-rose-500/5 via-amber-500/5 to-transparent border-rose-200/60">
            <div>
              <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <Repeat className="w-5 h-5 text-rose-500" />
                Painel de Contas Fixas & Recorrentes
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Acompanhe todas as suas contas de valor fixo, mensalidades e durações programadas.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs shrink-0">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Fixo Mensal</span>
                <span className="text-lg font-black text-rose-600 tabular-nums">{currencyFmt.format(totalFixedMonthly)}</span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Compromissos</span>
                <span className="text-lg font-black text-slate-800 tabular-nums">{fixedBillsList.length} ativas</span>
              </div>
            </div>
          </div>

          {/* Grid de Cards das Contas Fixas */}
          {fixedBillsList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {fixedBillsList.map(bill => {
                const startObj = new Date(bill.startDate + 'T12:00:00')
                const endObj = new Date(bill.endDate + 'T12:00:00')

                return (
                  <div
                    key={bill.id}
                    className="p-4 rounded-2xl glass-panel flex flex-col justify-between gap-3 border-l-4 border-l-rose-500 hover:shadow-md transition-all group"
                  >
                    {/* Top line: Icon + Description + Amount */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border"
                          style={{
                            backgroundColor: `${bill.category?.color || '#f43f5e'}15`,
                            borderColor: `${bill.category?.color || '#f43f5e'}30`
                          }}
                        >
                          {bill.category?.icon || '🔁'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug truncate">
                            {bill.description}
                          </h4>
                          <span className="text-[11px] font-medium text-slate-400">
                            {bill.category?.name || 'Custo Fixo'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-black text-rose-600 tabular-nums block">
                          {currencyFmt.format(bill.amount)}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">/mês</span>
                      </div>
                    </div>

                    {/* Middle line: Duração e Informações */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1 text-[11px] text-slate-600">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Período:</span>
                        <span className="font-bold text-slate-800">
                          {MONTH_NAMES[startObj.getMonth()]} {startObj.getFullYear()} → {MONTH_NAMES[endObj.getMonth()]} {endObj.getFullYear()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Frequência:</span>
                        <span className="font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md">
                          {bill.occurrences > 1 ? `Programado para ${bill.occurrences} meses` : 'Mensal Contínuo'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom line: Ações de edição */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setEditingTx(bill.lastTransaction)
                          setIsTxModalOpen(true)
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Gerenciar</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-12 glass-panel rounded-2xl text-center flex flex-col items-center gap-2">
              <Repeat className="w-12 h-12 text-slate-300" />
              <h4 className="font-bold text-slate-700 text-sm">Nenhuma conta fixa ou recorrente cadastrada</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Ao cadastrar um novo lançamento e marcar como "Fixo / Recorrente", ele aparecerá automaticamente aqui com todos os detalhes de duração.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* 2. LIMITES POR CATEGORIA (INTERATIVO COM CLIQUE PARA EDITAR) */}
      {viewMode === 'categories' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="glass-panel p-4 sm:p-6 rounded-2xl flex flex-col gap-4 sm:gap-6"
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-slate-800 text-base sm:text-lg flex items-center gap-2">
                <PieIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                Limites por Categoria
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Clique em qualquer item para editar o teto de gastos</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Despesas Fixas */}
            <div className="flex flex-col gap-2.5 bg-slate-50/50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/60">
              <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Despesas Fixas</span>
                <span className="text-[10px] text-slate-400">{currencyFmt.format(metrics.spentFixed)}</span>
              </h4>
              <div className="flex flex-col gap-2 mt-1">
                {fixedCategories.map(cat => {
                  const spent = spentPerCategory[cat.id] || 0
                  const budget = cat.budget_amount || 0
                  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
                  const isOver = budget > 0 && spent > budget

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setViewCategoryDetail(cat)}
                      className="p-3 bg-white border border-slate-200/80 hover:border-emerald-400 rounded-xl flex flex-col gap-1.5 cursor-pointer shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 min-w-0 flex-1">
                          <span>{cat.icon || '📌'}</span>
                          <span className="font-bold text-slate-900 leading-snug">{cat.name}</span>
                        </span>
                        <span className="text-[11px] font-bold tabular-nums text-slate-700 shrink-0">
                          {currencyFmt.format(spent)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100/80">
                        <span>Teto: {budget > 0 ? currencyFmt.format(budget) : 'Sem limite'}</span>
                        {budget > 0 && <span className={`font-bold ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>{pct}%</span>}
                      </div>
                      {budget > 0 && (
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-600' : (pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Despesas Variáveis */}
            <div className="flex flex-col gap-2.5 bg-slate-50/50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/60">
              <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Despesas Variáveis</span>
                <span className="text-[10px] text-slate-400">{currencyFmt.format(metrics.spentVariable)}</span>
              </h4>
              <div className="flex flex-col gap-2 mt-1">
                {variableCategories.map(cat => {
                  const spent = spentPerCategory[cat.id] || 0
                  const budget = cat.budget_amount || 0
                  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
                  const isOver = budget > 0 && spent > budget

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setViewCategoryDetail(cat)}
                      className="p-3 bg-white border border-slate-200/80 hover:border-emerald-400 rounded-xl flex flex-col gap-1.5 cursor-pointer shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 min-w-0 flex-1">
                          <span>{cat.icon || '🛒'}</span>
                          <span className="font-bold text-slate-900 leading-snug">{cat.name}</span>
                        </span>
                        <span className="text-[11px] font-bold tabular-nums text-slate-700 shrink-0">
                          {currencyFmt.format(spent)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100/80">
                        <span>Teto: {budget > 0 ? currencyFmt.format(budget) : 'Sem limite'}</span>
                        {budget > 0 && <span className={`font-bold ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>{pct}%</span>}
                      </div>
                      {budget > 0 && (
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-600' : (pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Investimentos */}
            <div className="flex flex-col gap-2.5 bg-purple-50/20 p-3.5 sm:p-4 rounded-2xl border border-purple-200/50">
              <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Investimentos & Metas</span>
                <span className="text-[10px] text-purple-500">{currencyFmt.format(metrics.spentInvestments)}</span>
              </h4>
              <div className="flex flex-col gap-2 mt-1">
                {investmentCategories.map(cat => {
                  const spent = spentPerCategory[cat.id] || 0
                  const budget = cat.budget_amount || 0
                  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setViewCategoryDetail(cat)}
                      className="p-3 bg-white border border-purple-200/80 hover:border-purple-400 rounded-xl flex flex-col gap-1.5 cursor-pointer shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 min-w-0 flex-1">
                          <span>{cat.icon || '💎'}</span>
                          <span className="font-bold text-slate-900 leading-snug">{cat.name}</span>
                        </span>
                        <span className="text-[11px] font-bold tabular-nums text-purple-900 shrink-0">
                          {currencyFmt.format(spent)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-purple-500 pt-1 border-t border-purple-100/80">
                        <span>Meta: {budget > 0 ? currencyFmt.format(budget) : 'Sem meta'}</span>
                        {budget > 0 && <span className="font-bold text-purple-700">{pct}%</span>}
                      </div>
                      {budget > 0 && (
                        <div className="w-full bg-purple-100 h-1.5 rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-purple-600 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. LISTA DE LANÇAMENTOS DO CICLO */}
      {viewMode === 'transactions' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="glass-panel p-4 sm:p-6 rounded-2xl flex flex-col gap-3 sm:gap-4"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-slate-800 text-base sm:text-lg flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                Contas do Ciclo ({pendingTransactions.length})
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Clique na conta para editar ou no botão para dar baixa</p>
            </div>

            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-bold w-full sm:w-auto justify-between">
              <button
                onClick={() => setPendingFilter('all')}
                className={`flex-1 sm:flex-none px-2.5 py-1 rounded-md transition-all ${pendingFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                Todas ({cycleTransactions.length})
              </button>
              <button
                onClick={() => setPendingFilter('expense')}
                className={`flex-1 sm:flex-none px-2.5 py-1 rounded-md transition-all ${pendingFilter === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
              >
                A Pagar
              </button>
              <button
                onClick={() => setPendingFilter('income')}
                className={`flex-1 sm:flex-none px-2.5 py-1 rounded-md transition-all ${pendingFilter === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                A Receber
              </button>
            </div>
          </div>

          {pendingTransactions.length > 0 ? (
            <div className="flex flex-col gap-3">
              {/* Cards de Faturas de Cartão de Crédito Agrupados */}
              {creditCardGroups.map(group => {
                const dueDay = group.card.due_day || 10
                return (
                  <div
                    key={group.card.id}
                    className="p-4 rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50/30 via-white to-slate-50 flex flex-col gap-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-lg shrink-0 border border-purple-200">
                          {group.card.icon || '💳'}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                            <span>Fatura {group.card.name}</span>
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                              Vence dia {dueDay}
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {group.transactions.length} {group.transactions.length === 1 ? 'lançamento no ciclo' : 'lançamentos no ciclo'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm sm:text-base font-black text-rose-600 tabular-nums">
                          {currencyFmt.format(group.total)}
                        </div>
                        <span className={`text-[10px] font-bold ${group.isPaid ? 'text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md' : 'text-slate-400'}`}>
                          {group.isPaid ? '✓ Fatura Paga' : 'Fatura Aberta'}
                        </span>
                      </div>
                    </div>

                    {/* Lista interna de compras do cartão */}
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-purple-100/70">
                      {group.transactions.map(t => {
                        const isTxPaid = t.status === 'paid_planned'
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              setEditingTx(t)
                              setIsTxModalOpen(true)
                            }}
                            className="flex items-center justify-between p-2 rounded-xl bg-white/80 hover:bg-white border border-slate-100 hover:border-purple-300 cursor-pointer transition-all text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-sm shrink-0">{t.category?.icon || '💳'}</span>
                              <span className={`font-semibold text-slate-800 truncate ${isTxPaid ? 'line-through opacity-60' : ''}`}>
                                {t.description}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">({dateFmt.format(new Date(t.date + 'T12:00:00'))})</span>
                            </div>
                            <span className="font-bold tabular-nums text-rose-600 shrink-0 ml-2">
                              {currencyFmt.format(Number(t.amount))}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Lançamentos de Contas Normais (Bancos, PIX, etc) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[600px] overflow-y-auto pr-0.5">
                {standardTransactions.map(t => {
                  const isPaid = t.status === 'paid_planned' || t.status === 'posted'
                  const isOverdue = new Date(t.date + 'T12:00:00') < new Date(new Date().setHours(0, 0, 0, 0)) && !isPaid

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setEditingTx(t)
                        setIsTxModalOpen(true)
                      }}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer group ${isPaid ? 'bg-slate-50 border-slate-200 opacity-60' : (isOverdue ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md')
                        }`}
                    >
                      {/* Linha Superior: Ícone + Descrição Completa + Valor */}
                      <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-base shrink-0 border"
                            style={{
                              backgroundColor: `${t.category?.color || '#94a3b8'}15`,
                              borderColor: `${t.category?.color || '#94a3b8'}30`
                            }}
                          >
                            {t.category?.icon || (t.type === 'expense' ? '💸' : '💰')}
                          </div>
                          <div className={`font-bold text-xs sm:text-sm text-slate-800 leading-snug flex-1 ${isPaid ? 'line-through' : ''}`}>
                            {t.description}
                          </div>
                        </div>

                        <div className={`font-black tabular-nums text-xs sm:text-sm shrink-0 text-right ${t.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {currencyFmt.format(Number(t.amount))}
                        </div>
                      </div>

                      {/* Linha Inferior: Data • Categoria + Botão de Ação */}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-1.5 border-t border-slate-100/80">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="font-semibold text-slate-600 shrink-0">{dateFmt.format(new Date(t.date + 'T12:00:00'))}</span>
                          <span className="shrink-0">•</span>
                          <span className="truncate text-slate-500">{t.category?.name || 'Geral'}</span>
                        </div>

                        {isPaid ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleUnpay(t.id); }}
                            disabled={isPending}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all shrink-0"
                          >
                            Desfazer
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePay(t.id); }}
                            disabled={isPending}
                            className={`px-3 py-1 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1 active:scale-95 shrink-0 ${t.type === 'expense' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t.type === 'expense' ? 'Pagar' : 'Receber'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center flex flex-col items-center">
              <CalendarCheck className="w-10 h-10 text-slate-300 mb-2" />
              <h4 className="font-bold text-xs sm:text-sm text-slate-700">Nenhuma conta pendente!</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">Tudo em dia para o filtro selecionado neste ciclo.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Modal KPI: Detalhes dos Lançamentos por Card */}
      <Modal
        isOpen={Boolean(kpiModal)}
        onClose={() => setKpiModal(null)}
        title={kpiModal?.title || 'Detalhes'}
      >
        <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1 pt-2">
          <p className="text-xs text-slate-500 font-medium">
            Lançamentos vinculados a <strong>{kpiModal?.title}</strong> neste ciclo:
          </p>

          {kpiModalTransactions.length > 0 ? (
            <div className="flex flex-col gap-3">
              {/* Grupos de Cartão de Crédito se houverem */}
              {kpiCreditCardGroups.map(group => (
                <div
                  key={group.card.id}
                  className="p-3.5 rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/40 via-white to-slate-50 flex flex-col gap-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-base shrink-0 border border-purple-200">
                        {group.card.icon || '💳'}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          Fatura {group.card.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {group.transactions.length} compras no ciclo • Vence dia {group.card.due_day || 10}
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-xs sm:text-sm text-rose-600 tabular-nums">
                      {currencyFmt.format(group.total)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-purple-100">
                    {group.transactions.map(t => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setEditingTx(t)
                          setIsTxModalOpen(true)
                        }}
                        className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-sm shrink-0">{t.category?.icon || '💳'}</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 text-xs truncate">{t.description}</div>
                            <div className="text-[10px] text-slate-400 font-medium">
                              {dateFmt.format(new Date(t.date + 'T12:00:00'))} • {t.category?.name || 'Geral'}
                            </div>
                          </div>
                        </div>
                        <span className="font-black text-xs tabular-nums shrink-0 text-rose-600">
                          {currencyFmt.format(Number(t.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Lançamentos comuns (Bancos, PIX, Dinheiro, Receitas) */}
              {kpiStandardTransactions.map(t => (
                <div
                  key={t.id}
                  onClick={() => {
                    setEditingTx(t)
                    setIsTxModalOpen(true)
                  }}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between gap-2 cursor-pointer transition-all active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-base shrink-0">{t.category?.icon || (t.type === 'expense' ? '💸' : '💰')}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 text-xs sm:text-sm truncate">{t.description}</div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {dateFmt.format(new Date(t.date + 'T12:00:00'))} • {t.category?.name || 'Geral'}
                      </div>
                    </div>
                  </div>

                  <div className={`font-black text-xs sm:text-sm tabular-nums shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {currencyFmt.format(Number(t.amount))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
              <CalendarCheck className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-semibold">Nenhum lançamento encontrado para este filtro no ciclo atual.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal 1: Lançamento de Transação / Planejamento */}
      <Modal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false)
          setEditingTx(null)
        }}
        title={editingTx ? "Editar Lançamento" : "Novo Lançamento / Planejamento"}
      >
        <TransactionForm
          workspaceId={workspaces[0]?.id}
          categories={categories}
          accounts={accounts}
          isPlanningMode={true}
          initialData={editingTx}
          onSuccess={() => {
            setIsTxModalOpen(false)
            setEditingTx(null)
          }}
        />
      </Modal>

      {/* Modal 2: Edição Direta de Categoria e Teto de Gastos */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => {
          setIsCatModalOpen(false)
          setEditingCat(null)
        }}
        title={editingCat ? `Editar Orçamento: ${editingCat.name}` : `Nova Categoria`}
      >
        <CategoryForm
          workspaceId={workspaces[0]?.id}
          initialData={editingCat}
          onSuccess={() => {
            setIsCatModalOpen(false)
            setEditingCat(null)
          }}
        />
      </Modal>

      {/* Modal 4: Detalhamento de Gastos por Categoria ao Clicar */}
      <Modal
        isOpen={!!viewCategoryDetail}
        onClose={() => setViewCategoryDetail(null)}
        title={viewCategoryDetail ? `${viewCategoryDetail.icon || '📌'} ${viewCategoryDetail.name}` : 'Gastos da Categoria'}
      >
        {viewCategoryDetail && (() => {
          const cat = viewCategoryDetail
          const spent = spentPerCategory[cat.id] || 0
          const budget = cat.budget_amount || 0
          const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
          const isOver = budget > 0 && spent > budget
          const catTxList = cycleTransactions.filter(t => t.category_id === cat.id)

          return (
            <div className="flex flex-col gap-4 py-1">
              {/* Header de Resumo da Categoria */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-3 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-200/60 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    {cat.is_investment ? '💎 Investimentos & Metas' : (cat.is_fixed ? '📌 Despesa Fixa' : '🛒 Despesa Variável')}
                  </span>
                  <button
                    onClick={() => {
                      setViewCategoryDetail(null)
                      setEditingCat(cat)
                      setIsCatModalOpen(true)
                    }}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    ✏️ Editar Teto
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total no Ciclo</span>
                    <span className="text-xl font-black text-slate-800 tabular-nums">{currencyFmt.format(spent)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Teto Orçado</span>
                    <span className="text-base font-bold text-slate-700 tabular-nums">
                      {budget > 0 ? currencyFmt.format(budget) : 'Sem limite'}
                    </span>
                  </div>
                </div>

                {budget > 0 && (
                  <div className="flex flex-col gap-1 pt-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-500">Uso do Orçamento</span>
                      <span className={isOver ? 'text-rose-600 font-black' : 'text-emerald-600 font-black'}>{pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-600' : (pct > 80 ? 'bg-amber-500' : 'bg-emerald-500')}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de Lançamentos da Categoria */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Lançamentos no Ciclo ({catTxList.length})
                </h4>

                {catTxList.length > 0 ? (
                  <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-0.5">
                    {catTxList.map(t => {
                      const isPaid = t.status === 'paid_planned' || t.status === 'posted'

                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            setViewCategoryDetail(null)
                            setEditingTx(t)
                            setIsTxModalOpen(true)
                          }}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-400 flex flex-col gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all group"
                        >
                          {/* Linha Superior: Descrição com Largura Total + Valor */}
                          <div className="flex items-start justify-between gap-3 min-w-0 w-full">
                            <span className={`font-bold text-xs sm:text-sm text-slate-800 leading-snug flex-1 ${isPaid ? 'line-through opacity-60' : ''}`}>
                              {t.description}
                            </span>
                            <span className={`font-black tabular-nums text-xs sm:text-sm shrink-0 text-right ${t.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {currencyFmt.format(Number(t.amount))}
                            </span>
                          </div>

                          {/* Linha Inferior: Data + Botão de Ação */}
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                            <span className="font-semibold text-slate-600">{dateFmt.format(new Date(t.date + 'T12:00:00'))}</span>

                            {isPaid ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUnpay(t.id); }}
                                disabled={isPending}
                                className="px-2.5 py-1 text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all shrink-0"
                              >
                                Desfazer
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handlePay(t.id); }}
                                disabled={isPending}
                                className={`px-3 py-1 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center gap-1 active:scale-95 shrink-0 ${t.type === 'expense' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                  }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t.type === 'expense' ? 'Pagar' : 'Receber'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Nenhum gasto registrado nesta categoria para este ciclo.
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Modal 3: Configurar Dia da Virada Direto na Tela */}
      <Modal
        isOpen={isTurnoverModalOpen}
        onClose={() => setIsTurnoverModalOpen(false)}
        title="Ajustar Dia de Virada do Mês"
      >
        <div className="flex flex-col gap-4 py-1">
          <p className="text-xs text-slate-500 leading-relaxed">
            Selecione o dia do mês em que seu ciclo de despesas e orçamento renova (ex: dia 5).
          </p>

          <div className="flex items-center justify-center gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-xs sm:text-sm font-bold text-slate-700">Dia</span>
            <input
              type="number"
              min={1}
              max={31}
              value={tempTurnoverDay}
              onChange={(e) => setTempTurnoverDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-16 px-2 py-1.5 text-center text-lg font-black rounded-xl border border-slate-300 bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
            <span className="text-xs sm:text-sm font-bold text-slate-700">de cada mês</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
            {[1, 5, 10, 15, 20, 25, 30].map(day => (
              <button
                key={day}
                type="button"
                onClick={() => setTempTurnoverDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 ${tempTurnoverDay === day ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                Dia {day}
              </button>
            ))}
          </div>

          <button
            onClick={handleSaveTurnoverDay}
            disabled={isPending}
            className="w-full mt-2 btn-primary py-3 flex justify-center items-center gap-2 text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20"
          >
            {isPending ? 'Salvando...' : 'Confirmar e Atualizar Ciclo'}
          </button>
        </div>
      </Modal>
    </main>
  )
}
