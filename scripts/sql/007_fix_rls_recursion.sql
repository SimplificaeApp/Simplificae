-- ==========================================
-- 8. Correção de Recursão Infinita no RLS
-- ==========================================

-- O erro "infinite recursion detected in policy for relation workspace_users" 
-- ocorre porque a política da tabela workspace_users estava fazendo 
-- um SELECT na própria tabela workspace_users para verificar permissões, 
-- gerando um loop infinito (o gato correndo atrás do próprio rabo).

-- 1. Removemos a política antiga que causava o loop
DROP POLICY IF EXISTS "Users can see members of their workspaces" ON "financeOS".workspace_users;

-- 2. Criamos uma política simples e direta: 
-- O usuário pode ver e interagir com seu próprio registro de permissão.
-- Isso é o suficiente para o banco de dados liberar o acesso ao Workspace
-- sem entrar em loop.
CREATE POLICY "Users can manage their own workspace links"
ON "financeOS".workspace_users
FOR ALL
USING (user_id = auth.uid());
