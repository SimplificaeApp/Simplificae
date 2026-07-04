'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function seedFakeData(workspaceId: string) {
  const supabase = await createClient()

  // 1. Criar uma Conta
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .insert({
      workspace_id: workspaceId,
      name: 'Conta Corrente Padrão',
      type: 'checking',
      initial_balance: 5000.00
    })
    .select()
    .single()

  if (accountError || !account) return { error: accountError?.message }

  // 2. Criar Categorias
  const { data: catIncome } = await supabase.from('categories').insert({
    workspace_id: workspaceId,
    name: 'Salário',
    type: 'income',
    color: '#10b981'
  }).select().single()

  const { data: catExpense } = await supabase.from('categories').insert({
    workspace_id: workspaceId,
    name: 'Alimentação',
    type: 'expense',
    color: '#f43f5e'
  }).select().single()

  // 3. Criar Transações Falsas
  if (catIncome && catExpense) {
    await supabase.from('transactions').insert([
      {
        workspace_id: workspaceId,
        account_id: account.id,
        category_id: catIncome.id,
        type: 'income',
        amount: 8500.00,
        date: new Date().toISOString(),
        description: 'Pagamento Empresa X',
        status: 'posted'
      },
      {
        workspace_id: workspaceId,
        account_id: account.id,
        category_id: catExpense.id,
        type: 'expense',
        amount: 120.50,
        date: new Date().toISOString(),
        description: 'Almoço Ifood',
        status: 'posted'
      },
      {
        workspace_id: workspaceId,
        account_id: account.id,
        category_id: catExpense.id,
        type: 'expense',
        amount: 450.00,
        date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        description: 'Supermercado Extra',
        status: 'posted'
      }
    ])
  }

  revalidatePath('/')
  return { success: true }
}
