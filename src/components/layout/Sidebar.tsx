'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowRightLeft, BarChart3, Settings, LogOut, CalendarDays, Wallet, CreditCard, PiggyBank } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { useTransition } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(() => { logout(); })
  }

  const isActive = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    if (pathname.startsWith(path) && path !== '/') return true;
    if (pathname === path) return true;
    return false;
  }

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/transactions', icon: ArrowRightLeft, label: 'Transações' },
    { href: '/planned', icon: CalendarDays, label: 'Planejamento' },
    { href: '/credit-cards', icon: CreditCard, label: 'Cartões' },
    { href: '/accounts', icon: Wallet, label: 'Contas' },
  ]

  return (
    <aside
      className="w-60 border-r border-slate-200/80 h-screen sticky top-0 hidden md:flex flex-col"
      style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
          >
            <PiggyBank className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight leading-none">
              Finance<span className="text-emerald-500">OS</span>
            </h2>
            <p className="text-[9px] font-semibold text-slate-400 tracking-widest uppercase mt-0.5">
              Copiloto Financeiro
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Menu</p>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${isActive(item.href) ? 'active' : ''}`}
          >
            <item.icon className="w-4 h-4 shrink-0" strokeWidth={isActive(item.href) ? 2.5 : 2} />
            <span>{item.label}</span>
            {isActive(item.href) && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3 flex flex-col gap-0.5">
        <Link href="/settings" className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`}>
          <Settings className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>Configurações</span>
        </Link>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="sidebar-link text-rose-500 hover:!bg-rose-50 hover:!text-rose-700 w-full disabled:opacity-50"
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>{isPending ? 'Saindo...' : 'Sair'}</span>
        </button>
      </div>
    </aside>
  );
}

