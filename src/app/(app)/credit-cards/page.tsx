import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreditCardsClient } from '@/components/credit-cards/CreditCardsClient'

export const dynamic = 'force-dynamic'

export default async function CreditCardsPage() {
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
  let creditCards: any[] = []
  let allAccounts: any[] = []
  let categories: any[] = []
  let transactions: any[] = []

  if (currentWorkspace) {
    const [accRes, catRes, txRes] = await Promise.all([
      supabase
        .from('accounts')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name', { ascending: true }),
      supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name', { ascending: true }),
      supabase
        .from('transactions')
        .select('*, category:categories(id, name, icon, color)')
        .eq('workspace_id', currentWorkspace.id)
    ])

    allAccounts = accRes.data || []
    categories = catRes.data || []
    const allTx = txRes.data || []

    creditCards = allAccounts.filter(a => a.type === 'credit_card')
    
    // Only keep transactions that belong to credit cards
    const ccIds = new Set(creditCards.map(c => c.id))
    transactions = allTx.filter(t => ccIds.has(t.account_id))
  }

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
