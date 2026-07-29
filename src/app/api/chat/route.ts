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

  // ── Carrega metadados do usuário para o system prompt ──
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, type, is_fixed, is_investment, budget_amount')

  const { data: accountsData } = await supabase
    .from('accounts')
    .select('id, name, type, initial_balance')

  const { data: vaultsData } = await supabase
    .from('account_vaults')
    .select('id, name, balance')

  const categoryIdToMeta: Record<string, { name: string; isInvestment: boolean; isFixed: boolean; type: string }> = {}
  for (const c of (categoriesData || []) as any[]) {
    categoryIdToMeta[c.id] = { name: c.name, isInvestment: !!c.is_investment, isFixed: !!c.is_fixed, type: c.type }
  }

  const accountIdToMeta: Record<string, { name: string; type: string }> = {}
  for (const a of (accountsData || []) as any[]) {
    accountIdToMeta[a.id] = { name: a.name, type: a.type }
  }

  const resolveCategory = (t: any): string => {
    if (t.category_id && categoryIdToMeta[t.category_id]) return categoryIdToMeta[t.category_id].name
    if (typeof t.category === 'string') return t.category
    if (Array.isArray(t.category) && t.category.length) return t.category[0]?.name || 'Outros'
    if (typeof t.category === 'object' && t.category?.name) return t.category.name
    return 'Outros'
  }

  const resolveAccount = (t: any): { name: string; isCreditCard: boolean } => {
    const meta = t.account_id ? accountIdToMeta[t.account_id] : null
    if (meta) return { name: meta.name, isCreditCard: meta.type === 'credit_card' }
    const name = typeof t.account === 'string' ? t.account : (t.account?.name || 'Desconhecida')
    const type = t.account?.type || ''
    return { name, isCreditCard: type === 'credit_card' }
  }

  // Metadados para o system prompt
  const bankAccountNames = (accountsData || []).filter((a: any) => a.type !== 'credit_card').map((a: any) => a.name).join(', ')
  const creditCardNames = (accountsData || []).filter((a: any) => a.type === 'credit_card').map((a: any) => a.name).join(', ')
  const categoryNames = (categoriesData || []).map((c: any) => {
    const tags = []
    if (c.is_fixed) tags.push('fixo')
    if (c.is_investment) tags.push('investimento')
    return c.name + (tags.length ? ` (${tags.join(', ')})` : '')
  }).join(', ')
  const vaultNames = (vaultsData || []).map((v: any) => `${v.name}: ${fmtBRL(Number(v.balance))}`).join(', ')

  // ── Converte mensagens ──
  const aiMessages: any[] = []
  for (const m of rawMessages) {
    if (m.role === 'user') {
      const text = typeof m.content === 'string'
        ? m.content
        : (Array.isArray(m.parts) ? m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('') : '')
      if (text.trim()) aiMessages.push({ role: 'user', content: text })
    } else if (m.role === 'assistant') {
      const parts = Array.isArray(m.parts) ? m.parts : []
      const text = parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || p.textDelta || '').join('')
      const toolResults = parts
        .filter((p: any) => p.type === 'tool-invocation' || p.toolInvocation)
        .map((p: any) => {
          const inv = p.toolInvocation || p
          const res = inv.result || inv.output || p.result || p.output
          if (res && typeof res === 'object') {
            return JSON.stringify(res)
          }
          return ''
        })
        .filter(Boolean)
        .join('\n')

      const finalContent = text || toolResults || (typeof m.content === 'string' ? m.content : '') || 'OK.'
      aiMessages.push({ role: 'assistant', content: finalContent })
    }
  }

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const today = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const systemPrompt = `Você é o Consultor & Mentor Financeiro Pessoal do Simplificae. Seu papel vai muito além de mostrar dados ou tabelas de banco de dados: você é um conselheiro financeiro empático, altamente inteligente, conversacional e reflexivo — como se fosse um especialista em planejamento financeiro pessoal acompanhando o usuário lado a lado.

**Data atual:** ${today}
**Mês/Ano atual:** ${currentMonth}/${currentYear} (${fmtMonth(currentMonth, currentYear)})

**Contexto Atual do Usuário:**
- Contas Bancárias: ${bankAccountNames || 'Nenhuma'}
- Cartões de Crédito: ${creditCardNames || 'Nenhum'}
- Categorias Cadastradas: ${categoryNames || 'Nenhuma'}
- Cofres/Objetivos de Investimento: ${vaultNames || 'Nenhum'}

---

### 🧠 COMO VOCÊ DEVE CONVERSAR (PERSONALIDADE E ESTILO)

1. **Mente Consultiva e Conversacional (NUNCA SEJA UM ROBÔ REPETIDOR DE DADOS):**
   - As ferramentas trazem os dados reais e exibem cards visuais na interface. **NUNCA apenas repita a lista bruta de valores ou o texto do campo "insight" retornado pelas ferramentas.**
   - O card visual já mostra as tabelas e os totais. A sua resposta em texto deve trazer **interpretação analítica, conselhos estratégicos, questionamentos e reflexão personalizada**.

2. **Para Perguntas Reflexivas, Aconselhamento ou Mentoria ("Como posso melhorar?", "O que acha das minhas contas?", "Como guardar mais dinheiro?", "Onde estou errando?", "Tenho dinheiro sobrando?"):**
   - Use sempre as ferramentas (\`getPlannedBudget\`, \`getFinancialSummary\`, \`getAccountBalances\`, \`getTransactions\`) para buscar a base real dos números antes de responder.
   - Responda como um **Mentor de Finanças Pessoais**, estruturando sua resposta em partes bem fluidas:
     a) **Diagnóstico Humanizado:** Faça um panorama encorajador do momento (ex: destacar saldo projetado positivo, capacidade de poupança ou consistência).
     b) **Análise Crítica de Oportunidades & Ralos de Dinheiro:** Identifique 1 a 2 pontos de atenção com dados reais (ex: despesas variáveis desproporcionais, categoria genérica "Outras Despesas", custos fixos pesados em transporte/moradia).
     c) **Provocação & Perguntas Reflexivas:** Faça 1 ou 2 perguntas inteligentes que estimulem o usuário a refletir criticamente sobre os próprios hábitos de consumo.
     d) **Plano de Ação Sugerido:** Ofereça 2 ou 3 passos práticos, realistas e mensuráveis para aplicar a curto e médio prazo.

3. **Para Perguntas Objetivas de Consulta ("Quanto gastei em mercado?", "Qual meu saldo na conta X?"):**
   - Busque com as ferramentas e dê uma resposta direta, clara e amigável, agregando uma pequena dica ou observação útil.

4. **Tom e Formatação:**
   - Use Markdown limpo: **negrito** nos pontos-chave, parágrafos curtos e fluidez conversacional.
   - Trate o usuário com proximidade, empatia e clareza.
   - Deixe a conversa aberta ao final para aprofundar nos pontos sugeridos se o usuário quiser.

Nota: O campo "insight" do resultado da ferramenta é apenas um resumo auxiliar do card. Não o copie palavra por palavra. Construa uma resposta conversacional e rica com sua própria voz.`

  const now2 = new Date()
  const cm = now2.getMonth() + 1
  const cy = now2.getFullYear()

  try {
    const result = streamText({
      model: google('gemini-3.5-flash-lite'),
      system: systemPrompt,
      messages: aiMessages,
      maxSteps: 8,
      tools: {
        /**
         * Busca o resumo financeiro de um mês:
         * receitas, despesas, saldo, top categorias
         */
        getFinancialSummary: tool({
          description: 'Obtém receitas totais, despesas totais, saldo do período e ranking de gastos por categoria de um determinado mês/ano. Use para perguntas sobre "como foram meus gastos", "quanto gastei no mês", "qual meu saldo", etc.',
          parameters: z.object({
            month: z.number().min(1).max(12).optional().describe('Mês (1-12). Default: mês atual'),
            year: z.number().optional().describe('Ano. Default: ano atual'),
            excludeCategory: z.string().optional().describe('Nome de categoria para excluir do resumo'),
          }),
          execute: async ({ month, year, excludeCategory }: any) => {
            const m = month ?? cm
            const y = year ?? cy
            const daysInMonth = new Date(y, m, 0).getDate()
            const start = `${y}-${String(m).padStart(2, '0')}-01`
            const end = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
            const excludeNorm = excludeCategory ? norm(excludeCategory) : null

            const { data: txs } = await supabase
              .from('transactions')
              .select('id, category_id, account_id, description, amount, type, date, ignore_in_cashflow')
              .gte('date', start).lte('date', end)

            if (!txs?.length) {
              return { found: false, period: fmtMonth(m, y), message: `Nenhum lançamento encontrado em ${fmtMonth(m, y)}.`, showCard: false }
            }

            let income = 0, expense = 0, excluded = 0
            const catMap: Record<string, number> = {}

            for (const t of txs as any[]) {
              if (t.ignore_in_cashflow || t.type === 'transfer') continue
              const desc = norm(t.description || '')
              if (desc.includes('ajuste manual') || desc.includes('aporte no cofrinho')) continue
              const cat = resolveCategory(t)
              const catN = norm(cat)
              if (excludeNorm && (catN.includes(excludeNorm) || desc.includes(excludeNorm))) {
                if (t.type === 'expense') excluded += Number(t.amount)
                continue
              }
              const amt = Number(t.amount) || 0
              if (t.type === 'income') income += amt
              if (t.type === 'expense') {
                expense += amt
                catMap[cat] = (catMap[cat] || 0) + amt
              }
            }

            const balance = income - expense
            const topCategories = Object.entries(catMap)
              .sort(([, a], [, b]) => b - a)
              .map(([name, total]) => ({ name, total: Number(total.toFixed(2)) }))

            const balanceStr = balance >= 0 ? `saldo positivo de **${fmtBRL(balance)}**` : `déficit de **${fmtBRL(Math.abs(balance))}**`
            const topCatsStr = topCategories.slice(0, 5).map(c => `- **${c.name}**: ${fmtBRL(c.total)}`).join('\n')
            const excludeNote = excluded > 0 ? ` (excluindo **${excludeCategory}**: ${fmtBRL(excluded)})` : ''
            const insight = `Em **${fmtMonth(m, y)}**${excludeNote}, você teve **${fmtBRL(income)}** em receitas e **${fmtBRL(expense)}** em despesas, resultando em um ${balanceStr}.\n\n**Principais categorias:**\n${topCatsStr}`

            return {
              cardType: 'summary',
              found: true,
              period: fmtMonth(m, y),
              totalIncome: Number(income.toFixed(2)),
              totalExpense: Number(expense.toFixed(2)),
              balance: Number(balance.toFixed(2)),
              excludedCategoryTotal: Number(excluded.toFixed(2)),
              topCategories,
              insight,
              showCard: true,
            }
          },
        } as any),

        /**
         * Busca transações com filtros livres.
         * O LLM escolhe os filtros corretos baseado na intenção do usuário.
         */
        getTransactions: tool({
          description: `Busca lançamentos/transações com filtros flexíveis. 
Use quando precisar de dados específicos como: gastos em uma categoria, item específico, conta, cartão, investimentos, ou qualquer busca por descrição.
IMPORTANTE: Para buscas por palavra-chave (ex: "futebol", "netflix", "ifood"), use o campo "keyword".
Para categorias do sistema (ex: "Alimentação", "Transporte"), use "categoryName".`,
          parameters: z.object({
            month: z.number().min(1).max(12).optional().describe('Mês (1-12). Default: mês atual'),
            year: z.number().optional().describe('Ano. Default: ano atual'),
            categoryName: z.string().optional().describe('Nome exato de uma categoria do sistema (ex: Alimentação, Transporte)'),
            keyword: z.string().optional().describe('Palavra-chave para buscar na descrição das transações (ex: netflix, ifood, futebol, academia)'),
            accountName: z.string().optional().describe('Nome de conta ou cartão para filtrar'),
            isInvestment: z.boolean().optional().describe('True para buscar apenas transações de categorias de investimento ou cofres'),
            onlyCreditCard: z.boolean().optional().describe('True para filtrar apenas transações de cartão de crédito'),
            onlyBankAccount: z.boolean().optional().describe('True para filtrar apenas transações de conta corrente/poupança'),
            expensesOnly: z.boolean().optional().describe('True para retornar apenas despesas'),
            incomeOnly: z.boolean().optional().describe('True para retornar apenas receitas'),
          }),
          execute: async ({ month, year, categoryName, keyword, accountName, isInvestment, onlyCreditCard, onlyBankAccount, expensesOnly, incomeOnly }: any) => {
            const m = month ?? cm
            const y = year ?? cy
            const daysInMonth = new Date(y, m, 0).getDate()
            const start = `${y}-${String(m).padStart(2, '0')}-01`
            const end = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

            const { data: allTxs } = await supabase
              .from('transactions')
              .select('id, category_id, account_id, description, amount, type, date, status, ignore_in_cashflow')
              .gte('date', start).lte('date', end)
              .order('date', { ascending: false })

            let txs = (allTxs || []) as any[]

            // Filtro base de segurança
            txs = txs.filter(t => {
              if (t.ignore_in_cashflow) return false
              if (t.type === 'transfer') return false
              const d = norm(t.description || '')
              if (d.includes('ajuste manual')) return false
              return true
            })

            // Filtro por investimentos
            if (isInvestment) {
              txs = txs.filter(t => {
                const meta = t.category_id ? categoryIdToMeta[t.category_id] : null
                const d = norm(t.description || '')
                return meta?.isInvestment || d.includes('aporte') || d.includes('investimento') || d.includes('reserva') || d.includes('cofre')
              })
            }

            // Filtro por categoria
            if (categoryName) {
              const catN = norm(categoryName)
              txs = txs.filter(t => {
                const cat = norm(resolveCategory(t))
                return cat.includes(catN) || catN.includes(cat)
              })
            }

            // Filtro por palavra-chave (busca na descrição)
            if (keyword) {
              const kw = norm(keyword)
              txs = txs.filter(t => {
                const d = norm(t.description || '')
                return d.includes(kw)
              })
            }

            // Filtro por conta
            if (accountName) {
              const accN = norm(accountName)
              txs = txs.filter(t => {
                const acc = norm(resolveAccount(t).name)
                return acc.includes(accN) || accN.includes(acc)
              })
            }

            // Filtro por tipo de conta
            if (onlyCreditCard) txs = txs.filter(t => resolveAccount(t).isCreditCard)
            if (onlyBankAccount) txs = txs.filter(t => !resolveAccount(t).isCreditCard)
            if (expensesOnly) txs = txs.filter(t => t.type === 'expense')
            if (incomeOnly) txs = txs.filter(t => t.type === 'income')

            let totalIncome = 0, totalExpense = 0
            for (const t of txs) {
              const amt = Number(t.amount) || 0
              if (t.type === 'income') totalIncome += amt
              if (t.type === 'expense') totalExpense += amt
            }

            const totalVal = totalExpense > 0 ? totalExpense : totalIncome
            let filterLabel = ''
            if (isInvestment) filterLabel = 'em investimentos/cofres'
            else if (categoryName) filterLabel = `na categoria **${categoryName}**`
            else if (keyword) filterLabel = `com "${keyword}" na descrição`
            else if (accountName) filterLabel = `na conta/cartão **${accountName}**`
            else filterLabel = 'no período'

            let insight = ''
            if (txs.length === 0) {
              insight = `Não encontrei nenhum lançamento ${filterLabel} em **${fmtMonth(m, y)}**.`
            } else {
              insight = `Em **${fmtMonth(m, y)}**, encontrei **${txs.length} lançamento(s)** ${filterLabel}, totalizando **${fmtBRL(totalVal)}**.`
            }

            return {
              cardType: 'search',
              found: txs.length > 0,
              period: fmtMonth(m, y),
              filters: { categoryName, keyword, accountName, isInvestment },
              totalIncome: Number(totalIncome.toFixed(2)),
              totalExpense: Number(totalExpense.toFixed(2)),
              transactionCount: txs.length,
              transactions: txs.slice(0, 50).map(t => {
                const acc = resolveAccount(t)
                return {
                  description: t.description || '',
                  amount: Number(t.amount).toFixed(2),
                  type: t.type,
                  date: t.date,
                  category: resolveCategory(t),
                  account: acc.name,
                  isCreditCard: acc.isCreditCard,
                }
              }),
              insight,
              showCard: txs.length > 0,
            }
          },
        } as any),

        /**
         * Planejamento financeiro (igual à aba /planned)
         */
        getPlannedBudget: tool({
          description: 'Obtém o planejamento orçamentário para um mês futuro, igual à aba de Planejamentos. Inclui custos fixos, variáveis estimados e receitas previstas.',
          parameters: z.object({
            month: z.number().min(1).max(12).optional().describe('Mês. Default: próximo mês'),
            year: z.number().optional().describe('Ano. Default: ano atual'),
          }),
          execute: async ({ month, year }: any) => {
            const nextM = cm === 12 ? 1 : cm + 1
            const nextY = cm === 12 ? cy + 1 : cy
            const targetMonth = month ?? nextM
            const targetYear = year ?? (month ? cy : nextY)

            const daysInTarget = new Date(targetYear, targetMonth, 0).getDate()
            const start = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
            const end = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(daysInTarget).padStart(2, '0')}`

            const { data: targetTxs } = await supabase
              .from('transactions')
              .select('id, category_id, amount, type, is_recurring, ignore_in_cashflow')
              .gte('date', start).lte('date', end)

            const fixedCatIds = new Set((categoriesData || []).filter((c: any) => c.is_fixed && !c.is_investment).map((c: any) => c.id))
            let spentFixed = 0, spentVariable = 0, totalTargetIncome = 0
            const fixedSpentMap: Record<string, number> = {}
            const varSpentMap: Record<string, number> = {}

            for (const t of (targetTxs || []) as any[]) {
              if (t.ignore_in_cashflow || t.type === 'transfer') continue
              const amt = Number(t.amount) || 0
              const cname = resolveCategory(t)
              if (t.type === 'income') {
                totalTargetIncome += amt
              } else if (t.type === 'expense') {
                const isFix = Boolean(t.is_recurring) || (t.category_id && fixedCatIds.has(t.category_id))
                if (isFix) {
                  spentFixed += amt
                  fixedSpentMap[cname] = (fixedSpentMap[cname] || 0) + amt
                } else {
                  spentVariable += amt
                  varSpentMap[cname] = (varSpentMap[cname] || 0) + amt
                }
              }
            }

            let plannedFixedBase = 0, plannedVarBase = 0, plannedIncomeBase = 0
            const fixedItems: { name: string; budget: number; projected: number }[] = []
            const varItems: { name: string; budget: number; projected: number }[] = []

            for (const c of (categoriesData || []) as any[]) {
              const budget = Number(c.budget_amount) || 0
              if (c.type === 'income') {
                plannedIncomeBase += budget
              } else if (c.type === 'expense' && !c.is_investment) {
                const spent = c.is_fixed ? (fixedSpentMap[c.name] || 0) : (varSpentMap[c.name] || 0)
                const projected = Math.max(budget, spent)
                if (c.is_fixed) {
                  plannedFixedBase += budget
                  if (projected > 0) fixedItems.push({ name: c.name, budget, projected })
                } else {
                  plannedVarBase += budget
                  if (projected > 0) varItems.push({ name: c.name, budget, projected })
                }
              }
            }

            const plannedFixed = Math.max(plannedFixedBase, spentFixed)
            const plannedVariable = Math.max(plannedVarBase, spentVariable)
            const plannedIncome = Math.max(plannedIncomeBase, totalTargetIncome)
            const totalExpense = plannedFixed + plannedVariable
            const projectedBalance = plannedIncome - totalExpense

            const fixedListStr = fixedItems.map(i => `- **${i.name}**: ${fmtBRL(i.projected)}`).join('\n') || '- *Nenhum custo fixo cadastrado*'
            const varListStr = varItems.map(i => `- **${i.name}**: ${fmtBRL(i.projected)}`).join('\n') || '- *Nenhum custo variável orçado*'
            const insight = `Para **${fmtMonth(targetMonth, targetYear)}**, o orçamento previsto é **${fmtBRL(totalExpense)}** em despesas.\n\n**📌 Custos Fixos (${fmtBRL(plannedFixed)}):**\n${fixedListStr}\n\n**💡 Custos Variáveis (${fmtBRL(plannedVariable)}):**\n${varListStr}\n\n💰 Receitas previstas: **${fmtBRL(plannedIncome)}** | Saldo projetado: **${fmtBRL(projectedBalance)}**`

            return {
              cardType: 'planning',
              found: true,
              period: fmtMonth(targetMonth, targetYear),
              fixedBills: { total: Number(plannedFixed.toFixed(2)), items: fixedItems },
              variableProjections: { total: Number(plannedVariable.toFixed(2)), items: varItems },
              totalEstimatedExpense: Number(totalExpense.toFixed(2)),
              expectedIncome: Number(plannedIncome.toFixed(2)),
              projectedBalance: Number(projectedBalance.toFixed(2)),
              insight,
              showCard: true,
            }
          },
        } as any),

        /**
         * Saldos de contas e cofres
         */
        getAccountBalances: tool({
          description: 'Obtém saldos calculados de todas as contas bancárias, cartões de crédito e cofres de investimento do usuário.',
          parameters: z.object({
            accountName: z.string().optional().describe('Filtrar por nome de conta específica'),
          }),
          execute: async ({ accountName }: any) => {
            const { data: accounts } = await supabase
              .from('accounts')
              .select('id, name, type, initial_balance, is_hidden')

            if (!accounts?.length) return { found: false, showCard: false }

            const { data: postedTxs } = await supabase
              .from('transactions')
              .select('account_id, destination_account_id, type, amount')
              .eq('status', 'posted')

            const { data: vaults } = await supabase
              .from('account_vaults')
              .select('id, name, balance, target_amount')

            const balanceMap: Record<string, number> = {}
            for (const acc of accounts as any[]) {
              balanceMap[acc.id] = Number(acc.initial_balance) || 0
            }
            for (const t of (postedTxs || []) as any[]) {
              const amt = Number(t.amount) || 0
              if (t.type === 'income' && t.account_id) balanceMap[t.account_id] = (balanceMap[t.account_id] || 0) + amt
              if (t.type === 'expense' && t.account_id) balanceMap[t.account_id] = (balanceMap[t.account_id] || 0) - amt
              if (t.type === 'transfer') {
                if (t.account_id) balanceMap[t.account_id] = (balanceMap[t.account_id] || 0) - amt
                if (t.destination_account_id) balanceMap[t.destination_account_id] = (balanceMap[t.destination_account_id] || 0) + amt
              }
            }

            let accountsList = (accounts as any[]).map(acc => ({
              id: acc.id,
              name: acc.name,
              type: acc.type,
              balance: Number((balanceMap[acc.id] ?? Number(acc.initial_balance) ?? 0).toFixed(2)),
              isCreditCard: acc.type === 'credit_card',
            }))

            if (accountName) {
              const q = norm(accountName)
              accountsList = accountsList.filter(a => norm(a.name).includes(q))
            }

            const totalLiquid = accountsList.filter(a => !a.isCreditCard).reduce((s, a) => s + a.balance, 0)
            const totalCreditDebt = accountsList.filter(a => a.isCreditCard).reduce((s, a) => s + Math.abs(a.balance), 0)
            const totalVaults = (vaults || []).reduce((s, v) => s + (Number(v.balance) || 0), 0)
            const accListStr = accountsList.map(a => `- **${a.name}**: ${fmtBRL(a.balance)}`).join('\n')
            const insight = `Aqui está o panorama dos seus saldos:\n\n${accListStr}\n\n💰 Saldo líquido total: **${fmtBRL(totalLiquid)}** | Faturas de cartão: **${fmtBRL(totalCreditDebt)}** | Cofres/Investimentos: **${fmtBRL(totalVaults)}**`

            return {
              cardType: 'accounts',
              found: true,
              totalLiquidBalance: Number(totalLiquid.toFixed(2)),
              totalCreditDebt: Number(totalCreditDebt.toFixed(2)),
              totalVaults: Number(totalVaults.toFixed(2)),
              netTotal: Number((totalLiquid + totalVaults).toFixed(2)),
              accountsList,
              vaultsList: vaults || [],
              insight,
              showCard: true,
            }
          },
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
