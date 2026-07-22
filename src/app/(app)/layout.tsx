import { createClient } from '@/lib/supabase/server'
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { PrivacyProvider } from "@/components/providers/PrivacyProvider"
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const [{ data: { user } }, { data: workspaces }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('workspaces').select('id, name, type').order('created_at', { ascending: true })
  ])

  if (!user) {
    redirect('/login')
  }

  return (
    <PrivacyProvider userPin={user.user_metadata?.privacy_pin}>
      <div className="flex min-h-screen bg-slate-50 pb-0">
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
          <Header workspaces={workspaces || []} user={user} />
          {children}
        </div>
      </div>
    </PrivacyProvider>
  )
}
