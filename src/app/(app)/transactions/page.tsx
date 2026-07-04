import { createClient } from '@/lib/supabase/server'
import { TransactionsClient } from '@/components/transactions/TransactionsClient'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
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
    const [txRes, catRes, accRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, category:categories(id, name, icon, color), account:accounts!transactions_account_id_fkey(id, name)')
        .eq('workspace_id', currentWorkspace.id)
        .order('date', { ascending: false })
        .limit(500),
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
      <TransactionsClient
        workspaceId={currentWorkspace?.id || ''}
        transactions={transactions}
        categories={categories}
        accounts={accounts}
      />
    </main>
  )
}
