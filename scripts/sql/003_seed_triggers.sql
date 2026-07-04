-- ==========================================
-- 5. Auto-Seed de Workspaces (Trigger)
-- ==========================================

-- Esta função é disparada sempre que um novo Workspace é criado.
-- Ela insere Categorias Padrão (Despesas/Receitas) e uma Conta Inicial (Carteira).
CREATE OR REPLACE FUNCTION "financeOS".seed_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Cria uma Conta padrão chamada 'Carteira'
    INSERT INTO "financeOS".accounts (workspace_id, name, type, initial_balance, currency)
    VALUES (NEW.id, 'Carteira', 'wallet', 0.00, 'BRL');

    -- 2. Cria Categorias de Receita Padrão
    INSERT INTO "financeOS".categories (workspace_id, name, type, color, icon)
    VALUES 
        (NEW.id, 'Salário', 'income', '#10b981', '💼'),
        (NEW.id, 'Investimentos', 'income', '#3b82f6', '📈'),
        (NEW.id, 'Cashback', 'income', '#8b5cf6', '🪙'),
        (NEW.id, 'Outras Receitas', 'income', '#94a3b8', '➕');

    -- 3. Cria Categorias de Despesa Padrão
    INSERT INTO "financeOS".categories (workspace_id, name, type, color, icon)
    VALUES 
        (NEW.id, 'Alimentação', 'expense', '#ef4444', '🍽️'),
        (NEW.id, 'Moradia', 'expense', '#f97316', '🏠'),
        (NEW.id, 'Transporte', 'expense', '#eab308', '🚗'),
        (NEW.id, 'Assinaturas', 'expense', '#ec4899', '▶️'),
        (NEW.id, 'Saúde', 'expense', '#06b6d4', '❤️'),
        (NEW.id, 'Lazer', 'expense', '#8b5cf6', '🎟️'),
        (NEW.id, 'Educação', 'expense', '#3b82f6', '🎓'),
        (NEW.id, 'Cartão de Crédito', 'expense', '#14b8a6', '💳'),
        (NEW.id, 'Outras Despesas', 'expense', '#64748b', '➖');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atrela a Trigger à tabela workspaces
DROP TRIGGER IF EXISTS on_workspace_created_seed ON "financeOS".workspaces;
CREATE TRIGGER on_workspace_created_seed
AFTER INSERT ON "financeOS".workspaces
FOR EACH ROW EXECUTE FUNCTION "financeOS".seed_new_workspace();
