import { createClient } from '@/lib/supabase/server'
import { PlannedClient } from '@/components/planned/PlannedClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PlannedPage() {
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
  let transactions: any[] = []
  let categories: any[] = []
  let accounts: any[] = []

  if (currentWorkspace) {
    const [txRes, catRes, accRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, category:categories(id, name, icon, color), account:accounts!transactions_account_id_fkey(id, name, color, icon)')
        .eq('workspace_id', currentWorkspace.id)
        .in('status', ['pending', 'paid_planned'])
        .order('date', { ascending: true }),
      supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', currentWorkspace.id),
      supabase
        .from('accounts')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
    ])
    
    transactions = txRes.data || []
    categories = catRes.data || []
    accounts = accRes.data || []
  }

  return (
    <PlannedClient 
      user={user} 
      transactions={transactions}
      categories={categories}
      accounts={accounts}
      workspaces={workspaces || []}
    />
  )
}
