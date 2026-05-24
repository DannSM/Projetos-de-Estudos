-- Data Skill Map - Question Bank Recommendation Link
-- Execute este arquivo apos docs/supabase-question-bank-v2.sql
-- e apos criar public.diagnostic_recommendations.
--
-- Esta migration adiciona campos opcionais em public.question_bank.
-- Ela nao altera perguntas existentes e nao preenche dados reais.
-- O preenchimento de skill_code e recommendation_key sera feito em etapa separada.
-- O frontend ainda nao sera alterado para consumir estes campos.
--
-- Nao ha foreign key obrigatoria nesta etapa: a question_bank pode conter
-- fallbacks, registros inativos ou perguntas ainda sem recomendacao mapeada.

alter table public.question_bank
  add column if not exists skill_code text null,
  add column if not exists recommendation_key text null,
  add column if not exists diagnostic_weight numeric null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'question_bank_skill_code_not_blank_check'
      and conrelid = 'public.question_bank'::regclass
  ) then
    alter table public.question_bank
      add constraint question_bank_skill_code_not_blank_check
      check (skill_code is null or length(btrim(skill_code)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'question_bank_recommendation_key_not_blank_check'
      and conrelid = 'public.question_bank'::regclass
  ) then
    alter table public.question_bank
      add constraint question_bank_recommendation_key_not_blank_check
      check (recommendation_key is null or length(btrim(recommendation_key)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'question_bank_diagnostic_weight_check'
      and conrelid = 'public.question_bank'::regclass
  ) then
    alter table public.question_bank
      add constraint question_bank_diagnostic_weight_check
      check (diagnostic_weight is null or diagnostic_weight >= 0);
  end if;
end $$;

create index if not exists idx_question_bank_skill_code
  on public.question_bank (skill_code);

create index if not exists idx_question_bank_recommendation_key
  on public.question_bank (recommendation_key);

create index if not exists idx_question_bank_mode_area_level_skill
  on public.question_bank (mode, area, level, skill_code);
