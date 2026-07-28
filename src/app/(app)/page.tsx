import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/DashboardClient'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()

  let user = null
  let workspaces: any[] = []

  try {
    const [
      userRes,
      workspacesRes
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('workspaces').select('id, name, type').order('created_at', { ascending: true })
    ])

    user = userRes.data?.user || null
    workspaces = workspacesRes.data || []
  } catch (error) {
    console.error('Error loading SSR data in Home page:', error)
  }

  return (
    <DashboardClient 
      user={user} 
      workspaces={workspaces} 
      transactions={[]} 
      categories={[]}
      accounts={[]}
    />
  )
}
