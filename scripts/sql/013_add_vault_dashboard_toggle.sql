-- 013_add_vault_dashboard_toggle.sql

ALTER TABLE "financeOS".account_vaults ADD COLUMN include_in_dashboard BOOLEAN DEFAULT true;
