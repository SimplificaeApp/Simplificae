import { createClient } from '@/lib/supabase/server'
import { AccountsClient } from '@/components/accounts/AccountsClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, type')
    .order('created_at', { ascending: true })

  const currentWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null
  let accounts: any[] = []

  if (currentWorkspace) {
    const { data: accountsData } = await supabase
      .from('accounts')
      .select('*, account_vaults(*)')
      .eq('workspace_id', currentWorkspace.id)
      .neq('type', 'credit_card')
      .order('created_at', { ascending: true })
      
    accounts = accountsData || []
  }

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
