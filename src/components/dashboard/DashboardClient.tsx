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
import { CustomSelect } from "@/components/ui/CustomSelect";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { getCreditCardDueDate } from "@/lib/creditCardUtils";
import { Lock } from "lucide-react";
import dynamic from "next/dynamic";
import { useTransactionsQuery, useCategoriesQuery, useAccountsQuery } from "@/hooks/useFinancialData";

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
  transactions: initialTransactions,
  categories: initialCategories,
  accounts: initialAccounts,
}: {
  user: any;
  workspaces: Workspace[];
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}) {
  const { data: cachedTransactions } = useTransactionsQuery(initialTransactions);
  const { data: cachedCategories } = useCategoriesQuery(initialCategories);
  const { data: cachedAccounts } = useAccountsQuery(initialAccounts);

  const transactions = cachedTransactions || initialTransactions;
  const categories = cachedCategories || initialCategories;
  const accounts = cachedAccounts || initialAccounts;

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [includeVaults, setIncludeVaults] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState<'fluxo' | 'macro' | 'gastos' | 'saldo' | 'saude'>('fluxo');
  const [distributionTab, setDistributionTab] = useState<'expense' | 'income'>('expense');
  const [hiddenExpenseCategories, setHiddenExpenseCategories] = useState<string[]>([]);
  const [hiddenIncomeCategories, setHiddenIncomeCategories] = useState<string[]>([]);
  const { isUnlocked, globalBlur, toggleGlobalBlur, requestUnlock, lock } = usePrivacy();

  const toggleHiddenExpenseCategory = (name: string) => {
    setHiddenExpenseCategories(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const toggleHiddenIncomeCategory = (name: string) => {
    setHiddenIncomeCategories(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const [detailModal, setDetailModal] = useState<{
    title: string;
    subtitle?: string;
    type: 'balance' | 'incomes' | 'expenses' | 'result' | 'category' | 'account';
    categoryName?: string;
    accountId?: string;
  } | null>(null);

  const chartEvents = useMemo(() => ({
    click: (params: any) => {
      if (params.name) {
        setDetailModal({
          title: `Gastos em ${params.name}`,
          subtitle: `Movimentações registradas na categoria ${params.name}`,
          type: 'category',
          categoryName: params.name
        });
      }
    }
  }), []);

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

  const accountsMap = useMemo(() => {
    const map: Record<string, Account> = {};
    accounts.forEach(acc => { map[acc.id] = acc; });
    return map;
  }, [accounts]);

  const dashboardAccountOptions = useMemo(() => {
    const bankAccs = accounts
      .filter(a => a.type !== 'credit_card')
      .map(a => ({ id: a.id, label: a.name, icon: a.icon || '🏦', group: '🏦 Contas Bancárias' }));

    const ccAccs = accounts
      .filter(a => a.type === 'credit_card')
      .map(a => ({ id: a.id, label: a.name, icon: a.icon || '💳', group: '💳 Cartões de Crédito' }));

    return [
      { id: "all", label: "Todas as Contas", icon: "📊" },
      ...bankAccs,
      ...ccAccs
    ];
  }, [accounts]);

  const dashboardCategoryOptions = useMemo(() => [
    { id: "all", label: "Todas as Categorias", icon: "🏷️" },
    ...categories.map((c) => ({ id: c.id, label: c.name, icon: c.icon }))
  ], [categories]);

  const isInvoicePaymentTx = useCallback((t: Transaction) => {
    if (t.type === 'transfer') {
      const destAcc = accountsMap[(t as any).destination_account_id];
      if (destAcc?.type === 'credit_card') return true;
    }

    const desc = (t.description || '').toLowerCase();
    const catName = (t.category?.name || '').toLowerCase();

    const keywords = [
      'pagamento cart',
      'pagamento de cart',
      'pagamento fatura',
      'pagamento de fatura',
      'fatura cart',
      'fatura nubank',
      'fatura inter',
      'fatura itau',
      'pagamento nubank',
      'pagamento inter'
    ];

    return keywords.some(k => desc.includes(k) || catName.includes(k));
  }, [accountsMap]);

  const isTxConfirmed = useCallback((t: Transaction) => {
    const acc = t.account_id ? accountsMap[t.account_id] : null;
    const isCreditCard = acc?.type === 'credit_card';

    if (isCreditCard) {
      if (t.status === 'paid_planned') return true;

      const hasInvoicePayment = transactions.some(other =>
        isInvoicePaymentTx(other) &&
        (other as any).destination_account_id === t.account_id &&
        (other.status === 'posted' || other.status === 'paid_planned')
      );
      return hasInvoicePayment;
    }

    return t.status === 'posted' || t.status === 'paid_planned';
  }, [accountsMap, transactions, isInvoicePaymentTx]);

  const filteredTx = useMemo(() => {
    return transactions.filter(t => {
      // ONLY include confirmed / posted transactions (exclude 'pending' / unconfirmed items)
      const isConfirmed = isTxConfirmed(t);
      if (!isConfirmed && !isInvoicePaymentTx(t)) return false;

      if (selectedAccount !== "all" && t.account_id !== selectedAccount) return false;
      if (selectedCategory !== "all" && t.category_id !== selectedCategory) return false;
      return true;
    });
  }, [transactions, selectedAccount, selectedCategory, isTxConfirmed, isInvoicePaymentTx]);

  const cyclePeriod = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0);
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    return { startDate, endDate };
  }, []);

  const getTransactionEffectiveDate = useCallback((t: Transaction) => {
    const acc = t.account_id ? accountsMap[t.account_id] : ((t as any).account || null);
    if (acc && acc.type === 'credit_card' && t.type === 'expense') {
      const closingDay = Number((acc as any).closing_day) || 1;
      const dueDay = Number((acc as any).due_day) || 10;
      return getCreditCardDueDate(t.date, closingDay, dueDay);
    }
    return new Date(t.date + 'T12:00:00');
  }, [accountsMap]);

  // Isolate current month transactions for KPIs strictly by effective date and confirmed status
  const currentMonthTx = useMemo(() => {
    return filteredTx
      .filter(t => {
        if (t.ignore_in_cashflow) return false;

        const isConfirmed = isTxConfirmed(t);
        if (!isConfirmed && !isInvoicePaymentTx(t)) return false;

        // Check if invoice payment transfer should be ignored (only ignore if individual CC purchases are already confirmed for that card)
        if (isInvoicePaymentTx(t)) {
          const destCardId = (t as any).destination_account_id;
          const hasIndividualCCExpenses = filteredTx.some(other =>
            other.account_id === destCardId &&
            other.type === 'expense' &&
            isTxConfirmed(other)
          );
          if (hasIndividualCCExpenses) return false;
        }

        const txEffectiveDate = getTransactionEffectiveDate(t);
        return txEffectiveDate >= cyclePeriod.startDate && txEffectiveDate <= cyclePeriod.endDate;
      })
      .sort((a, b) => new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime());
  }, [filteredTx, cyclePeriod, isInvoicePaymentTx, isTxConfirmed, getTransactionEffectiveDate]);

  // KPIs (Only Current Month)
  const totalIncomes = useMemo(
    () => currentMonthTx.filter((t) => {
      if (t.type !== "income") return false;
      const acc = t.account_id ? accountsMap[t.account_id] : ((t as any).account || null);
      return !acc || acc.type !== 'credit_card';
    }).reduce((acc, t) => acc + Number(t.amount), 0),
    [currentMonthTx, accountsMap]
  );

  const totalExpenses = useMemo(
    () => currentMonthTx.reduce((acc, t) => {
      const accObj = t.account_id ? accountsMap[t.account_id] : ((t as any).account || null);
      const isCC = Boolean(accObj && accObj.type === 'credit_card');
      if (t.type === 'expense') return acc + Number(t.amount);
      if (isCC && t.type === 'income') return acc - Number(t.amount);
      return acc;
    }, 0),
    [currentMonthTx, accountsMap]
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
          sum += a.account_vaults.reduce((acc: number, v: Vault) => {
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
    const daysInMonth = new Date(cyclePeriod.startDate.getFullYear(), cyclePeriod.startDate.getMonth() + 1, 0).getDate();
    const days: Record<number, { income: number; expense: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) days[d] = { income: 0, expense: 0 };

    currentMonthTx.forEach((t) => {
      const day = new Date(t.date + 'T12:00:00').getDate();
      if (days[day]) {
        const acc = t.account_id ? accountsMap[t.account_id] : ((t as any).account || null);
        const isCC = Boolean(acc && acc.type === 'credit_card');
        if (t.type === "income") {
          if (!isCC) days[day].income += Number(t.amount);
          else days[day].expense -= Number(t.amount);
        }
        if (t.type === "expense") days[day].expense += Number(t.amount);
      }
    });

    return Object.entries(days).map(([day, v]) => ({
      day: Number(day),
      Receitas: v.income,
      Despesas: v.expense,
    }));
  }, [currentMonthTx, cyclePeriod, accountsMap]);

  // Donut data: top categories by expense amount (Only Current Month)
  const donutData = useMemo(() => {
    const catMap = new Map<string, { name: string; icon: string; value: number }>();
    currentMonthTx.forEach((t) => {
      if (t.type === "expense") {
        const resolvedCat = t.category || categories.find(c => c.id === (t as any).category_id);
        const catName = resolvedCat?.name || "Outros Gastos";
        const catIcon = resolvedCat?.icon || "🏷️";

        const existing = catMap.get(catName);
        if (existing) {
          existing.value += Number(t.amount);
        } else {
          catMap.set(catName, { name: catName, icon: catIcon, value: Number(t.amount) });
        }
      }
    });

    const VIBRANT_PALETTE = [
      "#3b82f6", // Royal Blue
      "#10b981", // Emerald Green
      "#f59e0b", // Amber Gold
      "#8b5cf6", // Purple / Violet
      "#ec4899", // Vivid Pink
      "#06b6d4", // Cyan
      "#f97316", // Vivid Orange
      "#6366f1", // Indigo
      "#e11d48", // Crimson Rose
    ];

    return Array.from(catMap.values())
      .sort((a, b) => b.value - a.value)
      .map((item, idx) => ({
        ...item,
        color: VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length]
      }));
  }, [currentMonthTx, categories]);

  // Donut data: top categories by income amount (Only Current Month)
  const donutIncomeData = useMemo(() => {
    const catMap = new Map<string, { name: string; icon: string; value: number }>();
    currentMonthTx.forEach((t) => {
      if (t.type === "income") {
        const acc = t.account_id ? accountsMap[t.account_id] : ((t as any).account || null);
        const isCC = Boolean(acc && acc.type === 'credit_card');
        if (isCC) return;

        const resolvedCat = t.category || categories.find(c => c.id === (t as any).category_id);
        const catName = resolvedCat?.name || "Outras Entradas";
        const catIcon = resolvedCat?.icon || "💰";

        const existing = catMap.get(catName);
        if (existing) {
          existing.value += Number(t.amount);
        } else {
          catMap.set(catName, { name: catName, icon: catIcon, value: Number(t.amount) });
        }
      }
    });

    const INCOME_PALETTE = [
      "#10b981", "#06b6d4", "#3b82f6", "#8b5cf6",
      "#f59e0b", "#84cc16", "#ec4899", "#14b8a6"
    ];

    return Array.from(catMap.values())
      .sort((a, b) => b.value - a.value)
      .map((item, idx) => ({
        ...item,
        color: INCOME_PALETTE[idx % INCOME_PALETTE.length]
      }));
  }, [currentMonthTx, categories, accountsMap]);

  // Macro Bar Chart (Last 6 Months) — must come before ECharts options
  const macroBarData = useMemo(() => {
    const now = new Date();
    const data = [];
    for (let i = -5; i <= 0; i++) {
      const targetMonthStart = new Date(now.getFullYear(), now.getMonth() + i, 1, 0, 0, 0);
      const targetMonthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 23, 59, 59);

      let inc = 0, exp = 0;
      filteredTx.forEach((t: Transaction) => {
        if (t.ignore_in_cashflow) return;

        const isConfirmed = isTxConfirmed(t);
        if (!isConfirmed && !isInvoicePaymentTx(t)) return;

        if (isInvoicePaymentTx(t)) {
          const destCardId = (t as any).destination_account_id;
          const hasIndividualCCExpenses = filteredTx.some(other =>
            other.account_id === destCardId &&
            other.type === 'expense' &&
            isTxConfirmed(other)
          );
          if (hasIndividualCCExpenses) return;
        }

        const txEffectiveDate = getTransactionEffectiveDate(t);
        if (txEffectiveDate >= targetMonthStart && txEffectiveDate <= targetMonthEnd) {
          const acc = t.account_id ? accountsMap[t.account_id] : ((t as any).account || null);
          const isCC = Boolean(acc && acc.type === 'credit_card');
          if (t.type === 'income') {
            if (!isCC) inc += Number(t.amount);
            else exp -= Number(t.amount);
          }
          if (t.type === 'expense') exp += Number(t.amount);
        }
      });
      const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(targetMonthStart);
      data.push({ name: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), Receitas: inc, Despesas: exp });
    }
    return data;
  }, [filteredTx, isInvoicePaymentTx, isTxConfirmed, getTransactionEffectiveDate, accountsMap]);

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
    grid: {
      top: 32,
      right: 16,
      bottom: 36,
      left: 16,
      containLabel: true
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
  const donutExpenseOption = useMemo(() => {
    const visibleData = donutData.filter(d => !hiddenExpenseCategories.includes(d.name));
    return {
      tooltip: {
        trigger: 'item',
        extraCssText: 'z-index: 10 !important;',
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 12,
        padding: [10, 14],
        textStyle: { color: '#334155', fontSize: 12, fontFamily: 'inherit' },
        formatter: (p: any) => {
          const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          const icon = p.data.icon ? `${p.data.icon} ` : '';
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="width:10px;height:10px;border-radius:50%;background:${p.color};display:inline-block"></span><span style="font-weight:700;color:#334155">${icon}${p.name}</span></div>` +
            `<div style="font-size:15px;font-weight:900;color:#0f172a">${fmt(p.value)}</div>` +
            `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${p.percent.toFixed(1)}% do total</div>`
        }
      },
      legend: { show: false },
      series: [{
        type: 'pie', radius: ['48%', '72%'], center: ['50%', '44%'],
        padAngle: 2, minAngle: 3, itemStyle: { borderRadius: 6 },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 16, shadowOffsetY: 6, shadowColor: 'rgba(0,0,0,0.15)' } },
        data: visibleData.length > 0
          ? visibleData.map((d) => ({ name: d.name, icon: d.icon, value: d.value, itemStyle: { color: d.color } }))
          : [{ value: 1, name: hiddenExpenseCategories.length > 0 ? 'Fatias ocultadas' : 'Sem dados', itemStyle: { color: '#e2e8f0' } }],
        animationType: 'expansion', animationDuration: 1000, animationEasing: 'cubicOut'
      }]
    };
  }, [donutData, hiddenExpenseCategories]);

  // ECharts options — Donut Entradas
  const donutIncomeOption = useMemo(() => {
    const visibleData = donutIncomeData.filter(d => !hiddenIncomeCategories.includes(d.name));
    return {
      tooltip: {
        trigger: 'item',
        extraCssText: 'z-index: 10 !important;',
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 12,
        padding: [10, 14],
        textStyle: { color: '#334155', fontSize: 12, fontFamily: 'inherit' },
        formatter: (p: any) => {
          const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          const icon = p.data.icon ? `${p.data.icon} ` : '';
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="width:10px;height:10px;border-radius:50%;background:${p.color};display:inline-block"></span><span style="font-weight:700;color:#334155">${icon}${p.name}</span></div>` +
            `<div style="font-size:15px;font-weight:900;color:#0f172a">${fmt(p.value)}</div>` +
            `<div style="font-size:10px;color:#94a3b8;margin-top:2px">${p.percent.toFixed(1)}% do total</div>`
        }
      },
      legend: { show: false },
      series: [{
        type: 'pie', radius: ['48%', '72%'], center: ['50%', '44%'],
        padAngle: 2, minAngle: 3, itemStyle: { borderRadius: 6 },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 16, shadowOffsetY: 6, shadowColor: 'rgba(0,0,0,0.15)' } },
        data: visibleData.length > 0
          ? visibleData.map((d) => ({ name: d.name, icon: d.icon, value: d.value, itemStyle: { color: d.color } }))
          : [{ value: 1, name: hiddenIncomeCategories.length > 0 ? 'Fatias ocultadas' : 'Sem dados', itemStyle: { color: '#e2e8f0' } }],
        animationType: 'expansion', animationDuration: 1000, animationEasing: 'cubicOut'
      }]
    };
  }, [donutIncomeData, hiddenIncomeCategories]);

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
      padAngle: 2, minAngle: 3, itemStyle: { borderRadius: 6 },
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

  // Recent 5 transactions up to today (from filteredTx, excluding future installments)
  const recentTx = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return filteredTx
      .filter(t => t.date <= todayStr)
      .sort((a, b) => new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime())
      .slice(0, 5);
  }, [filteredTx]);
  const hasData = filteredTx.length > 0;

  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
  };

  const netMonthlyResult = totalIncomes - totalExpenses;
  const savingsRate = totalIncomes > 0 ? Math.max(0, Math.round((netMonthlyResult / totalIncomes) * 100)) : 0;

  const liquidAccounts = useMemo(() => {
    return accounts.filter(a => a.type !== 'credit_card');
  }, [accounts]);

  return (
    <>
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.3 }} className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Olá, {user?.user_metadata?.first_name || "Usuário"}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              Resumo Financeiro ·{" "}
              <span className="font-bold text-slate-700">
                {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto relative z-30">
            {/* Quick Filters */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs w-full sm:w-auto overflow-visible relative z-30">
              <CustomSelect
                value={selectedAccount}
                onChange={setSelectedAccount}
                options={dashboardAccountOptions}
                placeholder="Todas as Contas"
                className="flex-1 sm:flex-initial sm:w-40 text-xs min-w-[130px]"
              />

              <CustomSelect
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={dashboardCategoryOptions}
                placeholder="Todas as Categorias"
                className="flex-1 sm:flex-initial sm:w-44 text-xs min-w-[130px]"
              />

              <div className="flex items-center gap-1.5 shrink-0">
                <label className="flex items-center gap-1.5 px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50 transition-all shadow-2xs select-none">
                  <input
                    type="checkbox"
                    checked={includeVaults}
                    onChange={(e) => setIncludeVaults(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <PiggyBank className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Cofrinhos</span>
                </label>

                <button
                  onClick={handleToggleBlur}
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 flex items-center justify-center shadow-2xs shrink-0 transition-colors"
                  title={globalBlur ? "Mostrar saldos" : "Ocultar saldos"}
                >
                  {globalBlur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                {isUnlocked && (
                  <button
                    onClick={lock}
                    className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 hover:bg-rose-100 flex items-center justify-center shadow-2xs shrink-0 transition-colors"
                    title="Bloquear Sessão"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsTxModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              Nova Transação
            </motion.button>
          </div>
        </motion.div>

        {/* 4 Hero KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Saldo Consolidado */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.3, delay: 0.05 }}
            onClick={() => setDetailModal({
              title: 'Resumo do Saldo Consolidado',
              subtitle: 'Detalhamento de contas e cofrinhos vinculados',
              type: 'balance'
            })}
            className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:shadow-md hover:border-emerald-300 transition-all relative overflow-hidden group cursor-pointer"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saldo Consolidado</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-xl sm:text-2xl font-black text-slate-900 tabular-nums truncate ${globalBlur && !isUnlocked ? 'blur-sm select-none' : ''}`}
            >
              {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(displayBalance)}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold mt-1 flex items-center justify-between">
              {includeVaults ? (
                <span>
                  Inclui <strong className="text-emerald-600 font-bold">{globalBlur && !isUnlocked ? '••••' : currencyFmt.format(totalInVaults)}</strong> de cofrinhos
                </span>
              ) : (
                <span>Saldo disponível nas contas</span>
              )}
              <span className="text-emerald-600 font-bold group-hover:translate-x-0.5 transition-transform">Ver detalhes →</span>
            </div>
          </motion.div>

          {/* 2. Entradas do Mês */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.3, delay: 0.1 }}
            onClick={() => setDetailModal({
              title: 'Entradas do Mês',
              subtitle: `Lançamentos de receita em ${MONTHS[new Date().getMonth()]}`,
              type: 'incomes'
            })}
            className="glass-panel p-4 sm:p-5 rounded-2xl border border-emerald-100/80 hover:shadow-md hover:border-emerald-300 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Entradas do Mês</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-xl sm:text-2xl font-black text-emerald-600 tabular-nums truncate ${globalBlur && !isUnlocked ? 'blur-sm select-none' : ''}`}
            >
              {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(totalIncomes)}
            </div>
            <div className="text-[11px] text-emerald-700/80 font-medium mt-1 flex items-center justify-between">
              <span>{MONTHS[new Date().getMonth()]} {new Date().getFullYear()}</span>
              <span className="text-emerald-600 font-bold group-hover:translate-x-0.5 transition-transform">Ver lista →</span>
            </div>
          </motion.div>

          {/* 3. Saídas do Mês */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.3, delay: 0.15 }}
            onClick={() => setDetailModal({
              title: 'Saídas do Mês',
              subtitle: `Lançamentos de despesa em ${MONTHS[new Date().getMonth()]}`,
              type: 'expenses'
            })}
            className="glass-panel p-4 sm:p-5 rounded-2xl border border-rose-100/80 hover:shadow-md hover:border-rose-300 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Saídas do Mês</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-xl sm:text-2xl font-black text-rose-600 tabular-nums truncate ${globalBlur && !isUnlocked ? 'blur-sm select-none' : ''}`}
            >
              {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(totalExpenses)}
            </div>
            <div className="text-[11px] text-rose-700/80 font-medium mt-1 flex items-center justify-between">
              <span>{totalIncomes > 0 ? `${Math.round((totalExpenses / totalIncomes) * 100)}% das receitas` : 'Sem receitas no mês'}</span>
              <span className="text-rose-600 font-bold group-hover:translate-x-0.5 transition-transform">Ver lista →</span>
            </div>
          </motion.div>

          {/* 4. Economia / Resultado */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.3, delay: 0.2 }}
            onClick={() => setDetailModal({
              title: 'Balanço do Mês',
              subtitle: `Comparativo entre Entradas e Saídas em ${MONTHS[new Date().getMonth()]}`,
              type: 'result'
            })}
            className={`glass-panel p-4 sm:p-5 rounded-2xl border ${netMonthlyResult >= 0 ? 'border-emerald-100/80 bg-emerald-50/20 hover:border-emerald-300' : 'border-rose-100/80 bg-rose-50/20 hover:border-rose-300'} hover:shadow-md transition-all group cursor-pointer`}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Resultado do Mês</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${netMonthlyResult >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {netMonthlyResult >= 0 ? '📈' : '📉'}
              </div>
            </div>
            <div
              className={`text-xl sm:text-2xl font-black tabular-nums truncate ${netMonthlyResult >= 0 ? 'text-emerald-700' : 'text-rose-600'} ${globalBlur && !isUnlocked ? 'blur-sm select-none' : ''}`}
            >
              {globalBlur && !isUnlocked ? '••••' : `${netMonthlyResult >= 0 ? '+' : ''}${currencyFmt.format(netMonthlyResult)}`}
            </div>
            <div className="text-[11px] font-semibold mt-1 text-slate-500 flex items-center justify-between">
              <span>{netMonthlyResult >= 0 ? `Taxa de poupança: ${savingsRate}%` : 'Superávit negativo este mês'}</span>
              <span className="text-slate-700 font-bold group-hover:translate-x-0.5 transition-transform">Ver resumo →</span>
            </div>
          </motion.div>
        </div>

        {/* Visão Geral Financeira - Main 2 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Card (2 Columns) */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="lg:col-span-2 glass-panel rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Evolução do Fluxo Financeiro</h3>
                <p className="text-xs text-slate-500 font-medium">Acompanhe entradas e saídas ao longo do tempo</p>
              </div>

              {/* Segmented Chart Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setActiveChartTab('fluxo')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${activeChartTab === 'fluxo' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  Fluxo Diário
                </button>
                <button
                  type="button"
                  onClick={() => setActiveChartTab('macro')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${activeChartTab === 'macro' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  6 Meses
                </button>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full">
              {activeChartTab === 'fluxo' ? (
                <ReactECharts notMerge={true} lazyUpdate={true} option={areaChartOption} style={{ height: '100%', width: '100%' }} />
              ) : (
                <ReactECharts notMerge={true} lazyUpdate={true} option={macroBarOption} style={{ height: '100%', width: '100%' }} />
              )}
            </div>
          </motion.div>

          {/* Category Spending / Income Breakdown (1 Column) */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.35, delay: 0.3 }}
            className="glass-panel rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-0.5">
                    {distributionTab === 'expense' ? 'Top Gastos por Categoria' : 'Top Entradas por Categoria'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Clique no ícone de olho para ocultar a fatia do gráfico</p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0 self-stretch sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setDistributionTab('expense')}
                    className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                      distributionTab === 'expense' ? 'bg-white text-rose-600 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>💸 Despesas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistributionTab('income')}
                    className={`flex-1 sm:flex-none px-2.5 py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${
                      distributionTab === 'income' ? 'bg-white text-emerald-600 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>💰 Entradas</span>
                  </button>
                </div>
              </div>
            </div>

            {((distributionTab === 'expense' ? donutData : donutIncomeData).length > 0) ? (
              <div className="flex flex-col gap-4">
                <div className="h-44 w-full cursor-pointer">
                  <ReactECharts
                    notMerge={true}
                    lazyUpdate={true}
                    option={distributionTab === 'expense' ? donutExpenseOption : donutIncomeOption}
                    onEvents={chartEvents}
                    style={{ height: '100%', width: '100%' }}
                  />
                </div>

                {/* Banner de alerta para fatias ocultas se houver */}
                {((distributionTab === 'expense' && hiddenExpenseCategories.length > 0) ||
                  (distributionTab === 'income' && hiddenIncomeCategories.length > 0)) && (
                  <div className="flex justify-between items-center text-[11px] px-2 py-1 bg-amber-50 rounded-xl border border-amber-200/60 text-amber-800 font-bold">
                    <span>⚠️ {distributionTab === 'expense' ? hiddenExpenseCategories.length : hiddenIncomeCategories.length} fatia(s) oculta(s)</span>
                    <button
                      onClick={() => {
                        if (distributionTab === 'expense') setHiddenExpenseCategories([]);
                        else setHiddenIncomeCategories([]);
                      }}
                      className="text-indigo-600 hover:underline"
                    >
                      Mostrar todas
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                  {(distributionTab === 'expense' ? donutData : donutIncomeData).map((d) => {
                    const totalRef = distributionTab === 'expense' ? totalExpenses : totalIncomes;
                    const pct = totalRef > 0 ? Math.round((d.value / totalRef) * 100) : 0;
                    const isHidden = distributionTab === 'expense'
                      ? hiddenExpenseCategories.includes(d.name)
                      : hiddenIncomeCategories.includes(d.name);

                    return (
                      <div
                        key={d.name}
                        className={`flex items-center justify-between text-xs p-1.5 rounded-xl transition-all ${
                          isHidden ? 'opacity-40 bg-slate-100/50' : 'hover:bg-slate-100/70'
                        }`}
                      >
                        {/* Clique no nome abre o modal de detalhe mantendo a funcionalidade existente */}
                        <div
                          onClick={() => setDetailModal({
                            title: `${distributionTab === 'expense' ? 'Gastos' : 'Entradas'} em ${d.name}`,
                            subtitle: `Lançamentos na categoria ${d.name}`,
                            type: distributionTab === 'expense' ? 'category' : 'incomes',
                            categoryName: d.name
                          })}
                          className="flex items-center gap-2 min-w-0 flex-1 pr-2 cursor-pointer group"
                          title="Clique para ver detalhes desta categoria"
                        >
                          <span className="text-sm shrink-0">{d.icon || (distributionTab === 'expense' ? '🏷️' : '💰')}</span>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: d.color }}
                          />
                          <span className={`font-bold truncate ${isHidden ? 'line-through text-slate-400' : 'text-slate-700 group-hover:text-emerald-600 transition-colors'}`}>
                            {d.name}
                          </span>
                        </div>

                        {/* Valor + Porcentagem + Olho para Ocultar/Exibir fatia no gráfico */}
                        <div className="flex items-center gap-2 font-bold tabular-nums shrink-0">
                          <span className="text-slate-500 text-[11px] font-semibold">{pct}%</span>
                          <span
                            onClick={() => {
                              if (distributionTab === 'expense') toggleHiddenExpenseCategory(d.name);
                              else toggleHiddenIncomeCategory(d.name);
                            }}
                            className={`text-slate-800 cursor-pointer ${globalBlur && !isUnlocked ? 'blur-xs select-none' : ''} ${isHidden ? 'line-through text-slate-400' : ''}`}
                            title={isHidden ? "Exibir no gráfico" : "Ocultar do gráfico"}
                          >
                            {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(d.value)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (distributionTab === 'expense') toggleHiddenExpenseCategory(d.name);
                              else toggleHiddenIncomeCategory(d.name);
                            }}
                            className="p-1 rounded-lg hover:bg-slate-200/70 text-slate-400 hover:text-slate-600 transition-colors"
                            title={isHidden ? "Exibir no gráfico" : "Ocultar do gráfico"}
                          >
                            {isHidden ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-center gap-2 text-slate-400">
                <BarChart3 className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-semibold">
                  {distributionTab === 'expense' ? 'Nenhuma despesa registrada este mês' : 'Nenhuma entrada registrada este mês'}
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Minhas Contas Strip (Only Bank Checking / Savings Accounts) */}
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.35 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm">Distribuição das Minhas Contas</h3>
            <a href="/accounts" className="text-xs font-bold text-emerald-600 hover:text-emerald-700">Gerenciar contas →</a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {liquidAccounts.map(acc => {
              const vaultSum = acc.account_vaults?.reduce((sum: number, v: Vault) => sum + Number(v.balance), 0) || 0;
              return (
                <div
                  key={acc.id}
                  onClick={() => setDetailModal({
                    title: `Conta: ${acc.name}`,
                    subtitle: `Movimentações registradas na conta ${acc.name}`,
                    type: 'account',
                    accountId: acc.id
                  })}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shrink-0 group-hover:bg-emerald-50 transition-colors">
                      {acc.icon || '💳'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 text-xs truncate group-hover:text-emerald-700 transition-colors">{acc.name}</div>
                      <div className={`font-black text-sm text-slate-900 tabular-nums ${globalBlur && !isUnlocked ? 'blur-xs select-none' : ''}`}>
                        {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(acc.initial_balance)}
                      </div>
                    </div>
                  </div>
                  {includeVaults && vaultSum > 0 && (
                    <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg shrink-0" title="Saldo em cofrinhos">
                      🐷 {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(vaultSum)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent Transactions List */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="glass-panel rounded-2xl p-5 md:p-6 border border-slate-200/80 shadow-xs"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">Últimos Lançamentos</h3>
              <p className="text-xs text-slate-500 font-medium">Movimentações recentes cadastradas</p>
            </div>
            {hasData && (
              <a
                href="/transactions"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
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
                const acc = t.account_id ? accountsMap[t.account_id] : ((t as any).account || null);
                return (
                  <div
                    key={t.id}
                    className="flex justify-between items-center py-3 group hover:bg-slate-50/60 -mx-2 px-2 rounded-xl transition-all gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${isTransfer
                          ? "bg-blue-50 text-blue-600"
                          : isIncome
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-rose-50 text-rose-600"
                          }`}
                      >
                        {t.category?.icon ? (
                          <span className="text-base">{t.category.icon}</span>
                        ) : isTransfer ? (
                          <ArrowRightLeft className="w-4 h-4" />
                        ) : isIncome ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-800 text-xs sm:text-sm truncate">{t.description}</div>
                        <div className="text-[11px] text-slate-400 font-semibold flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 leading-tight">
                          <span className="truncate max-w-[140px] sm:max-w-none">{t.category?.name || (isTransfer ? "Pagamento de Fatura" : "Geral")}</span>
                          {acc && acc.type === 'credit_card' && (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 rounded-md inline-flex items-center gap-1 shrink-0">
                              💳 {acc.name}
                            </span>
                          )}
                          <span className="shrink-0">· {new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`font-black text-xs sm:text-sm tabular-nums shrink-0 ${isTransfer
                        ? "text-blue-600"
                        : isIncome
                          ? "text-emerald-600"
                          : "text-rose-600"
                        } ${globalBlur && !isUnlocked ? 'blur-xs select-none' : ''}`}
                    >
                      {globalBlur && !isUnlocked ? '••••' : `${isIncome ? "+" : isTransfer ? "" : "-"} ${currencyFmt.format(Number(t.amount))}`}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Wallet className="w-10 h-10 text-slate-300 mb-3" />
              <h2 className="text-sm font-bold text-slate-700 mb-1">Nenhuma transação encontrada</h2>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                Adicione suas primeiras receitas ou despesas para visualizar seu fluxo de caixa aqui.
              </p>
              <button
                onClick={() => setIsTxModalOpen(true)}
                className="bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4 text-emerald-400" /> Nova Transação
              </button>
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

      {/* Modal de Detalhamento ao Clicar em Cards e Gráficos */}
      <Modal
        isOpen={Boolean(detailModal)}
        onClose={() => setDetailModal(null)}
        title={detailModal?.title || ''}
      >
        <div className="space-y-4 pt-1">
          {detailModal?.subtitle && (
            <p className="text-xs text-slate-500 font-medium -mt-2">{detailModal.subtitle}</p>
          )}

          {/* 1. Saldo Consolidado Detail */}
          {detailModal?.type === 'balance' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex justify-between items-center shadow-md">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Consolidado</div>
                  <div className="text-xs text-emerald-400 font-medium">Contas + Cofrinhos</div>
                </div>
                <div className="text-2xl font-black tabular-nums">
                  {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(displayBalance)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contas Bancárias Líquidas</div>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                  {liquidAccounts.map(acc => (
                    <div key={acc.id} className="py-2 px-2 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span>{acc.icon || '💳'}</span>
                        <span className="font-bold text-slate-800">{acc.name}</span>
                      </div>
                      <span className="font-black text-slate-900 tabular-nums">
                        {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(acc.initial_balance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {totalInVaults > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                    <span>🐷 Cofrinhos de Guardados</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex justify-between items-center text-xs">
                    <span className="font-bold text-emerald-900">Total Guardado em Objetivos</span>
                    <span className="font-black text-emerald-700 tabular-nums">
                      {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(totalInVaults)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Entradas do Mês Detail */}
          {detailModal?.type === 'incomes' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex justify-between items-center shadow-2xs">
                <div>
                  <div className="text-xs font-bold text-emerald-800 uppercase">Total de Entradas no Mês</div>
                  <div className="text-[11px] text-emerald-600 font-medium">{currentMonthTx.filter(t => t.type === 'income' && !(t.account_id && accountsMap[t.account_id]?.type === 'credit_card')).length} lançamentos</div>
                </div>
                <div className="text-xl font-black text-emerald-600 tabular-nums">
                  {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(totalIncomes)}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
                {currentMonthTx.filter(t => t.type === 'income' && !(t.account_id && accountsMap[t.account_id]?.type === 'credit_card')).map(t => (
                  <div key={t.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                        {t.category?.icon || '🟢'}
                      </span>
                      <div>
                        <div className="font-bold text-slate-800">{t.description}</div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {t.category?.name || 'Receita'} · {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <span className="font-black text-emerald-600 tabular-nums shrink-0">
                      +{globalBlur && !isUnlocked ? '••••' : currencyFmt.format(Number(t.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Saídas do Mês Detail */}
          {detailModal?.type === 'expenses' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex justify-between items-center shadow-2xs">
                <div>
                  <div className="text-xs font-bold text-rose-800 uppercase">Total de Saídas no Mês</div>
                  <div className="text-[11px] text-rose-600 font-medium">
                    {currentMonthTx.filter(t => t.type === 'expense').length} lançamentos
                  </div>
                </div>
                <div className="text-xl font-black text-rose-600 tabular-nums">
                  {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(totalExpenses)}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
                {currentMonthTx.filter(t => t.type === 'expense').map(t => {
                  const acc = t.account_id ? accountsMap[t.account_id] : ((t as any).account || null);
                  return (
                    <div key={t.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {t.category?.icon || '🔻'}
                        </span>
                        <div>
                          <div className="font-bold text-slate-800">{t.description}</div>
                          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                            <span>{t.category?.name || 'Despesa'}</span>
                            {acc && acc.type === 'credit_card' && (
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 rounded-md inline-flex items-center gap-1 shrink-0">
                                💳 {acc.name}
                              </span>
                            )}
                            <span>· {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                      <span className="font-black text-rose-600 tabular-nums shrink-0">
                        -{globalBlur && !isUnlocked ? '••••' : currencyFmt.format(Number(t.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Resultado do Mês Detail */}
          {detailModal?.type === 'result' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase">Total Entradas</div>
                  <div className="text-base font-black text-emerald-600 tabular-nums">
                    {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(totalIncomes)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100">
                  <div className="text-[11px] font-bold text-rose-700 uppercase">Total Saídas</div>
                  <div className="text-base font-black text-rose-600 tabular-nums">
                    {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(totalExpenses)}
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${netMonthlyResult >= 0 ? 'bg-emerald-500/10 border-emerald-200' : 'bg-rose-500/10 border-rose-200'} flex justify-between items-center`}>
                <div>
                  <div className="text-xs font-bold text-slate-700 uppercase">Balanço Líquido do Mês</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Taxa de poupança acumulada: <strong>{savingsRate}%</strong></div>
                </div>
                <div className={`text-xl font-black tabular-nums ${netMonthlyResult >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {globalBlur && !isUnlocked ? '••••' : `${netMonthlyResult >= 0 ? '+' : ''}${currencyFmt.format(netMonthlyResult)}`}
                </div>
              </div>
            </div>
          )}

          {/* 5. Categoria Detail */}
          {detailModal?.type === 'category' && (
            <div className="space-y-3">
              {(() => {
                const categoryTx = currentMonthTx.filter(t => {
                  const resolved = t.category || categories.find(c => c.id === (t as any).category_id);
                  if (detailModal.categoryName === 'Outros Gastos') {
                    return t.type === 'expense' && !resolved?.name;
                  }
                  return resolved?.name === detailModal.categoryName;
                });
                const catSum = categoryTx.reduce((sum, t) => sum + Number(t.amount), 0);

                return (
                  <>
                    <div className="p-4 rounded-2xl bg-slate-900 text-white flex justify-between items-center shadow-md">
                      <div>
                        <div className="text-xs text-slate-400 font-bold uppercase">Total Nesta Categoria</div>
                        <div className="text-[11px] text-emerald-400 font-medium">{categoryTx.length} lançamentos</div>
                      </div>
                      <div className="text-xl font-black text-emerald-400 tabular-nums">
                        {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(catSum)}
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
                      {categoryTx.length > 0 ? (
                        categoryTx.map(t => {
                          const acc = t.account_id ? accountsMap[t.account_id] : ((t as any).account || null);
                          return (
                            <div key={t.id} className="py-2.5 flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2.5">
                                <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-sm shrink-0">
                                  {t.category?.icon || '🏷️'}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-800">{t.description}</div>
                                  <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                                    {acc && acc.type === 'credit_card' && (
                                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 rounded-md inline-flex items-center gap-1 shrink-0">
                                        💳 {acc.name}
                                      </span>
                                    )}
                                    <span>· {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                  </div>
                                </div>
                              </div>
                              <span className="font-black text-slate-900 tabular-nums shrink-0">
                                {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(Number(t.amount))}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-400">Nenhum lançamento nesta categoria</div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* 6. Conta Detail */}
          {detailModal?.type === 'account' && (
            <div className="space-y-3">
              {(() => {
                const acc = accounts.find(a => a.id === detailModal.accountId);
                const accTx = currentMonthTx.filter(t => t.account_id === detailModal.accountId);
                return (
                  <>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-2xs">
                          {acc?.icon || '💳'}
                        </span>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{acc?.name}</div>
                          <div className="text-[11px] text-slate-400 font-medium">{accTx.length} movimentações no mês</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Saldo em Conta</div>
                        <div className="text-lg font-black text-slate-900 tabular-nums">
                          {globalBlur && !isUnlocked ? '••••' : currencyFmt.format(acc?.initial_balance || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
                      {accTx.length > 0 ? (
                        accTx.map(t => (
                          <div key={t.id} className="py-2.5 flex justify-between items-center text-xs">
                            <div>
                              <div className="font-bold text-slate-800">{t.description}</div>
                              <div className="text-[11px] text-slate-400 font-medium">
                                {t.category?.name || 'Geral'} · {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            <span className={`font-black tabular-nums shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {globalBlur && !isUnlocked ? '••••' : `${t.type === 'income' ? '+' : '-'}${currencyFmt.format(Number(t.amount))}`}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-400">Nenhuma movimentação cadastrada nesta conta no mês</div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
