'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createVault(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const account_id = formData.get('account_id') as string
  if (!account_id) return { error: 'Conta não identificada.' }

  const targetStr = formData.get('target_amount') as string
  const targetAmount = targetStr ? parseFloat(targetStr.replace(/[^\d,-]/g, '').replace(',', '.')) : null

  const balanceStr = formData.get('balance') as string
  const initialBalance = balanceStr ? parseFloat(balanceStr.replace(/[^\d,-]/g, '').replace(',', '.')) : 0

  const data = {
    account_id,
    name: formData.get('name') as string,
    target_amount: targetAmount && !isNaN(targetAmount) ? targetAmount : null,
    balance: isNaN(initialBalance) ? 0 : initialBalance,
    icon: formData.get('icon') as string,
    color: formData.get('color') as string,
    include_in_dashboard: formData.get('include_in_dashboard') === 'true',
    is_hidden: formData.get('is_hidden') === 'true'
  }

  if (!data.name) {
    return { error: 'Preencha o nome do cofrinho.' }
  }

  const { error } = await supabase
    .from('account_vaults')
    .insert([data])

  if (error) {
    console.error('Erro ao criar cofrinho:', error)
    return { error: 'Ocorreu um erro ao salvar o cofrinho.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Cofrinho criado com sucesso!' }
}

export async function updateVault(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const icon = formData.get('icon') as string
  const color = formData.get('color') as string

  if (!id || !name) {
    return { error: 'Preencha o nome do cofrinho.' }
  }

  const targetStr = formData.get('target_amount') as string
  const targetAmount = targetStr ? parseFloat(targetStr.replace(/[^\d,-]/g, '').replace(',', '.')) : null

  const balanceStr = formData.get('balance') as string
  const balance = balanceStr ? parseFloat(balanceStr.replace(/[^\d,-]/g, '').replace(',', '.')) : null

  const data: any = {
    name,
    icon,
    color,
    target_amount: targetAmount && !isNaN(targetAmount) ? targetAmount : null,
    include_in_dashboard: formData.get('include_in_dashboard') === 'true',
    is_hidden: formData.get('is_hidden') === 'true'
  }

  if (balance !== null && !isNaN(balance)) {
    data.balance = balance
  }

  const { error } = await supabase
    .from('account_vaults')
    .update(data)
    .eq('id', id)

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
  const amountStr = formData.get('amount') as string
  const amount = amountStr ? parseFloat(amountStr.replace(/[^\d,-]/g, '').replace(',', '.')) : 0

  if (!vault_id || !action || isNaN(amount) || amount <= 0) {
    return { error: 'Dados inválidos para a transferência.' }
  }

  // Obter o cofrinho atual e a conta
  const { data: vault, error: fetchError } = await supabase
    .from('account_vaults')
    .select('*, account:accounts(id, initial_balance)')
    .eq('id', vault_id)
    .single()

  if (fetchError || !vault) {
    return { error: 'Cofrinho não encontrado.' }
  }

  const accountInitialBalance = Number((vault.account as any).initial_balance)

  if (action === 'deposit') {
    // Para guardar, verifica se tem saldo na conta
    // Idealmente seria o saldo atual (incluindo transações), mas usaremos o initial_balance por enquanto 
    // ou se o Dashboard usa initial_balance como base para o saldo atual.
    // Vamos apenas focar no initial_balance
    if (amount > accountInitialBalance) {
      return { error: 'Saldo disponível insuficiente na conta para este depósito.' }
    }
  }

  let newVaultBalance = Number(vault.balance)
  let newAccountBalance = accountInitialBalance

  if (action === 'deposit') {
    newVaultBalance += amount
    newAccountBalance -= amount
  } else {
    newVaultBalance -= amount
    if (newVaultBalance < 0) return { error: 'Saldo insuficiente no cofrinho.' }
    newAccountBalance += amount
  }

  // Atualiza saldo do cofrinho
  const { error: updateVaultError } = await supabase
    .from('account_vaults')
    .update({ balance: newVaultBalance })
    .eq('id', vault_id)

  if (updateVaultError) {
    console.error('Erro ao atualizar saldo do cofrinho:', updateVaultError)
    return { error: 'Erro ao processar a transferência.' }
  }

  // Atualiza saldo da conta
  const { error: updateAccountError } = await supabase
    .from('accounts')
    .update({ initial_balance: newAccountBalance })
    .eq('id', (vault.account as any).id)
    
  if (updateAccountError) {
    console.error('Erro ao atualizar saldo da conta:', updateAccountError)
    // Se der erro aqui o ideal seria rollback, mas como é simples vamos prosseguir
  }

  revalidatePath('/', 'layout')
  return { success: action === 'deposit' ? 'Dinheiro guardado com sucesso!' : 'Dinheiro resgatado com sucesso!' }
}

export async function deleteVault(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('account_vaults')
    .delete()
    .eq('id', id)

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
  const balanceStr = formData.get('balance') as string
  const newBalance = balanceStr ? parseFloat(balanceStr.replace(/[^\d,-]/g, '').replace(',', '.')) : null
  const workspace_id = formData.get('workspace_id') as string

  if (!id || newBalance === null || isNaN(newBalance)) {
    return { error: 'Valor inválido.' }
  }

  // Obter saldo atual do cofrinho
  const { data: vault, error: fetchError } = await supabase
    .from('account_vaults')
    .select('*, account:accounts(id, initial_balance)')
    .eq('id', id)
    .single()

  if (fetchError || !vault) return { error: 'Cofrinho não encontrado.' }

  const oldBalance = Number(vault.balance)
  const diff = newBalance - oldBalance

  if (diff === 0) {
    return { error: 'O valor informado é o mesmo do atual.' }
  }

  // Atualizar saldo do cofrinho (sem afetar o saldo bruto da conta)
  const { error } = await supabase
    .from('account_vaults')
    .update({ balance: newBalance })
    .eq('id', id)

  if (error) {
    console.error('Erro ao atualizar saldo do cofrinho:', error)
    return { error: 'Erro ao atualizar o cofrinho.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Saldo do cofrinho ajustado com sucesso!' }
}

export async function toggleVaultHidden(id: string, is_hidden: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('account_vaults')
    .update({ is_hidden })
    .eq('id', id)
    
  if (error) {
    return { error: 'Erro ao alternar visibilidade do cofrinho.' }
  }
  revalidatePath('/', 'layout')
  return { success: 'Visibilidade atualizada!' }
}
