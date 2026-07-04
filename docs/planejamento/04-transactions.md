# Transações (Receitas, Despesas e Transferências)

O módulo de transações é onde a maior parte da inserção de dados ocorre. Deve ser extremamente rápido, com suporte a preenchimento inteligente e regras flexíveis.

## Tipos de Transação
1. **Receita** (Entrada de dinheiro).
2. **Despesa** (Saída de dinheiro).
3. **Transferência** (Movimentação entre duas contas ou carteiras próprias do usuário).

## Campos Estruturais
- **ID** (UUID)
- **Workspace ID** (Vinculação de isolamento)
- **Tipo** (Income, Expense, Transfer)
- **Valor** (Decimal - precisão padrão monetária)
- **Data da Competência** (Quando o gasto ocorreu)
- **Data de Vencimento/Liquidação** (Quando de fato será pago/recebido)
- **Status** (Pendente, Consolidado, Cancelado)
- **Conta / Cartão** (De onde sai / entra o dinheiro)
- **Categoria** (Vínculo com a tabela de categorias)
- **Tags / Subcategorias** (Arrays dinâmicos para filtragem avançada)
- **Descrição/Nome** (Ex: Almoço Ifood)
- **Anexos** (Notas Fiscais em PDF/Imagem).

## Lógicas Complexas (V1)
- **Parcelamentos**: Uma compra de R$ 1000 parcelada em 10x deve gerar 10 transações "Pilha" amarradas a um ID de Grupo (`installment_id`), diluindo R$ 100 por mês no fluxo de caixa previsto.
- **Recorrência**: Contas fixas mensais (ex: Aluguel) devem ser configuradas como Recorrentes. O sistema deve prever a projeção futura sem necessariamente sujar o saldo atual.
- **Conciliação**: Marcar a transação como "Pendente" até que seja efetivamente paga (ou "efetivada"), o que afeta o saldo Real vs Saldo Previsto.

## Automação & IA
- O motor de IA lerá o texto digitado via PNL e fará o match das categorias.
- Automação via regras (Webhooks): Se uma integração bancária notificar uma compra na "Padaria XYZ", o sistema já criará a transação automaticamente.
