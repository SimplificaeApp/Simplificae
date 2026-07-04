-- Script de correção rápida para vincular contas sem dono ao Workspace
-- Cole isso no SQL Editor do Supabase e execute.

DO $$ 
DECLARE
    v_user RECORD;
    v_workspace_id UUID;
BEGIN
    -- Para cada usuário que não tem nenhum workspace...
    FOR v_user IN 
        SELECT id FROM "financeOS".users u
        WHERE NOT EXISTS (
            SELECT 1 FROM "financeOS".workspace_users wu WHERE wu.user_id = u.id
        )
    LOOP
        -- Cria um workspace para ele
        INSERT INTO "financeOS".workspaces (name, type)
        VALUES ('Meu Financeiro', 'personal')
        RETURNING id INTO v_workspace_id;
        
        -- Vincula o usuário ao workspace
        INSERT INTO "financeOS".workspace_users (workspace_id, user_id, role)
        VALUES (v_workspace_id, v_user.id, 'owner');
        
        RAISE NOTICE 'Workspace criado e vinculado para usuário %', v_user.id;
    END LOOP;
    
    -- Agora, para garantir: qualquer workspace órfão (sem dono na workspace_users)
    -- vai ser atribuído ao primeiro usuário existente.
    INSERT INTO "financeOS".workspace_users (workspace_id, user_id, role)
    SELECT 
        w.id,
        (SELECT id FROM "financeOS".users LIMIT 1),
        'owner'
    FROM "financeOS".workspaces w
    WHERE NOT EXISTS (
        SELECT 1 FROM "financeOS".workspace_users wu WHERE wu.workspace_id = w.id
    );
END $$;
