# Data Skill Map - Analytics/Admin (hardening de seguranca)

## Resumo

A secao `analytics.html` agora usa:

1. **Autenticacao real** (Supabase Auth, email/senha).
2. **Leitura segura via RPC** (funcoes SQL com validacao de admin).
3. **Sem chave admin hardcoded no frontend**.
4. **Sem SELECT direto de `anon` nas views em producao**.

## Escopo de dados permitido

Somente views agregadas:

- `public.vw_platform_activity_daily`
- `public.vw_user_activity_daily`
- `public.vw_satisfaction_feedback_daily`

Nao usar nesta etapa:

- `public.vw_satisfaction_comments_admin`
- tabelas base: `diagnostic_sessions`, `diagnostic_answers`, `challenge_attempts`, `satisfaction_feedback`

## Diferenca entre modo temporario (dev) e modo seguro (prod)

### Temporario/dev (legado)

- Gate por JS (`window.DATA_SKILL_MAP_ADMIN.analyticsAccessKey`)
- `anon` com `SELECT` direto nas views
- Aceitavel apenas para prototipo local

### Seguro/producao (atual)

- Login real via Supabase Auth
- Usuario precisa estar cadastrado como admin na tabela `public.admin_users`
- Frontend nao faz `from(view)`, usa apenas RPC:
  - `admin_is_authorized`
  - `admin_get_platform_activity_daily`
  - `admin_get_user_activity_daily`
  - `admin_get_satisfaction_feedback_daily`
- `anon` nao precisa de `SELECT` nas views

## Scripts SQL

1. `docs/supabase-analytics-hardening.sql`
   - cria `public.admin_users`
   - cria funcoes RPC seguras
   - concede apenas `EXECUTE` das RPCs para `authenticated`

2. `docs/supabase-permissions-analytics-prod.sql`
   - revoga `SELECT` de `anon` nas views
   - revoga `SELECT` direto de `authenticated` nas views
   - reforca bloqueio de tabelas base

3. (Opcional, apenas dev legado) `docs/supabase-permissions-analytics-frontend-temp.sql`
   - mantem leitura direta por `anon` para testes antigos

## Como cadastrar usuario admin

1. Criar usuario no Supabase Auth (Dashboard > Authentication > Users).
2. Pegar `id` e `email` desse usuario.
3. Inserir na tabela `admin_users`:

```sql
insert into public.admin_users (user_id, email)
values ('<UUID_DO_AUTH_USER>', '<EMAIL_ADMIN>');
```

## Como acessar o painel admin

1. Abrir `analytics.html`.
2. Fazer login com email/senha do usuario admin criado no Supabase Auth.
3. Se autenticado e autorizado, o painel carrega dados via RPC.

## Variaveis/configuracao no frontend

Apenas configuracao publica continua necessaria:

- `window.DATA_SKILL_MAP_SUPABASE.url`
- `window.DATA_SKILL_MAP_SUPABASE.anonKey`

Nao usar `service_role` no frontend.

## Como testar permissao

1. Usuario autenticado **nao admin**:
   - login funciona
   - RPC retorna bloqueio (`forbidden`)
   - painel nao libera dados

2. Usuario **admin**:
   - login funciona
   - `admin_is_authorized` retorna `true`
   - dados carregam nas 3 areas do painel

3. Usuario anonimo (sem login):
   - nao acessa dados
   - tela permanece no form de login

## Validacao recomendada de seguranca

Executar no SQL Editor:

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in (
    'vw_platform_activity_daily',
    'vw_user_activity_daily',
    'vw_satisfaction_feedback_daily',
    'vw_satisfaction_comments_admin'
  )
order by grantee, table_name, privilege_type;
```

Resultado esperado em producao: sem `SELECT` para `anon`/`authenticated` nas views.
