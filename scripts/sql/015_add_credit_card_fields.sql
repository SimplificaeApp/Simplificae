-- Adicionar campos específicos de cartão de crédito na tabela accounts
ALTER TABLE "financeOS".accounts
ADD COLUMN credit_limit DECIMAL(15, 2) DEFAULT 0.00,
ADD COLUMN closing_day INTEGER,
ADD COLUMN due_day INTEGER;
