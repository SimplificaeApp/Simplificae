import { createClient } from '@/lib/supabase/server'
import { AccountsClient } from '@/components/accounts/AccountsClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  const supabase = await createClient()

  const [
    { data: { user } },
    { data: workspaces },
    { data: accountsData }
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('workspaces').select('id, name, type').order('created_at', { ascending: true }),
    supabase.from('accounts').select('*, account_vaults(*)').neq('type', 'credit_card').order('created_at', { ascending: true })
  ])

  if (!user) {
    redirect('/login')
  }

  const currentWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null
  const accounts = accountsData || []

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">Contas e Cofrinhos</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie seus saldos e objetivos.</p>
      </div>
      <AccountsClient 
        workspaceId={currentWorkspace?.id} 
        accounts={accounts} 
      />
    </main>
  )
}
