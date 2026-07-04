-- 012_add_account_vaults.sql

CREATE TABLE "financeOS".account_vaults (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES "financeOS".accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_amount DECIMAL(15, 2),
    balance DECIMAL(15, 2) DEFAULT 0.00,
    icon VARCHAR(50),
    color VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE "financeOS".account_vaults ENABLE ROW LEVEL SECURITY;

-- Add RLS policy: users can access vaults of accounts that belong to their workspaces
CREATE POLICY "Users can access vaults in their workspaces"
ON "financeOS".account_vaults
FOR ALL
USING (
    account_id IN (
        SELECT a.id FROM "financeOS".accounts a
        JOIN "financeOS".workspace_users wu ON wu.workspace_id = a.workspace_id
        WHERE wu.user_id = auth.uid()
    )
);
