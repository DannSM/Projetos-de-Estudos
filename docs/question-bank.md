# Question Bank (Supabase)

## Objetivo
Centralizar as perguntas de Diagnóstico e Desafios na tabela `public.question_bank`, permitindo atualização de conteúdo sem redeploy do frontend.

## Estrutura da tabela
A tabela é criada por `docs/supabase-question-bank.sql` com os principais campos:

- Identificação: `id`, `question_key`
- Classificação: `mode` (`diagnostico` ou `desafio`), `area`, `category`, `level`, `concept`
- Conteúdo: `question`, `code`, `context`, `options`, `correct_index`, `explanation`, `points`
- Operação: `is_active`, `display_order`, `source`, `created_at`, `updated_at`

Validações relevantes:

- `mode` restrito a `diagnostico` ou `desafio`
- `options` deve ser array JSON com pelo menos 2 opções
- `correct_index` deve ser >= 0 e menor que o tamanho de `options`
- `points` deve ser `null` ou >= 0

## Segurança (RLS)

- RLS habilitado em `public.question_bank`
- Política de leitura para `anon` apenas quando `is_active = true`
- Sem política de escrita para `anon`
- Grants:
  - `grant usage on schema public to anon`
  - `grant select on public.question_bank to anon`

Observação importante: perguntas com `is_active = true` ficam públicas para leitura no frontend.

## Como executar (Supabase SQL Editor)

1. Executar `docs/supabase-question-bank.sql`
2. Executar `docs/supabase-question-bank-seed.sql`
3. Executar `docs/supabase-question-bank-v2.sql` (metadados para seleção inteligente)

O seed é idempotente via `question_key` (`INSERT ... ON CONFLICT DO UPDATE`).

## Manutenção de conteúdo (sem CRUD frontend)

Nesta fase, escrita deve ser feita por:

- SQL script
- Supabase Studio

Não existe CRUD administrativo no frontend público.

## Como validar origem Supabase vs fallback local

Abrir a aplicação e verificar no console:

- `state.questionBankSource.diagnostico`
- `state.questionBankSource.desafio`

Valores possíveis:

- `supabase`
- `fallback_local`

Para diagnóstico, também é possível validar:

- `state.diagnosticSelectionMeta`
- `state.diagnosticRecentWindowDays`

## Seleção inteligente do diagnóstico

- A seleção do diagnóstico foi centralizada em `src/question-selector.js`.
- Mantém 5 perguntas por nível.
- Prioriza variedade por área dentro do nível.
- Aplica anti-repetição local por 7 dias usando:
  - `dataSkillMap_diag_recent_questions`
- Fallback automático quando o estoque fresco não é suficiente:
  1. pool fresco do mesmo nível;
  2. reintrodução de recentes do mesmo nível;
  3. fallback local existente quando Supabase falha.

## Checklist SQL de validação

```sql
select mode, count(*)
from public.question_bank
group by mode;
```

```sql
select mode, is_active, count(*)
from public.question_bank
group by mode, is_active;
```

```sql
select mode, category, count(*)
from public.question_bank
where mode = 'desafio'
group by mode, category
order by category;
```

```sql
select question_key, mode, level, display_order
from public.question_bank
order by mode, display_order
limit 50;
```

## Limitações atuais

- Sem CRUD administrativo no frontend
- Escrita apenas por SQL/Studio
- Fallback local ainda ativo temporariamente
- `heroPreviewChallenges` permanece hardcoded (fora deste escopo)

## Próximos passos

- Painel admin com autenticação/autorização
- Versionamento e trilha de auditoria das perguntas
- Fluxo de publicação (`rascunho -> ativo`)
