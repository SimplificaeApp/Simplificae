import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from '@/components/settings/SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, type, month_turnover_day')
    .order('created_at', { ascending: true })

  const currentWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null

  let categories: any[] = []

  if (currentWorkspace) {
    const [catRes] = await Promise.all([
      supabase.from('categories').select('*').eq('workspace_id', currentWorkspace.id).order('name', { ascending: true })
    ])
    categories = catRes.data || []
  }

  return (
    <main className="flex-1 p-6 lg:p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie suas preferências, orçamento e categorias de transação.</p>
      </div>

      <SettingsClient 
        workspaceId={currentWorkspace?.id}
        workspace={currentWorkspace}
        categories={categories}
        initialPin={user?.user_metadata?.privacy_pin}
      />
    </main>
  )
}

