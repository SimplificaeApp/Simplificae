import { createClient } from '@/lib/supabase/server'
import { PlannedClient } from '@/components/planned/PlannedClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PlannedPage() {
  const supabase = await createClient()

  const [
    { data: { user } },
    { data: workspaces }
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('workspaces').select('id, name, type, month_turnover_day').order('created_at', { ascending: true })
  ])

  if (!user) {
    redirect('/login')
  }

  const currentWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null

  return (
    <PlannedClient 
      user={user} 
      transactions={[]}
      categories={[]}
      accounts={[]}
      workspaces={workspaces || []}
      workspace={currentWorkspace}
    />
  )
}

