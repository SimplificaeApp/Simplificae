"use client";

import { motion } from "framer-motion";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  CalendarDays,
  PiggyBank,
  Settings2,
  Eye,
  EyeOff,
  BarChart3,
} from "lucide-react";
import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { useState, useMemo, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Lock } from "lucide-react";
import dynamic from "next/dynamic";
import {
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

// Lazy load ECharts to avoid large bundle impact on initial load
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false, loading: () => <div className="h-full w-full bg-slate-50 rounded-xl animate-pulse" /> });

type Workspace = { id: string; name: string; type: string };
type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  status: string;
  account_id?: string;
  category_id?: string;
  category?: { id: string; name: string; icon?: string; color?: string } | null;
  ignore_in_cashflow?: boolean;
};
type Category = { id: string; name: string; type: string; icon?: string; color?: string };
type Vault = { id: string; name: string; target_amount: number | null; balance: number; icon?: string; color?: string; account_id: string }
type Account = { id: string; name: string; type: string; initial_balance: number; icon?: string; color?: string; account_vaults?: Vault[] };

const currencyFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const DONUT_COLORS = [
  "#6366f1", "#f43f5e", "#f59e0b", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444", "#64748b",
];

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Custom tooltip for area chart
function AreaChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const income = payload.find((p: any) => p.dataKey === 'Receitas')?.value || 0;
  const expense = payload.find((p: any) => p.dataKey === 'Despesas')?.value || 0;
  const result = income - expense;

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-3 shadow-xl min-w-[160px]">
      <p className="text-xs font-bold text-slate-500 mb-2">Dia {label}</p>
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
    </div>
  );
}

// Custom tooltip for donut chart
function DonutTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-xl px-5 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] min-w-[180px]">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: data.color || data.fill }}></div>
        <span className="text-sm font-bold text-slate-700">{data.name}</span>
      </div>
      <div className="text-lg font-black text-slate-900 tabular-nums mb-1">
        {currencyFmt.format(data.value)}
      </div>
      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
        Fração do Total
      </div>
    </div>
  );
}


export function DashboardClient({
  user,
  workspaces,
  transactions,
  categories,
  accounts,
}: {
  user: any;
  workspaces: Workspace[];
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}) {
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [includeVaults, setIncludeVaults] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState(false);
  const { isUnlocked, globalBlur, toggleGlobalBlur, requestUnlock, lock } = usePrivacy();

  const handleToggleBlur = () => {
    if (globalBlur) {
      // Se está borrado e quer revelar, pede o PIN
      requestUnlock(() => {
        toggleGlobalBlur();
      });
    } else {
      // Se vai borrar, bloqueia de novo por segurança
      lock();
      toggleGlobalBlur();
    }
  }

  const filteredTx = useMemo(() => {
    return transactions.filter(t => {
      if (selectedAccount !== "all" && t.account_id !== selectedAccount) return false;
      if (selectedCategory !== "all" && t.category_id !== selectedCategory) return false;
      return true;
    });
  }, [transactions, selectedAccount, selectedCategory]);

  const validCashflowTx = useMemo(() => {
    return filteredTx.filter(t => {
      if (t.ignore_in_cashflow) return false;
      if (t.status !== 'posted' && t.status !== 'paid_planned') return false;

      const account = accounts.find(a => a.id === t.account_id);
      if (account?.type === 'credit_card') return false;

      return true;
    });
  }, [filteredTx, accounts]);

  // Isolate current month transactions for KPIs
  const currentMonthTx = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return validCashflowTx.filter(t => {
      const txDate = new Date(t.date + 'T12:00:00')
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
    })
  }, [validCashflowTx])

  // KPIs (Only Current Month)
  const totalIncomes = useMemo(
    () => currentMonthTx.filter((t) => t.type === "income").reduce((acc, t) => acc + Number(t.amount), 0),
    [currentMonthTx]
  );

  // O pagamento da fatura do cartão é uma transferência de checking -> credit_card
  // Deve contar como despesa no dashboard (Only Current Month)
  const totalExpenses = useMemo(
    () => currentMonthTx.filter((t) => {
      if (t.type === "expense") return true;
      if (t.type === "transfer") {
        const destAcc = accounts.find(a => a.id === (t as any).destination_account_id);
        if (destAcc?.type === 'credit_card') return true;
      }
      return false;
    }).reduce((acc, t) => acc + Number(t.amount), 0),
    [currentMonthTx, accounts]
  );
  const availableBalance = useMemo(
    () => {
      if (selectedAccount !== "all") {
        const acc = accounts.find(a => a.id === selectedAccount);
        if (!acc || acc.type === 'credit_card') return 0;
        if ((acc as any).is_hidden && !isUnlocked) return 0;
        return Number(acc.initial_balance);
      }
      return accounts.reduce((acc, a) => {
        if (a.type === 'credit_card') return acc;
        if ((a as any).is_hidden && !isUnlocked) return acc;
        return acc + Number(a.initial_balance);
      }, 0);
    },
    [accounts, selectedAccount, isUnlocked]
  );

  const totalInVaults = useMemo(() => {
    let sum = 0;
    accounts.forEach(a => {
      if (selectedAccount === "all" || a.id === selectedAccount) {
        if (a.account_vaults) {
          sum += a.account_vaults.reduce((acc, v) => {
            if ((v as any).include_in_dashboard === false) return acc;
            if ((v as any).is_hidden && !isUnlocked) return acc;
            return acc + Number(v.balance);
          }, 0);
        }
      }
    });
    return sum;
  }, [accounts, selectedAccount, isUnlocked]);

  const totalBalance = availableBalance + totalInVaults;
  const displayBalance = includeVaults ? totalBalance : availableBalance;

  const accountDistributionData = useMemo(() => {
    return accounts
      .filter(a => a.type !== 'credit_card' && Number(a.initial_balance) > 0)
      .map(a => ({
        name: a.name,
        value: Number(a.initial_balance),
        color: a.color || undefined
      }));
  }, [accounts]);

  // Area chart data: aggregate by day
  const areaData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const days: Record<number, { income: number; expense: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) days[d] = { income: 0, expense: 0 };

    currentMonthTx.forEach((t) => {
      const day = new Date(t.date + "T12:00:00").getDate();
      if (t.type === "income") days[day].income += Number(t.amount);
      if (t.type === "expense") days[day].expense += Number(t.amount);
      if (t.type === "transfer") {
        const destAcc = accounts.find(a => a.id === (t as any).destination_account_id);
        if (destAcc?.type === 'credit_card') days[day].expense += Number(t.amount);
      }
    });

    return Object.entries(days).map(([day, v]) => ({
      day: Number(day),
      Receitas: v.income,
      Despesas: v.expense,
    }));
  }, [currentMonthTx, accounts]);

  // Donut data: top categories by expense amount (Only Current Month)
  const donutData = useMemo(() => {
    const catMap = new Map<string, { name: string; value: number; color: string }>();
    currentMonthTx
      .forEach((t) => {
        let isExpense = false;
        let catName = t.category?.name || "Sem Categoria";
        let catColor = t.category?.color || "#64748b";

        if (t.type === "expense") {
          isExpense = true;
        } else if (t.type === "transfer") {
          const destAcc = accounts.find(a => a.id === (t as any).destination_account_id);
          if (destAcc?.type === 'credit_card') {
            isExpense = true;
            catName = "Fatura do Cartão";
            catColor = destAcc.color || "#3b82f6";
          }
        }

        if (isExpense) {
          const existing = catMap.get(catName);
          if (existing) {
            existing.value += Number(t.amount);
          } else {
            catMap.set(catName, { name: catName, value: Number(t.amount), color: catColor });
          }
        }
      });
    return Array.from(catMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [currentMonthTx, accounts]);

  // Macro Bar Chart (Last 6 Months) — must come before ECharts options
  const macroBarData = useMemo(() => {
    const now = new Date()
    const data = []
    for (let i = -5; i <= 0; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const targetMonth = targetDate.getMonth()
      const targetYear = targetDate.getFullYear()
      let inc = 0, exp = 0
      validCashflowTx.forEach(t => {
        const txDate = new Date(t.date + 'T12:00:00')
        if (txDate.getMonth() === targetMonth && txDate.getFullYear() === targetYear) {
          if (t.type === 'income') inc += Number(t.amount)
          if (t.type === 'expense') exp += Number(t.amount)
          if (t.type === 'transfer') {
            const destAcc = accounts.find((a: any) => a.id === (t as any).destination_account_id)
            if (destAcc?.type === 'credit_card') exp += Number(t.amount)
          }
        }
      })
      const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(targetDate)
      data.push({ name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), Receitas: inc, Despesas: exp })
    }
    return data
  }, [validCashflowTx, accounts])

  // ECharts options — Area Chart (Fluxo Diário)
  const areaChartOption = useMemo(() => ({
    grid: { top: 16, right: 16, bottom: 24, left: 54, containLabel: false },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      borderRadius: 12,
      padding: [10, 14],
      textStyle: { color: '#334155', fontSize: 12, fontFamily: 'inherit' },
      formatter: (params: any[]) => {
        const income = params.find((p: any) => p.seriesName === 'Receitas')?.value || 0
        const expense = params.find((p: any) => p.seriesName === 'Despesas')?.value || 0
        const result = income - expense
        const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        return `<div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px">Dia ${params[0].axisValue}</div>` +
          `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:4px"><span style="color:#64748b">Receitas</span><span style="color:#10b981;font-weight:800">${fmt(income)}</span></div>` +
          `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:8px"><span style="color:#64748b">Despesas</span><span style="color:#f43f5e;font-weight:800">${fmt(expense)}</span></div>` +
          `<div style="border-top:1px solid #f1f5f9;padding-top:8px;display:flex;justify-content:space-between;gap:16px"><span style="color:#64748b">Resultado</span><span style="color:${result >= 0 ? '#10b981' : '#f43f5e'};font-weight:900">${result >= 0 ? '+' : ''}${fmt(result)}</span></div>`
      }
    },
    legend: { show: false },
    xAxis: { type: 'category', data: areaData.map(d => d.day), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'inherit' }, splitLine: { show: false } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'inherit', formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v) }, splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } } },
    series: [
      {
        name: 'Receitas', type: 'line', data: areaData.map(d => d.Receitas),
        smooth: true, symbol: 'none', lineStyle: { color: '#10b981', width: 2.5 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.28)' }, { offset: 1, color: 'rgba(16,185,129,0)' }] } },
        animationDuration: 1200, animationEasing: 'cubicOut'
      },
      {
        name: 'Despesas', type: 'line', data: areaData.map(d => d.Despesas),
        smooth: true, symbol: 'none', lineStyle: { color: '#f43f5e', width: 2.5 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(244,63,94,0.18)' }, { offset: 1, color: 'rgba(244,63,94,0)' }] } },
        animationDuration: 1400, animationEasing: 'cubicOut'
      }
    ]
  }), [areaData])

  // ECharts options — Macro Bar Chart (6 meses)
  const macroBarOption = useMemo(() => ({
    // AJUSTE AQUI: Aumentamos o recuo do topo e da base, e ativamos o containLabel
    grid: {
      top: 32,
      right: 16,
      bottom: 36, // Mais espaço para a legenda respirar embaixo do eixo X
      left: 16,   // Reduzido de 54 para 16 porque o containLabel cuidará do espaçamento do texto do eixo Y
      containLabel: true // O pulo do gato para evitar sobreposição automaticamente
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      borderRadius: 12,
      padding: [10, 14],
      textStyle: { color: '#334155', fontSize: 12, fontFamily: 'inherit' },
      formatter: (params: any[]) => {
        const inc = params.find((p: any) => p.seriesName === 'Receitas')?.value || 0
        const exp = params.find((p: any) => p.seriesName === 'Despesas')?.value || 0
        const result = inc - exp
        const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        return `<div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px">${params[0].axisValue}</div>` +
          `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:4px"><span style="color:#64748b">Receitas</span><span style="color:#10b981;font-weight:800">${fmt(inc)}</span></div>` +
          `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:8px"><span style="color:#64748b">Despesas</span><span style="color:#f43f5e;font-weight:800">${fmt(exp)}</span></div>` +
          `<div style="border-top:1px solid #f1f5f9;padding-top:8px;display:flex;justify-content:space-between;gap:16px"><span style="color:#64748b">Líquido</span><span style="color:${result >= 0 ? '#10b981' : '#f43f5e'};font-weight:900">${result >= 0 ? '+' : ''}${fmt(result)}</span></div>`
      }
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#64748b', fontSize: 11, fontFamily: 'inherit' },
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 20
    },
    xAxis: { type: 'category', data: macroBarData.map(d => d.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'inherit' }, splitLine: { show: false } },
    yAxis: { type: 'value', axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#94a3b8', fontSize: 11, fontFamily: 'inherit', formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v) }, splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } } },
    series: [
      { name: 'Receitas', type: 'bar', data: macroBarData.map(d => d.Receitas), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#34d399' }] }, borderRadius: [6, 6, 0, 0] }, barMaxWidth: 36, animationDuration: 1000, animationEasing: 'elasticOut' },
      { name: 'Despesas', type: 'bar', data: macroBarData.map(d => d.Despesas), itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#f43f5e' }, { offset: 1, color: '#fb7185' }] }, borderRadius: [6, 6, 0, 0] }, barMaxWidth: 36, animationDuration: 1200, animationEasing: 'elasticOut' },
    ]
  }), [macroBarData])

  // ECharts options — Donut Despesas
  const donutExpenseOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      borderRadius: 12,
      padding: [10, 14],
      textStyle: { color: '#334155', fontSize: 12, fontFamily: 'inherit' },
      formatter: (p: any) => {
        const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="width:10px;height:10px;border-radius:50%;background:${p.color};display:inline-block"></span><span style="font-weight:700;color:#334155">${p.name}</span></div>` +
          `<div style="font-size:15px;font-weight:900;color:#0f172a">${fmt(p.value)}</div>` +
          `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${p.percent.toFixed(1)}% do total</div>`
      }
    },
    legend: { type: 'scroll', orient: 'horizontal', bottom: 0, textStyle: { color: '#64748b', fontSize: 11, fontFamily: 'inherit' }, icon: 'circle', itemWidth: 8, itemHeight: 8 },
    series: [{
      type: 'pie', radius: ['48%', '72%'], center: ['50%', '44%'],
      padAngle: 4, itemStyle: { borderRadius: 6 },
      label: { show: false },
      emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 16, shadowOffsetY: 6, shadowColor: 'rgba(0,0,0,0.15)' } },
      data: donutData.map((d, i) => ({ name: d.name, value: d.value, itemStyle: { color: d.color || DONUT_COLORS[i % DONUT_COLORS.length] } })),
      animationType: 'expansion', animationDuration: 1000, animationEasing: 'cubicOut'
    }]
  }), [donutData])

  // ECharts options — Donut Distribuição
  const donutDistOption = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.97)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      borderRadius: 12,
      padding: [10, 14],
      textStyle: { color: '#334155', fontSize: 12, fontFamily: 'inherit' },
      formatter: (p: any) => {
        const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="width:10px;height:10px;border-radius:50%;background:${p.color};display:inline-block"></span><span style="font-weight:700;color:#334155">${p.name}</span></div>` +
          `<div style="font-size:15px;font-weight:900;color:#0f172a">${fmt(p.value)}</div>` +
          `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${p.percent.toFixed(1)}% do total</div>`
      }
    },
    legend: { type: 'scroll', orient: 'horizontal', bottom: 0, textStyle: { color: '#64748b', fontSize: 11, fontFamily: 'inherit' }, icon: 'circle', itemWidth: 8, itemHeight: 8 },
    series: [{
      type: 'pie', radius: ['48%', '72%'], center: ['50%', '44%'],
      padAngle: 4, itemStyle: { borderRadius: 6 },
      label: { show: false },
      emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 16, shadowOffsetY: 6, shadowColor: 'rgba(0,0,0,0.15)' } },
      data: accountDistributionData.map((d, i) => ({ name: d.name, value: d.value, itemStyle: { color: d.color || DONUT_COLORS[i % DONUT_COLORS.length] } })),
      animationType: 'expansion', animationDuration: 1000, animationEasing: 'cubicOut'
    }]
  }), [accountDistributionData])

  // ECharts — Gauge de Saúde Financeira
  const spendingRate = totalIncomes > 0 ? Math.min(100, Math.round((totalExpenses / totalIncomes) * 100)) : 0
  const gaugeColor = spendingRate < 70 ? '#10b981' : spendingRate < 90 ? '#f59e0b' : '#f43f5e'
  const gaugeOption = useMemo(() => ({
    series: [{
      type: 'gauge',
      startAngle: 220, endAngle: -40,
      min: 0, max: 100,
      radius: '88%',
      center: ['50%', '58%'],
      progress: { show: true, width: 14, roundCap: true, itemStyle: { color: gaugeColor } },
      axisLine: { lineStyle: { width: 14, color: [[1, '#f1f5f9']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      pointer: { show: false },
      anchor: { show: false },
      detail: {
        show: true,
        offsetCenter: [0, '10%'],
        fontSize: 24,
        fontWeight: 900,
        color: gaugeColor,
        fontFamily: 'inherit',
        formatter: `${spendingRate}%`
      },
      title: {
        show: true,
        offsetCenter: [0, '40%'],
        fontSize: 11,
        color: '#94a3b8',
        fontFamily: 'inherit',
        fontWeight: 600
      },
      data: [{ value: spendingRate, name: 'do orçamento' }],
      animationDuration: 1500, animationEasing: 'cubicOut'
    }]
  }), [spendingRate, gaugeColor])

  // Custom macro bar tooltip (legacy, kept for reference)
  const MacroBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    return null
  }

  // Recent 5 transactions (from filteredTx, including credit cards)
  const recentTx = filteredTx.slice(0, 5);
  const hasData = filteredTx.length > 0;

  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <>
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.3 }} className="flex flex-wrap justify-between items-start lg:items-end mb-8 gap-4 md:gap-6">
          <div className="w-full 2xl:w-auto">
            <h1 className="text-2xl font-black text-slate-900">
              Olá, {user?.user_metadata?.first_name || "Usuário"}! 👋
            </h1>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              Fluxo de caixa de{" "}
              <span className="font-semibold text-slate-700">
                {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center 2xl:justify-end gap-3 w-full 2xl:flex-1">
            {/* Mobile Filters Toggle Button */}
            <div className="flex justify-between md:hidden w-full gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings2 className="w-4 h-4" />
                Filtros {selectedAccount !== 'all' || selectedCategory !== 'all' ? '(Ativos)' : ''}
              </button>

              <button
                onClick={handleToggleBlur}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 flex items-center justify-center shadow-sm"
                title={globalBlur ? "Mostrar saldos" : "Ocultar saldos"}
              >
                {globalBlur ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className={`${showFilters ? 'flex' : 'hidden'} md:flex flex-col md:flex-row flex-wrap items-center gap-2.5 w-full md:w-auto bg-slate-100/60 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs`}>
              {/* Seletor de Conta Ultramoderno */}
              <div className="relative w-full md:w-auto">
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full md:w-auto pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs appearance-none cursor-pointer"
                >
                  <option value="all">💳 Todas as Contas</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.icon ? `${a.icon} ` : ''}{a.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {/* Seletor de Categoria Ultramoderno */}
              <div className="relative w-full md:w-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full md:w-auto pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs appearance-none cursor-pointer"
                >
                  <option value="all">🏷️ Todas as Categorias</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              {/* Checkbox Cofrinhos Ultramoderno */}
              <label className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 transition-all shadow-xs select-none w-full md:w-auto">
                <input
                  type="checkbox"
                  checked={includeVaults}
                  onChange={(e) => setIncludeVaults(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <PiggyBank className="w-4 h-4 text-emerald-600" />
                <span>Incluir Cofrinhos</span>
              </label>

              {/* Reset button se houver filtro ativo */}
              {(selectedAccount !== 'all' || selectedCategory !== 'all') && (
                <button
                  onClick={() => { setSelectedAccount('all'); setSelectedCategory('all'); }}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all w-full md:w-auto text-center"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
              <button
                onClick={handleToggleBlur}
                className="hidden md:flex px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 items-center justify-center transition-colors shadow-sm hover:shadow-md"
                title={globalBlur ? "Mostrar saldos" : "Ocultar saldos"}
              >
                {globalBlur ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              {isUnlocked && (
                <button
                  onClick={lock}
                  className="hidden md:flex px-4 py-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 hover:bg-rose-100 items-center justify-center transition-colors shadow-sm hover:shadow-md"
                  title="Bloquear Sessão"
                >
                  <Lock className="w-5 h-5" />
                </button>
              )}

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsTxModalOpen(true)}
                className="btn-primary flex items-center justify-center gap-2 shadow-[0_8px_20px_rgb(16,185,129,0.3)] flex-1 md:flex-none text-sm px-6 py-2.5"
              >
                <Plus className="w-5 h-5" />
                Nova Transação
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="glass-panel p-5 md:p-6 rounded-2xl group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-500">Saldo Consolidado</h3>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <div
              className={`text-2xl xl:text-3xl font-black text-slate-900 tabular-nums truncate ${globalBlur ? 'blur-sm select-none cursor-pointer' : ''}`}
              onClick={globalBlur ? () => requestUnlock() : undefined}
            >
              {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(displayBalance)}
            </div>
            {/* PRINT DOS SALDOS */}
            {/* <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
              <span>
                {includeVaults
                  ? `${currencyFmt.format(availableBalance)} disponível`
                  : `${currencyFmt.format(totalBalance)} com cofrinhos`}
              </span>
              {totalInVaults > 0 && (
                <span className="text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">
                  {currencyFmt.format(totalInVaults)} guardado
                </span>
              )}
            </div> */}
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="glass-panel p-5 md:p-6 rounded-2xl group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={areaData}>
                  <Line type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={3} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-500">Receitas</h3>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <div className="text-2xl xl:text-3xl font-black text-emerald-600 tabular-nums truncate">
                {currencyFmt.format(totalIncomes)}
              </div>
              <p className="text-xs text-slate-400 mt-1">{MONTHS[new Date().getMonth()]}</p>
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="glass-panel p-5 md:p-6 rounded-2xl group hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={areaData}>
                  <Line type="monotone" dataKey="Despesas" stroke="#f43f5e" strokeWidth={3} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-slate-500">Despesas</h3>
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                </div>
              </div>
              <div className="text-2xl xl:text-3xl font-black text-rose-600 tabular-nums truncate">
                {currencyFmt.format(totalExpenses)}
              </div>
              <p className="text-xs text-slate-400 mt-1">{MONTHS[new Date().getMonth()]}</p>
            </div>
          </motion.div>
        </div>

        {/* Charts Row 1: Area & Macro Bar — ECharts */}
        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 md:gap-6 mb-8">
            {/* Area Chart */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="lg:col-span-4 glass-panel rounded-2xl p-5 md:p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">Fluxo Diário <span className="text-slate-400 font-medium text-sm">({MONTHS[new Date().getMonth()]})</span></h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-600 font-semibold"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Receitas</span>
                  <span className="flex items-center gap-1.5 text-rose-500 font-semibold"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />Despesas</span>
                </div>
              </div>
              <div className="h-64 md:h-72">
                <ReactECharts option={areaChartOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </motion.div>

            {/* Gauge */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="lg:col-span-2 glass-panel rounded-2xl p-5 md:p-6 flex flex-col"
            >
              <h3 className="font-bold text-slate-800 mb-1">Saúde Financeira</h3>
              <p className="text-xs text-slate-400 mb-2">% despesas vs receitas</p>
              <div className="flex-1 min-h-0 h-48 md:h-full">
                <ReactECharts option={gaugeOption} style={{ height: '100%', width: '100%' }} />
              </div>
              <p className={`text-center text-xs font-bold mt-1 ${spendingRate < 70 ? 'text-emerald-600' : spendingRate < 90 ? 'text-amber-500' : 'text-rose-600'
                }`}>
                {spendingRate < 70 ? '✅ Dentro do orçamento' : spendingRate < 90 ? '⚠️ Atenção aos gastos' : '🚨 Gastos elevados'}
              </p>
            </motion.div>
          </div>
        )}

        {/* Macro Bar Chart */}
        {hasData && (
          <div className="mb-8">
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.28 }}
              className="glass-panel rounded-2xl p-5 md:p-6"
            >
              <h3 className="font-bold text-slate-800 mb-4">Visão Geral <span className="text-slate-400 font-medium text-sm">(Últimos 6 Meses)</span></h3>
              <div className="h-64 md:h-72">
                <ReactECharts option={macroBarOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </motion.div>
          </div>
        )}

        {/* Charts Row 2: Donuts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
          {/* Donut Despesas */}
          {hasData && (
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="glass-panel rounded-2xl p-5 md:p-6"
            >
              <h3 className="font-bold text-slate-800 mb-4">Top Despesas <span className="text-slate-400 font-medium text-sm">(Mês Atual)</span></h3>
              {donutData.length > 0 ? (
                <div className="h-64 md:h-72">
                  <ReactECharts option={donutExpenseOption} style={{ height: '100%', width: '100%' }} />
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <BarChart3 className="w-10 h-10 text-slate-200" />
                  <p className="text-sm">Nenhuma despesa no mês atual</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Donut Distribuição de Contas */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.32 }}
            className="glass-panel rounded-2xl p-5 md:p-6"
          >
            <h3 className="font-bold text-slate-800 mb-4">Distribuição do Saldo</h3>
            {accountDistributionData.length > 0 ? (
              <div className="h-64 md:h-72">
                <ReactECharts option={donutDistOption} style={{ height: '100%', width: '100%' }} />
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Wallet className="w-10 h-10 text-slate-200" />
                <p className="text-sm">Nenhuma conta com saldo positivo</p>
              </div>
            )}
          </motion.div>
        </div>


        {/* Recent Transactions */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass-panel rounded-2xl p-5 md:p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Transações Recentes</h3>
            {hasData && (
              <a
                href="/transactions"
                className="text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              >
                Ver todas →
              </a>
            )}
          </div>
          {hasData ? (
            <div className="flex flex-col divide-y divide-slate-100">
              {recentTx.map((t) => {
                const isIncome = t.type === "income";
                const isTransfer = t.type === "transfer";
                return (
                  <div
                    key={t.id}
                    className="flex justify-between items-center py-3.5 group hover:bg-slate-50/50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isTransfer
                          ? "bg-blue-50 text-blue-600"
                          : isIncome
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-rose-50 text-rose-600"
                          }`}
                      >
                        {t.category?.icon ? (
                          <span className="text-base">{t.category.icon}</span>
                        ) : isTransfer ? (
                          <ArrowRightLeft className="w-5 h-5" />
                        ) : isIncome ? (
                          <TrendingUp className="w-5 h-5" />
                        ) : (
                          <TrendingDown className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{t.description}</div>
                        <div className="text-xs text-slate-400 font-medium">
                          {t.category?.name || (isTransfer ? "Pagamento de Fatura" : "")}{" "}
                          · {new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`font-bold text-sm tabular-nums ${isTransfer
                        ? "text-blue-600"
                        : isIncome
                          ? "text-emerald-600"
                          : "text-rose-600"
                        }`}
                    >
                      {isIncome ? "+" : isTransfer ? "" : "-"}{" "}
                      {currencyFmt.format(Number(t.amount))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="w-12 h-12 text-slate-300 mb-4" />
              <h2 className="text-lg font-bold text-slate-700 mb-2">Nenhuma transação encontrada</h2>
              <p className="text-sm text-slate-500 max-w-sm mb-6">
                Comece adicionando sua primeira receita ou despesa para ver o fluxo de caixa aqui.
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsTxModalOpen(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Nova Transação
              </motion.button>
            </div>
          )}
        </motion.div>
      </main>

      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title="Nova Transação"
      >
        <TransactionForm
          workspaceId={workspaces[0]?.id}
          categories={categories}
          accounts={accounts}
          onSuccess={() => setIsTxModalOpen(false)}
        />
      </Modal>
    </>
  );
}
