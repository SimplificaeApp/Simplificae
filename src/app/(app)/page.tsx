import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()

  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [
    { data: { user } },
    { data: workspaces },
    txRes,
    catRes,
    accRes
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('workspaces').select('id, name, type').order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('*, category:categories(id, name, icon, color)')
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('date', { ascending: false }),
    supabase
      .from('categories')
      .select('*'),
    supabase
      .from('accounts')
      .select('*, account_vaults(*)')
  ])

  const transactions = txRes.data || []
  const categories = catRes.data || []
  const accounts = accRes.data || []

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
