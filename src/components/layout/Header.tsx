'use client'

import { usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, ArrowRightLeft, CalendarDays, Wallet, CreditCard, BarChart3, Settings, Menu, X, PiggyBank } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { useTransition, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const PAGE_LABELS: Record<string, { label: string; icon: any }> = {
  '/': { label: 'Dashboard', icon: LayoutDashboard },
  '/transactions': { label: 'Transações', icon: ArrowRightLeft },
  '/planned': { label: 'Planejamento', icon: CalendarDays },
  '/accounts': { label: 'Contas', icon: Wallet },
  '/credit-cards': { label: 'Cartões', icon: CreditCard },
  '/settings': { label: 'Configurações', icon: Settings },
}

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: ArrowRightLeft, label: 'Transações' },
  { href: '/planned', icon: CalendarDays, label: 'Planejamento' },
  { href: '/credit-cards', icon: CreditCard, label: 'Cartões' },
  { href: '/accounts', icon: Wallet, label: 'Contas' },
]

export function Header({ workspaces = [], user }: { workspaces?: any[], user?: any }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuário';
  const initials = firstName.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    startTransition(() => { logout(); });
  };

  const pageKey = Object.keys(PAGE_LABELS).find(k => k !== '/' && pathname.startsWith(k)) || (pathname === '/' ? '/' : null);
  const page = pageKey ? PAGE_LABELS[pageKey] : PAGE_LABELS['/'];
  const PageIcon = page.icon;

  return (
    <>
      <header className="h-14 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm flex items-center justify-between px-4 sm:px-5 sticky top-0 z-20 shrink-0">
        {/* Breadcrumb / Page title */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <Menu className="w-4 h-4 text-slate-600" />
          </button>
          <div className="hidden md:flex w-7 h-7 rounded-lg bg-slate-100 items-center justify-center">
            <PageIcon className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
          </div>
          <h2 className="font-bold text-slate-800 text-sm">{page.label}</h2>
        </div>

        {/* User area */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:block">
            Olá, <span className="font-bold text-slate-800">{firstName}</span>
          </span>

          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          >
            {initials}
          </div>

          <button
            onClick={handleLogout}
            disabled={isPending}
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors bg-slate-50 hover:bg-rose-50 px-3 py-1.5 rounded-lg disabled:opacity-50"
            title="Sair"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isPending ? 'Saindo...' : 'Sair'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-white shadow-2xl z-50 md:hidden flex flex-col"
            >
              <div className="px-5 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-700">
                    <PiggyBank className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-800 tracking-tight leading-none">Finance<span className="text-emerald-500">OS</span></h2>
                    <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase mt-0.5">Copiloto Financeiro</p>
                  </div>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto bg-white">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Menu</p>
                {navItems.map(item => {
                  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>

              <div className="px-3 pb-4 border-t border-slate-100 pt-3 flex flex-col gap-1 bg-white">
                <Link href="/settings" onClick={() => setIsSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  <Settings className="w-4 h-4 shrink-0" strokeWidth={2} />
                  <span>Configurações</span>
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={isPending}
                  className="flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-colors w-full disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4 shrink-0" strokeWidth={2} />
                  <span>{isPending ? 'Saindo...' : 'Sair'}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

