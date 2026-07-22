import { createClient } from '@/lib/supabase/server'
import { TransactionsClient } from '@/components/transactions/TransactionsClient'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const supabase = await createClient()

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
      .select('*, category:categories(id, name, icon, color), account:accounts!transactions_account_id_fkey(id, name)')
      .order('date', { ascending: false })
      .limit(500),
    supabase
      .from('categories')
      .select('*'),
    supabase
      .from('accounts')
      .select('*')
  ])

  const currentWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null
  const transactions = txRes.data || []
  const categories = catRes.data || []
  const accounts = accRes.data || []

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
