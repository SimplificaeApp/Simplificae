'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createCategory(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const workspace_id = formData.get('workspace_id') as string
  if (!workspace_id) return { error: 'Workspace não identificado.' }

  const budgetStr = formData.get('budget_amount') as string
  const budget_amount = budgetStr ? parseFloat(budgetStr.replace(/[^\d,-]/g, '').replace(',', '.')) : 0

  const data = {
    workspace_id,
    name: formData.get('name') as string,
    type: formData.get('type') as string, // 'income' | 'expense'
    icon: formData.get('icon') as string,
    color: formData.get('color') as string || (formData.get('type') === 'expense' ? '#ef4444' : '#10b981'),
    budget_amount: isNaN(budget_amount) ? 0 : budget_amount,
    is_fixed: formData.get('is_fixed') === 'on' || formData.get('is_fixed') === 'true',
    is_investment: formData.get('is_investment') === 'on' || formData.get('is_investment') === 'true'
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

export async function updateCategory(id: string, prevState: any, formData: FormData) {
  const supabase = await createClient()

  const budgetStr = formData.get('budget_amount') as string
  const budget_amount = budgetStr ? parseFloat(budgetStr.replace(/[^\d,-]/g, '').replace(',', '.')) : 0

  const data = {
    name: formData.get('name') as string,
    type: formData.get('type') as string,
    icon: formData.get('icon') as string,
    color: formData.get('color') as string || (formData.get('type') === 'expense' ? '#ef4444' : '#10b981'),
    budget_amount: isNaN(budget_amount) ? 0 : budget_amount,
    is_fixed: formData.get('is_fixed') === 'on' || formData.get('is_fixed') === 'true',
    is_investment: formData.get('is_investment') === 'on' || formData.get('is_investment') === 'true'
  }

  if (!data.name || !data.type) {
    return { error: 'Preencha o nome e o tipo da categoria.' }
  }

  const { error } = await supabase
    .from('categories')
    .update(data)
    .eq('id', id)

  if (error) {
    console.error('Erro ao atualizar categoria:', error)
    return { error: 'Ocorreu um erro ao atualizar a categoria.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Categoria atualizada com sucesso!' }
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

