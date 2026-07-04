import { createClient } from '@/lib/supabase/server'
import { ReportsClient } from '@/components/reports/ReportsClient'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
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
    // Fetch last 12 months of data for reports
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    const startDate = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth(), 1)
      .toISOString().split('T')[0]

    const [txRes, catRes, accRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, category:categories(id, name, icon, color)')
        .eq('workspace_id', currentWorkspace.id)
        .gte('date', startDate)
        .order('date', { ascending: false }),
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
    <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <ReportsClient
        transactions={transactions}
        categories={categories}
        accounts={accounts}
      />
    </main>
  )
}
