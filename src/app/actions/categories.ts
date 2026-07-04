'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createCategory(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const workspace_id = formData.get('workspace_id') as string
  if (!workspace_id) return { error: 'Workspace não identificado.' }

  const data = {
    workspace_id,
    name: formData.get('name') as string,
    type: formData.get('type') as string, // 'income' | 'expense'
    icon: formData.get('icon') as string,
    color: formData.get('type') === 'expense' ? '#ef4444' : '#10b981' // Default cores temporárias
  }

  if (!data.name || !data.type) {
    return { error: 'Preencha o nome e o tipo da categoria.' }
  }

  const { error } = await supabase
    .from('categories')
    .insert([data])

  if (error) {
    console.error('Erro ao criar categoria:', error)
    return { error: 'Ocorreu um erro ao salvar a categoria.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Categoria criada com sucesso!' }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao deletar categoria:', error)
    return { error: 'Erro ao excluir categoria. Verifique se existem transações vinculadas.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Categoria excluída com sucesso!' }
}
