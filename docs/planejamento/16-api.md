# Contratos de API (Next.js Server Actions)

Como decidimos pelo padrão Next.js + Supabase, não teremos controladores REST tradicionais em um servidor isolado. Utilizaremos **Server Actions** do Next.js 15+ para mutações e Supabase SDK no Server Components para queries de leitura.

## Padrão de Mutação (Server Action)

Toda Server Action deve encapsular a lógica de negócio e garantir o isolamento do Workspace:

```typescript
// Exemplo de Assinatura
export async function createTransaction(data: TransactionInput) {
  // 1. Validar Sessão (Supabase Auth)
  // 2. Extrair user_id
  // 3. Verificar permissão em `workspace_users` para o `workspace_id` informado
  // 4. Inserir na tabela `transactions`
  // 5. RevalidatePath('/dashboard')
}
```

## Integração Externa (Edge Functions Supabase)
Utilizaremos as Edge Functions (Deno) do Supabase para processamentos assíncronos:
- **Webhook Recebimento Bancário**: Quando a Open Finance API dispara um evento, a Edge Function recebe, processa a formatação e insere no Banco.
- **Microserviço de IA**: O Agente LangGraph (Python) exporá um endpoint FastAPI interno. O Next.js enviará os comandos de linguagem natural para este serviço de IA, que responderá com a extração de intenções.
