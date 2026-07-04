# User Flows Principais

A experiência do usuário (UX) do FinanceOS deve ser focada em "Zero Atrito". Todo o trabalho pesado é terceirizado para a IA e integrações.

## 1. Fluxo de Onboarding (First-Time User)
1. **Cadastro Base**: E-mail, Google ou Apple (via Supabase Auth).
2. **Seleção de Perfil**: O usuário é indagado se o foco primário é "Pessoal" ou "Empresarial".
3. **Criação do Workspace**: O sistema cria automaticamente o Workspace base.
4. **Configuração Expressa**:
   - Qual a sua moeda base (BRL, USD)?
   - Conexão do primeiro banco (Mock de Open Finance ou importação de extrato OFX rápida via drag and drop).
5. **Dashboard Zero-State**: A IA faz uma leitura inicial e diz "Olá, identifiquei 4 transações recentes. Vamos começar a organizar?"

## 2. Fluxo: Adicionando uma Despesa
- **Padrão**: Botão "Nova Transação" (+) no Dashboard. Modal minimalista aparece. 
- **Entrada Rápida**: O usuário digita: "Almoço no Ifood 35.90 no cartão Nubank".
- **Ação da IA**: O sistema entende a string, preenche automaticamente os campos:
  - Valor: 35.90
  - Categoria: Alimentação/Delivery
  - Conta de origem: Cartão Nubank
- O usuário apenas confirma (1 clique).

## 3. Fluxo: Fechamento de Mês e Insights
1. Chega o dia 1º do mês seguinte.
2. O agente de IA em background processa o mês fechado.
3. Notificação Proativa: "Seu Resumo de Março está pronto".
4. Ao clicar, um card de "Story" (estilo Instagram) apresenta:
   - "Você economizou 15% a mais esse mês, parabéns!"
   - "Cuidado, seus gastos com Uber subiram R$ 120,00."
   - "Sua meta de reserva de emergência atingiu 40%."

## 4. Fluxo: Alternando entre Pessoal e Empresa
1. O MEI clica no seu Avatar no topo da tela.
2. Seleciona "Workspace: Minha Empresa LTDA".
3. A interface muda a cor do tema levemente para indicar a troca de contexto.
4. O Dashboard recalcula tudo instantaneamente mostrando apenas os dados corporativos (sem misturar saldos).
