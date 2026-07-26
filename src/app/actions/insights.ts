import { createClient } from '@/lib/supabase/server'
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

const InsightsSchema = z.object({
  insights: z.array(z.object({
    type: z.enum(['warning', 'success', 'tip', 'alert']),
    title: z.string(),
    description: z.string(),
    metric: z.string().optional(),
  }))
})

export type FinancialInsight = z.infer<typeof InsightsSchema>['insights'][number]

export async function getFinancialInsights(): Promise<FinancialInsight[]> {
  try {
    const supabase = await createClient()

    const now = new Date()
    const currMonth = now.getMonth() + 1
    const currYear = now.getFullYear()
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonth = prevDate.getMonth() + 1
    const prevYear = prevDate.getFullYear()
    const daysPassed = now.getDate()
    const daysInMonth = new Date(currYear, currMonth, 0).getDate()

    const buildRange = (m: number, y: number) => ({
      start: `${y}-${String(m).padStart(2, '0')}-01`,
      end: `${y}-${String(m).padStart(2, '0')}-31`
    })

    const curr = buildRange(currMonth, currYear)
    const prev = buildRange(prevMonth, prevYear)

    const [{ data: currTx }, { data: prevTx }] = await Promise.all([
      supabase.from('transactions').select('amount, type, status, ignore_in_cashflow, category:categories(name)').gte('date', curr.start).lte('date', curr.end),
      supabase.from('transactions').select('amount, type, ignore_in_cashflow, category:categories(name)').gte('date', prev.start).lte('date', prev.end),
    ])

    // Compute summary
    let currExpense = 0, currIncome = 0
    const currCatMap: Record<string, number> = {}
    currTx?.filter(t => !t.ignore_in_cashflow).forEach((t: any) => {
      if (t.type === 'expense') {
        currExpense += Number(t.amount)
        const cat = t.category?.name || 'Outros'
        currCatMap[cat] = (currCatMap[cat] || 0) + Number(t.amount)
      }
      if (t.type === 'income') currIncome += Number(t.amount)
    })

    let prevExpense = 0
    const prevCatMap: Record<string, number> = {}
    prevTx?.filter(t => !t.ignore_in_cashflow).forEach((t: any) => {
      if (t.type === 'expense') {
        prevExpense += Number(t.amount)
        const cat = t.category?.name || 'Outros'
        prevCatMap[cat] = (prevCatMap[cat] || 0) + Number(t.amount)
      }
    })

    const projectedExpense = daysPassed > 0 ? (currExpense / daysPassed) * daysInMonth : 0
    const topCategory = Object.entries(currCatMap).sort(([, a], [, b]) => b - a)[0]

    // Build a compact summary for the AI
    const catChanges: string[] = []
    Object.entries(currCatMap).forEach(([cat, val]) => {
      const prevVal = prevCatMap[cat] || 0
      if (prevVal > 0) {
        const pct = ((val - prevVal) / prevVal) * 100
        if (Math.abs(pct) > 20) catChanges.push(`${cat}: ${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`)
      }
    })

    const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    const summary = `
Mês atual (${currMonth}/${currYear}):
- Despesas até agora: ${fmt(currExpense)}
- Receitas: ${fmt(currIncome)}
- Saldo: ${fmt(currIncome - currExpense)}
- Projeção de despesas ao fim do mês: ${fmt(projectedExpense)}
- ${daysPassed} dias passados de ${daysInMonth}
- Categoria que mais gasta: ${topCategory ? `${topCategory[0]} (${fmt(topCategory[1])})` : 'N/A'}

Mês anterior (${prevMonth}/${prevYear}):
- Total de despesas: ${fmt(prevExpense)}

Variações de categorias vs mês anterior:
${catChanges.length > 0 ? catChanges.join('\n') : 'Dados insuficientes para comparação'}
    `.trim()

    const { object } = await generateObject({
      model: google('gemini-flash-latest'),
      schema: InsightsSchema,
      prompt: `Você é um analista financeiro pessoal. Analise os dados abaixo e gere exatamente 4 insights financeiros úteis, práticos e personalizados para o usuário. Varie os tipos entre warning, success, tip e alert. Seja específico com números quando possível. Responda em português do Brasil.

${summary}

Gere 4 insights variados que realmente agreguem valor ao usuário.`,
    })

    return object.insights

  } catch (error) {
    console.error('Insights error:', error)
    return [
      { type: 'tip', title: 'Dica do dia', description: 'Acompanhe seus gastos regularmente para manter as finanças sob controle.' },
    ]
  }
}
