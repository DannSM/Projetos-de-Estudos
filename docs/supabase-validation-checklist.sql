-- Data Skill Map - checklist de validacao da camada analitica externa
-- Execute apos:
-- 1) docs/supabase-views.sql
-- 2) docs/supabase-permissions-bi.sql
--
-- Observacao: os testes de "deve falhar" devem ser executados isoladamente.

-- =========================================================
-- TESTE 1 - SELECT nas views aprovadas (deve funcionar)
-- =========================================================
select * from public.vw_platform_activity_daily limit 10;
select * from public.vw_user_activity_daily limit 10;
select * from public.vw_satisfaction_feedback_daily limit 10;

-- =========================================================
-- TESTE 2 - Reader sem acesso as tabelas base (deve falhar)
-- Execute bloco abaixo isoladamente.
-- =========================================================
-- set role dsm_dashboard_reader;
-- select * from public.diagnostic_sessions limit 10;
-- select * from public.diagnostic_answers limit 10;
-- select * from public.challenge_attempts limit 10;
-- select * from public.satisfaction_feedback limit 10;
-- reset role;

-- =========================================================
-- TESTE 3 - Reader sem acesso a view admin (deve falhar)
-- Execute bloco abaixo isoladamente.
-- =========================================================
-- set role dsm_dashboard_reader;
-- select * from public.vw_satisfaction_comments_admin limit 10;
-- reset role;

-- =========================================================
-- TESTE 4 - Auditoria de grants para anon/authenticated
-- Resultado esperado: 0 linhas.
-- =========================================================
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

-- =========================================================
-- TESTE 5 - Auditoria de grants para dsm_dashboard_reader
-- Resultado esperado: SELECT somente nas 3 views aprovadas.
-- =========================================================
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'dsm_dashboard_reader'
order by table_name, privilege_type;

-- =========================================================
-- TESTE 6 - Validacao de timezone (UTC vs Sao Paulo)
-- Resultado esperado: activity_date das views segue dia local.
-- =========================================================
with base as (
  select
    attempt_id,
    created_at as raw_ts_utc,
    (created_at at time zone 'America/Sao_Paulo') as ts_sao_paulo,
    date_trunc('day', created_at)::date as utc_day,
    date_trunc('day', created_at at time zone 'America/Sao_Paulo')::date as sao_paulo_day
  from public.satisfaction_feedback
  order by created_at desc
  limit 20
)
select *
from base
order by raw_ts_utc desc;

-- Comparacao direta com a view diaria de satisfacao.
with feedback_daily_base as (
  select
    date_trunc('day', created_at at time zone 'America/Sao_Paulo')::date as activity_date,
    count(*) as total_feedbacks_base
  from public.satisfaction_feedback
  group by 1
),
feedback_daily_view as (
  select
    activity_date,
    sum(total_feedbacks) as total_feedbacks_view
  from public.vw_satisfaction_feedback_daily
  group by 1
)
select
  coalesce(b.activity_date, v.activity_date) as activity_date,
  coalesce(b.total_feedbacks_base, 0) as total_feedbacks_base,
  coalesce(v.total_feedbacks_view, 0) as total_feedbacks_view
from feedback_daily_base b
full outer join feedback_daily_view v using (activity_date)
order by activity_date desc;

-- =========================================================
-- TESTE 7 - Validacao de contagens (views vs base)
-- Resultado esperado: totais compativeis no mesmo recorte/fuso.
-- =========================================================
with
diagnostics_base as (
  select
    date_trunc('day', finished_at at time zone 'America/Sao_Paulo')::date as activity_date,
    count(*) as diagnostics_count_base
  from public.diagnostic_sessions
  group by 1
),
challenges_base as (
  select
    date_trunc('day', answered_at at time zone 'America/Sao_Paulo')::date as activity_date,
    count(*) as challenge_attempts_count_base
  from public.challenge_attempts
  group by 1
),
satisfaction_base as (
  select
    date_trunc('day', created_at at time zone 'America/Sao_Paulo')::date as activity_date,
    count(*) as satisfaction_count_base,
    sum(case when comment is not null and btrim(comment) <> '' then 1 else 0 end) as comments_count_base
  from public.satisfaction_feedback
  group by 1
)
select
  p.activity_date,
  p.diagnostics_count as diagnostics_count_view,
  coalesce(d.diagnostics_count_base, 0) as diagnostics_count_base,
  p.challenge_attempts_count as challenge_attempts_count_view,
  coalesce(c.challenge_attempts_count_base, 0) as challenge_attempts_count_base,
  p.satisfaction_count as satisfaction_count_view,
  coalesce(s.satisfaction_count_base, 0) as satisfaction_count_base,
  p.satisfaction_comments_count as comments_count_view,
  coalesce(s.comments_count_base, 0) as comments_count_base
from public.vw_platform_activity_daily p
left join diagnostics_base d on d.activity_date = p.activity_date
left join challenges_base c on c.activity_date = p.activity_date
left join satisfaction_base s on s.activity_date = p.activity_date
order by p.activity_date desc
limit 30;
