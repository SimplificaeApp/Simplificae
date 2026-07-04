# Cartões de Crédito

Cartões de crédito são tratados de forma especial porque operam como "dívidas de curto prazo" com ciclos de fechamento, diferentemente das contas bancárias tradicionais.

## Lógica do Cartão
- **Limite Total** e **Limite Disponível**.
- **Dia de Fechamento**: Data em que as compras começam a ser jogadas para a fatura do mês seguinte.
- **Dia de Vencimento**: Data máxima de pagamento da fatura fechada.
- **Conta Padrão de Pagamento**: De onde o dinheiro sairá quando a fatura for paga.

## A Dinâmica da Fatura
O FinanceOS gerencia "Faturas" (`Invoices`) dinamicamente.
1. Ao adicionar uma despesa num cartão, ela cai na Fatura Atual (Aberta).
2. As Faturas possuem estados: **Aberta**, **Fechada**, **Parcialmente Paga**, **Paga**.
3. O Dashboard avisa quando a fatura fecha.
4. Para pagar a fatura, o sistema gera uma **Transferência** da Conta Corrente para o Cartão de Crédito. Essa mecânica garante que a despesa não seja duplicada no relatório (a despesa ocorre na compra, não no pagamento da fatura).

## Cartões Adicionais
- Suporte a agrupamento de cartões sob uma mesma "Fatura Principal" (ideal para cartões adicionais da família ou de funcionários no MEI).
