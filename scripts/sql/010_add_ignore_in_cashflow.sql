-- 010_add_ignore_in_cashflow.sql

ALTER TABLE transactions
ADD COLUMN ignore_in_cashflow BOOLEAN DEFAULT false;
