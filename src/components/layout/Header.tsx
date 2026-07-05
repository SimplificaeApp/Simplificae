'use client'

import { usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, ArrowRightLeft, CalendarDays, Wallet, CreditCard, BarChart3, Settings } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { useTransition } from "react";

const PAGE_LABELS: Record<string, { label: string; icon: any }> = {
  '/': { label: 'Dashboard', icon: LayoutDashboard },
  '/transactions': { label: 'Transações', icon: ArrowRightLeft },
  '/planned': { label: 'Planejamento', icon: CalendarDays },
  '/accounts': { label: 'Contas', icon: Wallet },
  '/credit-cards': { label: 'Cartões de Crédito', icon: CreditCard },
  '/reports': { label: 'Relatórios', icon: BarChart3 },
  '/settings': { label: 'Configurações', icon: Settings },
}

export function Header({ workspaces = [], user }: { workspaces?: any[], user?: any }) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuário';
  const initials = firstName.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    startTransition(() => { logout(); });
  };

  const pageKey = Object.keys(PAGE_LABELS).find(k => k !== '/' && pathname.startsWith(k)) || (pathname === '/' ? '/' : null);
  const page = pageKey ? PAGE_LABELS[pageKey] : PAGE_LABELS['/'];
  const PageIcon = page.icon;

  return (
    <header className="h-14 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm flex items-center justify-between px-5 sticky top-0 z-20 shrink-0">
      {/* Breadcrumb / Page title */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
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
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors bg-slate-50 hover:bg-rose-50 px-3 py-1.5 rounded-lg disabled:opacity-50"
          title="Sair"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline-block">{isPending ? 'Saindo...' : 'Sair'}</span>
        </button>
      </div>
    </header>
  );
}

