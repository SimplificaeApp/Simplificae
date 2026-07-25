-- 016_add_vault_transactions.sql
-- Table to store transaction history for cofrinhos (deposits and withdrawals)

CREATE TABLE IF NOT EXISTS "financeOS".vault_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vault_id UUID REFERENCES "financeOS".account_vaults(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL, -- 'deposit' | 'withdraw'
    amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE "financeOS".vault_transactions ENABLE ROW LEVEL SECURITY;

-- Add RLS policy: users can access vault transactions in their workspaces
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vault_transactions' 
        AND policyname = 'Users can access vault transactions in their workspaces'
    ) THEN
        CREATE POLICY "Users can access vault transactions in their workspaces"
        ON "financeOS".vault_transactions
        FOR ALL
        USING (
            vault_id IN (
                SELECT v.id FROM "financeOS".account_vaults v
                JOIN "financeOS".accounts a ON a.id = v.account_id
                JOIN "financeOS".workspace_users wu ON wu.workspace_id = a.workspace_id
                WHERE wu.user_id = auth.uid()
            )
        );
    END IF;
END $$;
