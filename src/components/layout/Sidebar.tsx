'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowRightLeft, BarChart3, Settings, LogOut, CalendarDays, Wallet, CreditCard } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { useTransition } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(() => {
      logout();
    });
  }

  const isActive = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    if (pathname.startsWith(path) && path !== '/') return true;
    if (pathname === path) return true;
    return false;
  }

  const linkClass = (path: string) => `flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
    isActive(path) 
      ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100' 
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/transactions', icon: ArrowRightLeft, label: 'Transações' },
    { href: '/planned', icon: CalendarDays, label: 'Planejamento' },
    { href: '/credit-cards', icon: CreditCard, label: 'Cartões' },
    { href: '/accounts', icon: Wallet, label: 'Contas' },
    { href: '/reports', icon: BarChart3, label: 'Relatórios' },
  ]

  return (
    <aside className="w-64 border-r border-slate-200 h-screen sticky top-0 bg-white hidden md:flex flex-col">
      <div className="p-6">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Finance<span className="text-emerald-500">OS</span></h2>
        <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase mt-0.5">Copiloto Financeiro</p>
      </div>

      <nav className="flex-1 px-4 flex flex-col gap-1">
        {navItems.map(item => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 flex flex-col gap-1">
        <Link href="/settings" className={linkClass('/settings')}>
          <Settings className="w-5 h-5" />
          Configurações
        </Link>
        <button 
          onClick={handleLogout} 
          disabled={isPending}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors text-left w-full font-medium disabled:opacity-50"
        >
          <LogOut className="w-5 h-5" />
          {isPending ? 'Saindo...' : 'Sair'}
        </button>
      </div>
    </aside>
  );
}
