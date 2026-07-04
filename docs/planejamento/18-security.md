# Segurança e Privacidade (Security)

Como lidamos com dados financeiros, segurança é prioridade máxima (Princípio Zero Trust).

## Autenticação
- Totalmente delegada ao **Supabase Auth**.
- MFA (Multi-Factor Authentication) obrigatório para Workspaces marcados como `business`.
- Sessão controlada via cookies HTTPOnly no padrão SSR do Next.js.

## Row Level Security (RLS) do Supabase
Nenhum dado é protegido "apenas na UI" ou "apenas na API". A proteção real mora no Banco de Dados.
Todas as tabelas terão RLS ativado com políticas estritas.

Exemplo de Política (Policy) para a tabela `transactions`:
```sql
CREATE POLICY "Users can only see transactions in their workspaces" 
ON public.transactions 
FOR SELECT 
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  )
);
```

## Criptografia e Privacidade
- Dados em repouso são criptografados pelo provider da nuvem (Supabase/AWS).
- O Agente de IA LangGraph não utilizará os dados do usuário para treinar modelos fundacionais. Qualquer chamada para LLMs externos (ex: GPT-4) ocorrerá via API Enterprise com `zero data retention`.
