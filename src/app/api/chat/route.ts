import { google } from '@ai-sdk/google'
import { streamText, tool, convertToModelMessages } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages } = await req.json()
  const modelMessages = await convertToModelMessages(messages)

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const systemPrompt = `Você é o FinanceOS AI, um assistente financeiro pessoal extremamente inteligente, analítico e carismático. 
Você tem acesso ao histórico financeiro completo do usuário e pode analisar seus dados em tempo real usando as ferramentas disponíveis.

Data de hoje: ${today}

Suas capacidades:
- Analisar padrões de gastos e receitas
- Detectar anomalias e alertar o usuário
- Calcular projeções e tendências
- Dar conselhos financeiros personalizados baseados nos dados reais
- Comparar meses diferentes
- Identificar as categorias que mais consomem o orçamento

Regras:
1. Sempre use as ferramentas para buscar dados reais antes de responder perguntas sobre valores
2. Formate valores monetários sempre em BRL (ex: R$ 1.500,00)
3. Seja direto, útil e amigável. Use emojis estrategicamente
4. Se o usuário perguntar algo que você não consegue responder com os dados disponíveis, diga claramente
5. Responda SEMPRE em português do Brasil`

  const summarySchema = z.object({
    month: z.number().min(1).max(12).describe('Mês (1-12)'),
    year: z.number().describe('Ano (ex: 2025)'),
  })

  const searchSchema = z.object({
    query: z.string().describe('Termo de busca (ex: Ifood, Uber, mercado)'),
    months: z.number().min(1).max(12).default(3).describe('Quantos meses para trás buscar'),
  })

  const budgetSchema = z.object({})

  const result = streamText({
    model: google('gemini-flash-latest'),
    system: systemPrompt,
    messages: modelMessages,
    tools: {
      getTransactionsSummary: tool({
        description: 'Busca um resumo das transações do usuário para um mês/ano específico.',
        parameters: summarySchema,
        execute: async (args: z.infer<typeof summarySchema>) => {
          const { month, year } = args
          const startDate = `${year}-${String(month).padStart(2, '0')}-01`
          const endDate = `${year}-${String(month).padStart(2, '0')}-31`

          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, type, date, ignore_in_cashflow, category:categories(name)')
            .gte('date', startDate)
            .lte('date', endDate)

          if (!transactions || transactions.length === 0) {
            return {
              found: false,
              message: `Nenhuma transação encontrada para ${month}/${year}`,
              totalIncome: '0',
              totalExpense: '0',
              balance: '0',
              transactionCount: 0,
              topCategories: [] as { name: string; total: string }[]
            }
          }

          let totalIncome = 0
          let totalExpense = 0
          const categoryTotals: Record<string, number> = {}

          transactions.forEach((t: any) => {
            if (t.ignore_in_cashflow) return
            if (t.type === 'income') totalIncome += Number(t.amount)
            if (t.type === 'expense') {
              totalExpense += Number(t.amount)
              const catName = t.category?.name || 'Sem categoria'
              categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(t.amount)
            }
          })

          const topCategories = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, total]) => ({ name, total: total.toFixed(2) }))

          return {
            found: true,
            message: `Dados de ${month}/${year}`,
            totalIncome: totalIncome.toFixed(2),
            totalExpense: totalExpense.toFixed(2),
            balance: (totalIncome - totalExpense).toFixed(2),
            transactionCount: transactions.length,
            topCategories,
          }
        }
      } as any),

      searchTransactions: tool({
        description: 'Busca transações por descrição. Use quando o usuário perguntar sobre gastos com algo específico.',
        parameters: searchSchema,
        execute: async (args: z.infer<typeof searchSchema>) => {
          const { query, months } = args
          const since = new Date()
          since.setMonth(since.getMonth() - months)
          const sinceStr = since.toISOString().split('T')[0]

          const { data: transactions } = await supabase
            .from('transactions')
            .select('description, amount, type, date, category:categories(name)')
            .gte('date', sinceStr)
            .ilike('description', `%${query}%`)
            .order('date', { ascending: false })
            .limit(50)

          if (!transactions || transactions.length === 0) {
            return {
              found: false,
              query,
              months,
              transactionCount: 0,
              totalSpent: '0',
              recentTransactions: [] as any[]
            }
          }

          const total = transactions
            .filter((t: any) => t.type === 'expense')
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

          return {
            found: true,
            query,
            months,
            transactionCount: transactions.length,
            totalSpent: total.toFixed(2),
            recentTransactions: transactions.slice(0, 10).map((t: any) => ({
              description: t.description,
              amount: Number(t.amount).toFixed(2),
              type: t.type,
              date: t.date,
              category: t.category?.name,
            }))
          }
        }
      } as any),

      getBudgetStatus: tool({
        description: 'Busca o status atual do orçamento do mês corrente.',
        parameters: budgetSchema,
        execute: async (args: z.infer<typeof budgetSchema>) => {
          const now = new Date()
          const month = now.getMonth() + 1
          const year = now.getFullYear()
          const startDate = `${year}-${String(month).padStart(2, '0')}-01`
          const endDate = `${year}-${String(month).padStart(2, '0')}-31`
          const daysInMonth = new Date(year, month, 0).getDate()
          const daysPassed = now.getDate()

          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, type, status')
            .gte('date', startDate)
            .lte('date', endDate)

          let realExpense = 0, realIncome = 0, pendingExpense = 0

          transactions?.forEach((t: any) => {
            if (t.status === 'confirmed' && t.type === 'expense') realExpense += Number(t.amount)
            if (t.status === 'confirmed' && t.type === 'income') realIncome += Number(t.amount)
            if (t.status === 'pending' && t.type === 'expense') pendingExpense += Number(t.amount)
          })

          const monthProgress = Math.round((daysPassed / daysInMonth) * 100)
          const projectedExpense = daysPassed > 0 ? (realExpense / daysPassed) * daysInMonth : 0

          return {
            currentMonth: `${month}/${year}`,
            monthProgress: `${monthProgress}% do mês passou (dia ${daysPassed}/${daysInMonth})`,
            realExpense: realExpense.toFixed(2),
            realIncome: realIncome.toFixed(2),
            balance: (realIncome - realExpense).toFixed(2),
            pendingExpense: pendingExpense.toFixed(2),
            projectedMonthlyExpense: projectedExpense.toFixed(2),
          }
        }
      } as any),
    },
  })

  return result.toUIMessageStreamResponse()
}
