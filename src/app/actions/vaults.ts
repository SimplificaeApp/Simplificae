'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseCurrency, parseNullableCurrency, parseBoolean } from './utils'

export async function createVault(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const account_id = formData.get('account_id') as string
  if (!account_id) return { error: 'Conta não identificada.' }

  const name = formData.get('name') as string
  if (!name) return { error: 'Preencha o nome do cofrinho.' }

  const initialBalance = parseCurrency(formData.get('balance'))

  const data = {
    account_id,
    name,
    target_amount: parseNullableCurrency(formData.get('target_amount')),
    balance: initialBalance,
    icon: formData.get('icon') as string,
    color: formData.get('color') as string,
    include_in_dashboard: parseBoolean(formData.get('include_in_dashboard')),
    is_hidden: parseBoolean(formData.get('is_hidden'))
  }

  const { data: createdVault, error } = await supabase
    .from('account_vaults')
    .insert([data])
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar cofrinho:', error)
    return { error: 'Ocorreu um erro ao salvar o cofrinho.' }
  }

  // Registrar saldo inicial como um aporte no histórico se for maior que zero
  if (initialBalance > 0 && createdVault?.id) {
    await supabase.from('vault_transactions').insert([{
      vault_id: createdVault.id,
      action: 'deposit',
      amount: initialBalance
    }])
  }

  revalidatePath('/', 'layout')
  return { success: 'Cofrinho criado com sucesso!' }
}

export async function updateVault(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  if (!id || !name) return { error: 'Preencha o nome do cofrinho.' }

  const balance = parseNullableCurrency(formData.get('balance'))

  const data: any = {
    name,
    icon: formData.get('icon') as string,
    color: formData.get('color') as string,
    target_amount: parseNullableCurrency(formData.get('target_amount')),
    include_in_dashboard: parseBoolean(formData.get('include_in_dashboard')),
    is_hidden: parseBoolean(formData.get('is_hidden'))
  }

  if (balance !== null) {
    data.balance = balance
  }

  const { error } = await supabase.from('account_vaults').update(data).eq('id', id)
  if (error) {
    console.error('Erro ao atualizar cofrinho:', error)
    return { error: 'Ocorreu um erro ao atualizar o cofrinho.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Cofrinho atualizado com sucesso!' }
}

export async function transferToVault(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const vault_id = formData.get('vault_id') as string
  const action = formData.get('action') as 'deposit' | 'withdraw'
  const amount = parseCurrency(formData.get('amount'))
  const createTx = parseBoolean(formData.get('create_transaction'))
  const category_id = formData.get('category_id') as string

  if (!vault_id || !action || amount <= 0) {
    return { error: 'Dados inválidos para a transferência.' }
  }

  const { data: vault, error: fetchError } = await supabase
    .from('account_vaults')
    .select('*, account:accounts(id, workspace_id, initial_balance)')
    .eq('id', vault_id)
    .single()

  if (fetchError || !vault) return { error: 'Cofrinho não encontrado.' }

  const accountObj = vault.account as any
  const accountInitialBalance = Number(accountObj.initial_balance) || 0

  if (action === 'deposit' && amount > accountInitialBalance) {
    return { error: 'Saldo disponível insuficiente na conta para este depósito.' }
  }

  let newVaultBalance = Number(vault.balance) || 0
  let newAccountBalance = accountInitialBalance

  if (action === 'deposit') {
    newVaultBalance += amount
    newAccountBalance -= amount
  } else {
    newVaultBalance -= amount
    if (newVaultBalance < 0) return { error: 'Saldo insuficiente no cofrinho.' }
    newAccountBalance += amount
  }

  const { error: updateVaultError } = await supabase
    .from('account_vaults')
    .update({ balance: newVaultBalance })
    .eq('id', vault_id)

  if (updateVaultError) {
    console.error('Erro ao atualizar saldo do cofrinho:', updateVaultError)
    return { error: 'Erro ao processar a transferência.' }
  }

  await supabase
    .from('accounts')
    .update({ initial_balance: newAccountBalance })
    .eq('id', accountObj.id)

  // Registrar histórico do cofrinho em vault_transactions
  await supabase.from('vault_transactions').insert([{
    vault_id,
    action,
    amount
  }])

  if (action === 'deposit' && createTx && category_id) {
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('transactions').insert([{
      workspace_id: accountObj.workspace_id,
      account_id: accountObj.id,
      category_id,
      type: 'expense',
      amount,
      description: `Aporte no cofrinho: ${vault.name}`,
      date: today,
      status: 'posted',
      ignore_in_cashflow: false
    }])
  }

  revalidatePath('/', 'layout')
  return { success: action === 'deposit' ? 'Dinheiro guardado com sucesso!' : 'Dinheiro resgatado com sucesso!' }
}

export async function deleteVault(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('account_vaults').delete().eq('id', id)
  if (error) {
    console.error('Erro ao deletar cofrinho:', error)
    return { error: 'Erro ao excluir o cofrinho.' }
  }
  revalidatePath('/', 'layout')
  return { success: 'Cofrinho excluído com sucesso!' }
}

export async function editVaultBalance(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const newBalance = parseNullableCurrency(formData.get('balance'))

  if (!id || newBalance === null) return { error: 'Valor inválido.' }

  const { data: vault, error: fetchError } = await supabase
    .from('account_vaults')
    .select('balance')
    .eq('id', id)
    .single()

  if (fetchError || !vault) return { error: 'Cofrinho não encontrado.' }

  const oldBalance = Number(vault.balance) || 0
  const diff = newBalance - oldBalance

  if (diff === 0) {
    return { error: 'O valor informado é o mesmo do atual.' }
  }

  const { error } = await supabase.from('account_vaults').update({ balance: newBalance }).eq('id', id)
  if (error) {
    console.error('Erro ao atualizar saldo do cofrinho:', error)
    return { error: 'Erro ao atualizar o cofrinho.' }
  }

  // Registrar no histórico de transações do cofrinho
  await supabase.from('vault_transactions').insert([{
    vault_id: id,
    action: diff > 0 ? 'deposit' : 'withdraw',
    amount: Math.abs(diff)
  }])

  revalidatePath('/', 'layout')
  return { success: 'Saldo do cofrinho ajustado com sucesso!' }
}

export async function toggleVaultHidden(id: string, is_hidden: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('account_vaults').update({ is_hidden }).eq('id', id)
  if (error) return { error: 'Erro ao alternar visibilidade do cofrinho.' }
  revalidatePath('/', 'layout')
  return { success: 'Visibilidade atualizada!' }
}

export async function getVaultHistory(vaultId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vault_transactions')
    .select('*')
    .eq('vault_id', vaultId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar histórico do cofrinho:', error)
    return { error: 'Não foi possível carregar o histórico.' }
  }

  return { history: data || [] }
}
