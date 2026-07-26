import { createClient } from '@/lib/supabase/server'
import { AiFloatingButton } from './AiFloatingButton'

export async function AiAssistantWrapper() {
  const supabase = await createClient()
  
  const [
    { data: workspaces },
    { data: categories },
    { data: accounts }
  ] = await Promise.all([
    supabase.from('workspaces').select('id, name, type').order('created_at', { ascending: true }),
    supabase.from('categories').select('*'),
    supabase.from('accounts').select('*')
  ])

  const currentWorkspace = workspaces && workspaces.length > 0 ? workspaces[0] : null
  
  if (!currentWorkspace) return null

  return (
    <AiFloatingButton 
      workspaceId={currentWorkspace.id} 
      categories={categories || []} 
      accounts={accounts || []} 
    />
  )
}
