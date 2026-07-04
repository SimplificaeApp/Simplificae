-- ==========================================
-- 7. Permissões de Schema (Correção de Acesso)
-- ==========================================

-- Por padrão, o Supabase apenas libera acesso ao schema "public".
-- Como criamos o schema "financeOS", precisamos dar permissão explícita
-- para que os usuários autenticados possam acessá-lo via API (Frontend/Next.js).

-- 1. Permite o uso do schema para usuários logados e anônimos (se houver rotas públicas)
GRANT USAGE ON SCHEMA "financeOS" TO authenticated, anon;

-- 2. Permite operações de CRUD nas tabelas do schema (o RLS ainda vai bloquear acessos indevidos)
GRANT ALL ON ALL TABLES IN SCHEMA "financeOS" TO authenticated, anon;

-- 3. Garante que as novas tabelas criadas no futuro também herdem essas permissões
ALTER DEFAULT PRIVILEGES IN SCHEMA "financeOS" 
GRANT ALL ON TABLES TO authenticated, anon;

-- 4. Permissões para uso de sequências (caso o Supabase gere IDs automáticos com sequences)
GRANT ALL ON ALL SEQUENCES IN SCHEMA "financeOS" TO authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA "financeOS" 
GRANT ALL ON SEQUENCES TO authenticated, anon;
