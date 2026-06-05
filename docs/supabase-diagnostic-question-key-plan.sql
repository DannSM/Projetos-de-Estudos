-- Plano documental: persistir identificador estavel da pergunta respondida.
-- NAO executar automaticamente. Revisar em SQL Editor/migration futura antes de aplicar.
--
-- Objetivo:
-- - Permitir anti-repeticao persistente por question_key/question_id.
-- - Manter compatibilidade com respostas antigas que so possuem o texto da pergunta.
-- - Preservar o fluxo atual enquanto o frontend faz fallback por texto normalizado.

begin;

-- 1) Colunas opcionais e retrocompativeis.
alter table public.diagnostic_answers
  add column if not exists question_id uuid,
  add column if not exists question_key text;

-- 2) Relacao opcional com question_bank.
-- A FK fica nullable para nao quebrar respostas antigas e respostas vindas de fallback local.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'diagnostic_answers_question_id_fkey'
  ) then
    alter table public.diagnostic_answers
      add constraint diagnostic_answers_question_id_fkey
      foreign key (question_id)
      references public.question_bank(id)
      on delete set null;
  end if;
end $$;

-- 3) Indices para busca de historico recente.
create index if not exists idx_diagnostic_answers_user_answered_question_key
  on public.diagnostic_answers (user_id, answered_at desc, question_key)
  where question_key is not null;

create index if not exists idx_diagnostic_answers_user_answered_question_id
  on public.diagnostic_answers (user_id, answered_at desc, question_id)
  where question_id is not null;

create index if not exists idx_diagnostic_answers_anon_answered_question_key
  on public.diagnostic_answers (anonymous_user_id, answered_at desc, question_key)
  where question_key is not null;

-- 4) Backfill conservador por texto exato + nivel + area.
-- Pode haver ambiguidades se o texto da pergunta tiver sido editado; por isso revisar duplicidades antes.
with candidate_matches as (
  select
    da.id as diagnostic_answer_id,
    qb.id as question_id,
    qb.question_key,
    count(*) over (partition by da.id) as match_count
  from public.diagnostic_answers da
  join public.question_bank qb
    on qb.mode = 'diagnostico'
   and qb.question = da.question
   and qb.level = da.level
   and qb.area = da.area
  where da.question_id is null
    and da.question_key is null
)
update public.diagnostic_answers da
set
  question_id = cm.question_id,
  question_key = cm.question_key
from candidate_matches cm
where da.id = cm.diagnostic_answer_id
  and cm.match_count = 1;

-- 5) Apos validar backfill e frontend, considerar:
-- - manter question_key nullable para fallback local;
-- - registrar question_id/question_key em novas respostas;
-- - atualizar consultas de anti-repeticao para priorizar question_key e cair para texto normalizado.

rollback;
