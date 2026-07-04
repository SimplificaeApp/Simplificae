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
  ChevronRight,
  CalendarDays,
  Filter,
  PiggyBank,
  LineChart,
  Settings2,
  Eye,
  EyeOff,
} from "lucide-react";
import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Lock } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Sector,
} from "recharts";

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
type Account = { id: string; name: string; initial_balance: number; icon?: string; color?: string; account_vaults?: Vault[] };

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

// Active Shape for Pie to give a 3D hover effect
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;

  return (
    <g>
      <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill="#334155" className="text-xs font-bold">
        {payload.name.substring(0, 15)}{payload.name.length > 15 ? '...' : ''}
      </text>
      <text x={cx} y={cy + 10} dy={8} textAnchor="middle" fill="#64748b" className="text-[10px] font-semibold">
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: `drop-shadow(0px 10px 10px ${fill}60)` }}
      />
    </g>
  );
};

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

  const [activeIndexExpense, setActiveIndexExpense] = useState<number>(-1);
  const [activeIndexDist, setActiveIndexDist] = useState<number>(-1);

  const filteredTx = useMemo(() => {
    return transactions.filter(t => {
      if (selectedAccount !== "all" && t.account_id !== selectedAccount) return false;
      if (selectedCategory !== "all" && t.category_id !== selectedCategory) return false;
      return true;
    });
  }, [transactions, selectedAccount, selectedCategory]);

  const validCashflowTx = useMemo(() => {
    return filteredTx.filter(t => !(t as any).ignore_in_cashflow && t.status === 'posted');
  }, [filteredTx]);

  // KPIs
  const totalIncomes = useMemo(
    () => validCashflowTx.filter((t) => t.type === "income").reduce((acc, t) => acc + Number(t.amount), 0),
    [validCashflowTx]
  );
  const totalExpenses = useMemo(
    () => validCashflowTx.filter((t) => t.type === "expense").reduce((acc, t) => acc + Number(t.amount), 0),
    [validCashflowTx]
  );
  const availableBalance = useMemo(
    () => {
      if (selectedAccount !== "all") {
        const acc = accounts.find(a => a.id === selectedAccount);
        if (!acc) return 0;
        if ((acc as any).is_hidden && !isUnlocked) return 0;
        return Number(acc.initial_balance);
      }
      return accounts.reduce((acc, a) => {
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
      .filter(a => Number(a.initial_balance) > 0)
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

    validCashflowTx.forEach((t) => {
      const day = new Date(t.date + "T12:00:00").getDate();
      if (t.type === "income") days[day].income += Number(t.amount);
      if (t.type === "expense") days[day].expense += Number(t.amount);
    });

    return Object.entries(days).map(([day, v]) => ({
      day: Number(day),
      Receitas: v.income,
      Despesas: v.expense,
    }));
  }, [transactions]);

  // Donut data: top categories by expense amount
  const donutData = useMemo(() => {
    const catMap = new Map<string, { name: string; value: number; color: string }>();
    validCashflowTx
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const catName = t.category?.name || "Sem Categoria";
        const catColor = t.category?.color || "#64748b";
        const existing = catMap.get(catName);
        if (existing) {
          existing.value += Number(t.amount);
        } else {
          catMap.set(catName, { name: catName, value: Number(t.amount), color: catColor });
        }
      });
    return Array.from(catMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions]);

  // Recent 5 transactions (from filtered)
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

            <div className={`${showFilters ? 'flex' : 'hidden'} md:flex flex-col md:flex-row flex-wrap gap-2 w-full md:w-auto`}>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full md:w-auto cursor-pointer shadow-sm"
              >
                <option value="all">Todas as Contas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full md:w-auto cursor-pointer shadow-sm"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm select-none">
                <input
                  type="checkbox"
                  checked={includeVaults}
                  onChange={(e) => setIncludeVaults(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <PiggyBank className="w-4 h-4 text-slate-400" />
                <span>Incluir Cofrinhos</span>
              </label>
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
            className="glass-panel p-5 md:p-6 rounded-2xl group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
          >
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
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="glass-panel p-5 md:p-6 rounded-2xl group hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-300"
          >
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
          </motion.div>
        </div>

        {/* Charts Row */}
        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
            {/* Area Chart */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="lg:col-span-3 glass-panel rounded-2xl p-5 md:p-6"
            >
              <h3 className="font-bold text-slate-800 mb-4">Fluxo de Caixa Diário</h3>
              <div className="h-64 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                      <filter id="shadowArea" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#10b981" floodOpacity="0.1" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                    />
                    <Tooltip content={<AreaChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="Receitas"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#gradIncome)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Despesas"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      fill="url(#gradExpense)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Pie Chart Top Despesas */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="glass-panel rounded-2xl p-5 md:p-6"
            >
              <h3 className="font-bold text-slate-800 mb-4">Top Despesas</h3>
              {donutData.length > 0 ? (
                <div className="h-64 md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        {...{
                          activeIndex: activeIndexExpense === -1 ? undefined : activeIndexExpense,
                          activeShape: renderActiveShape as any
                        }}
                        onMouseEnter={(_, index) => setActiveIndexExpense(index)}
                        onMouseLeave={() => setActiveIndexExpense(-1)}
                        data={donutData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={0}
                        cornerRadius={4}
                      >
                        {donutData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || DONUT_COLORS[index % DONUT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: "12px" }}
                        iconType="circle"
                        iconSize={8}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                  Nenhuma despesa registrada no mês.
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Distribuição do Saldo - Independente de ter transações no mês */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
          {/* Pie Chart Distribuição de Contas */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.28 }}
            className="glass-panel rounded-2xl p-5 md:p-6 lg:col-span-1"
          >
            <h3 className="font-bold text-slate-800 mb-4">Distribuição do Saldo (Todas as contas)</h3>
            {accountDistributionData.length > 0 ? (
              <div className="h-64 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      {...{
                        activeIndex: activeIndexDist === -1 ? undefined : activeIndexDist,
                        activeShape: renderActiveShape as any
                      }}
                      onMouseEnter={(_, index) => setActiveIndexDist(index)}
                      onMouseLeave={() => setActiveIndexDist(-1)}
                      data={accountDistributionData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                      strokeWidth={0}
                      cornerRadius={4}
                    >
                      {accountDistributionData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || DONUT_COLORS[index % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: "12px" }}
                      iconType="circle"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                Nenhuma conta com saldo positivo.
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
                          {t.category?.name || (isTransfer ? "Transferência" : "")}{" "}
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
