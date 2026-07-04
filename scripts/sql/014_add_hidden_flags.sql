-- 014_add_hidden_flags.sql

ALTER TABLE "financeOS".accounts ADD COLUMN is_hidden BOOLEAN DEFAULT false;
ALTER TABLE "financeOS".account_vaults ADD COLUMN is_hidden BOOLEAN DEFAULT false;
