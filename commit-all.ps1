# 1. Setup & Docs
git add "package.json" "package-lock.json" "tsconfig.json" "next.config.ts" ".gitignore" "eslint.config.mjs" "postcss.config.mjs"
git commit -m "chore(setup): init base project and config files"

git add "docs" "README.md" "AGENTS.md" "CLAUDE.md"
git commit -m "docs(spec): add project documentation and rules"

# 2. Database
git add "scripts/sql/001_initial_schema.sql" "scripts/sql/002_users_mirror.sql"
git commit -m "feat(db): add initial schema and roles"

git add "scripts/sql/003_seed_triggers.sql" "scripts/sql/004_auto_workspace.sql" "scripts/sql/005_fix_orphans.sql"
git commit -m "feat(db): add default seeds and triggers"

git add "scripts/sql/006_schema_permissions.sql" "scripts/sql/007_fix_rls_recursion.sql"
git commit -m "feat(db): configure rls policies and permissions"

git add "scripts/sql/008_fix_category_icons.sql" "scripts/sql/009_add_transfer_destination.sql" "scripts/sql/010_add_ignore_in_cashflow.sql" "scripts/sql/011_add_account_styles.sql" "scripts/sql/012_add_account_vaults.sql" "scripts/sql/013_add_vault_dashboard_toggle.sql" "scripts/sql/014_add_hidden_flags.sql" "scripts/sql/015_add_credit_card_fields.sql"
git commit -m "feat(db): add advanced migrations"

# 3. Foundation & UI Base
git add "src/app/globals.css" "src/app/layout.tsx"
git commit -m "chore(ui): add global css and root layout"

git add "src/components/ui"
git commit -m "feat(ui): add base reusable components"

git add "src/lib/supabase"
git commit -m "feat(lib): add supabase clients and utils"

# 4. Autenticação
git add "src/app/actions/auth.ts" "src/app/(auth)/actions.ts"
git commit -m "feat(auth): add auth server actions"

git add "src/app/(auth)" "src/app/auth"
git commit -m "feat(auth): implement login and signup pages"

# 5. Core & Layout
git add "src/app/(app)/layout.tsx" "src/components/providers"
git commit -m "feat(core): add app layout and providers"

git add "src/components/layout"
git commit -m "feat(layout): implement sidebar and header navigation"

git add "src/app/(app)/setup" "src/app/actions/seed.ts"
git commit -m "feat(core): add setup page and workspace init"

# 6. Contas e Cofres
git add "src/app/actions/accounts.ts"
git commit -m "feat(accounts): add accounts server actions"

git add "src/app/(app)/accounts" "src/components/accounts"
git commit -m "feat(accounts): implement accounts ui"

git add "src/app/actions/vaults.ts" "src/app/(app)/vaults" "src/components/vaults"
git commit -m "feat(vaults): implement goals and vaults"

# 7. Cartões de Crédito
git add "src/lib/creditCardUtils.ts"
git commit -m "feat(credit-cards): add invoice calculator utils"

git add "src/app/(app)/credit-cards" "src/components/credit-cards"
git commit -m "feat(credit-cards): implement credit cards ui and invoices"

# 8. Transações e Categorias
git add "src/app/actions/categories.ts" "src/components/categories"
git commit -m "feat(categories): add categories actions"

git add "src/app/actions/transactions.ts"
git commit -m "feat(transactions): add transactions actions"

git add "src/components/transactions"
git commit -m "feat(transactions): implement transaction forms and modal"

# 9. Dashboard & Settings
git add "src/app/actions/settings.ts" "src/app/(app)/settings" "src/components/settings"
git commit -m "feat(settings): add user preferences page"

git add "src/app/(app)/dashboard" "src/components/dashboard" "src/components/planned"
git commit -m "feat(dashboard): implement charts and insights panel"

git add "src/app/(app)/page.tsx"
git commit -m "feat(dashboard): link main page dashboard"

# 10. Remaining files (public, etc)
git add "public" "src/app/favicon.ico" "src/middleware.ts" "src/components/reports"
git commit -m "chore(public): add static assets and types"
