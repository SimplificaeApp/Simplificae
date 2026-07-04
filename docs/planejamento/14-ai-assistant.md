# Assistente Financeiro (IA Autônoma)

O grande diferencial competitivo do FinanceOS. Baseado em **agentes autônomos** rodando em background (LangGraph/MCP) e interface interativa no dashboard.

## O Papel do Agente Autônomo
A IA não fica esperando você fazer perguntas. Ela funciona em loop periódico (ex: de madrugada) lendo as transações recentes no banco e cruzando com o histórico.

### Tarefas Autônomas
1. **Categorização Semântica**: Lê "Pix para Joao Mercado da Silva" e associa à categoria "Mercado/Alimentação".
2. **Monitoramento de Assinaturas**: Se o débito recorrente da Netflix pular de R$ 39 para R$ 45, ele gera o alerta: "Sua assinatura da Netflix teve um aumento de 15% neste mês."
3. **Análise de Faturas**: Identifica compras duplicadas.
4. **Previsão de Fluxo de Caixa**: "Baseado nas suas contas fixas, você chegará no dia 30 com R$ 200 negativos se não mudar o ritmo de despesas com Delivery."

## O Chat Interativo (Copiloto)
Na interface do Dashboard, o usuário pode digitar perguntas em linguagem natural:
- *"Quanto eu gastei com Ifood no ano passado inteiro?"* -> A IA constrói a query no Supabase e devolve um gráfico.
- *"Dá pra eu comprar um celular de 3 mil reais parcelado em 10x?"* -> A IA puxa o Orçamento (Budget) e responde baseada na folga orçamentária dos próximos meses.

## Arquitetura (Integração LangGraph/MCP)
- O Next.js Server Actions aciona a infraestrutura serverless do modelo (ex: OpenAI GPT-4o ou Gemini via SDK).
- O contexto financeiro do usuário (dados anonimizados do Workspace) é enviado no system prompt temporariamente para a resolução da query, garantindo as regras estritas de segurança da empresa.
