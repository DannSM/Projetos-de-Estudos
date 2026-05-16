-- Data Skill Map - Question Bank (Diagnostico + Desafios)
-- Execute no SQL Editor do Supabase.

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

create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  question_key text not null unique,
  mode text not null,
  area text not null,
  category text null,
  level text not null,
  concept text null,
  question text not null,
  code text null,
  context text null,
  options jsonb not null,
  correct_index integer not null,
  explanation text not null,
  points integer null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  source text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_bank_mode_check check (mode in ('diagnostico', 'desafio')),
  constraint question_bank_options_type_check check (jsonb_typeof(options) = 'array'),
  constraint question_bank_options_length_check check (jsonb_array_length(options) >= 2),
  constraint question_bank_correct_index_min_check check (correct_index >= 0),
  constraint question_bank_correct_index_max_check check (correct_index < jsonb_array_length(options)),
  constraint question_bank_points_check check (points is null or points >= 0)
);

drop trigger if exists trg_question_bank_set_updated_at on public.question_bank;
create trigger trg_question_bank_set_updated_at
before update on public.question_bank
for each row
execute function public.set_updated_at();

create index if not exists idx_question_bank_mode on public.question_bank (mode);
create index if not exists idx_question_bank_mode_active on public.question_bank (mode, is_active);
create index if not exists idx_question_bank_mode_category on public.question_bank (mode, category);
create index if not exists idx_question_bank_mode_level on public.question_bank (mode, level);
create index if not exists idx_question_bank_display_order on public.question_bank (display_order);

alter table public.question_bank enable row level security;

drop policy if exists "anon_select_active_question_bank" on public.question_bank;
create policy "anon_select_active_question_bank"
on public.question_bank
for select
to anon
using (is_active = true);

grant usage on schema public to anon;
grant select on table public.question_bank to anon;
