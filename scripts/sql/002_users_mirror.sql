-- ==========================================
-- 4. Tabela Espelho de Usuários (FinanceOS)
-- ==========================================

-- Cria a tabela de usuários dentro do nosso schema
CREATE TABLE "financeOS".users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Ativa RLS para a tabela de usuários
ALTER TABLE "financeOS".users ENABLE ROW LEVEL SECURITY;

-- Política: Usuário só pode ler/atualizar seu próprio perfil
CREATE POLICY "Users can view and update their own profile"
ON "financeOS".users
FOR ALL
USING (id = auth.uid());

-- Trigger Function: Copia o usuário da tabela `auth.users` para `financeOS.users`
CREATE OR REPLACE FUNCTION "financeOS".handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "financeOS".users (id, email, first_name)
    VALUES (
        NEW.id, 
        NEW.email, 
        -- Extrai o first_name do JSONB do raw_user_meta_data que enviamos no signup
        NEW.raw_user_meta_data->>'first_name' 
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atrela a Trigger à tabela auth.users (executada sempre que alguém criar conta)
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION "financeOS".handle_new_user();

-- ==========================================
-- Refatoração: Apontar workspace_users para a nova tabela
-- (Opcional, mas recomendado para integridade no mesmo schema)
-- ==========================================
ALTER TABLE "financeOS".workspace_users
  DROP CONSTRAINT IF EXISTS workspace_users_user_id_fkey,
  ADD CONSTRAINT workspace_users_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES "financeOS".users(id) ON DELETE CASCADE;
