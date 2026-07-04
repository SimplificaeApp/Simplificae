'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ArrowRightLeft, BarChart3, Settings, Plus, CalendarDays, Wallet, Menu, CreditCard } from "lucide-react"
import { useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { TransactionForm } from "@/components/transactions/TransactionForm"

type Category = { id: string; name: string; type: string; icon?: string; color?: string }
type Account = { id: string; name: string; initial_balance: number; icon?: string; color?: string }

export function MobileNav({
  workspaceId,
  categories,
  accounts
}: {
  workspaceId?: string
  categories: Category[]
  accounts: Account[]
}) {
  const pathname = usePathname()
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const mainNavItems = [
    { href: '/', icon: LayoutDashboard, label: 'Inicio' },
    { href: '/transactions', icon: ArrowRightLeft, label: 'Histórico' },
  ]

  const rightNavItems = [
    { href: '/accounts', icon: Wallet, label: 'Contas' },
  ]

  const menuItems = [
    { href: '/planned', icon: CalendarDays, label: 'Planejamento' },
    { href: '/credit-cards', icon: CreditCard, label: 'Cartões' },
    { href: '/reports', icon: BarChart3, label: 'Relatórios' },
    { href: '/settings', icon: Settings, label: 'Ajustes' },
  ]

  const isActive = (path: string) => {
    if (path === '/' && pathname !== '/') return false
    if (pathname.startsWith(path) && path !== '/') return true
    if (pathname === path) return true
    return false
  }

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-safe">
        <div className="flex items-center justify-around h-16 px-2 relative">

          {/* Left items */}
          <div className="flex flex-1 justify-around">
            {mainNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive(item.href) ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Center FAB */}
          <div className="relative -top-5 flex justify-center w-16">
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors active:scale-95 border-4 border-slate-50"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Right items */}
          <div className="flex flex-1 justify-around">
            {rightNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive(item.href) ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            ))}

            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex flex-col items-center justify-center w-full h-full gap-1 transition-colors text-slate-400 hover:text-slate-600"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Mais</span>
            </button>
          </div>

        </div>
      </div>

      <Modal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        title="Nova Transação"
      >
        <TransactionForm
          workspaceId={workspaceId || ''}
          categories={categories}
          accounts={accounts}
          onSuccess={() => setIsTxModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        title="Menu"
      >
        <div className="flex flex-col gap-2">
          {menuItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <item.icon className="w-5 h-5 text-slate-500" />
              <span className="font-semibold">{item.label}</span>
            </Link>
          ))}
        </div>
      </Modal>
    </>
  )
}
