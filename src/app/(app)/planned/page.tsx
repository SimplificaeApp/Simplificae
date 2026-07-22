import { createClient } from '@/lib/supabase/server'
import { PlannedClient } from '@/components/planned/PlannedClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PlannedPage() {
  const supabase = await createClient()

  const [
    { data: { user } },
    { data: workspaces },
    txRes,
    catRes,
    accRes
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('workspaces').select('id, name, type, month_turnover_day').order('created_at', { ascending: true }),
    supabase
      .from('transactions')
      .select('*, category:categories(*), account:accounts!transactions_account_id_fkey(id, name, color, icon, type, closing_day, due_day)')
      .order('date', { ascending: true }),
    supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true }),
    supabase
      .from('accounts')
      .select('*')
  ])

  if (!user) {
    redirect('/login')
  }

  const currentWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null
  const transactions = txRes.data || []
  const categories = catRes.data || []
  const accounts = accRes.data || []

  return (
    <PlannedClient 
      user={user} 
      transactions={transactions}
      categories={categories}
      accounts={accounts}
      workspaces={workspaces || []}
      workspace={currentWorkspace}
    />
  )
}

