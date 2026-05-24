-- Data Skill Map - suporte auth-first para Meu Progresso
--
-- Execute este arquivo no SQL Editor do Supabase.
--
-- Objetivo:
-- - Manter o fluxo anonimo atual funcionando com anonymous_user_id.
-- - Permitir que etapas futuras do frontend gravem user_id = auth.uid().
-- - Permitir que usuarios autenticados leiam apenas os proprios registros.
-- - Preparar uma RPC simples para alimentar a pagina "Meu Progresso".
--
-- Observacao:
-- O frontend ainda nao envia user_id nesta etapa. A conexao da UI sera feita
-- em uma etapa futura, usando o cliente autenticado do Supabase Auth.

-- 1) Colunas auth-first opcionais.
alter table public.diagnostic_sessions
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.diagnostic_answers
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.challenge_attempts
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.satisfaction_feedback
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 2) Indices para leitura por usuario autenticado e historico por tentativa.
create index if not exists idx_diagnostic_sessions_user_id
  on public.diagnostic_sessions (user_id);

create index if not exists idx_diagnostic_sessions_user_finished_at
  on public.diagnostic_sessions (user_id, finished_at desc);

create index if not exists idx_diagnostic_sessions_attempt_id
  on public.diagnostic_sessions (attempt_id);

create index if not exists idx_diagnostic_answers_user_id
  on public.diagnostic_answers (user_id);

create index if not exists idx_diagnostic_answers_user_answered_at
  on public.diagnostic_answers (user_id, answered_at desc);

create index if not exists idx_diagnostic_answers_attempt_id
  on public.diagnostic_answers (attempt_id);

create index if not exists idx_challenge_attempts_user_id
  on public.challenge_attempts (user_id);

create index if not exists idx_challenge_attempts_user_answered_at
  on public.challenge_attempts (user_id, answered_at desc);

create index if not exists idx_challenge_attempts_attempt_id
  on public.challenge_attempts (attempt_id);

create index if not exists idx_satisfaction_feedback_user_id
  on public.satisfaction_feedback (user_id);

create index if not exists idx_satisfaction_feedback_user_created_at
  on public.satisfaction_feedback (user_id, created_at desc);

create index if not exists idx_satisfaction_feedback_attempt_id
  on public.satisfaction_feedback (attempt_id);

-- 3) RLS permanece habilitado nas tabelas atuais.
alter table public.diagnostic_sessions enable row level security;
alter table public.diagnostic_answers enable row level security;
alter table public.challenge_attempts enable row level security;
alter table public.satisfaction_feedback enable row level security;

-- Antes de executar em producao, confira se nao existem policies manuais
-- com nomes diferentes e permissoes amplas nestas tabelas:
--
-- select schemaname, tablename, policyname, roles, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in (
--     'diagnostic_sessions',
--     'diagnostic_answers',
--     'challenge_attempts',
--     'satisfaction_feedback'
--   )
-- order by tablename, policyname;
--
-- Esta migration substitui apenas as policies conhecidas pelo projeto.

-- 4) Policies anonimas: mantem inserts anonimos, mas impede user_id preenchido.
drop policy if exists "anon_insert_diagnostic_sessions" on public.diagnostic_sessions;
create policy "anon_insert_diagnostic_sessions"
on public.diagnostic_sessions
for insert
to anon
with check (user_id is null);

drop policy if exists "anon_insert_diagnostic_answers" on public.diagnostic_answers;
create policy "anon_insert_diagnostic_answers"
on public.diagnostic_answers
for insert
to anon
with check (user_id is null);

drop policy if exists "anon_insert_challenge_attempts" on public.challenge_attempts;
create policy "anon_insert_challenge_attempts"
on public.challenge_attempts
for insert
to anon
with check (user_id is null);

drop policy if exists "anon_insert_satisfaction_feedback" on public.satisfaction_feedback;
create policy "anon_insert_satisfaction_feedback"
on public.satisfaction_feedback
for insert
to anon
with check (user_id is null);

-- 5) Policies autenticadas: insert e leitura somente do proprio usuario.
drop policy if exists "authenticated_insert_own_diagnostic_sessions" on public.diagnostic_sessions;
create policy "authenticated_insert_own_diagnostic_sessions"
on public.diagnostic_sessions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "authenticated_select_own_diagnostic_sessions" on public.diagnostic_sessions;
create policy "authenticated_select_own_diagnostic_sessions"
on public.diagnostic_sessions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "authenticated_insert_own_diagnostic_answers" on public.diagnostic_answers;
create policy "authenticated_insert_own_diagnostic_answers"
on public.diagnostic_answers
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "authenticated_select_own_diagnostic_answers" on public.diagnostic_answers;
create policy "authenticated_select_own_diagnostic_answers"
on public.diagnostic_answers
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "authenticated_insert_own_challenge_attempts" on public.challenge_attempts;
create policy "authenticated_insert_own_challenge_attempts"
on public.challenge_attempts
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "authenticated_select_own_challenge_attempts" on public.challenge_attempts;
create policy "authenticated_select_own_challenge_attempts"
on public.challenge_attempts
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "authenticated_insert_own_satisfaction_feedback" on public.satisfaction_feedback;
create policy "authenticated_insert_own_satisfaction_feedback"
on public.satisfaction_feedback
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "authenticated_select_own_satisfaction_feedback" on public.satisfaction_feedback;
create policy "authenticated_select_own_satisfaction_feedback"
on public.satisfaction_feedback
for select
to authenticated
using (user_id = auth.uid());

-- 6) Grants minimos.
grant usage on schema public to anon, authenticated;

grant insert on table public.diagnostic_sessions to anon;
grant insert on table public.diagnostic_answers to anon;
grant insert on table public.challenge_attempts to anon;
grant insert on table public.satisfaction_feedback to anon;

grant insert, select on table public.diagnostic_sessions to authenticated;
grant insert, select on table public.diagnostic_answers to authenticated;
grant insert, select on table public.challenge_attempts to authenticated;
grant insert, select on table public.satisfaction_feedback to authenticated;

-- As quatro tabelas usam identity columns. No Postgres/Supabase, os nomes
-- abaixo sao os nomes padrao gerados para as sequences do schema atual.
grant usage, select on sequence public.diagnostic_sessions_id_seq to anon, authenticated;
grant usage, select on sequence public.diagnostic_answers_id_seq to anon, authenticated;
grant usage, select on sequence public.challenge_attempts_id_seq to anon, authenticated;
grant usage, select on sequence public.satisfaction_feedback_id_seq to anon, authenticated;

-- Defesa explicita: anon nao deve consultar tabelas de progresso.
revoke select on table public.diagnostic_sessions from anon;
revoke select on table public.diagnostic_answers from anon;
revoke select on table public.challenge_attempts from anon;
revoke select on table public.satisfaction_feedback from anon;

-- 7) RPC simples para a futura pagina "Meu Progresso".
-- Retorna uma linha com resumo do usuario autenticado atual.
create or replace function public.get_my_progress_summary()
returns table (
  total_diagnostics bigint,
  last_diagnostic_at timestamptz,
  current_level text,
  score_percent integer,
  areas_to_improve jsonb,
  total_challenge_attempts bigint,
  challenge_correct_attempts bigint,
  last_activity_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
with
diagnostic_summary as (
  select
    count(*)::bigint as total_diagnostics,
    max(finished_at) as last_diagnostic_at
  from public.diagnostic_sessions
  where user_id = auth.uid()
),
latest_diagnostic as (
  select
    ds.overall_level,
    ds.score_percent,
    ds.area_score_snapshot
  from public.diagnostic_sessions ds
  where ds.user_id = auth.uid()
  order by ds.finished_at desc, ds.created_at desc
  limit 1
),
areas as (
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'area', area_item ->> 'area',
          'percent', nullif(area_item ->> 'percent', '')::integer,
          'correct', nullif(area_item ->> 'correct', '')::integer,
          'total', nullif(area_item ->> 'total', '')::integer
        )
        order by nullif(area_item ->> 'percent', '')::integer asc nulls last
      ),
      '[]'::jsonb
    ) as areas_to_improve
  from latest_diagnostic ld
  cross join lateral jsonb_array_elements(coalesce(ld.area_score_snapshot, '[]'::jsonb)) as area_item
  where coalesce(nullif(area_item ->> 'total', '')::integer, 0) > 0
),
challenge_summary as (
  select
    count(*)::bigint as total_challenge_attempts,
    coalesce(sum(case when is_correct then 1 else 0 end), 0)::bigint as challenge_correct_attempts,
    max(answered_at) as last_challenge_at
  from public.challenge_attempts
  where user_id = auth.uid()
),
answer_activity as (
  select max(answered_at) as last_answer_at
  from public.diagnostic_answers
  where user_id = auth.uid()
),
feedback_activity as (
  select max(created_at) as last_feedback_at
  from public.satisfaction_feedback
  where user_id = auth.uid()
),
activity_values as (
  select diagnostic_summary.last_diagnostic_at as activity_at from diagnostic_summary
  union all
  select challenge_summary.last_challenge_at from challenge_summary
  union all
  select answer_activity.last_answer_at from answer_activity
  union all
  select feedback_activity.last_feedback_at from feedback_activity
)
select
  diagnostic_summary.total_diagnostics,
  diagnostic_summary.last_diagnostic_at,
  latest_diagnostic.overall_level as current_level,
  latest_diagnostic.score_percent,
  coalesce(areas.areas_to_improve, '[]'::jsonb) as areas_to_improve,
  challenge_summary.total_challenge_attempts,
  challenge_summary.challenge_correct_attempts,
  (select max(activity_at) from activity_values) as last_activity_at
from diagnostic_summary
cross join challenge_summary
cross join answer_activity
cross join feedback_activity
left join latest_diagnostic on true
left join areas on true;
$$;

revoke all on function public.get_my_progress_summary() from public, anon;
grant execute on function public.get_my_progress_summary() to authenticated;
