import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreditCardsClient } from '@/components/credit-cards/CreditCardsClient'

export const dynamic = 'force-dynamic'

export default async function CreditCardsPage() {
  const supabase = await createClient()

  const [
    { data: { user } },
    { data: workspaces },
    accRes,
    catRes,
    txRes
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('workspaces').select('id, name, type').order('created_at', { ascending: true }),
    supabase.from('accounts').select('*').order('name', { ascending: true }),
    supabase.from('categories').select('*').order('name', { ascending: true }),
    supabase.from('transactions').select('*, category:categories(id, name, icon, color)')
  ])

  if (!user) {
    redirect('/login')
  }

  const currentWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null
  const allAccounts = accRes.data || []
  const categories = catRes.data || []
  const allTx = txRes.data || []

  const creditCards = allAccounts.filter(a => a.type === 'credit_card')
  const ccIds = new Set(creditCards.map(c => c.id))
  const transactions = allTx.filter(t => ccIds.has(t.account_id))

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <CreditCardsClient 
        workspaceId={currentWorkspace?.id || ''} 
        creditCards={creditCards} 
        allAccounts={allAccounts}
        categories={categories}
        transactions={transactions}
      />
    </main>
  )
}
