# Contas (Accounts)

As Contas representam a origem ou o destino físico/virtual do dinheiro. São os cofres do usuário.

## Estrutura da Conta
- **Nome** (Ex: Nubank, Itaú Empresa, Caixa Caixinha).
- **Tipo** (Conta Corrente, Poupança, Dinheiro em Espécie, Investimento).
- **Saldo Inicial** (Valor de partida na criação da conta).
- **Saldo Atual** (Campo dinâmico calculado com base nas transações efetivadas).
- **Ícone e Cor** (Identidade visual da instituição para facilitar o UX).
- **Incluir no Dashboard?** (Flag booleano que define se o saldo desta conta deve somar no saldo consolidado geral da tela inicial).

## Relacionamentos
- Uma conta obrigatoriamente pertence a um **Workspace**.
- Múltiplos usuários podem ter acesso à mesma conta caso compartilhem o Workspace.
- Transações de Crédito, Débito ou Transferência sempre referenciam pelo menos o `account_id`.

## Conciliação (Reconciliation)
A cada virada de mês ou fechamento, o usuário deve ser capaz de fazer a "Conciliação Bancária", onde ele compara o saldo do FinanceOS com o saldo do extrato real do banco.
O sistema oferecerá a criação automática de "Transação de Ajuste de Saldo" caso haja discrepâncias.
