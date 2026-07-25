'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseCurrency, parseNullableCurrency, parseBoolean } from './utils'

export async function createAccount(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const workspace_id = formData.get('workspace_id') as string
  if (!workspace_id) return { error: 'Workspace não identificado.' }

  const name = formData.get('name') as string
  const type = formData.get('type') as string // 'checking' | 'savings' | 'credit_card' | 'wallet'
  if (!name || !type) return { error: 'Preencha o nome e o tipo da conta.' }

  const isCreditCard = type === 'credit_card'
  const closingDayStr = formData.get('closing_day') as string
  const dueDayStr = formData.get('due_day') as string

  const data = {
    workspace_id,
    name,
    type,
    initial_balance: parseCurrency(formData.get('initial_balance')),
    currency: 'BRL',
    include_in_dashboard: parseBoolean(formData.get('include_in_dashboard')),
    icon: formData.get('icon') as string,
    color: formData.get('color') as string,
    is_hidden: parseBoolean(formData.get('is_hidden')),
    credit_limit: isCreditCard ? parseNullableCurrency(formData.get('credit_limit')) : null,
    closing_day: isCreditCard && closingDayStr ? parseInt(closingDayStr, 10) : null,
    due_day: isCreditCard && dueDayStr ? parseInt(dueDayStr, 10) : null
  }

  const { error } = await supabase.from('accounts').insert([data])
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
  if (!id || !name || !type) return { error: 'Preencha o nome e o tipo da conta.' }

  const isCreditCard = type === 'credit_card'
  const closingDayStr = formData.get('closing_day') as string
  const dueDayStr = formData.get('due_day') as string

  const data = {
    name,
    type,
    icon: formData.get('icon') as string,
    color: formData.get('color') as string,
    include_in_dashboard: parseBoolean(formData.get('include_in_dashboard')),
    is_hidden: parseBoolean(formData.get('is_hidden')),
    credit_limit: isCreditCard ? parseNullableCurrency(formData.get('credit_limit')) : null,
    closing_day: isCreditCard && closingDayStr ? parseInt(closingDayStr, 10) : null,
    due_day: isCreditCard && dueDayStr ? parseInt(dueDayStr, 10) : null
  }

  const { error } = await supabase.from('accounts').update(data).eq('id', id)
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
  const newBalance = parseNullableCurrency(formData.get('initial_balance'))
  const workspace_id = formData.get('workspace_id') as string

  if (!id || newBalance === null) return { error: 'Valor inválido.' }

  const { data: acc } = await supabase.from('accounts').select('initial_balance').eq('id', id).single()
  if (!acc) return { error: 'Conta não encontrada.' }

  const oldBalance = Number(acc.initial_balance) || 0
  const diff = newBalance - oldBalance
  if (diff === 0) return { error: 'O valor informado é o mesmo do atual.' }

  // Registrar ajuste manual no extrato
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

  const { error } = await supabase.from('accounts').update({ initial_balance: newBalance }).eq('id', id)
  if (error) {
    console.error('Erro ao atualizar saldo:', error)
    return { error: 'Erro ao atualizar a conta.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Saldo da conta ajustado com sucesso!' }
}

export async function toggleAccountHidden(id: string, is_hidden: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts').update({ is_hidden }).eq('id', id)
  if (error) return { error: 'Erro ao alternar visibilidade da conta.' }
  revalidatePath('/', 'layout')
  return { success: 'Visibilidade atualizada!' }
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts').delete().eq('id', id)
  if (error) {
    console.error('Erro ao deletar conta:', error)
    return { error: 'Erro ao excluir conta. Verifique se existem transações vinculadas.' }
  }
  revalidatePath('/', 'layout')
  return { success: 'Conta excluída com sucesso!' }
}
