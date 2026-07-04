# Roadmap de Desenvolvimento (FinanceOS)

O projeto será entregue em ciclos iterativos, com foco contínuo em agilidade (Next.js + Supabase) para rápida validação no mercado.

## MVP (Produto Mínimo Viável) - "A Fundação"
**Foco**: Gestão transacional essencial e arquitetura base.
- Setup do Supabase (Auth, RLS, Database).
- Arquitetura de Workspaces estruturada no Banco de Dados.
- Contas e Transações Manuais.
- Categorização Básica.
- Dashboard Principal com saldos e gráfico de fluxo (Receitas vs Despesas).
- Relatório Simples (DRE Mensal básico).

## V1 - "Controle Completo"
**Foco**: Orçamento e gestão de dívidas/cartões.
- Módulo de Cartões de Crédito (Fechamento e Limites).
- Metas Financeiras (Saving Goals).
- Orçamentos (Budgets) por categorias.
- Transações Parceladas e Recorrentes.

## V2 - "Inteligência Autônoma" (O Fator "Wow")
**Foco**: O Assistente Financeiro IA entra no jogo.
- Agente Autônomo LangGraph operando em background (Análise Diária/Semanal).
- Notificações proativas e Insights gerados pela IA.
- Importação Inteligente de arquivos OFX/CSV com categorização via IA.
- Módulo de Assinaturas (rastreio automático de serviços recorrentes).
- Chat interativo (Interface tipo ChatGPT) no Dashboard para consultas financeiras complexas.

## V3 - "Automação e Ecossistema"
**Foco**: Crescimento, Investimentos e Empresas.
- Módulo Avançado de Investimentos (Sincronização de carteira, cotações).
- Open Finance API (Integração real bancária no Brasil).
- Regras de Automação (If-This-Then-That).
- Conciliação Bancária via OCR de notas e extratos.
