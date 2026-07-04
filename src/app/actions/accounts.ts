'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createAccount(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const workspace_id = formData.get('workspace_id') as string
  if (!workspace_id) return { error: 'Workspace não identificado.' }

  const balanceStr = formData.get('initial_balance') as string
  const numericBalance = balanceStr ? parseFloat(balanceStr.replace(/[^\d,-]/g, '').replace(',', '.')) : 0.00

  const type = formData.get('type') as string
  
  const closingDayStr = formData.get('closing_day') as string
  const dueDayStr = formData.get('due_day') as string
  const creditLimitStr = formData.get('credit_limit') as string
  const creditLimit = creditLimitStr ? parseFloat(creditLimitStr.replace(/[^\d,-]/g, '').replace(',', '.')) : 0.00

  const data = {
    workspace_id,
    name: formData.get('name') as string,
    type, // 'checking' | 'savings' | 'credit_card' | 'wallet'
    initial_balance: isNaN(numericBalance) ? 0 : numericBalance,
    currency: 'BRL',
    include_in_dashboard: formData.get('include_in_dashboard') === 'true',
    icon: formData.get('icon') as string,
    color: formData.get('color') as string,
    is_hidden: formData.get('is_hidden') === 'true',
    credit_limit: type === 'credit_card' ? (isNaN(creditLimit) ? 0 : creditLimit) : null,
    closing_day: type === 'credit_card' && closingDayStr ? parseInt(closingDayStr, 10) : null,
    due_day: type === 'credit_card' && dueDayStr ? parseInt(dueDayStr, 10) : null
  }

  if (!data.name || !data.type) {
    return { error: 'Preencha o nome e o tipo da conta.' }
  }

  const { error } = await supabase
    .from('accounts')
    .insert([data])

  if (error) {
    console.error('Erro ao criar conta:', error)
    return { error: 'Ocorreu um erro ao salvar a conta.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Conta criada com sucesso!' }
}

export async function updateAccount(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const type = formData.get('type') as string
  const icon = formData.get('icon') as string
  const color = formData.get('color') as string
  const include_in_dashboard = formData.get('include_in_dashboard') === 'true'
  const is_hidden = formData.get('is_hidden') === 'true'
  
  const closingDayStr = formData.get('closing_day') as string
  const dueDayStr = formData.get('due_day') as string
  const creditLimitStr = formData.get('credit_limit') as string
  const creditLimit = creditLimitStr ? parseFloat(creditLimitStr.replace(/[^\d,-]/g, '').replace(',', '.')) : 0.00

  if (!id || !name || !type) {
    return { error: 'Preencha o nome e o tipo da conta.' }
  }

  const data = {
    name,
    type,
    icon,
    color,
    include_in_dashboard,
    is_hidden,
    credit_limit: type === 'credit_card' ? (isNaN(creditLimit) ? 0 : creditLimit) : null,
    closing_day: type === 'credit_card' && closingDayStr ? parseInt(closingDayStr, 10) : null,
    due_day: type === 'credit_card' && dueDayStr ? parseInt(dueDayStr, 10) : null
  }

  const { error } = await supabase
    .from('accounts')
    .update(data)
    .eq('id', id)

  if (error) {
    console.error('Erro ao atualizar conta:', error)
    return { error: 'Ocorreu um erro ao atualizar a conta.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Conta atualizada com sucesso!' }
}

export async function editAccountBalance(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const balanceStr = formData.get('initial_balance') as string
  const newBalance = balanceStr ? parseFloat(balanceStr.replace(/[^\d,-]/g, '').replace(',', '.')) : null
  const workspace_id = formData.get('workspace_id') as string

  if (!id || newBalance === null || isNaN(newBalance)) {
    return { error: 'Valor inválido.' }
  }

  // Obter saldo atual
  const { data: acc } = await supabase
    .from('accounts')
    .select('initial_balance')
    .eq('id', id)
    .single()

  if (!acc) return { error: 'Conta não encontrada.' }

  const oldBalance = Number(acc.initial_balance)
  const diff = newBalance - oldBalance

  if (diff === 0) {
    return { error: 'O valor informado é o mesmo do atual.' }
  }

  // Cria transação de ajuste
  const txData = {
    workspace_id,
    account_id: id,
    type: diff > 0 ? 'income' : 'expense',
    amount: Math.abs(diff),
    description: 'Ajuste Manual de Saldo (Conta)',
    date: new Date().toISOString().split('T')[0],
    status: 'posted',
    ignore_in_cashflow: true
  }

  const { error: txError } = await supabase.from('transactions').insert([txData])
  if (txError) return { error: 'Erro ao registrar ajuste.' }

  // Atualizar saldo da conta
  const { error } = await supabase
    .from('accounts')
    .update({ initial_balance: newBalance })
    .eq('id', id)

  if (error) {
    console.error('Erro ao atualizar saldo:', error)
    return { error: 'Erro ao atualizar a conta.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Saldo da conta ajustado com sucesso!' }
}

export async function toggleAccountHidden(id: string, is_hidden: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('accounts')
    .update({ is_hidden })
    .eq('id', id)
    
  if (error) {
    return { error: 'Erro ao alternar visibilidade da conta.' }
  }
  revalidatePath('/', 'layout')
  return { success: 'Visibilidade atualizada!' }
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao deletar conta:', error)
    return { error: 'Erro ao excluir conta. Verifique se existem transações vinculadas.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Conta excluída com sucesso!' }
}
