'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseCurrency, parseBoolean } from './utils'

/**
 * Adjust account balance safely
 */
async function adjustAccountBalance(supabase: any, accountId: string | null | undefined, delta: number) {
  if (!accountId || delta === 0 || isNaN(delta)) return
  const { data: acc } = await supabase.from('accounts').select('initial_balance').eq('id', accountId).single()
  if (acc) {
    const currentBalance = Number(acc.initial_balance) || 0
    await supabase.from('accounts').update({ initial_balance: currentBalance + delta }).eq('id', accountId)
  }
}

/**
 * Applies (+1) or Reverts (-1) transaction effect on account balances
 */
async function applyTransactionBalanceEffect(
  supabase: any,
  tx: { account_id?: string; destination_account_id?: string; type: string; amount: number },
  multiplier: 1 | -1
) {
  const amount = Number(tx.amount) * multiplier
  if (tx.type === 'income') {
    await adjustAccountBalance(supabase, tx.account_id, amount)
  } else if (tx.type === 'expense') {
    await adjustAccountBalance(supabase, tx.account_id, -amount)
  } else if (tx.type === 'transfer') {
    await adjustAccountBalance(supabase, tx.account_id, -amount)
    await adjustAccountBalance(supabase, tx.destination_account_id, amount)
  }
}

export async function createTransaction(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const workspace_id = formData.get('workspace_id') as string
  if (!workspace_id) return { error: 'Workspace não identificado.' }

  const numericAmount = parseCurrency(formData.get('amount'))
  if (numericAmount <= 0) return { error: 'Valor inválido.' }

  const installmentsStr = formData.get('installments') as string
  const installments = installmentsStr ? parseInt(installmentsStr, 10) : 1
  const status = (formData.get('status') as string) || 'posted'
  const baseDate = formData.get('date') as string

  const baseData: any = {
    workspace_id,
    account_id: formData.get('account_id') as string,
    type: formData.get('type') as string,
    amount: installments > 1 ? numericAmount / installments : numericAmount,
    description: formData.get('description') as string,
    status,
    ignore_in_cashflow: parseBoolean(formData.get('ignore_in_cashflow'))
  }

  if (baseData.type === 'transfer') {
    baseData.destination_account_id = formData.get('destination_account_id') as string
    if (!baseData.destination_account_id || baseData.account_id === baseData.destination_account_id) {
      return { error: 'Selecione uma conta de destino válida e diferente da origem.' }
    }
  } else {
    baseData.category_id = formData.get('category_id') as string
    if (!baseData.category_id) {
      return { error: 'Selecione uma categoria.' }
    }
  }

  if (!baseData.description || !baseDate) {
    return { error: 'Preencha a descrição e a data.' }
  }

  if (status === 'posted' && !baseData.account_id) {
    return { error: 'Selecione uma conta para transações efetivadas.' }
  }

  const isRecurring = parseBoolean(formData.get('is_recurring'))
  const recurringMonthsStr = formData.get('recurring_months') as string
  const recurringMonths = recurringMonthsStr ? parseInt(recurringMonthsStr, 10) : 12

  const transactionsToInsert = []

  if (isRecurring && baseData.type !== 'transfer') {
    for (let i = 0; i < recurringMonths; i++) {
      const dateObj = new Date(baseDate + 'T12:00:00')
      dateObj.setMonth(dateObj.getMonth() + i)
      transactionsToInsert.push({
        ...baseData,
        amount: numericAmount,
        date: dateObj.toISOString().split('T')[0],
        description: baseData.description,
        is_recurring: true
      })
    }
  } else if (installments > 1 && baseData.type !== 'transfer') {
    const installment_id = crypto.randomUUID()
    for (let i = 0; i < installments; i++) {
      const dateObj = new Date(baseDate + 'T12:00:00')
      dateObj.setMonth(dateObj.getMonth() + i)
      transactionsToInsert.push({
        ...baseData,
        amount: numericAmount / installments,
        date: dateObj.toISOString().split('T')[0],
        description: `${baseData.description} (${i + 1}/${installments})`,
        installment_id
      })
    }
  } else {
    transactionsToInsert.push({
      ...baseData,
      amount: numericAmount,
      date: baseDate
    })
  }

  const { error } = await supabase.from('transactions').insert(transactionsToInsert)
  if (error) {
    console.error('Erro ao inserir transação:', error)
    return { error: 'Ocorreu um erro ao salvar a transação.' }
  }

  // Se efetivada e de parcela única, ajusta saldo
  if (status === 'posted' && installments === 1) {
    await applyTransactionBalanceEffect(supabase, transactionsToInsert[0], 1)
  }

  revalidatePath('/', 'layout')
  return { success: 'Transação salva com sucesso!' }
}

export async function deleteTransaction(id: string, scope: 'single' | 'future' = 'single') {
  const supabase = await createClient()

  const { data: tx, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (!tx) {
    if (fetchError) console.error('Delete Transaction Error:', fetchError, 'ID:', id)
    return { error: 'Transação não encontrada.' }
  }

  if (scope === 'future' && (tx.is_recurring || tx.installment_id)) {
    let query = supabase
      .from('transactions')
      .delete()
      .eq('workspace_id', tx.workspace_id)
      .gte('date', tx.date)

    if (tx.installment_id) {
      query = query.eq('installment_id', tx.installment_id)
    } else {
      query = query.eq('description', tx.description)
      if (tx.category_id) query = query.eq('category_id', tx.category_id)
    }

    const { error } = await query
    if (error) {
      console.error('Error deleting future transactions:', error)
      return { error: 'Erro ao excluir transações futuras.' }
    }
  } else {
    // Reverter saldo da conta se estava efetivada ou paga
    if (tx.status === 'posted' || tx.status === 'paid_planned') {
      await applyTransactionBalanceEffect(supabase, tx, -1)
    }

    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) return { error: 'Erro ao excluir transação.' }
  }

  revalidatePath('/', 'layout')
  return { success: 'Transação excluída com sucesso!' }
}

export async function payTransactionNew(id: string) {
  const supabase = await createClient()

  const { data: tx, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (!tx) {
    if (fetchError) console.error('Fetch Transaction Error:', fetchError, 'ID:', id)
    return { error: 'Transação não encontrada.' }
  }
  if (tx.status === 'paid_planned' || tx.status === 'posted') {
    return { error: 'Transação já foi paga.' }
  }

  const { error } = await supabase
    .from('transactions')
    .update({ status: 'paid_planned' })
    .eq('id', id)

  if (error) {
    console.error('Error updating transaction status:', error)
    return { error: 'Erro ao pagar transação.' }
  }

  // Atualizar saldo
  await applyTransactionBalanceEffect(supabase, tx, 1)

  revalidatePath('/', 'layout')
  return { success: 'Transação marcada como paga!' }
}

export async function unpayTransaction(id: string) {
  const supabase = await createClient()

  const { data: tx, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (!tx) {
    if (fetchError) console.error('Unpay Transaction Error:', fetchError, 'ID:', id)
    return { error: 'Transação não encontrada.' }
  }
  if (tx.status === 'pending') return { error: 'Transação já está pendente.' }

  const { error } = await supabase
    .from('transactions')
    .update({ status: 'pending' })
    .eq('id', id)

  if (error) return { error: 'Erro ao desmarcar transação.' }

  // Reverter saldo
  await applyTransactionBalanceEffect(supabase, tx, -1)

  revalidatePath('/', 'layout')
  return { success: 'Transação desmarcada!' }
}

export async function updateTransaction(id: string, prevState: any, formData: FormData) {
  const supabase = await createClient()

  const { data: oldTx } = await supabase.from('transactions').select().eq('id', id).single()
  if (!oldTx) return { error: 'Transação não encontrada.' }

  const numericAmount = parseCurrency(formData.get('amount'))
  if (numericAmount <= 0) return { error: 'Valor inválido.' }

  const updateScope = (formData.get('update_scope') as string) || 'single'

  const baseData: any = {
    account_id: formData.get('account_id') as string,
    type: formData.get('type') as string,
    amount: numericAmount,
    description: formData.get('description') as string,
    status: (formData.get('status') as string) || 'posted',
    date: formData.get('date') as string,
    is_recurring: oldTx.is_recurring,
    ignore_in_cashflow: parseBoolean(formData.get('ignore_in_cashflow'))
  }

  if (baseData.type === 'transfer') {
    baseData.destination_account_id = formData.get('destination_account_id') as string
  } else {
    baseData.category_id = formData.get('category_id') as string
    baseData.destination_account_id = null
  }

  if (!baseData.description || !baseData.date) {
    return { error: 'Preencha a descrição e a data.' }
  }

  // 1. Reverter efeitos de saldo da transação antiga
  if (oldTx.status === 'posted' || oldTx.status === 'paid_planned') {
    await applyTransactionBalanceEffect(supabase, oldTx, -1)
  }

  // 2. Aplicar novos efeitos de saldo se efetivada
  if (baseData.status === 'posted' || baseData.status === 'paid_planned') {
    await applyTransactionBalanceEffect(supabase, baseData, 1)
  }

  // 3. Atualizar registro no banco
  const { error } = await supabase.from('transactions').update(baseData).eq('id', id)
  if (error) return { error: 'Erro ao atualizar transação.' }

  // 4. Atualizar parcelas/recorrências futuras se solicitado
  if (updateScope === 'future' && (oldTx.is_recurring || oldTx.installment_id)) {
    const futureData: any = {
      description: baseData.description,
      amount: baseData.amount,
      type: baseData.type,
      category_id: baseData.category_id,
      account_id: baseData.account_id,
      destination_account_id: baseData.destination_account_id,
      ignore_in_cashflow: baseData.ignore_in_cashflow
    }

    let futureQuery = supabase
      .from('transactions')
      .update(futureData)
      .eq('workspace_id', oldTx.workspace_id)
      .gt('date', oldTx.date)

    if (oldTx.installment_id) {
      futureQuery = futureQuery.eq('installment_id', oldTx.installment_id)
    } else {
      futureQuery = futureQuery.eq('description', oldTx.description)
      if (oldTx.category_id) futureQuery = futureQuery.eq('category_id', oldTx.category_id)
    }

    await futureQuery
  }

  revalidatePath('/', 'layout')
  return { success: 'Transação atualizada!' }
}

export async function markAsPosted(id: string) {
  const supabase = await createClient()

  const { data: tx, error: fetchErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !tx) return { error: 'Transação não encontrada.' }
  if (tx.status === 'posted') return { error: 'Já está confirmada.' }

  // Atualizar saldo
  await applyTransactionBalanceEffect(supabase, tx, 1)

  const { error } = await supabase.from('transactions').update({ status: 'posted' }).eq('id', id)
  if (error) return { error: 'Erro ao confirmar transação.' }

  revalidatePath('/', 'layout')
  return { success: 'Transação confirmada!' }
}
