-- Data Skill Map - Question Bank v2 (incremental)
-- Evolui a tabela public.question_bank sem recriar e sem apagar dados.
-- Execute apos docs/supabase-question-bank.sql.

alter table public.question_bank
  add column if not exists difficulty_score integer,
  add column if not exists question_type text,
  add column if not exists tags text[],
  add column if not exists estimated_time_seconds integer,
  add column if not exists times_answered integer not null default 0,
  add column if not exists correct_rate numeric;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'question_bank_difficulty_score_check'
      and conrelid = 'public.question_bank'::regclass
  ) then
    alter table public.question_bank
      add constraint question_bank_difficulty_score_check
      check (difficulty_score is null or difficulty_score between 1 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'question_bank_question_type_check'
      and conrelid = 'public.question_bank'::regclass
  ) then
    alter table public.question_bank
      add constraint question_bank_question_type_check
      check (
        question_type is null
        or question_type in ('conceitual', 'cenario', 'codigo', 'interpretacao', 'negocio', 'pegadinha')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'question_bank_estimated_time_seconds_check'
      and conrelid = 'public.question_bank'::regclass
  ) then
    alter table public.question_bank
      add constraint question_bank_estimated_time_seconds_check
      check (estimated_time_seconds is null or estimated_time_seconds >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'question_bank_times_answered_check'
      and conrelid = 'public.question_bank'::regclass
  ) then
    alter table public.question_bank
      add constraint question_bank_times_answered_check
      check (times_answered >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'question_bank_correct_rate_check'
      and conrelid = 'public.question_bank'::regclass
  ) then
    alter table public.question_bank
      add constraint question_bank_correct_rate_check
      check (correct_rate is null or (correct_rate >= 0 and correct_rate <= 1));
  end if;
end $$;

create index if not exists idx_question_bank_mode_level_area_active
  on public.question_bank (mode, level, area, is_active);

create index if not exists idx_question_bank_mode_active_difficulty
  on public.question_bank (mode, is_active, difficulty_score);

create index if not exists idx_question_bank_tags_gin
  on public.question_bank using gin (tags);
