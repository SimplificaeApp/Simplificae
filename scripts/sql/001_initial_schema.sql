-- ==========================================
-- Schema Inicial: FinanceOS
-- ==========================================

-- Extensão necessária para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cria o schema dedicado para o projeto
CREATE SCHEMA IF NOT EXISTS "financeOS";

-- ==========================================
-- 1. TABELAS CORE
-- ==========================================

-- 1.1 Workspaces
CREATE TABLE "financeOS".workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('personal', 'family', 'business')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 1.2 Workspace Users (Relacionamento de permissão)
CREATE TABLE "financeOS".workspace_users (
    workspace_id UUID REFERENCES "financeOS".workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    PRIMARY KEY (workspace_id, user_id)
);

-- 1.3 Accounts (Contas e Carteiras)
CREATE TABLE "financeOS".accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES "financeOS".workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'wallet')),
    initial_balance DECIMAL(15, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'BRL',
    include_in_dashboard BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 1.4 Categories (Categorias de Transação)
CREATE TABLE "financeOS".categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES "financeOS".workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
    color VARCHAR(20),
    icon VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- 1.5 Transactions (Receitas, Despesas, Transferências)
CREATE TABLE "financeOS".transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES "financeOS".workspaces(id) ON DELETE CASCADE,
    account_id UUID REFERENCES "financeOS".accounts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES "financeOS".categories(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    amount DECIMAL(15, 2) NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'posted', 'cancelled')),
    installment_id UUID,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Índices de Performance
CREATE INDEX idx_transactions_workspace_date ON "financeOS".transactions(workspace_id, date);
CREATE INDEX idx_transactions_account ON "financeOS".transactions(account_id);


-- ==========================================
-- 2. POLÍTICAS DE SEGURANÇA (Row Level Security - RLS)
-- ==========================================

ALTER TABLE "financeOS".workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeOS".workspace_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeOS".accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeOS".categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financeOS".transactions ENABLE ROW LEVEL SECURITY;

-- 2.1 Workspaces Policy
-- O usuário só pode ver e alterar os workspaces que ele faz parte.
CREATE POLICY "Users can access their own workspaces"
ON "financeOS".workspaces
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM "financeOS".workspace_users 
        WHERE workspace_users.workspace_id = workspaces.id 
        AND workspace_users.user_id = auth.uid()
    )
);

-- 2.2 Workspace Users Policy
-- O usuário pode ver os membros dos workspaces que ele faz parte.
CREATE POLICY "Users can see members of their workspaces"
ON "financeOS".workspace_users
FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id FROM "financeOS".workspace_users WHERE user_id = auth.uid()
    )
);

-- 2.3 Accounts Policy
CREATE POLICY "Users can access accounts in their workspaces"
ON "financeOS".accounts
FOR ALL
USING (
    workspace_id IN (
        SELECT workspace_id FROM "financeOS".workspace_users WHERE user_id = auth.uid()
    )
);

-- 2.4 Categories Policy
CREATE POLICY "Users can access categories in their workspaces"
ON "financeOS".categories
FOR ALL
USING (
    workspace_id IN (
        SELECT workspace_id FROM "financeOS".workspace_users WHERE user_id = auth.uid()
    )
);

-- 2.5 Transactions Policy
CREATE POLICY "Users can access transactions in their workspaces"
ON "financeOS".transactions
FOR ALL
USING (
    workspace_id IN (
        SELECT workspace_id FROM "financeOS".workspace_users WHERE user_id = auth.uid()
    )
);


-- ==========================================
-- 3. TRIGGERS
-- ==========================================

-- Trigger Function: Cria o dono do workspace automaticamente
CREATE OR REPLACE FUNCTION "financeOS".handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "financeOS".workspace_users (workspace_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dispara logo após criar um workspace
CREATE TRIGGER on_workspace_created
AFTER INSERT ON "financeOS".workspaces
FOR EACH ROW EXECUTE FUNCTION "financeOS".handle_new_workspace();
