# Regras de Negócio Fundamentais

Este documento concentra as premissas arquiteturais e matemáticas que não podem ser violadas na camada de backend (Next.js Actions / Supabase).

## 1. Regra de Isolamento de Workspaces
- **NENHUMA** query de Banco de Dados de transação, relatório ou conta deve retornar dados sem um filtro explícito de `workspace_id`.
- O isolamento é absoluto. Um usuário pertencente ao Workspace Pessoal não pode acidentalmente ver saldos do Workspace Empresa, mesmo que seja dono de ambos, a menos que ele mude ativamente o contexto no Frontend.

## 2. Saldo Atual vs Saldo Previsto
- **Saldo Efetivado (Atual)**: É a soma de (Receitas Consolidadas) - (Despesas Consolidadas) + (Transferências recebidas efetivadas) - (Transferências enviadas efetivadas).
- **Saldo Previsto**: Soma do Saldo Atual com todas as transações Pendentes até o último dia do mês corrente.
- Essa regra evita que o usuário se engane com dinheiro que já está comprometido.

## 3. Prevenção de Duplicidade no Pagamento de Fatura
O pagamento de fatura do cartão de crédito **NÃO É UMA DESPESA**.
- Se a compra no restaurante foi no cartão (R$ 100), a despesa foi no dia 15 na categoria "Alimentação".
- Quando o usuário paga a fatura de R$ 100 no dia 30 usando o saldo da Conta Corrente, trata-se de uma **Transferência** da Conta Corrente para a entidade "Cartão de Crédito". 
- Se a regra fosse tratada como despesa dupla, o DRE do usuário ficaria incorreto (somando R$ 200 de gastos).

## 4. Estorno de Transação
O sistema não deve deletar fisicamente as transações para fins de auditoria (Soft Delete).
Se houver um estorno no cartão, ele entra como um crédito abatendo na fatura correspondente.

## 5. Permissões Granulares (V2/V3)
- Níveis: **Owner** (Tudo), **Admin** (Convida pessoas, cria contas), **Editor** (Registra transações, vê saldos), **Viewer** (Só visualiza dashboard e relatórios, sem editar).
