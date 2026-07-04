-- 011_add_account_styles.sql

ALTER TABLE "financeOS".accounts
ADD COLUMN icon VARCHAR(50),
ADD COLUMN color VARCHAR(20);
