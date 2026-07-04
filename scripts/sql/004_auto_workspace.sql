-- ==========================================
-- 6. Criação Automática de Workspace no Cadastro
-- ==========================================

-- Atualizamos a função de espelhamento de usuário para também 
-- criar um Workspace pessoal e já atrelar o dono corretamente.
CREATE OR REPLACE FUNCTION "financeOS".handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    -- 1. Cria o espelho do usuário
    INSERT INTO "financeOS".users (id, email, first_name)
    VALUES (
        NEW.id, 
        NEW.email, 
        NEW.raw_user_meta_data->>'first_name' 
    );

    -- 2. Cria o Workspace Pessoal do usuário
    INSERT INTO "financeOS".workspaces (name, type)
    VALUES ('Meu Financeiro', 'personal')
    RETURNING id INTO new_workspace_id;

    -- 3. Associa o usuário recém-criado como DONO do Workspace
    -- (Bypassando a dependência do auth.uid() que pode falhar em triggers internas)
    INSERT INTO "financeOS".workspace_users (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'owner');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Como o "handle_new_workspace" antigo usava auth.uid(), 
-- vamos desativar ele temporariamente para evitar conflito na criação via backend,
-- ou reescrevê-lo para só inserir se não existir.
DROP TRIGGER IF EXISTS on_workspace_created ON "financeOS".workspaces;

-- Caso a gente queira permitir criar workspaces secundários pela interface no futuro,
-- recriamos a trigger validando se o auth.uid() existe (assim não quebra o backend).
CREATE OR REPLACE FUNCTION "financeOS".handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO "financeOS".workspace_users (workspace_id, user_id, role)
        VALUES (NEW.id, auth.uid(), 'owner');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workspace_created
AFTER INSERT ON "financeOS".workspaces
FOR EACH ROW EXECUTE FUNCTION "financeOS".handle_new_workspace();
