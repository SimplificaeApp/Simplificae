'use server'

import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// This defines the structure of the JSON the AI must return
const TransactionSchema = z.object({
  description: z.string().describe('Uma descrição curta e clara da transação (ex: Ifood, Posto Ipiranga)'),
  amount: z.number().describe('O valor absoluto da transação em formato numérico (ex: 50.00)'),
  type: z.enum(['income', 'expense']).describe('income para receita/entrada, expense para despesa/saída'),
  account_id: z.string().describe('O ID da conta onde a transação ocorreu, baseado na lista de contas fornecida'),
  category_id: z.string().describe('O ID da categoria que melhor se encaixa, baseado na lista de categorias fornecida'),
  date: z.string().describe('A data da transação no formato YYYY-MM-DD. Se a pessoa falar hoje, use a data atual do contexto. Se não falar, use a data atual.')
})

export type AiTransactionResult = z.infer<typeof TransactionSchema>

export async function parseNaturalLanguageTransaction(
  userInput: string,
  accounts: { id: string, name: string, type: string }[],
  categories: { id: string, name: string, type: string }[],
  currentDateStr: string
) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('Não autorizado')
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('Chave da API do Gemini (GOOGLE_GENERATIVE_AI_API_KEY) não encontrada no arquivo .env')
    }

    // Build the context for the prompt
    const accountsContext = accounts.map(a => `ID: ${a.id} | Nome: ${a.name} | Tipo: ${a.type}`).join('\n')
    const categoriesContext = categories.map(c => `ID: ${c.id} | Nome: ${c.name} | Tipo: ${c.type}`).join('\n')

    const prompt = `
      Você é um assistente financeiro altamente preciso. 
      O usuário forneceu a seguinte entrada de texto: "${userInput}"
      
      Sua tarefa é extrair os dados e retornar um objeto JSON estruturado preenchendo todos os campos necessários.
      
      Regras:
      1. A data atual de referência é: ${currentDateStr}. Use ela como base para palavras como "hoje", "ontem", etc.
      2. Mapeie a transação para a conta mais provável da lista abaixo. Se o usuário falar "nubank", procure a conta Nubank. Se não ficar claro, escolha a conta principal ou do tipo "checking".
      Contas disponíveis:
      ${accountsContext}
      
      3. Mapeie a transação para a categoria mais provável da lista abaixo. Ex: pizza -> Alimentação, gasolina -> Transporte.
      Categorias disponíveis:
      ${categoriesContext}
    `

    // Generate structured data using Gemini Flash
    const { object } = await generateObject({
      model: google('gemini-3.5-flash-lite'),
      schema: TransactionSchema,
      prompt: prompt,
    })

    return {
      success: true,
      data: object
    }
  } catch (error: any) {
    console.error('AI Error:', error)
    return {
      success: false,
      error: error.message || 'Erro ao processar o texto com Inteligência Artificial'
    }
  }
}
