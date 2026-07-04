# Schema de Banco de Dados (Supabase / PostgreSQL)

Arquitetura desenhada para ser multi-tenant via **Workspaces**. Tudo está atrelado a um `workspace_id`.

## Tabelas Principais (Core)

### `workspaces`
- `id` (UUID, PK)
- `name` (String, ex: "Casa", "Minha MEI")
- `type` (Enum: personal, family, business)
- `created_at` (Timestamp)

### `workspace_users` (Relacionamento N:N)
- `workspace_id` (UUID, FK)
- `user_id` (UUID, FK para auth.users do Supabase)
- `role` (Enum: owner, admin, editor, viewer)

### `accounts` (Contas e Carteiras)
- `id` (UUID, PK)
- `workspace_id` (UUID, FK)
- `name` (String)
- `type` (Enum: checking, savings, credit_card, wallet)
- `initial_balance` (Decimal)
- `currency` (String, ex: BRL)
- `include_in_dashboard` (Boolean)

### `categories`
- `id` (UUID, PK)
- `workspace_id` (UUID, FK)
- `name` (String)
- `type` (Enum: income, expense)
- `color` (String HEX)
- `icon` (String Lucide Name)

### `transactions`
- `id` (UUID, PK)
- `workspace_id` (UUID, FK)
- `account_id` (UUID, FK)
- `category_id` (UUID, FK, nullable)
- `type` (Enum: income, expense, transfer)
- `amount` (Decimal, absoluto)
- `date` (Date)
- `description` (String)
- `status` (Enum: pending, posted, cancelled)
- `installment_id` (UUID, FK para grupo de parcelas, nullable)
- `is_recurring` (Boolean)

## Observações de Performance
- Índices B-Tree compostos criados em `(workspace_id, date)` na tabela `transactions` para extrema rapidez nas queries do Dashboard mensal.
