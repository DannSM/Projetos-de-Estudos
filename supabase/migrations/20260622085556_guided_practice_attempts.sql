begin;

create table if not exists public.user_guided_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references public.learning_activities(id) on delete cascade,
  attempt_payload jsonb not null default '{}'::jsonb,
  answer_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  score_percent numeric,
  status text not null default 'completed',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_guided_practice_attempts_attempt_payload_check
    check (jsonb_typeof(attempt_payload) = 'object'),
  constraint user_guided_practice_attempts_answer_payload_check
    check (jsonb_typeof(answer_payload) = 'object'),
  constraint user_guided_practice_attempts_result_payload_check
    check (jsonb_typeof(result_payload) = 'object'),
  constraint user_guided_practice_attempts_score_check
    check (score_percent is null or score_percent between 0 and 100),
  constraint user_guided_practice_attempts_status_check
    check (status in ('started', 'submitted', 'completed'))
);

create index if not exists idx_user_guided_practice_attempts_user_created
  on public.user_guided_practice_attempts (user_id, created_at desc);

create index if not exists idx_user_guided_practice_attempts_activity
  on public.user_guided_practice_attempts (activity_id, created_at desc);

drop trigger if exists trg_user_guided_practice_attempts_set_updated_at
  on public.user_guided_practice_attempts;
create trigger trg_user_guided_practice_attempts_set_updated_at
before update on public.user_guided_practice_attempts
for each row execute function public.set_updated_at();

alter table public.user_guided_practice_attempts enable row level security;

create policy "user_guided_practice_attempts_select_own"
on public.user_guided_practice_attempts for select to authenticated
using ((select auth.uid()) = user_id);

create policy "user_guided_practice_attempts_insert_own"
on public.user_guided_practice_attempts for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_guided_practice_attempts_update_own"
on public.user_guided_practice_attempts for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "user_guided_practice_attempts_admin_all"
on public.user_guided_practice_attempts for all to authenticated
using ((select public.is_admin_user()))
with check ((select public.is_admin_user()));

revoke all on table public.user_guided_practice_attempts from public, anon, authenticated;
grant select, insert, update on table public.user_guided_practice_attempts to authenticated;

insert into public.learning_activities (
  slug,
  activity_type,
  title,
  subtitle,
  track_slug,
  track_title,
  step_order,
  status,
  level_label,
  estimated_minutes,
  is_active,
  metadata
)
values (
  'indicadores-meta-resultado',
  'practice',
  'Meta e resultado',
  'Prática guiada de leitura de KPI',
  'indicadores-e-kpis',
  'Indicadores e KPIs',
  1,
  'active',
  'Básico',
  10,
  true,
  jsonb_build_object(
    'format', 'guided_practice',
    'content_version', 1,
    'source', 'guided_practice_kpi_mvp_v1',
    'step_key', 'indicadores-01-meta-resultado',
    'skill_code', 'kpi.target.interpretation',
    'recommendation_key', 'diag_rec_kpi_target_interpretation_basic_review_v1',
    'objective', 'Treinar a diferença entre resultado observado, meta esperada e interpretação do desvio.',
    'scenario', jsonb_build_object(
      'title', 'Satisfação abaixo da meta',
      'context', 'Uma equipe acompanha a taxa de satisfação dos atendimentos. A meta do mês é 85%, mas o resultado atual ficou em 78%.'
    ),
    'indicator_data', jsonb_build_array(
      jsonb_build_object('label', 'Meta', 'value', '85%'),
      jsonb_build_object('label', 'Resultado atual', 'value', '78%'),
      jsonb_build_object('label', 'Desvio', 'value', '-7 p.p.'),
      jsonb_build_object('label', 'Volume analisado', 'value', '420 atendimentos')
    ),
    'question', 'Qual é a melhor leitura desse indicador?',
    'response_schema', 'single_choice',
    'options', jsonb_build_array(
      jsonb_build_object('id', 'A', 'text', 'O resultado está bom, porque 78% representa a maioria dos atendimentos.'),
      jsonb_build_object('id', 'B', 'text', 'O resultado está abaixo da meta em 7 pontos percentuais e precisa de investigação sobre causas do desvio.'),
      jsonb_build_object('id', 'C', 'text', 'O indicador não pode ser analisado porque não temos o nome dos clientes.'),
      jsonb_build_object('id', 'D', 'text', 'A meta deve ser ignorada, pois o resultado isolado já mostra desempenho suficiente.')
    ),
    'correct_option', 'B',
    'feedback', 'A melhor leitura compara resultado com meta e transforma a diferença em uma interpretação acionável. Como 78% está 7 p.p. abaixo da meta de 85%, a análise deve investigar causas do desvio, como prazo, qualidade da solução, comunicação ou perfil dos atendimentos.',
    'attention', 'Não avalie um KPI apenas pelo número isolado. Um indicador precisa de contexto, meta e leitura de impacto.',
    'conclusion', 'Você praticou como transformar um percentual em diagnóstico de negócio: resultado, meta, desvio e próxima investigação.',
    'completion_rule', 'correct_answer_and_feedback_viewed'
  )
)
on conflict (slug) do update set
  activity_type = excluded.activity_type,
  title = excluded.title,
  subtitle = excluded.subtitle,
  track_slug = excluded.track_slug,
  track_title = excluded.track_title,
  step_order = excluded.step_order,
  status = excluded.status,
  level_label = excluded.level_label,
  estimated_minutes = excluded.estimated_minutes,
  is_active = excluded.is_active,
  metadata = excluded.metadata,
  updated_at = now();

update public.learning_path_steps
set
  content_url = 'pratica-guiada.html?atividade=indicadores-meta-resultado',
  metadata = metadata || jsonb_build_object(
    'activity_slug', 'indicadores-meta-resultado',
    'format', 'guided_practice'
  ),
  updated_at = now()
where step_key = 'indicadores-01-meta-resultado';

create or replace view public.vw_guided_practice_activities_public
with (security_barrier = true)
as
select
  id,
  slug,
  activity_type,
  title,
  subtitle,
  track_slug,
  track_title,
  step_order,
  status,
  level_label,
  estimated_minutes,
  metadata
from public.learning_activities
where is_active = true
  and status = 'active'
  and metadata ->> 'format' = 'guided_practice';

revoke all on table public.vw_guided_practice_activities_public from public, anon, authenticated;
grant select on table public.vw_guided_practice_activities_public to anon, authenticated;

commit;
