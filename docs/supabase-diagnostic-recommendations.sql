-- Data Skill Map - Diagnostic Recommendations
-- Execute este arquivo primeiro no SQL Editor do Supabase.
-- Depois execute docs/supabase-diagnostic-recommendations-seed.sql.
-- O frontend ainda sera conectado a esta tabela em etapa futura.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.diagnostic_recommendations (
  id uuid primary key default gen_random_uuid(),
  recommendation_key text not null unique,
  skill_code text not null,
  area text not null,
  level text not null,
  concept text not null,
  recommendation_type text not null,
  severity text not null,
  title text not null,
  diagnosis_text text not null,
  study_guidance text not null,
  next_step text not null,
  trigger_level text null,
  priority integer not null default 0,
  is_active boolean not null default true,
  source text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diagnostic_recommendations_skill_code_not_blank_check
    check (length(btrim(skill_code)) > 0),
  constraint diagnostic_recommendations_recommendation_key_not_blank_check
    check (length(btrim(recommendation_key)) > 0),
  constraint diagnostic_recommendations_area_check
    check (area in ('SQL', 'Excel', 'Estatística', 'Lógica de dados', 'Indicadores')),
  constraint diagnostic_recommendations_level_check
    check (level in ('Básico', 'Intermediário', 'Avançado')),
  constraint diagnostic_recommendations_trigger_level_check
    check (trigger_level is null or trigger_level in ('Básico', 'Intermediário', 'Avançado', 'Final')),
  constraint diagnostic_recommendations_type_check
    check (recommendation_type in ('review', 'next_step', 'blocked_level', 'attention', 'strength')),
  constraint diagnostic_recommendations_severity_check
    check (severity in ('low', 'medium', 'high', 'critical')),
  constraint diagnostic_recommendations_priority_check
    check (priority >= 0)
);

drop trigger if exists trg_diagnostic_recommendations_set_updated_at
on public.diagnostic_recommendations;

create trigger trg_diagnostic_recommendations_set_updated_at
before update on public.diagnostic_recommendations
for each row
execute function public.set_updated_at();

create index if not exists idx_diagnostic_recommendations_skill_code
  on public.diagnostic_recommendations (skill_code);

create index if not exists idx_diagnostic_recommendations_area
  on public.diagnostic_recommendations (area);

create index if not exists idx_diagnostic_recommendations_level
  on public.diagnostic_recommendations (level);

create index if not exists idx_diagnostic_recommendations_is_active
  on public.diagnostic_recommendations (is_active);

create index if not exists idx_diagnostic_recommendations_priority
  on public.diagnostic_recommendations (priority);

create index if not exists idx_diagnostic_recommendations_active_priority
  on public.diagnostic_recommendations (is_active, priority);

alter table public.diagnostic_recommendations enable row level security;

drop policy if exists "anon_select_active_diagnostic_recommendations"
on public.diagnostic_recommendations;

create policy "anon_select_active_diagnostic_recommendations"
on public.diagnostic_recommendations
for select
to anon
using (is_active = true);

drop policy if exists "authenticated_select_active_diagnostic_recommendations"
on public.diagnostic_recommendations;

create policy "authenticated_select_active_diagnostic_recommendations"
on public.diagnostic_recommendations
for select
to authenticated
using (is_active = true);

grant usage on schema public to anon, authenticated;
grant select on table public.diagnostic_recommendations to anon, authenticated;

revoke insert, update, delete on table public.diagnostic_recommendations from anon, authenticated;
