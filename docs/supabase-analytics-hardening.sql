-- Data Skill Map - hardening de seguranca para analytics interno
-- Objetivo: remover dependencia de SELECT anon nas views e expor leitura
-- apenas por RPC segura para usuarios admin autenticados.

-- 1) Cadastro de usuarios admin (controle de autorizacao)
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_no_direct_access" on public.admin_users;
create policy "admin_users_no_direct_access"
on public.admin_users
for all
to authenticated
using (false)
with check (false);

revoke all on public.admin_users from anon, authenticated;

-- 2) Helper de autorizacao admin (usado pelas RPCs)
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin_user() from public, anon;
grant execute on function public.is_admin_user() to authenticated;

-- 3) RPC: verifica autorizacao admin do usuario logado
create or replace function public.admin_is_authorized()
returns table (
  is_authorized boolean,
  admin_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_email text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  jwt_email := coalesce(auth.jwt() ->> 'email', '');

  return query
  select public.is_admin_user(), jwt_email;
end;
$$;

revoke all on function public.admin_is_authorized() from public, anon;
grant execute on function public.admin_is_authorized() to authenticated;

-- 4) RPC: leitura segura da view de plataforma
create or replace function public.admin_get_platform_activity_daily(
  p_start_date date default null,
  p_end_date date default null,
  p_limit integer default 180
)
returns table (
  activity_date date,
  active_users bigint,
  diagnostics_count bigint,
  diagnostic_avg_score_percent numeric,
  diagnostic_answers_count bigint,
  diagnostic_answers_correct bigint,
  diagnostic_answers_accuracy_percent numeric,
  challenge_attempts_count bigint,
  challenge_correct_count bigint,
  challenge_accuracy_percent numeric,
  satisfaction_count bigint,
  satisfaction_comments_count bigint,
  satisfaction_avg_rating numeric,
  satisfaction_diagnostic_avg_rating numeric,
  satisfaction_challenge_avg_rating numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 180), 1), 365);

  return query
  select
    v.activity_date,
    v.active_users,
    v.diagnostics_count,
    v.diagnostic_avg_score_percent,
    v.diagnostic_answers_count,
    v.diagnostic_answers_correct,
    v.diagnostic_answers_accuracy_percent,
    v.challenge_attempts_count,
    v.challenge_correct_count,
    v.challenge_accuracy_percent,
    v.satisfaction_count,
    v.satisfaction_comments_count,
    v.satisfaction_avg_rating,
    v.satisfaction_diagnostic_avg_rating,
    v.satisfaction_challenge_avg_rating
  from public.vw_platform_activity_daily v
  where (p_start_date is null or v.activity_date >= p_start_date)
    and (p_end_date is null or v.activity_date <= p_end_date)
  order by v.activity_date asc
  limit v_limit;
end;
$$;

revoke all on function public.admin_get_platform_activity_daily(date, date, integer) from public, anon;
grant execute on function public.admin_get_platform_activity_daily(date, date, integer) to authenticated;

-- 5) RPC: leitura segura da view por usuario
create or replace function public.admin_get_user_activity_daily(
  p_start_date date default null,
  p_end_date date default null,
  p_user_filter text default null,
  p_limit integer default 1800
)
returns table (
  activity_date date,
  anonymous_user_id text,
  diagnostics_count bigint,
  diagnostic_avg_score_percent numeric,
  diagnostic_answers_count bigint,
  diagnostic_answers_correct bigint,
  diagnostic_answers_accuracy_percent numeric,
  challenge_attempts_count bigint,
  challenge_correct_count bigint,
  challenge_accuracy_percent numeric,
  satisfaction_count bigint,
  satisfaction_comments_count bigint,
  satisfaction_avg_rating numeric,
  satisfaction_diagnostic_avg_rating numeric,
  satisfaction_challenge_avg_rating numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_filter text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 1800), 1), 5000);
  v_filter := nullif(trim(coalesce(p_user_filter, '')), '');

  return query
  select
    v.activity_date,
    v.anonymous_user_id,
    v.diagnostics_count,
    v.diagnostic_avg_score_percent,
    v.diagnostic_answers_count,
    v.diagnostic_answers_correct,
    v.diagnostic_answers_accuracy_percent,
    v.challenge_attempts_count,
    v.challenge_correct_count,
    v.challenge_accuracy_percent,
    v.satisfaction_count,
    v.satisfaction_comments_count,
    v.satisfaction_avg_rating,
    v.satisfaction_diagnostic_avg_rating,
    v.satisfaction_challenge_avg_rating
  from public.vw_user_activity_daily v
  where (p_start_date is null or v.activity_date >= p_start_date)
    and (p_end_date is null or v.activity_date <= p_end_date)
    and (v_filter is null or v.anonymous_user_id ilike '%' || v_filter || '%')
  order by v.activity_date desc, v.anonymous_user_id asc
  limit v_limit;
end;
$$;

revoke all on function public.admin_get_user_activity_daily(date, date, text, integer) from public, anon;
grant execute on function public.admin_get_user_activity_daily(date, date, text, integer) to authenticated;

-- 6) RPC: leitura segura da view de satisfacao
create or replace function public.admin_get_satisfaction_feedback_daily(
  p_start_date date default null,
  p_end_date date default null,
  p_limit integer default 500
)
returns table (
  activity_date date,
  context_type text,
  challenge_id text,
  diagnostic_id text,
  total_feedbacks bigint,
  avg_rating numeric,
  rating_1 bigint,
  rating_2 bigint,
  rating_3 bigint,
  rating_4 bigint,
  rating_5 bigint,
  comments_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  v_limit := least(greatest(coalesce(p_limit, 500), 1), 2000);

  return query
  select
    v.activity_date,
    v.context_type,
    v.challenge_id,
    v.diagnostic_id,
    v.total_feedbacks,
    v.avg_rating,
    v.rating_1,
    v.rating_2,
    v.rating_3,
    v.rating_4,
    v.rating_5,
    v.comments_count
  from public.vw_satisfaction_feedback_daily v
  where (p_start_date is null or v.activity_date >= p_start_date)
    and (p_end_date is null or v.activity_date <= p_end_date)
  order by v.activity_date asc, v.context_type asc
  limit v_limit;
end;
$$;

revoke all on function public.admin_get_satisfaction_feedback_daily(date, date, integer) from public, anon;
grant execute on function public.admin_get_satisfaction_feedback_daily(date, date, integer) to authenticated;
