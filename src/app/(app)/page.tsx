import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, type')
    .order('created_at', { ascending: true })

  const currentWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null

  let transactions: any[] = []
  let categories: any[] = []
  let accounts: any[] = []

  if (currentWorkspace) {
    // Buscar transações do mês atual
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const [txRes, catRes, accRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, category:categories(id, name, icon, color)')
        .eq('workspace_id', currentWorkspace.id)
        .gte('date', firstDay)
        .lte('date', lastDay)
        .order('date', { ascending: false }),
      supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', currentWorkspace.id),
      supabase
        .from('accounts')
        .select('*, account_vaults(*)')
        .eq('workspace_id', currentWorkspace.id)
    ])
    
    transactions = txRes.data || []
    categories = catRes.data || []
    accounts = accRes.data || []
  }

  return (
    <DashboardClient 
      user={user} 
      workspaces={workspaces || []} 
      transactions={transactions} 
      categories={categories}
      accounts={accounts}
    />
  )
}
