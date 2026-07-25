'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseCurrency, parseBoolean } from './utils'

export async function createCategory(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const workspace_id = formData.get('workspace_id') as string
  if (!workspace_id) return { error: 'Workspace não identificado.' }

  let rawType = formData.get('type') as string
  let isInvestment = parseBoolean(formData.get('is_investment'))

  if (rawType === 'investment') {
    rawType = 'expense'
    isInvestment = true
  }

  const name = formData.get('name') as string
  if (!name || !rawType) return { error: 'Preencha o nome e o tipo da categoria.' }

  const defaultColor = isInvestment ? '#8b5cf6' : rawType === 'expense' ? '#ef4444' : '#10b981'

  const data = {
    workspace_id,
    name,
    type: rawType,
    icon: formData.get('icon') as string,
    color: (formData.get('color') as string) || defaultColor,
    budget_amount: parseCurrency(formData.get('budget_amount')),
    is_fixed: parseBoolean(formData.get('is_fixed')),
    is_investment: isInvestment
  }

  const { data: insertedCategory, error } = await supabase
    .from('categories')
    .insert([data])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar categoria:', error)
    return { error: 'Ocorreu um erro ao salvar a categoria.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Categoria criada com sucesso!', category: insertedCategory }
}

export async function updateCategory(id: string, prevState: any, formData: FormData) {
  const supabase = await createClient()

  let rawType = formData.get('type') as string
  let isInvestment = parseBoolean(formData.get('is_investment'))

  if (rawType === 'investment') {
    rawType = 'expense'
    isInvestment = true
  }

  const name = formData.get('name') as string
  if (!name || !rawType) return { error: 'Preencha o nome e o tipo da categoria.' }

  const defaultColor = isInvestment ? '#8b5cf6' : rawType === 'expense' ? '#ef4444' : '#10b981'

  const data = {
    name,
    type: rawType,
    icon: formData.get('icon') as string,
    color: (formData.get('color') as string) || defaultColor,
    budget_amount: parseCurrency(formData.get('budget_amount')),
    is_fixed: parseBoolean(formData.get('is_fixed')),
    is_investment: isInvestment
  }

  const { error } = await supabase.from('categories').update(data).eq('id', id)
  if (error) {
    console.error('Erro ao atualizar categoria:', error)
    return { error: 'Ocorreu um erro ao atualizar a categoria.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Categoria atualizada com sucesso!' }
}

export async function deleteCategory(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) {
    console.error('Erro ao deletar categoria:', error)
    return { error: 'Erro ao excluir categoria. Verifique se existem transações vinculadas.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Categoria excluída com sucesso!' }
}
