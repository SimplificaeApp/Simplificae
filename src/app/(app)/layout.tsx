import { createClient } from '@/lib/supabase/server'
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { MobileNav } from "@/components/layout/MobileNav"
import { PrivacyProvider } from "@/components/providers/PrivacyProvider"
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar Workspaces do usuário
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, type')
    .order('created_at', { ascending: true })

  const currentWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null
  
  let categories: any[] = []
  let accounts: any[] = []

  if (currentWorkspace) {
    const [catRes, accRes] = await Promise.all([
      supabase.from('categories').select('*').eq('workspace_id', currentWorkspace.id),
      supabase.from('accounts').select('*').eq('workspace_id', currentWorkspace.id)
    ])
    categories = catRes.data || []
    accounts = accRes.data || []
  }

  return (
    <PrivacyProvider userPin={user.user_metadata?.privacy_pin}>
      <div className="flex min-h-screen bg-slate-50 pb-16 md:pb-0">
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
          <Header workspaces={workspaces || []} user={user} />
          {children}
        </div>
        <MobileNav 
          workspaceId={currentWorkspace?.id} 
          categories={categories} 
          accounts={accounts} 
        />
      </div>
    </PrivacyProvider>
  )
}
