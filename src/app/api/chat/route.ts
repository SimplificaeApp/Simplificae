import { google } from '@ai-sdk/google'
import { streamText, tool } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const maxDuration = 60

function fmtMonth(m: number, y: number) {
  return new Date(y, m - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function norm(str: string) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json().catch(() => ({}))
  const rawMessages: any[] = Array.isArray(body) ? body : (Array.isArray(body?.messages) ? body.messages : [])

  const lastUserMsg = [...rawMessages].reverse().find((m: any) => m.role === 'user')
  const lastUserText = typeof lastUserMsg?.content === 'string'
    ? lastUserMsg.content
    : (Array.isArray(lastUserMsg?.parts) ? lastUserMsg.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('') : '')

  const promptNorm = norm(lastUserText)

  // 1. Carrega Contexto Global do Usuário
  const { data: categoriesData } = await supabase.from('categories').select('id, name, type, is_fixed, is_investment, budget_amount')
  const { data: accountsData } = await supabase.from('accounts').select('id, name, type, initial_balance')
  const { data: vaultsData } = await supabase.from('account_vaults').select('id, name, balance')

  const categoryIdToNameMap: Record<string, { name: string; isInvestment: boolean; isFixed: boolean }> = {}
  if (categoriesData) {
    for (const c of categoriesData as any[]) {
      categoryIdToNameMap[c.id] = { name: c.name, isInvestment: !!c.is_investment, isFixed: !!c.is_fixed }
    }
  }

  const accountIdMap: Record<string, { id: string; name: string; type: string }> = {}
  if (accountsData) {
    for (const a of accountsData as any[]) {
      accountIdMap[a.id] = { id: a.id, name: a.name, type: a.type }
    }
  }

  const categoryResolver = (t: any): string => {
    if (t.category_id && categoryIdToNameMap[t.category_id]) return categoryIdToNameMap[t.category_id].name
    if (typeof t.category === 'string') return t.category
    if (Array.isArray(t.category) && t.category.length > 0) return t.category[0]?.name || 'Outros'
    if (typeof t.category === 'object' && t.category?.name) return t.category.name
    return 'Outros'
  }

  const accountResolver = (t: any): { name: string; type: string; isCreditCard: boolean } => {
    const accObj = t.account_id ? accountIdMap[t.account_id] : null
    if (accObj) {
      return { name: accObj.name, type: accObj.type, isCreditCard: accObj.type === 'credit_card' }
    }
    const name = typeof t.account === 'string' ? t.account : (t.account?.name || '')
    const type = t.account?.type || ''
    return { name, type, isCreditCard: type === 'credit_card' }
  }

  const categoriesList = (categoriesData || []).map((c: any) => c.name).filter(Boolean)
  const bankAccounts = (accountsData || []).filter((a: any) => a.type !== 'credit_card')
  const creditCards = (accountsData || []).filter((a: any) => a.type === 'credit_card')
  
  const bankAccountsStr = bankAccounts.map((a: any) => `${a.name} (Conta)`).join(', ')
  const creditCardsStr = creditCards.map((a: any) => `${a.name} (Cartão de Crédito)`).join(', ')
  const accountsList = (accountsData || []).map((a: any) => a.name).filter(Boolean)
  const vaultsList = (vaultsData || []).map((v: any) => `${v.name}: ${fmtBRL(Number(v.balance) || 0)}`)

  // Memória de Contexto Multiturno (Categoria, Conta, Mês)
  let previousCategoryContext: string | null = null
  let previousAccountContext: string | null = null
  let previousMonthContext: number | null = null

  const aiMessages: any[] = []
  for (const m of rawMessages) {
    if (m.role === 'user') {
      const text = typeof m.content === 'string'
        ? m.content
        : (Array.isArray(m.parts) ? m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('') : '')
      
      if (text.trim()) {
        aiMessages.push({ role: 'user', content: text })
        const mNorm = norm(text)
        for (const cName of categoriesList) {
          if (mNorm.includes(norm(cName))) {
            previousCategoryContext = cName
            break
          }
        }
        for (const aName of accountsList) {
          if (mNorm.includes(norm(aName))) {
            previousAccountContext = aName
            break
          }
        }
        if (mNorm.includes('agosto')) previousMonthContext = 8
        if (mNorm.includes('julho')) previousMonthContext = 7
        if (mNorm.includes('setembro')) previousMonthContext = 9
      }
    } else if (m.role === 'assistant') {
      const parts = Array.isArray(m.parts) ? m.parts : []
      const textStr = parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || p.textDelta || '').join('')
      const toolInsightStr = parts
        .filter((p: any) => p.type === 'tool-invocation' || p.toolInvocation)
        .map((p: any) => {
          const inv = p.toolInvocation || p
          const res = inv.result || inv.output || p.result || p.output
          if (res && typeof res === 'object' && res.insight) return res.insight
          return ''
        })
        .filter(Boolean)
        .join('\n')

      const finalContent = textStr || toolInsightStr || (typeof m.content === 'string' ? m.content : '') || 'OK.'
      aiMessages.push({ role: 'assistant', content: finalContent })
    }
  }

  const now = new Date()
  const today = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const systemPrompt = `Você é o assistente pessoal de inteligência financeira da plataforma Simplificae.
Hoje é ${today}. O mês de referência atual é ${currentMonth}/${currentYear} (${fmtMonth(currentMonth, currentYear)}).

SEU CONTEXTO FINANCEIRO:
- Contas Bancárias (Débito/Líquido): ${bankAccountsStr || 'Nenhuma'}
- Cartões de Crédito (Fatura): ${creditCardsStr || 'Nenhum'}
- Categorias cadastradas: ${categoriesList.join(', ')}
- Cofres e Investimentos: ${vaultsList.length > 0 ? vaultsList.join(', ') : 'Nenhum'}

REGRAS OBRIGATÓRIAS:
1. SEMPRE FORNEÇA RESPOSTAS EM TEXTO RICAS E COMPLETAS:
   - Nunca responda em branco. Sempre comente os números, forneça análises e explicações claras.

2. QUANDO O USUÁRIO PERGUNTAR POR INVESTIMENTOS ("quanto investi", "quanto guardei", "cofres"):
   - Busque as transações de categorias de investimento (ex: Renda Fixa) ou aportes em cofres.

3. CONTINUIDADE DE PERÍODO E PERGUNTAS DE DETALHAMENTO ("detalha melhor", "o que seriam esses"):
   - Se o usuário perguntou sobre agosto ou sobre uma categoria específica, mantenha esse contexto e explique detalhadamente em formato Markdown com marcadores.`

  try {
    const result = streamText({
      model: google('gemini-3.5-flash-lite'),
      system: systemPrompt,
      messages: aiMessages,
      maxSteps: 5,
      tools: {
        // ─── 1. Resumo Financeiro Geral do Mês ─────────────────────────────
        getFinancialSummary: tool({
          description: 'Obtem o resumo financeiro do mes (total de receitas, total de despesas, saldo e principais categorias).',
          parameters: z.object({
            month: z.number().min(1).max(12).optional(),
            year: z.number().optional(),
            excludeCategory: z.string().optional(),
          }),
          execute: async (args: any) => {
            const m = args.month ?? previousMonthContext ?? currentMonth
            const y = args.year ?? currentYear
            const daysInMonth = new Date(y, m, 0).getDate()
            const startDate = `${y}-${String(m).padStart(2,'0')}-01`
            const endDate = `${y}-${String(m).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`

            const excludeQuery = args.excludeCategory ? norm(args.excludeCategory) : null

            const { data: txs } = await supabase
              .from('transactions')
              .select('id, category_id, account_id, description, amount, type, date, ignore_in_cashflow')
              .gte('date', startDate).lte('date', endDate)

            if (!txs) return { found: false, period: fmtMonth(m, y), insight: `Sem lançamentos registrados em ${fmtMonth(m, y)}.`, showCard: false }

            let totalIncome = 0
            let totalExpense = 0
            let excludedTotal = 0
            const catMap: Record<string, number> = {}

            for (const t of txs as any[]) {
              if (t.ignore_in_cashflow || t.type === 'transfer') continue
              const cname = categoryResolver(t)
              const cnameNorm = norm(cname)
              const descNorm = norm(t.description || '')

              if (descNorm.includes('ajuste manual') || descNorm.includes('aporte no cofrinho')) continue

              if (excludeQuery && (cnameNorm.includes(excludeQuery) || descNorm.includes(excludeQuery))) {
                if (t.type === 'expense') excludedTotal += Number(t.amount)
                continue
              }

              const amt = Number(t.amount) || 0
              if (t.type === 'income') totalIncome += amt
              if (t.type === 'expense') {
                totalExpense += amt
                catMap[cname] = (catMap[cname] || 0) + amt
              }
            }

            const balance = totalIncome - totalExpense
            const topCategories = Object.entries(catMap)
              .sort(([, a], [, b]) => b - a)
              .map(([name, total]) => ({ name, total: Number(total.toFixed(2)) }))

            const balanceStr = balance >= 0 ? `saldo positivo de **${fmtBRL(balance)}**` : `déficit de **${fmtBRL(Math.abs(balance))}**`
            const excludeNote = excludeQuery && excludedTotal > 0 ? ` (desconsiderando a categoria **${args.excludeCategory}** de **${fmtBRL(excludedTotal)}**)` : ''
            
            const insight = `Em **${fmtMonth(m, y)}**${excludeNote}, você registrou **${fmtBRL(totalIncome)}** em receitas e **${fmtBRL(totalExpense)}** em despesas consideradas, resultando em um ${balanceStr}.`

            return {
              cardType: 'summary',
              found: true,
              period: fmtMonth(m, y),
              totalIncome: Number(totalIncome.toFixed(2)),
              totalExpense: Number(totalExpense.toFixed(2)),
              balance: Number(balance.toFixed(2)),
              excludedTotal: Number(excludedTotal.toFixed(2)),
              transactionCount: txs.length,
              topCategories,
              insight,
              showCard: true
            }
          }
        } as any),

        // ─── 2. Transações e Buscas Específicas ─────────────────────────────
        getTransactions: tool({
          description: 'Busca lancamentos e transacoes filtrados por mês, ano, categoria, conta ou investimentos.',
          parameters: z.object({
            month: z.number().min(1).max(12).optional(),
            year: z.number().optional(),
            categoryName: z.string().optional(),
            accountName: z.string().optional(),
            keyword: z.string().optional(),
            isInvestment: z.boolean().optional().describe('Defina como true quando a pergunta for sobre investimentos, cofres, aportes ou reserva'),
            onlyCreditCards: z.boolean().optional(),
            onlyBankAccounts: z.boolean().optional(),
          }),
          execute: async (args: any) => {
            const m = args.month ?? previousMonthContext ?? currentMonth
            const y = args.year ?? currentYear
            const daysInMonth = new Date(y, m, 0).getDate()
            const startDate = `${y}-${String(m).padStart(2,'0')}-01`
            const endDate = `${y}-${String(m).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`

            const { data: allTxs } = await supabase
              .from('transactions')
              .select('id, category_id, account_id, description, amount, type, date, status, ignore_in_cashflow')
              .gte('date', startDate).lte('date', endDate)
              .order('date', { ascending: false })

            let txs = allTxs || []

            // A) Filtro de Segurança do Fluxo de Caixa
            txs = txs.filter((t: any) => {
              if (t.ignore_in_cashflow) return false
              if (t.type === 'transfer') return false
              const descNorm = norm(t.description || '')
              if (descNorm.includes('ajuste manual')) return false
              return true
            })

            // Detecta intenção de investimento caso não passada nos argumentos
            const isInvestIntent = args.isInvestment || promptNorm.includes('investi') || promptNorm.includes('investimento') || promptNorm.includes('guardei') || promptNorm.includes('cofre') || promptNorm.includes('reserva')

            // B) Filtro por Investimentos
            if (isInvestIntent) {
              txs = txs.filter((t: any) => {
                const catObj = t.category_id ? categoryIdToNameMap[t.category_id] : null
                const descNorm = norm(t.description || '')
                const cnameNorm = catObj ? norm(catObj.name) : ''
                return catObj?.isInvestment || cnameNorm.includes('renda fixa') || cnameNorm.includes('investimento') || descNorm.includes('aporte') || descNorm.includes('investimento') || descNorm.includes('reserva') || descNorm.includes('cofre')
              })
            } else {
              // Filtro normal por Categoria
              let targetCatName = args.categoryName || null
              if (!targetCatName) {
                for (const cName of categoriesList) {
                  const cNorm = norm(cName)
                  if (promptNorm.includes(cNorm) || cNorm.includes(promptNorm)) {
                    targetCatName = cName
                    break
                  }
                }
              }
              if (!targetCatName && previousCategoryContext && (promptNorm.includes('essas') || promptNorm.includes('esses') || promptNorm.includes('quais') || promptNorm.includes('detalha') || promptNorm.includes('outras despesas'))) {
                targetCatName = previousCategoryContext
              }

              if (targetCatName) {
                const catNorm = norm(targetCatName)
                txs = txs.filter((t: any) => {
                  const cname = norm(categoryResolver(t))
                  const desc = norm(t.description || '')
                  return cname.includes(catNorm) || catNorm.includes(cname) || desc.includes(catNorm)
                })
              }

              if (args.keyword) {
                const kwNorm = norm(args.keyword)
                txs = txs.filter((t: any) => {
                  const desc = norm(t.description || '')
                  const cname = norm(categoryResolver(t))
                  return desc.includes(kwNorm) || cname.includes(kwNorm)
                })
              }
            }

            if (args.accountName) {
              const accNorm = norm(args.accountName)
              txs = txs.filter((t: any) => {
                const aname = norm(accountResolver(t).name)
                return aname.includes(accNorm) || accNorm.includes(aname)
              })
            }

            let totalIncome = 0
            let totalExpense = 0

            for (const t of txs as any[]) {
              const amt = Number(t.amount) || 0
              if (t.type === 'income') totalIncome += amt
              if (t.type === 'expense') totalExpense += amt
            }

            let insight = ''
            if (txs.length === 0) {
              insight = isInvestIntent 
                ? `Nenhum investimento ou aporte registrado em **${fmtMonth(m, y)}**.`
                : `Nenhum lançamento localizado em **${fmtMonth(m, y)}**.`
            } else if (isInvestIntent) {
              insight = `Em **${fmtMonth(m, y)}**, você investiu/aportou um total de **${fmtBRL(totalExpense > 0 ? totalExpense : totalIncome)}**, distribuídos em **${txs.length} lançamento(s)**.`
            } else {
              const label = args.categoryName || previousCategoryContext || 'pesquisa'
              insight = `Em **${fmtMonth(m, y)}**, você registrou **${fmtBRL(totalExpense > 0 ? totalExpense : totalIncome)}** (${label}), distribuídos em **${txs.length} lançamento(s)**.`
            }

            return {
              cardType: 'search',
              found: txs.length > 0,
              period: fmtMonth(m, y),
              categoryFilter: args.categoryName || (isInvestIntent ? 'Investimentos' : undefined),
              accountFilter: args.accountName,
              totalIncome: Number(totalIncome.toFixed(2)),
              totalExpense: Number(totalExpense.toFixed(2)),
              transactionCount: txs.length,
              transactions: txs.map((t: any) => {
                const accInfo = accountResolver(t)
                return {
                  description: t.description,
                  amount: Number(t.amount).toFixed(2),
                  type: t.type,
                  date: t.date,
                  category: categoryResolver(t),
                  account: accInfo.name,
                  isCreditCard: accInfo.isCreditCard
                }
              }),
              insight,
              showCard: true
            }
          }
        } as any),

        // ─── 3. Planejamento do Mês Futuro (Aba /planned) ─────────────────
        getPlannedTransactions: tool({
          description: 'Obtem o planejamento de orcamento e despesas previstas para os proximos meses exatamente igual a aba /planned.',
          parameters: z.object({
            month: z.number().min(1).max(12).optional(),
            year: z.number().optional(),
          }),
          execute: async (args: any) => {
            let targetMonth = args.month ?? previousMonthContext
            let targetYear = args.year
            if (!targetMonth) {
              targetMonth = currentMonth === 12 ? 1 : currentMonth + 1
              targetYear = currentMonth === 12 ? currentYear + 1 : currentYear
            }
            if (!targetYear) targetYear = currentYear

            const daysInTarget = new Date(targetYear, targetMonth, 0).getDate()
            const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
            const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(daysInTarget).padStart(2, '0')}`

            // 1. Busca lançamentos cadastrados para o ciclo do próximo mês
            const { data: targetTxs } = await supabase
              .from('transactions')
              .select('id, category_id, account_id, description, amount, type, date, status, is_recurring, ignore_in_cashflow')
              .gte('date', startDate).lte('date', endDate)

            let spentFixed = 0
            let spentVariable = 0
            let totalTargetIncome = 0
            const fixedCategorySpentMap: Record<string, number> = {}
            const variableCategorySpentMap: Record<string, number> = {}

            const fixedCatIds = new Set((categoriesData || []).filter((c: any) => c.is_fixed && !c.is_investment).map((c: any) => c.id))

            if (targetTxs) {
              for (const t of targetTxs as any[]) {
                if (t.ignore_in_cashflow || t.type === 'transfer') continue
                const amt = Number(t.amount) || 0
                const cname = categoryResolver(t)
                if (t.type === 'income') {
                  totalTargetIncome += amt
                } else if (t.type === 'expense') {
                  const isFix = Boolean(t.is_recurring) || Boolean(t.category_id && fixedCatIds.has(t.category_id))
                  if (isFix) {
                    spentFixed += amt
                    fixedCategorySpentMap[cname] = (fixedCategorySpentMap[cname] || 0) + amt
                  } else {
                    spentVariable += amt
                    variableCategorySpentMap[cname] = (variableCategorySpentMap[cname] || 0) + amt
                  }
                }
              }
            }

            // 2. Orçamentos base das categorias (budget_amount)
            let plannedFixedBase = 0
            let plannedVariableBase = 0
            let plannedIncomeBase = 0
            const fixedCategoryItems: { name: string; amount: number }[] = []
            const variableCategoryItems: { name: string; amount: number }[] = []

            if (categoriesData) {
              for (const c of categoriesData as any[]) {
                const amt = Number(c.budget_amount) || 0
                if (c.type === 'income') {
                  plannedIncomeBase += amt
                } else if (c.type === 'expense' && !c.is_investment) {
                  const spentInCat = c.is_fixed ? (fixedCategorySpentMap[c.name] || 0) : (variableCategorySpentMap[c.name] || 0)
                  const finalCatAmount = Math.max(amt, spentInCat)

                  if (c.is_fixed) {
                    plannedFixedBase += amt
                    if (finalCatAmount > 0) fixedCategoryItems.push({ name: c.name, amount: finalCatAmount })
                  } else {
                    plannedVariableBase += amt
                    if (finalCatAmount > 0) variableCategoryItems.push({ name: c.name, amount: finalCatAmount })
                  }
                }
              }
            }

            const plannedFixed = Math.max(plannedFixedBase, spentFixed)
            const plannedVariable = Math.max(plannedVariableBase, spentVariable)
            const plannedIncome = Math.max(plannedIncomeBase, totalTargetIncome)

            const totalEstimatedExpense = plannedFixed + plannedVariable
            const projectedBalance = plannedIncome - totalEstimatedExpense

            const isDetailRequested = promptNorm.includes('detalha') || promptNorm.includes('detalhe') || promptNorm.includes('quais') || promptNorm.includes('item')

            let insight = ''
            if (isDetailRequested) {
              const fixedLines = fixedCategoryItems.map(i => `- **${i.name}**: ${fmtBRL(i.amount)}`).join('\n')
              const varLines = variableCategoryItems.map(i => `- **${i.name}**: ${fmtBRL(i.amount)}`).join('\n')

              insight = `De acordo com a sua **Aba de Planejamento**, o detalhamento para **${fmtMonth(targetMonth, targetYear)}** é:\n\n` +
                `### 📌 Custos Fixos (${fmtBRL(plannedFixed)}):\n${fixedLines || '- *Nenhum*'}\n\n` +
                `### 💡 Custos Variáveis (${fmtBRL(plannedVariable)}):\n${varLines || '- *Nenhum*'}\n\n` +
                `💰 **Receitas Previstas**: ${fmtBRL(plannedIncome)} | 🟢 **Saldo Projetado**: ${fmtBRL(projectedBalance)}`
            } else {
              insight = `De acordo com a sua **Aba de Planejamento**, o seu orçamento para **${fmtMonth(targetMonth, targetYear)}** está estimado em **${fmtBRL(totalEstimatedExpense)}** (**${fmtBRL(plannedFixed)}** em Custos Fixos + **${fmtBRL(plannedVariable)}** em Custos Variáveis).`
            }

            return {
              cardType: 'planning',
              found: true,
              period: fmtMonth(targetMonth, targetYear),
              fixedBills: {
                total: Number(plannedFixed.toFixed(2)),
                items: fixedCategoryItems
              },
              variableProjections: {
                total: Number(plannedVariable.toFixed(2)),
                items: variableCategoryItems
              },
              totalEstimatedExpense: Number(totalEstimatedExpense.toFixed(2)),
              expectedIncome: Number(plannedIncome.toFixed(2)),
              projectedBalance: Number(projectedBalance.toFixed(2)),
              insight,
              showCard: true
            }
          }
        } as any),

        // ─── 4. Saldos de Contas e Cofres de Investimentos ───────────────
        getAccounts: tool({
          description: 'Obtem os saldos atuais das contas bancarias, faturas de cartao e cofres de investimento do usuario.',
          parameters: z.object({
            accountName: z.string().optional(),
          }),
          execute: async (args: any) => {
            const { data: accounts } = await supabase.from('accounts').select('id, name, type, initial_balance, is_hidden')

            if (!accounts) return { cardType: 'accounts', found: false, insight: 'Nenhuma conta localizada.', showCard: false }

            const { data: allTxs } = await supabase
              .from('transactions')
              .select('account_id, destination_account_id, type, amount, status')
              .eq('status', 'posted')

            const { data: vaults } = await supabase.from('account_vaults').select('id, name, balance, target_amount')

            const calculatedAccounts = accounts.map((acc: any) => {
              let balance = Number(acc.initial_balance) || 0
              if (allTxs) {
                for (const t of allTxs as any[]) {
                  const amt = Number(t.amount) || 0
                  if (t.type === 'income' && t.account_id === acc.id) balance += amt
                  if (t.type === 'expense' && t.account_id === acc.id) balance -= amt
                  if (t.type === 'transfer') {
                    if (t.account_id === acc.id) balance -= amt
                    if (t.destination_account_id === acc.id) balance += amt
                  }
                }
              }
              return { id: acc.id, name: acc.name, type: acc.type, balance: Number(balance.toFixed(2)), isHidden: acc.is_hidden }
            })

            let filtered = calculatedAccounts
            if (args.accountName) {
              const q = norm(args.accountName)
              filtered = calculatedAccounts.filter((a: any) => norm(a.name).includes(q))
            }

            const totalLiquid = calculatedAccounts.reduce((s, a) => s + (a.type !== 'credit_card' ? a.balance : 0), 0)
            const totalCreditDebt = calculatedAccounts.reduce((s, a) => s + (a.type === 'credit_card' ? Math.abs(a.balance) : 0), 0)
            const totalVaults = (vaults || []).reduce((s, v) => s + (Number(v.balance) || 0), 0)

            const insight = `Você possui **${filtered.length}** conta(s)/cartão(ões). Saldo líquido total: **${fmtBRL(totalLiquid)}** | Faturas de cartão: **${fmtBRL(totalCreditDebt)}** | Cofres/Investimentos: **${fmtBRL(totalVaults)}**.`

            return {
              cardType: 'accounts',
              found: true,
              totalLiquidBalance: Number(totalLiquid.toFixed(2)),
              totalCreditDebt: Number(totalCreditDebt.toFixed(2)),
              totalVaults: Number(totalVaults.toFixed(2)),
              netTotal: Number((totalLiquid + totalVaults).toFixed(2)),
              accountsList: filtered,
              vaultsList: vaults || [],
              insight,
              showCard: true
            }
          }
        } as any),

      },
      onError: (err: any) => {
        console.error('[CHAT API] Stream error:', err)
      },
    } as any)

    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error('[CHAT API] Fatal error:', error)
    return new Response(JSON.stringify({ error: 'Erro ao processar.' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
