-- Data Skill Map - fundacao incremental auth-first de aprendizado
--
-- Avaliacao gratuita: usuarios anonimos continuam podendo fazer diagnostico,
-- desafios e feedback usando as tabelas atuais do app:
-- diagnostic_sessions, diagnostic_answers, challenge_attempts e
-- satisfaction_feedback.
--
-- Historico permanente, mapa de habilidades, progresso em trilhas e
-- recomendacoes personalizadas exigem login via Supabase Auth.
--
-- Conversao futura: um resultado anonimo recente podera ser promovido para
-- historico autenticado por fluxo controlado no frontend, usando campos como
-- source_attempt_id e last_session_attempt_id. Este script nao abre historico
-- anonimo persistente nas novas tabelas.
--
-- Admin: usa o mesmo Supabase Auth, mas autorizacao real continua sendo
-- public.admin_users + public.is_admin_user(). profiles.role existe apenas
-- para UX/segmentacao e nao substitui admin_users como fonte de seguranca.
--
-- Execute manualmente no SQL Editor do Supabase apos revisao.

create extension if not exists pgcrypto;

-- Reutiliza o helper ja adotado no projeto. create or replace preserva o nome
-- esperado por triggers existentes e mantem a funcao simples e compativel.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1) Perfis de usuario autenticado
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'student',
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('student', 'admin')),
  constraint profiles_plan_check check (plan in ('free', 'pro', 'team'))
);

create index if not exists idx_profiles_role
  on public.profiles (role);

create index if not exists idx_profiles_plan
  on public.profiles (plan);

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Perfil automatico ao criar auth.users.
-- A funcao copia apenas email/metadados basicos do usuario autenticado.
-- A autorizacao admin permanece fora daqui, via public.admin_users.
create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name'), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_auth_users_create_profile on auth.users;
create trigger trg_auth_users_create_profile
after insert on auth.users
for each row
execute function public.handle_new_auth_user_profile();

-- Backfill para usuarios Auth ja existentes antes desta migration.
insert into public.profiles (id, email, display_name)
select
  au.id,
  au.email,
  nullif(coalesce(au.raw_user_meta_data ->> 'display_name', au.raw_user_meta_data ->> 'name'), '')
from auth.users au
on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      updated_at = now();

-- 2) Progresso persistente por area de conhecimento
create table if not exists public.user_skill_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_area text not null,
  current_level text,
  score_percent numeric(5,2),
  confidence_score numeric(5,2),
  questions_answered integer not null default 0,
  questions_correct integer not null default 0,
  last_session_attempt_id text,
  last_activity_at timestamptz,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_skill_progress_score_check check (
    score_percent is null or (score_percent >= 0 and score_percent <= 100)
  ),
  constraint user_skill_progress_confidence_check check (
    confidence_score is null or (confidence_score >= 0 and confidence_score <= 100)
  ),
  constraint user_skill_progress_questions_check check (
    questions_answered >= 0 and questions_correct >= 0 and questions_correct <= questions_answered
  ),
  constraint user_skill_progress_status_check check (
    status in ('active', 'needs_review', 'completed', 'archived')
  )
);

create unique index if not exists user_skill_progress_user_area_uidx
  on public.user_skill_progress (user_id, skill_area);

create index if not exists idx_user_skill_progress_user_id
  on public.user_skill_progress (user_id);

create index if not exists idx_user_skill_progress_skill_area
  on public.user_skill_progress (skill_area);

create index if not exists idx_user_skill_progress_status
  on public.user_skill_progress (status);

drop trigger if exists trg_user_skill_progress_set_updated_at on public.user_skill_progress;
create trigger trg_user_skill_progress_set_updated_at
before update on public.user_skill_progress
for each row
execute function public.set_updated_at();

-- 3) Recomendacoes personalizadas persistentes
create table if not exists public.learning_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_area text not null,
  recommendation_type text not null default 'study',
  priority integer not null default 3,
  title text not null,
  description text,
  reason text,
  source_attempt_id text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_recommendations_priority_check check (priority between 1 and 5),
  constraint learning_recommendations_type_check check (
    recommendation_type in ('study', 'practice', 'review', 'path', 'challenge')
  ),
  constraint learning_recommendations_status_check check (
    status in ('active', 'dismissed', 'completed', 'expired')
  )
);

create index if not exists idx_learning_recommendations_user_id
  on public.learning_recommendations (user_id);

create index if not exists idx_learning_recommendations_skill_area
  on public.learning_recommendations (skill_area);

create index if not exists idx_learning_recommendations_status
  on public.learning_recommendations (status);

drop trigger if exists trg_learning_recommendations_set_updated_at on public.learning_recommendations;
create trigger trg_learning_recommendations_set_updated_at
before update on public.learning_recommendations
for each row
execute function public.set_updated_at();

-- 4) Trilhas de aprendizado (conteudo educacional publico quando ativo)
create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  skill_area text not null,
  level text,
  estimated_minutes integer,
  status text not null default 'draft',
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_paths_estimated_minutes_check check (
    estimated_minutes is null or estimated_minutes >= 0
  ),
  constraint learning_paths_status_check check (
    status in ('draft', 'active', 'archived')
  )
);

create index if not exists idx_learning_paths_skill_area
  on public.learning_paths (skill_area);

create index if not exists idx_learning_paths_status
  on public.learning_paths (status);

drop trigger if exists trg_learning_paths_set_updated_at on public.learning_paths;
create trigger trg_learning_paths_set_updated_at
before update on public.learning_paths
for each row
execute function public.set_updated_at();

-- 5) Etapas das trilhas
create table if not exists public.learning_path_steps (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  step_key text,
  title text not null,
  description text,
  skill_area text,
  content_type text not null default 'lesson',
  content_url text,
  estimated_minutes integer,
  display_order integer not null default 0,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_path_steps_estimated_minutes_check check (
    estimated_minutes is null or estimated_minutes >= 0
  ),
  constraint learning_path_steps_content_type_check check (
    content_type in ('lesson', 'practice', 'quiz', 'project', 'external')
  ),
  constraint learning_path_steps_status_check check (
    status in ('active', 'draft', 'archived')
  )
);

create unique index if not exists learning_path_steps_path_step_key_uidx
  on public.learning_path_steps (path_id, step_key)
  where step_key is not null;

create index if not exists idx_learning_path_steps_path_id
  on public.learning_path_steps (path_id);

create index if not exists idx_learning_path_steps_skill_area
  on public.learning_path_steps (skill_area);

create index if not exists idx_learning_path_steps_status
  on public.learning_path_steps (status);

drop trigger if exists trg_learning_path_steps_set_updated_at on public.learning_path_steps;
create trigger trg_learning_path_steps_set_updated_at
before update on public.learning_path_steps
for each row
execute function public.set_updated_at();

-- 6) Progresso persistente em trilhas
create table if not exists public.user_learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  step_id uuid references public.learning_path_steps(id) on delete set null,
  status text not null default 'not_started',
  progress_percent numeric(5,2) not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  last_activity_at timestamptz,
  source_attempt_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_learning_progress_percent_check check (
    progress_percent >= 0 and progress_percent <= 100
  ),
  constraint user_learning_progress_status_check check (
    status in ('not_started', 'in_progress', 'completed', 'paused', 'archived')
  )
);

create unique index if not exists user_learning_progress_user_path_uidx
  on public.user_learning_progress (user_id, path_id)
  where step_id is null;

create unique index if not exists user_learning_progress_user_path_step_uidx
  on public.user_learning_progress (user_id, path_id, step_id)
  where step_id is not null;

create index if not exists idx_user_learning_progress_user_id
  on public.user_learning_progress (user_id);

create index if not exists idx_user_learning_progress_path_id
  on public.user_learning_progress (path_id);

create index if not exists idx_user_learning_progress_status
  on public.user_learning_progress (status);

drop trigger if exists trg_user_learning_progress_set_updated_at on public.user_learning_progress;
create trigger trg_user_learning_progress_set_updated_at
before update on public.user_learning_progress
for each row
execute function public.set_updated_at();

-- RLS nas novas tabelas
alter table public.profiles enable row level security;
alter table public.user_skill_progress enable row level security;
alter table public.learning_recommendations enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_steps enable row level security;
alter table public.user_learning_progress enable row level security;

-- Policies: profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin_user());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role = 'student'
  and plan = 'free'
);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin_user())
with check (id = auth.uid() or public.is_admin_user());

-- Policies: user_skill_progress
drop policy if exists "user_skill_progress_select_own_or_admin" on public.user_skill_progress;
create policy "user_skill_progress_select_own_or_admin"
on public.user_skill_progress
for select
to authenticated
using (user_id = auth.uid() or public.is_admin_user());

drop policy if exists "user_skill_progress_insert_own" on public.user_skill_progress;
create policy "user_skill_progress_insert_own"
on public.user_skill_progress
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_skill_progress_update_own_or_admin" on public.user_skill_progress;
create policy "user_skill_progress_update_own_or_admin"
on public.user_skill_progress
for update
to authenticated
using (user_id = auth.uid() or public.is_admin_user())
with check (user_id = auth.uid() or public.is_admin_user());

-- Policies: learning_recommendations
drop policy if exists "learning_recommendations_select_own_or_admin" on public.learning_recommendations;
create policy "learning_recommendations_select_own_or_admin"
on public.learning_recommendations
for select
to authenticated
using (user_id = auth.uid() or public.is_admin_user());

drop policy if exists "learning_recommendations_insert_own" on public.learning_recommendations;
create policy "learning_recommendations_insert_own"
on public.learning_recommendations
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "learning_recommendations_update_own_or_admin" on public.learning_recommendations;
create policy "learning_recommendations_update_own_or_admin"
on public.learning_recommendations
for update
to authenticated
using (user_id = auth.uid() or public.is_admin_user())
with check (user_id = auth.uid() or public.is_admin_user());

-- Policies: learning_paths e learning_path_steps
drop policy if exists "learning_paths_select_active_public" on public.learning_paths;
create policy "learning_paths_select_active_public"
on public.learning_paths
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "learning_paths_admin_select_all" on public.learning_paths;
create policy "learning_paths_admin_select_all"
on public.learning_paths
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "learning_paths_admin_write" on public.learning_paths;
create policy "learning_paths_admin_write"
on public.learning_paths
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "learning_path_steps_select_active_public" on public.learning_path_steps;
create policy "learning_path_steps_select_active_public"
on public.learning_path_steps
for select
to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.learning_paths lp
    where lp.id = learning_path_steps.path_id
      and lp.status = 'active'
  )
);

drop policy if exists "learning_path_steps_admin_select_all" on public.learning_path_steps;
create policy "learning_path_steps_admin_select_all"
on public.learning_path_steps
for select
to authenticated
using (public.is_admin_user());

drop policy if exists "learning_path_steps_admin_write" on public.learning_path_steps;
create policy "learning_path_steps_admin_write"
on public.learning_path_steps
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

-- Policies: user_learning_progress
drop policy if exists "user_learning_progress_select_own_or_admin" on public.user_learning_progress;
create policy "user_learning_progress_select_own_or_admin"
on public.user_learning_progress
for select
to authenticated
using (user_id = auth.uid() or public.is_admin_user());

drop policy if exists "user_learning_progress_insert_own" on public.user_learning_progress;
create policy "user_learning_progress_insert_own"
on public.user_learning_progress
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_learning_progress_update_own_or_admin" on public.user_learning_progress;
create policy "user_learning_progress_update_own_or_admin"
on public.user_learning_progress
for update
to authenticated
using (user_id = auth.uid() or public.is_admin_user())
with check (user_id = auth.uid() or public.is_admin_user());

-- Grants minimos das novas estruturas.
-- anon nao recebe acesso a perfis/progresso/recomendacoes.
grant usage on schema public to anon, authenticated;

grant select on table public.learning_paths to anon;
grant select on table public.learning_path_steps to anon;

grant select, insert on table public.profiles to authenticated;
grant update (email, display_name) on table public.profiles to authenticated;
grant select, insert, update on table public.user_skill_progress to authenticated;
grant select, insert, update on table public.learning_recommendations to authenticated;
grant select, insert, update on table public.user_learning_progress to authenticated;
grant select on table public.learning_paths to authenticated;
grant select on table public.learning_path_steps to authenticated;

-- Views administrativas agregadas.
-- Nao ha grants para anon/authenticated. O caminho recomendado para acesso
-- futuro e RPC segura, seguindo o padrao ja usado pelo analytics atual.
drop view if exists public.vw_skill_distribution;
create view public.vw_skill_distribution as
select
  usp.skill_area,
  coalesce(usp.current_level, 'sem_nivel') as current_level,
  usp.status,
  count(*) as users_count,
  round(avg(usp.score_percent), 2) as avg_score_percent,
  round(avg(usp.confidence_score), 2) as avg_confidence_score,
  sum(usp.questions_answered) as questions_answered,
  sum(usp.questions_correct) as questions_correct
from public.user_skill_progress usp
group by usp.skill_area, coalesce(usp.current_level, 'sem_nivel'), usp.status;

drop view if exists public.vw_most_missed_questions;
create view public.vw_most_missed_questions as
select
  da.area as skill_area,
  da.level,
  da.concept,
  da.question,
  count(*) as answers_count,
  sum(case when da.is_correct then 1 else 0 end) as correct_count,
  sum(case when not da.is_correct then 1 else 0 end) as missed_count,
  round(
    case
      when count(*) = 0 then 0
      else (sum(case when not da.is_correct then 1 else 0 end)::numeric / count(*)) * 100
    end
  , 2) as miss_rate_percent
from public.diagnostic_answers da
group by da.area, da.level, da.concept, da.question
order by missed_count desc, answers_count desc;

drop view if exists public.vw_user_progress_summary;
create view public.vw_user_progress_summary as
select
  usp.user_id,
  p.email,
  p.role,
  p.plan,
  count(distinct usp.skill_area) as skill_areas_count,
  round(avg(usp.score_percent), 2) as avg_score_percent,
  sum(usp.questions_answered) as questions_answered,
  sum(usp.questions_correct) as questions_correct,
  max(usp.last_activity_at) as last_activity_at,
  count(*) filter (where usp.status = 'completed') as completed_skill_areas,
  count(*) filter (where usp.status = 'needs_review') as review_skill_areas
from public.user_skill_progress usp
join public.profiles p
  on p.id = usp.user_id
group by usp.user_id, p.email, p.role, p.plan;

drop view if exists public.vw_recommendations_summary;
create view public.vw_recommendations_summary as
select
  lr.skill_area,
  lr.recommendation_type,
  lr.status,
  lr.priority,
  count(*) as recommendations_count,
  count(distinct lr.user_id) as users_count,
  min(lr.created_at) as first_created_at,
  max(lr.created_at) as last_created_at
from public.learning_recommendations lr
group by lr.skill_area, lr.recommendation_type, lr.status, lr.priority;

drop view if exists public.vw_learning_path_progress;
create view public.vw_learning_path_progress as
select
  lp.id as path_id,
  lp.slug,
  lp.title,
  lp.skill_area,
  lp.status as path_status,
  count(ulp.id) as progress_records_count,
  count(distinct ulp.user_id) as users_count,
  count(*) filter (where ulp.status = 'in_progress') as in_progress_count,
  count(*) filter (where ulp.status = 'completed') as completed_count,
  round(avg(ulp.progress_percent), 2) as avg_progress_percent,
  max(ulp.last_activity_at) as last_activity_at
from public.learning_paths lp
left join public.user_learning_progress ulp
  on ulp.path_id = lp.id
group by lp.id, lp.slug, lp.title, lp.skill_area, lp.status;

drop view if exists public.vw_conversion_funnel;
create view public.vw_conversion_funnel as
select '01_completed_free_diagnostic' as funnel_step, count(distinct anonymous_user_id) as users_count
from public.diagnostic_sessions
union all
select '02_created_account' as funnel_step, count(*) as users_count
from public.profiles
union all
select '03_has_skill_progress' as funnel_step, count(distinct user_id) as users_count
from public.user_skill_progress
union all
select '04_has_recommendation' as funnel_step, count(distinct user_id) as users_count
from public.learning_recommendations
union all
select '05_started_learning_path' as funnel_step, count(distinct user_id) as users_count
from public.user_learning_progress
where status in ('in_progress', 'completed')
union all
select '06_completed_learning_path' as funnel_step, count(distinct user_id) as users_count
from public.user_learning_progress
where status = 'completed';

revoke all on public.vw_skill_distribution from public, anon, authenticated;
revoke all on public.vw_most_missed_questions from public, anon, authenticated;
revoke all on public.vw_user_progress_summary from public, anon, authenticated;
revoke all on public.vw_recommendations_summary from public, anon, authenticated;
revoke all on public.vw_learning_path_progress from public, anon, authenticated;
revoke all on public.vw_conversion_funnel from public, anon, authenticated;
