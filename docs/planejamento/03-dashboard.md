# Dashboard

O Dashboard é o coração do FinanceOS. Deve responder instantaneamente à pergunta: "Como está minha saúde financeira neste Workspace hoje?".

## Componentes Principais

### 1. Seletor de Workspace e Mês
- Menu dropdown fixo para trocar entre os Workspaces do usuário (ex: "Casa", "Minha MEI").
- Navegação horizontal rápida de meses (Mês anterior, Mês Atual, Próximo Mês).

### 2. Cards de KPIs (Key Performance Indicators)
- **Saldo Atual Consolidad**: Somatório de todas as contas vinculadas (Visão Global).
- **Receitas vs Despesas (Mês Atual)**: Progressão e comparação com o mês anterior (ex: `+12% vs anterior`).
- **Cartões de Crédito**: Total das faturas abertas e aviso de proximidade do fechamento.

### 3. Gráficos de Visão Rápida
- **Fluxo de Caixa Diário**: Gráfico de linhas ou barras mostrando a evolução do saldo no decorrer do mês.
- **Top Despesas por Categoria**: Gráfico de Donut evidenciando os maiores gargalos (Alimentação, Moradia, etc).

### 4. Componente: AI Insights & Alertas (Proativo)
- Uma sessão dedicada no topo que só aparece se a IA tiver algo a dizer.
- Ex: `[!] Atenção: Sua conta de energia (R$ 250) vence amanhã e você não possui saldo suficiente na Conta Nubank.`
- Ex: `[💡] Dica: Você gastou R$ 300 com Uber essa semana. Está 40% acima da sua média.`

### 5. Transações Recentes
- Lista simplificada das últimas 5 movimentações, com ícones visuais para categorias (Fast Food, Supermercado, etc) e botão flutuante rápido para adicionar novas transações.
