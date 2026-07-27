import { google } from '@ai-sdk/google'
import { streamText, generateText, tool } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const maxDuration = 60

function fmtMonth(m: number, y: number) {
  return new Date(y, m - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Selecao de ferramenta baseada em keywords (evita falha do modelo) ─────
function pickTool(question: string): string {
  const q = question.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos

  // Contas futuras / proximas
  if (/proxim|venc|conta prevista|agend|programad|futur|quando pago|pagar|devo pagar/.test(q)) return 'getUpcomingBills'

  // Categorias especificas
  const categoryWords = [
    'alimenta','comida','restaurante','lanche','ifood','refeic',
    'transporte','uber','gasolina','combustivel','onibus','metro','pedagio',
    'moradia','aluguel','condomin','luz','agua','energia','internet','gas',
    'saude','medico','farmacia','remedio','academia','plano de saude',
    'educacao','escola','faculdade','curso','mensalidade',
    'lazer','entretenimento','netflix','spotify','viagem','hotel','cinema',
    'vestuario','roupa','calcado','vestuario',
    'mercado','supermercado','compras',
    'categoria','gasto com','gastei com','quanto em',
  ]
  if (categoryWords.some(w => q.includes(w))) return 'getCategorySpending'

  // Busca por nome especifico
  if (/buscar|procurar|encontrar|historico de/.test(q)) return 'searchTransactions'

  // Status / orcamento atual
  if (/status|orcamento|ja gastei|quanto gastei ate|projecao|ate o fim|pendente|confirmad/.test(q)) return 'getBudgetStatus'

  // Resumo mensal (padrao)
  return 'getTransactionsSummary'
}

// Extrai o nome da categoria da pergunta
function extractCategory(question: string): string {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const map: Record<string, string> = {
    'alimenta': 'Alimentação', 'comida': 'Alimentação', 'ifood': 'Alimentação', 'restaurante': 'Alimentação', 'refeic': 'Alimentação',
    'transporte': 'Transporte', 'uber': 'Transporte', 'gasolina': 'Transporte', 'combustivel': 'Transporte',
    'moradia': 'Moradia', 'aluguel': 'Moradia', 'condomin': 'Moradia',
    'saude': 'Saúde', 'medico': 'Saúde', 'farmacia': 'Saúde',
    'educacao': 'Educação', 'escola': 'Educação', 'faculdade': 'Educação',
    'lazer': 'Lazer', 'netflix': 'Lazer', 'cinema': 'Lazer',
    'mercado': 'Mercado', 'supermercado': 'Mercado',
    'vestuario': 'Vestuário', 'roupa': 'Vestuário',
    'viagem': 'Viagem', 'hotel': 'Viagem',
  }
  for (const [key, cat] of Object.entries(map)) {
    if (q.includes(key)) return cat
  }
  // Tenta extrair palavra apos "em " ou "com "
  const match = q.match(/(?:gasto(?:i)? (?:com|em)|em|com) ([a-z]+)/)
  if (match) return match[1].charAt(0).toUpperCase() + match[1].slice(1)
  return ''
}

// Extrai mes da pergunta
function extractMonth(question: string, currentMonth: number, currentYear: number): { month: number, year: number } {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const monthNames: Record<string, number> = {
    'janeiro':1,'fevereiro':2,'marco':3,'abril':4,'maio':5,'junho':6,
    'julho':7,'agosto':8,'setembro':9,'outubro':10,'novembro':11,'dezembro':12
  }
  for (const [name, num] of Object.entries(monthNames)) {
    if (q.includes(name)) return { month: num, year: currentYear }
  }
  if (q.includes('proximo mes') || q.includes('mes que vem')) {
    const nm = currentMonth === 12 ? 1 : currentMonth + 1
    return { month: nm, year: currentMonth === 12 ? currentYear + 1 : currentYear }
  }
  if (q.includes('mes passado') || q.includes('mes anterior')) {
    const pm = currentMonth === 1 ? 12 : currentMonth - 1
    return { month: pm, year: currentMonth === 1 ? currentYear - 1 : currentYear }
  }
  return { month: currentMonth, year: currentYear }
}

async function generateInsight(userQuestion: string, contextData: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: google('gemini-3.5-flash-lite'),
      system: `Voce e o FinanceOS AI, assistente financeiro pessoal. Responde em portugues do Brasil.
Seja natural e direto. Responda SO o que foi perguntado.
Seja conciso: 2-3 paragrafos no maximo.
Use **negrito** para valores importantes.
Nao use secoes numeradas nem titulos com #.
Se nao souber algo com certeza, diga honestamente.`,
      prompt: `Pergunta: "${userQuestion}"
Dados: ${contextData}
Responda diretamente a pergunta.`,
    } as any)
    return text || ''
  } catch (err) {
    console.error('[CHAT API] generateInsight error:', err)
    return ''
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { messages } = await req.json()
  const now = new Date()
  const today = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Pega ultima mensagem do usuario
  const lastUserMsg = [...(messages || [])].reverse().find((m: any) => m.role === 'user')
  const userQuestion = lastUserMsg?.content ||
    (Array.isArray(lastUserMsg?.parts) ? lastUserMsg.parts.map((p: any) => p.text || '').join('') : '') || ''

  const aiMessages: any[] = (messages || []).map((m: any) => {
    if (m.role === 'user') {
      const text = m.content || (Array.isArray(m.parts) ? m.parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('') : '')
      return { role: 'user', content: text || '' }
    }
    if (m.role === 'assistant') {
      const parts = Array.isArray(m.parts) ? m.parts : []
      const text = parts.filter((p: any) => p.type === 'text').map((p: any) => p.text || '').join('')
      const contentStr = text || (typeof m.content === 'string' ? m.content : '')
      if (!contentStr.trim()) return null
      return { role: 'assistant', content: contentStr }
    }
    return null
  }).filter(Boolean)

  const systemPrompt = `Voce e o FinanceOS AI. Hoje e ${today}. Mes atual: ${currentMonth}/${currentYear}.
Responda em portugues do Brasil. Use as ferramentas disponíveis para buscar dados reais.`

  try {
    const selectedTool = pickTool(userQuestion)
    const { month: qMonth, year: qYear } = extractMonth(userQuestion, currentMonth, currentYear)

    const result = streamText({
      model: google('gemini-3.5-flash-lite'),
      system: systemPrompt,
      messages: aiMessages,
      maxSteps: 3,
      tools: {
        getTransactionsSummary: tool({
          description: 'Busca resumo mensal: receitas, despesas, saldo e principais categorias. Use para perguntas gerais sobre o mes.',
          parameters: z.object({
            month: z.number().min(1).max(12).optional(),
            year: z.number().optional(),
          }),
          execute: async (args: any) => {
            const month = args.month ?? qMonth
            const year = args.year ?? qYear
            const daysInMonth = new Date(year, month, 0).getDate()
            const startDate = `${year}-${String(month).padStart(2,'0')}-01`
            const endDate = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`

            const { data: txs, error } = await supabase
              .from('transactions').select('amount, type, date, ignore_in_cashflow, category:categories(name)')
              .gte('date', startDate).lte('date', endDate)

            if (error) return { found: false, error: error.message, insight: 'Erro ao buscar dados.', showCard: false }
            if (!txs || txs.length === 0) return { found: false, period: fmtMonth(month, year), totalIncome: 0, totalExpense: 0, balance: 0, transactionCount: 0, topCategories: [], insight: `Nao encontrei lancamentos para ${fmtMonth(month, year)}.`, showCard: false }

            let totalIncome = 0, totalExpense = 0
            const cats: Record<string, number> = {}
            const allTx: any[] = []
            for (const t of txs as any[]) {
              if (t.ignore_in_cashflow) continue
              if (t.type === 'income') totalIncome += Number(t.amount)
              if (t.type === 'expense') {
                totalExpense += Number(t.amount)
                const cn = t.category?.name || 'Sem categoria'
                cats[cn] = (cats[cn] || 0) + Number(t.amount)
                allTx.push(t)
              }
            }

            const topCategories = Object.entries(cats).sort(([,a],[,b])=>b-a).slice(0,6).map(([name,total])=>({name,total:Number(total.toFixed(2))}))
            const balance = totalIncome - totalExpense

            // Verifica se a pergunta e sobre um subconjunto (ex: desconsiderando X)
            const qLower = userQuestion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            let contextNote = ''
            if (/desconsiderando|sem considerar|excluindo|tirando/.test(qLower)) {
              // Tenta encontrar o que excluir
              const excludeMatch = qLower.match(/desconsiderando|sem considerar|excluindo|tirando\s+([^,]+)/)
              const excludeCat = topCategories.find(c => {
                const cn = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                return qLower.includes(cn.split(' ')[0])
              })
              if (excludeCat) {
                const adjustedExpense = totalExpense - excludeCat.total
                const adjustedBalance = totalIncome - adjustedExpense
                contextNote = `\nSe desconsiderar "${excludeCat.name}" (${fmtBRL(excludeCat.total)}): despesas seriam ${fmtBRL(adjustedExpense)}, saldo seria ${fmtBRL(adjustedBalance)}`
              }
            }

            const context = `${fmtMonth(month, year)}: Receitas ${fmtBRL(totalIncome)} | Despesas ${fmtBRL(totalExpense)} | Saldo ${fmtBRL(balance)}
Categorias: ${topCategories.slice(0,5).map(c=>`${c.name} ${fmtBRL(c.total)} (${Math.round((c.total/totalExpense)*100)}%)`).join(' | ')}${contextNote}`

            const insight = await generateInsight(userQuestion, context)

            return { found: true, period: fmtMonth(month, year), totalIncome: Number(totalIncome.toFixed(2)), totalExpense: Number(totalExpense.toFixed(2)), balance: Number(balance.toFixed(2)), transactionCount: txs.length, topCategories, insight, showCard: true }
          }
        } as any),

        getCategorySpending: tool({
          description: 'Busca gastos de uma categoria especifica como Alimentacao, Transporte, Moradia, Mercado, Lazer, Saude, Educacao.',
          parameters: z.object({
            categoryName: z.string().describe('Nome da categoria'),
            month: z.number().min(1).max(12).optional(),
            year: z.number().optional(),
          }),
          execute: async (args: any) => {
            const month = args.month ?? qMonth
            const year = args.year ?? qYear
            const catQuery = (args.categoryName || extractCategory(userQuestion) || '').trim()
            if (!catQuery) return { found: false, insight: 'Nao consegui identificar a categoria. Pode especificar melhor?', showCard: false }

            const daysInMonth = new Date(year, month, 0).getDate()
            const startDate = `${year}-${String(month).padStart(2,'0')}-01`
            const endDate = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`

            // Busca categoria por nome
            const { data: categories } = await supabase.from('categories').select('id, name').ilike('name', `%${catQuery}%`)

            if (!categories || categories.length === 0) {
              // Tenta buscar por descricao de transacoes como fallback
              const { data: txsByDesc } = await supabase
                .from('transactions').select('description, amount, type, date, category:categories(name)')
                .gte('date', startDate).lte('date', endDate)
                .ilike('description', `%${catQuery}%`).eq('type', 'expense').order('amount', { ascending: false })

              if (txsByDesc && txsByDesc.length > 0) {
                const total = txsByDesc.reduce((s: number, t: any) => s + Number(t.amount), 0)
                const txList = txsByDesc.slice(0,10).map((t: any) => ({ description: t.description, amount: Number(t.amount).toFixed(2), date: t.date, category: t.category?.name }))
                const context = `Busca por "${catQuery}" em ${fmtMonth(month,year)} (por descricao, nao por categoria): ${txsByDesc.length} lancamentos. Total: ${fmtBRL(total)}.`
                const insight = await generateInsight(userQuestion, context)
                return { found: true, categoryQuery: catQuery, period: fmtMonth(month,year), totalSpent: Number(total.toFixed(2)), transactionCount: txsByDesc.length, transactions: txList, insight, showCard: true }
              }

              // Lista as categorias disponiveis para ajudar
              const { data: allCats } = await supabase.from('categories').select('name').order('name')
              const catList = (allCats || []).map((c: any) => c.name).join(', ')
              const insight = await generateInsight(userQuestion, `Nao encontrada categoria "${catQuery}" para ${fmtMonth(month,year)}. Categorias existentes: ${catList}`)
              return { found: false, categoryQuery: catQuery, period: fmtMonth(month,year), insight, showCard: false }
            }

            const catIds = categories.map((c: any) => c.id)
            const { data: txs, error } = await supabase
              .from('transactions').select('description, amount, type, date, category:categories(name)')
              .in('category_id', catIds).gte('date', startDate).lte('date', endDate)
              .eq('type', 'expense').order('amount', { ascending: false })

            if (error) return { found: false, categoryQuery: catQuery, error: error.message, insight: 'Erro ao buscar dados.', showCard: false }

            const totalSpent = (txs||[]).reduce((s: number, t: any) => s + Number(t.amount), 0)
            const txList = (txs||[]).slice(0,15).map((t: any) => ({ description: t.description, amount: Number(t.amount).toFixed(2), date: t.date, category: t.category?.name }))
            const matchedNames = [...new Set(categories.map((c: any) => c.name as string))]

            const context = `"${matchedNames.join(', ')}" em ${fmtMonth(month,year)}: Total ${fmtBRL(totalSpent)}, ${(txs||[]).length} lancamentos. Principais: ${txList.slice(0,5).map(t=>`${t.description}: ${fmtBRL(parseFloat(t.amount))}`).join(' | ')}`
            const insight = await generateInsight(userQuestion, context)

            return { found: (txs||[]).length > 0, categoryQuery: catQuery, matchedCategories: matchedNames, period: fmtMonth(month,year), totalSpent: Number(totalSpent.toFixed(2)), transactionCount: (txs||[]).length, transactions: txList, insight, showCard: (txs||[]).length > 0 }
          }
        } as any),

        searchTransactions: tool({
          description: 'Busca transacoes por palavra-chave na descricao.',
          parameters: z.object({
            query: z.string(),
            months: z.number().min(1).max(12).optional(),
          }),
          execute: async (args: any) => {
            const months = args.months ?? 3
            const since = new Date(); since.setMonth(since.getMonth() - months)
            const sinceStr = since.toISOString().split('T')[0]

            const { data: txs, error } = await supabase
              .from('transactions').select('description, amount, type, date, category:categories(name)')
              .gte('date', sinceStr).ilike('description', `%${args.query}%`)
              .order('date', { ascending: false }).limit(30)

            if (error) return { found: false, query: args.query, error: error.message, insight: 'Erro ao buscar.', showCard: false }

            const expenses = (txs||[]).filter((t: any) => t.type === 'expense')
            const total = expenses.reduce((s: number, t: any) => s + Number(t.amount), 0)
            const txList = (txs||[]).slice(0,10).map((t: any) => ({ description: t.description, amount: Number(t.amount).toFixed(2), type: t.type, date: t.date, category: t.category?.name }))

            const context = `"${args.query}" nos ultimos ${months} meses: ${txList.length} transacoes, total ${fmtBRL(total)}.`
            const insight = await generateInsight(userQuestion, context)

            return { found: txList.length > 0, query: args.query, months, transactionCount: txList.length, totalSpent: Number(total.toFixed(2)), transactions: txList, insight, showCard: txList.length > 0 }
          }
        } as any),

        getBudgetStatus: tool({
          description: 'Status atual do mes: despesas confirmadas, pendentes e projecao.',
          parameters: z.object({}),
          execute: async () => {
            const month = currentMonth, year = currentYear
            const daysInMonth = new Date(year, month, 0).getDate()
            const daysPassed = now.getDate()
            const startDate = `${year}-${String(month).padStart(2,'0')}-01`
            const endDate = `${year}-${String(month).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`

            const { data: txs, error } = await supabase
              .from('transactions').select('amount, type, status').gte('date', startDate).lte('date', endDate)

            if (error) return { error: error.message, insight: 'Erro ao buscar dados.', showCard: false }

            let realExpense = 0, realIncome = 0, pendingExpense = 0
            for (const t of (txs as any[] || [])) {
              if (t.status === 'confirmed' && t.type === 'expense') realExpense += Number(t.amount)
              if (t.status === 'confirmed' && t.type === 'income') realIncome += Number(t.amount)
              if (t.status === 'pending' && t.type === 'expense') pendingExpense += Number(t.amount)
            }

            const projectedExpense = daysPassed > 0 ? (realExpense / daysPassed) * daysInMonth : 0
            const context = `${Math.round((daysPassed/daysInMonth)*100)}% do mes. Receitas: ${fmtBRL(realIncome)} | Despesas: ${fmtBRL(realExpense)} | Pendente: ${fmtBRL(pendingExpense)} | Projecao: ${fmtBRL(projectedExpense)}`
            const insight = await generateInsight(userQuestion, context)

            return { period: fmtMonth(month, year), monthProgress: `${Math.round((daysPassed/daysInMonth)*100)}% (dia ${daysPassed}/${daysInMonth})`, realExpense: Number(realExpense.toFixed(2)), realIncome: Number(realIncome.toFixed(2)), balance: Number((realIncome-realExpense).toFixed(2)), pendingExpense: Number(pendingExpense.toFixed(2)), projectedMonthlyExpense: Number(projectedExpense.toFixed(2)), insight, showCard: true }
          }
        } as any),

        getUpcomingBills: tool({
          description: 'Busca as proximas contas, transacoes pendentes e recorrentes previstas para os proximos dias ou mes.',
          parameters: z.object({
            days: z.number().optional().describe('Quantos dias para frente buscar (padrao 30)'),
          }),
          execute: async (args: any) => {
            const days = args.days ?? 30
            const from = new Date()
            const to = new Date(); to.setDate(to.getDate() + days)
            const fromStr = from.toISOString().split('T')[0]
            const toStr = to.toISOString().split('T')[0]

            // Busca transacoes pendentes ou agendadas no futuro
            const { data: pending, error } = await supabase
              .from('transactions')
              .select('description, amount, type, date, status, category:categories(name)')
              .gte('date', fromStr).lte('date', toStr)
              .in('status', ['pending', 'scheduled'])
              .order('date', { ascending: true })

            if (error) return { found: false, error: error.message, insight: 'Erro ao buscar contas previstas.', showCard: false }

            const bills = (pending || []).filter((t: any) => t.type === 'expense')
            const totalPending = bills.reduce((s: number, t: any) => s + Number(t.amount), 0)
            const billList = bills.slice(0, 15).map((t: any) => ({
              description: t.description,
              amount: Number(t.amount).toFixed(2),
              date: t.date,
              status: t.status,
              category: t.category?.name,
            }))

            const context = `Proximas contas (${days} dias): ${bills.length} pendentes, total ${fmtBRL(totalPending)}.
${billList.slice(0,8).map(t=>`${t.date}: ${t.description} ${fmtBRL(parseFloat(t.amount))}`).join(' | ')}
${bills.length === 0 ? 'Nenhuma conta pendente encontrada nesse periodo.' : ''}`

            const insight = await generateInsight(userQuestion, context)

            return { found: bills.length > 0, daysAhead: days, totalPending: Number(totalPending.toFixed(2)), transactionCount: bills.length, transactions: billList, insight, showCard: bills.length > 0 }
          }
        } as any),
      },
      toolChoice: selectedTool === 'getTransactionsSummary' ? undefined : { type: 'tool', toolName: selectedTool } as any,
      onError: (err: any) => { console.error('[CHAT API] Stream error:', err) },
    } as any)

    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error('[CHAT API] Fatal error:', error)
    return new Response(JSON.stringify({ error: 'Erro ao processar.' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
