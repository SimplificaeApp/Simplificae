'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createTransaction(prevState: any, formData: FormData) {
  const supabase = await createClient()

  // Precisamos do Workspace ID, que pode vir oculto no formulário
  const workspace_id = formData.get('workspace_id') as string
  if (!workspace_id) return { error: 'Workspace não identificado.' }

  const amountStr = formData.get('amount') as string
  // Remove R$, pontos e converte vírgula para ponto
  const numericAmount = parseFloat(amountStr.replace(/[^\d,-]/g, '').replace(',', '.'))
  
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return { error: 'Valor inválido.' }
  }

  const installmentsStr = formData.get('installments') as string
  const installments = installmentsStr ? parseInt(installmentsStr, 10) : 1
  const status = formData.get('status') as string || 'posted'
  const baseDate = formData.get('date') as string

  const baseData: any = {
    workspace_id,
    account_id: formData.get('account_id') as string,
    type: formData.get('type') as string,
    amount: installments > 1 ? numericAmount / installments : numericAmount,
    description: formData.get('description') as string,
    status: status,
    ignore_in_cashflow: formData.get('ignore_in_cashflow') === 'on'
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

  const isRecurring = formData.get('is_recurring') === 'true'
  const recurringMonthsStr = formData.get('recurring_months') as string
  const recurringMonths = recurringMonthsStr ? parseInt(recurringMonthsStr, 10) : 12

  const transactionsToInsert = []
  
  if (isRecurring && baseData.type !== 'transfer') {
    for (let i = 0; i < recurringMonths; i++) {
      const dateObj = new Date(baseDate + 'T12:00:00')
      dateObj.setMonth(dateObj.getMonth() + i)
      
      transactionsToInsert.push({
        ...baseData,
        amount: numericAmount, // Mantém o valor integral a cada mês!
        date: dateObj.toISOString().split('T')[0],
        description: baseData.description
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

  const { error } = await supabase
    .from('transactions')
    .insert(transactionsToInsert)

  if (error) {
    console.error('Erro ao inserir transação:', error)
    return { error: 'Ocorreu um erro ao salvar a transação.' }
  }

  // Se a transação for 'posted' e não for parcelada
  if (status === 'posted' && installments === 1) {
    const data = transactionsToInsert[0]
    // Isso pode ser feito via Trigger no SQL (recomendado) ou aqui.
    // Faremos via código por enquanto para simplicidade do MVP, 
    // mas o ideal futuro é uma trigger bancária.
    
    // Pega o saldo atual da conta de origem
    const { data: account } = await supabase
      .from('accounts')
      .select('initial_balance') // Usando initial_balance como field de controle por enquanto
      .eq('id', data.account_id)
      .single()
      
    if (account) {
      let newBalance = Number(account.initial_balance)
      if (data.type === 'income') newBalance += data.amount
      if (data.type === 'expense' || data.type === 'transfer') newBalance -= data.amount
      
      await supabase
        .from('accounts')
        .update({ initial_balance: newBalance })
        .eq('id', data.account_id)
    }

    // Se for transferência, adiciona na conta de destino
    if (data.type === 'transfer' && data.destination_account_id) {
      const { data: destAccount } = await supabase
        .from('accounts')
        .select('initial_balance')
        .eq('id', data.destination_account_id)
        .single()

      if (destAccount) {
        await supabase
          .from('accounts')
          .update({ initial_balance: Number(destAccount.initial_balance) + data.amount })
          .eq('id', data.destination_account_id)
      }
    }
  }

  revalidatePath('/', 'layout')
  return { success: 'Transação salva com sucesso!' }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()

  // Buscar a transação antes de deletar para reverter o saldo
  const { data: tx, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (!tx) {
    console.error("Delete Transaction Error:", fetchError, "ID:", id);
    return { error: 'Transação não encontrada.' }
  }

  let account = null
  if (tx.account_id) {
    const { data: acc } = await supabase.from('accounts').select('id, initial_balance').eq('id', tx.account_id).single()
    account = acc
  }

  // Reverter saldo da conta de origem
  if (tx.status === 'posted' && account) {
    let newBalance = Number(account.initial_balance)
    if (tx.type === 'income') newBalance -= Number(tx.amount)
    if (tx.type === 'expense' || tx.type === 'transfer') newBalance += Number(tx.amount)

    await supabase
      .from('accounts')
      .update({ initial_balance: newBalance })
      .eq('id', tx.account_id)

    // Reverter conta de destino se for transferência
    if (tx.type === 'transfer' && tx.destination_account_id) {
      const { data: destAcc } = await supabase
        .from('accounts')
        .select('initial_balance')
        .eq('id', tx.destination_account_id)
        .single()

      if (destAcc) {
        await supabase
          .from('accounts')
          .update({ initial_balance: Number(destAcc.initial_balance) - Number(tx.amount) })
          .eq('id', tx.destination_account_id)
      }
    }
  }

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) return { error: 'Erro ao excluir transação.' }

  revalidatePath('/', 'layout')
  return { success: 'Transação excluída com sucesso!' }
}

export async function payTransactionNew(id: string) {
  console.error("SERVER ACTION: payTransactionNew started for id:", id);
  const supabase = await createClient()

  // Buscar transação
  const { data: tx, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (!tx) {
    console.error("SERVER ACTION: !tx IS TRUE. fetchError:", fetchError, "ID:", id);
    return { error: 'Transação não encontrada.' }
  }
  if (tx.status === 'paid_planned' || tx.status === 'posted') {
    console.error("SERVER ACTION: tx already paid. status:", tx.status);
    return { error: 'Transação já foi paga.' }
  }

  let account = null
  if (tx.account_id) {
    const { data: acc, error: accErr } = await supabase.from('accounts').select('id, initial_balance').eq('id', tx.account_id).single()
    if (accErr) {
      console.error("SERVER ACTION: Error fetching account:", accErr);
    }
    account = acc
  }

  // Atualizar para paid_planned (para manter na tela de planejamento)
  const { error } = await supabase
    .from('transactions')
    .update({ status: 'paid_planned' })
    .eq('id', id)

  if (error) {
    console.error("SERVER ACTION: Error updating transaction:", error);
    return { error: 'Erro ao pagar transação.' }
  }

  // Atualizar saldo
  if (account) {
    let newBalance = Number(account.initial_balance)
    if (tx.type === 'income') newBalance += Number(tx.amount)
    if (tx.type === 'expense' || tx.type === 'transfer') newBalance -= Number(tx.amount)

    const { error: balanceErr } = await supabase
      .from('accounts')
      .update({ initial_balance: newBalance })
      .eq('id', tx.account_id)
      
    if (balanceErr) {
      console.error("SERVER ACTION: Error updating balance:", balanceErr);
    }
  }

  revalidatePath('/', 'layout')
  console.error("SERVER ACTION: payTransactionNew SUCCESS");
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
    console.error("Unpay Transaction Error:", fetchError, "ID:", id);
    return { error: 'Transação não encontrada.' }
  }
  if (tx.status === 'pending') return { error: 'Transação já está pendente.' }

  let account = null
  if (tx.account_id) {
    const { data: acc } = await supabase.from('accounts').select('id, initial_balance').eq('id', tx.account_id).single()
    account = acc
  }

  const { error } = await supabase
    .from('transactions')
    .update({ status: 'pending' })
    .eq('id', id)

  if (error) return { error: 'Erro ao desmarcar transação.' }

  if (account) {
    let newBalance = Number(account.initial_balance)
    if (tx.type === 'income') newBalance -= Number(tx.amount)
    if (tx.type === 'expense' || tx.type === 'transfer') newBalance += Number(tx.amount)

    await supabase
      .from('accounts')
      .update({ initial_balance: newBalance })
      .eq('id', tx.account_id)
  }

  revalidatePath('/', 'layout')
  return { success: 'Lançamento desmarcado com sucesso!' }
}

export async function updateTransaction(id: string, prevState: any, formData: FormData) {
  const supabase = await createClient()

  // 1. Fetch old transaction to revert balances
  const { data: oldTx } = await supabase.from('transactions').select().eq('id', id).single()
  if (!oldTx) return { error: 'Transação não encontrada.' }

  // 2. Validate and parse new data
  const amountStr = formData.get('amount') as string
  const numericAmount = parseFloat(amountStr.replace(/[^\d,-]/g, '').replace(',', '.'))
  
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return { error: 'Valor inválido.' }
  }

  const baseData: any = {
    account_id: formData.get('account_id') as string,
    type: formData.get('type') as string,
    amount: numericAmount,
    description: formData.get('description') as string,
    status: formData.get('status') as string || 'posted',
    date: formData.get('date') as string,
    ignore_in_cashflow: formData.get('ignore_in_cashflow') === 'on'
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

  // 3. Revert Old Balances
  if (oldTx.status === 'posted' && oldTx.account_id) {
    const { data: oldAcc } = await supabase.from('accounts').select('initial_balance').eq('id', oldTx.account_id).single()
    if (oldAcc) {
      let revertedBalance = Number(oldAcc.initial_balance)
      if (oldTx.type === 'income') revertedBalance -= Number(oldTx.amount)
      if (oldTx.type === 'expense' || oldTx.type === 'transfer') revertedBalance += Number(oldTx.amount)
      await supabase.from('accounts').update({ initial_balance: revertedBalance }).eq('id', oldTx.account_id)
    }

    if (oldTx.type === 'transfer' && oldTx.destination_account_id) {
      const { data: oldDest } = await supabase.from('accounts').select('initial_balance').eq('id', oldTx.destination_account_id).single()
      if (oldDest) {
        await supabase.from('accounts').update({ initial_balance: Number(oldDest.initial_balance) - Number(oldTx.amount) }).eq('id', oldTx.destination_account_id)
      }
    }
  }

  // 4. Apply New Balances
  if (baseData.status === 'posted' && baseData.account_id) {
    const { data: newAcc } = await supabase.from('accounts').select('initial_balance').eq('id', baseData.account_id).single()
    if (newAcc) {
      let newBalance = Number(newAcc.initial_balance)
      if (baseData.type === 'income') newBalance += baseData.amount
      if (baseData.type === 'expense' || baseData.type === 'transfer') newBalance -= baseData.amount
      await supabase.from('accounts').update({ initial_balance: newBalance }).eq('id', baseData.account_id)
    }

    if (baseData.type === 'transfer' && baseData.destination_account_id) {
      const { data: newDest } = await supabase.from('accounts').select('initial_balance').eq('id', baseData.destination_account_id).single()
      if (newDest) {
        await supabase.from('accounts').update({ initial_balance: Number(newDest.initial_balance) + baseData.amount }).eq('id', baseData.destination_account_id)
      }
    }
  }

  // 5. Update Transaction
  const { error } = await supabase.from('transactions').update(baseData).eq('id', id)
  if (error) return { error: 'Erro ao atualizar transação.' }

  revalidatePath('/', 'layout')
  return { success: 'Transação atualizada!' }
}

export async function markAsPosted(id: string) {
  'use server'
  const supabase = await createClient()

  // Fetch the transaction
  const { data: tx, error: fetchErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !tx) return { error: 'Transação não encontrada.' }
  if (tx.status === 'posted') return { error: 'Já está confirmada.' }

  // Update account balance
  if (tx.account_id) {
    const { data: acc } = await supabase.from('accounts').select('initial_balance').eq('id', tx.account_id).single()
    if (acc) {
      let newBalance = Number(acc.initial_balance)
      if (tx.type === 'income') newBalance += Number(tx.amount)
      if (tx.type === 'expense' || tx.type === 'transfer') newBalance -= Number(tx.amount)
      await supabase.from('accounts').update({ initial_balance: newBalance }).eq('id', tx.account_id)
    }
    // Handle transfer destination
    if (tx.type === 'transfer' && tx.destination_account_id) {
      const { data: dest } = await supabase.from('accounts').select('initial_balance').eq('id', tx.destination_account_id).single()
      if (dest) {
        await supabase.from('accounts').update({ initial_balance: Number(dest.initial_balance) + Number(tx.amount) }).eq('id', tx.destination_account_id)
      }
    }
  }

  const { error } = await supabase.from('transactions').update({ status: 'posted' }).eq('id', id)
  if (error) return { error: 'Erro ao confirmar transação.' }

  revalidatePath('/', 'layout')
  return { success: 'Transação confirmada!' }
}
