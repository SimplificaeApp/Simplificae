function startOfDay(d: Date) {
  const newDate = new Date(d)
  newDate.setHours(0, 0, 0, 0)
  return newDate
}

function endOfDay(d: Date) {
  const newDate = new Date(d)
  newDate.setHours(23, 59, 59, 999)
  return newDate
}

export function getCreditCardCycles(closingDay: number, dueDay: number, referenceDate: Date = new Date()) {
  const currentMonth = referenceDate.getMonth()
  const currentYear = referenceDate.getFullYear()

  // Data de fechamento deste mês
  let closingDateThisMonth = new Date(currentYear, currentMonth, closingDay)
  
  // Se a data de referência já passou do fechamento, a fatura ATUAL é a do próximo mês
  let targetMonth = currentMonth
  let targetYear = currentYear
  if (referenceDate.getTime() > endOfDay(closingDateThisMonth).getTime()) {
    targetMonth += 1
    if (targetMonth > 11) {
      targetMonth = 0
      targetYear += 1
    }
  }

  // Fatura Atual: Fecha no targetMonth
  const currentClosing = new Date(targetYear, targetMonth, closingDay)
  
  // O início do ciclo da fatura atual é o dia seguinte ao fechamento do mês anterior
  let prevMonth = targetMonth - 1
  let prevYear = targetYear
  if (prevMonth < 0) {
    prevMonth = 11
    prevYear -= 1
  }
  const prevMonthDate = new Date(prevYear, prevMonth, closingDay)
  const currentStart = startOfDay(new Date(prevYear, prevMonth, closingDay + 1)) 

  // Vencimento
  let dueMonth = targetMonth
  let dueYear = targetYear
  if (dueDay < closingDay) {
    dueMonth += 1
    if (dueMonth > 11) {
      dueMonth = 0
      dueYear += 1
    }
  }
  const currentDue = new Date(dueYear, dueMonth, dueDay)

  // Previous
  let prevPrevMonth = prevMonth - 1
  let prevPrevYear = prevYear
  if (prevPrevMonth < 0) {
    prevPrevMonth = 11
    prevPrevYear -= 1
  }

  // Next
  let nextMonth = targetMonth + 1
  let nextYear = targetYear
  if (nextMonth > 11) {
    nextMonth = 0
    nextYear += 1
  }
  let nextDueMonth = dueMonth + 1
  let nextDueYear = dueYear
  if (nextDueMonth > 11) {
    nextDueMonth = 0
    nextDueYear += 1
  }
  let prevDueMonth = dueMonth - 1
  let prevDueYear = dueYear
  if (prevDueMonth < 0) {
    prevDueMonth = 11
    prevDueYear -= 1
  }

  return {
    current: {
      start: currentStart,
      end: endOfDay(currentClosing),
      dueDate: currentDue,
    },
    // Fatura anterior
    previous: {
      start: startOfDay(new Date(prevPrevYear, prevPrevMonth, closingDay + 1)),
      end: endOfDay(new Date(prevYear, prevMonth, closingDay)),
      dueDate: new Date(prevDueYear, prevDueMonth, dueDay),
    },
    // Próxima fatura
    next: {
      start: startOfDay(new Date(targetYear, targetMonth, closingDay + 1)),
      end: endOfDay(new Date(nextYear, nextMonth, closingDay)),
      dueDate: new Date(nextDueYear, nextDueMonth, dueDay),
    }
  }
}

export function calculateCardBalances(card: any, transactions: any[]) {
  const cardTx = transactions.filter(t => t.account_id === card.id || t.destination_account_id === card.id)
  
  const cycles = getCreditCardCycles(card.closing_day || 1, card.due_day || 10)
  
  let currentInvoiceTotal = 0
  let previousInvoiceTotal = 0
  let nextInvoiceTotal = 0
  
  const currentTxs: any[] = []
  const previousTxs: any[] = []
  const nextTxs: any[] = []
  
  let totalBalance = 0 // Saldo devedor total

  for (const tx of cardTx) {
    const txDate = new Date(tx.date)
    
    // Gastos no cartão (account_id = card.id)
    if (tx.account_id === card.id && tx.type === 'expense') {
      totalBalance += Number(tx.amount)
      
      if (txDate >= cycles.current.start && txDate <= cycles.current.end) {
        currentInvoiceTotal += Number(tx.amount)
        currentTxs.push(tx)
      } else if (txDate >= cycles.previous.start && txDate <= cycles.previous.end) {
        previousInvoiceTotal += Number(tx.amount)
        previousTxs.push(tx)
      } else if (txDate >= cycles.next.start && txDate <= cycles.next.end) {
        nextInvoiceTotal += Number(tx.amount)
        nextTxs.push(tx)
      }
    }
    
    // Pagamentos do cartão (transferência PARA o cartão)
    if (tx.destination_account_id === card.id && tx.type === 'transfer') {
      totalBalance -= Number(tx.amount)
      
      if (txDate >= cycles.current.start && txDate <= cycles.current.end) {
        currentInvoiceTotal -= Number(tx.amount)
        currentTxs.push(tx)
      } else if (txDate >= cycles.previous.start && txDate <= cycles.previous.end) {
        previousInvoiceTotal -= Number(tx.amount)
        previousTxs.push(tx)
      } else if (txDate >= cycles.next.start && txDate <= cycles.next.end) {
        nextInvoiceTotal -= Number(tx.amount)
        nextTxs.push(tx)
      }
    }
  }

  // Ordenar transações da mais recente para mais antiga
  currentTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  previousTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  nextTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return {
    cycles,
    totals: {
      current: Math.max(0, currentInvoiceTotal), // não deixar negativo se pagou a mais
      previous: Math.max(0, previousInvoiceTotal),
      next: Math.max(0, nextInvoiceTotal),
      totalDebt: totalBalance
    },
    txs: {
      current: currentTxs,
      previous: previousTxs,
      next: nextTxs
    }
  }
}
