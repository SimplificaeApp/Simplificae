import { createClient } from '@/lib/supabase/server'
import { TransactionsClient } from '@/components/transactions/TransactionsClient'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const supabase = await createClient()

  const [
    { data: { user } },
    { data: workspaces }
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('workspaces').select('id, name, type').order('created_at', { ascending: true })
  ])

  const currentWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <TransactionsClient
        workspaceId={currentWorkspace?.id || ''}
        transactions={[]}
        categories={[]}
        accounts={[]}
      />
    </main>
  )
}
