-- ==========================================
-- 10. Suporte a Transferências
-- ==========================================

-- Adiciona a coluna 'destination_account_id' na tabela de transações.
-- Essa coluna é opcional para receitas e despesas, mas necessária para transferências.

ALTER TABLE "financeOS".transactions
ADD COLUMN destination_account_id UUID REFERENCES "financeOS".accounts(id) ON DELETE CASCADE;

-- Adiciona um índice para otimizar buscas por conta de destino
CREATE INDEX idx_transactions_destination_account ON "financeOS".transactions(destination_account_id);
