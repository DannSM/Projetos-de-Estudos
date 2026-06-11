-- Data Skill Map - fundacao Supabase da Central SQL v1
--
-- Este script cria catalogo, dataset, exercicio e historico de pratica.
-- Praticas continuam sem alterar user_learning_progress ou user_skill_progress.
-- Execute manualmente no SQL Editor do Supabase apos revisao.

begin;

create extension if not exists pgcrypto;

create table if not exists public.learning_activities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  activity_type text not null,
  title text not null,
  subtitle text,
  track_slug text,
  track_title text,
  step_order integer,
  status text not null default 'draft',
  level_label text,
  estimated_minutes integer,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_activities_type_check
    check (activity_type in ('introduction', 'practice')),
  constraint learning_activities_status_check
    check (status in ('completed', 'active', 'coming_soon', 'locked', 'draft')),
  constraint learning_activities_step_order_check
    check (step_order is null or step_order >= 0),
  constraint learning_activities_estimated_minutes_check
    check (estimated_minutes is null or estimated_minutes > 0),
  constraint learning_activities_metadata_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.sql_datasets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  engine text not null default 'postgresql',
  schema_config jsonb not null,
  seed_data jsonb not null,
  sample_rows jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sql_datasets_engine_check
    check (engine = 'postgresql'),
  constraint sql_datasets_schema_config_check
    check (jsonb_typeof(schema_config) = 'object'),
  constraint sql_datasets_seed_data_check
    check (jsonb_typeof(seed_data) = 'array'),
  constraint sql_datasets_sample_rows_check
    check (jsonb_typeof(sample_rows) = 'array')
);

create table if not exists public.sql_practice_exercises (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.learning_activities(id) on delete cascade,
  dataset_id uuid not null references public.sql_datasets(id) on delete restrict,
  prompt text not null,
  objective text,
  theoretical_support jsonb not null default '{}'::jsonb,
  validation_config jsonb not null,
  expected_result jsonb not null,
  solution_sql text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sql_practice_exercises_activity_unique unique (activity_id),
  constraint sql_practice_exercises_id_activity_unique unique (id, activity_id),
  constraint sql_practice_exercises_theoretical_support_check
    check (jsonb_typeof(theoretical_support) = 'object'),
  constraint sql_practice_exercises_validation_config_check
    check (jsonb_typeof(validation_config) = 'object'),
  constraint sql_practice_exercises_expected_result_check
    check (jsonb_typeof(expected_result) = 'object')
);

create table if not exists public.sql_query_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references public.learning_activities(id) on delete cascade,
  exercise_id uuid not null,
  query_text text,
  execution_status text not null,
  row_count integer,
  error_message text,
  result_preview jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint sql_query_runs_exercise_activity_fk
    foreign key (exercise_id, activity_id)
    references public.sql_practice_exercises(id, activity_id)
    on delete cascade,
  constraint sql_query_runs_id_owner_exercise_unique
    unique (id, user_id, exercise_id),
  constraint sql_query_runs_status_check
    check (execution_status in ('success', 'error')),
  constraint sql_query_runs_row_count_check
    check (row_count is null or row_count >= 0),
  constraint sql_query_runs_result_preview_check
    check (jsonb_typeof(result_preview) = 'array')
);

create table if not exists public.user_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references public.learning_activities(id) on delete cascade,
  exercise_id uuid not null,
  query_run_id uuid,
  validation_status text not null,
  validation_message text,
  validation_details jsonb not null default '{}'::jsonb,
  attempt_number integer not null,
  created_at timestamptz not null default now(),
  constraint user_practice_attempts_exercise_activity_fk
    foreign key (exercise_id, activity_id)
    references public.sql_practice_exercises(id, activity_id)
    on delete cascade,
  constraint user_practice_attempts_query_run_owner_fk
    foreign key (query_run_id, user_id, exercise_id)
    references public.sql_query_runs(id, user_id, exercise_id)
    on delete cascade,
  constraint user_practice_attempts_status_check
    check (validation_status in ('correct', 'partial', 'incorrect')),
  constraint user_practice_attempts_number_check
    check (attempt_number > 0),
  constraint user_practice_attempts_details_check
    check (jsonb_typeof(validation_details) = 'object')
);

create table if not exists public.user_practice_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references public.learning_activities(id) on delete cascade,
  exercise_id uuid not null,
  note_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_practice_notes_exercise_activity_fk
    foreign key (exercise_id, activity_id)
    references public.sql_practice_exercises(id, activity_id)
    on delete cascade,
  constraint user_practice_notes_user_exercise_unique unique (user_id, exercise_id)
);

create table if not exists public.user_activity_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id uuid not null references public.learning_activities(id) on delete cascade,
  exercise_id uuid not null,
  difficulty text,
  confidence text,
  comment text,
  source text not null default 'sql_practice',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_activity_feedback_exercise_activity_fk
    foreign key (exercise_id, activity_id)
    references public.sql_practice_exercises(id, activity_id)
    on delete cascade,
  constraint user_activity_feedback_difficulty_check
    check (difficulty is null or difficulty in ('Facil', 'Media', 'Dificil')),
  constraint user_activity_feedback_confidence_check
    check (confidence is null or confidence in ('Baixa', 'Media', 'Alta')),
  constraint user_activity_feedback_source_check
    check (source in ('sql_practice')),
  constraint user_activity_feedback_user_exercise_source_unique
    unique (user_id, exercise_id, source)
);

create index if not exists idx_learning_activities_track_order
  on public.learning_activities (track_slug, step_order);
create index if not exists idx_learning_activities_active_slug
  on public.learning_activities (is_active, slug);
create index if not exists idx_sql_practice_exercises_dataset_id
  on public.sql_practice_exercises (dataset_id);
create index if not exists idx_sql_query_runs_user_created
  on public.sql_query_runs (user_id, created_at desc);
create index if not exists idx_sql_query_runs_exercise
  on public.sql_query_runs (exercise_id, created_at desc);
create index if not exists idx_user_practice_attempts_user_exercise
  on public.user_practice_attempts (user_id, exercise_id, created_at desc);
create index if not exists idx_user_practice_notes_user
  on public.user_practice_notes (user_id);
create index if not exists idx_user_activity_feedback_user
  on public.user_activity_feedback (user_id);

drop trigger if exists trg_learning_activities_set_updated_at on public.learning_activities;
create trigger trg_learning_activities_set_updated_at
before update on public.learning_activities
for each row execute function public.set_updated_at();

drop trigger if exists trg_sql_datasets_set_updated_at on public.sql_datasets;
create trigger trg_sql_datasets_set_updated_at
before update on public.sql_datasets
for each row execute function public.set_updated_at();

drop trigger if exists trg_sql_practice_exercises_set_updated_at on public.sql_practice_exercises;
create trigger trg_sql_practice_exercises_set_updated_at
before update on public.sql_practice_exercises
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_practice_notes_set_updated_at on public.user_practice_notes;
create trigger trg_user_practice_notes_set_updated_at
before update on public.user_practice_notes
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_activity_feedback_set_updated_at on public.user_activity_feedback;
create trigger trg_user_activity_feedback_set_updated_at
before update on public.user_activity_feedback
for each row execute function public.set_updated_at();

alter table public.learning_activities enable row level security;
alter table public.sql_datasets enable row level security;
alter table public.sql_practice_exercises enable row level security;
alter table public.sql_query_runs enable row level security;
alter table public.user_practice_attempts enable row level security;
alter table public.user_practice_notes enable row level security;
alter table public.user_activity_feedback enable row level security;

drop policy if exists "learning_activities_select_active_public" on public.learning_activities;
drop policy if exists "learning_activities_admin_all" on public.learning_activities;
create policy "learning_activities_admin_all"
on public.learning_activities for all to authenticated
using ((select public.is_admin_user()))
with check ((select public.is_admin_user()));

drop policy if exists "sql_datasets_select_active_public" on public.sql_datasets;
drop policy if exists "sql_datasets_admin_all" on public.sql_datasets;
create policy "sql_datasets_admin_all"
on public.sql_datasets for all to authenticated
using ((select public.is_admin_user()))
with check ((select public.is_admin_user()));

drop policy if exists "sql_practice_exercises_select_active_public" on public.sql_practice_exercises;
drop policy if exists "sql_practice_exercises_admin_all" on public.sql_practice_exercises;
create policy "sql_practice_exercises_admin_all"
on public.sql_practice_exercises for all to authenticated
using ((select public.is_admin_user()))
with check ((select public.is_admin_user()));

drop policy if exists "sql_query_runs_select_own" on public.sql_query_runs;
create policy "sql_query_runs_select_own"
on public.sql_query_runs for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "sql_query_runs_insert_own" on public.sql_query_runs;
create policy "sql_query_runs_insert_own"
on public.sql_query_runs for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists "sql_query_runs_update_own" on public.sql_query_runs;
drop policy if exists "sql_query_runs_admin_all" on public.sql_query_runs;
create policy "sql_query_runs_admin_all"
on public.sql_query_runs for all to authenticated
using ((select public.is_admin_user()))
with check ((select public.is_admin_user()));

drop policy if exists "user_practice_attempts_select_own" on public.user_practice_attempts;
create policy "user_practice_attempts_select_own"
on public.user_practice_attempts for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "user_practice_attempts_insert_own" on public.user_practice_attempts;
create policy "user_practice_attempts_insert_own"
on public.user_practice_attempts for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists "user_practice_attempts_update_own" on public.user_practice_attempts;
drop policy if exists "user_practice_attempts_admin_all" on public.user_practice_attempts;
create policy "user_practice_attempts_admin_all"
on public.user_practice_attempts for all to authenticated
using ((select public.is_admin_user()))
with check ((select public.is_admin_user()));

drop policy if exists "user_practice_notes_select_own" on public.user_practice_notes;
create policy "user_practice_notes_select_own"
on public.user_practice_notes for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "user_practice_notes_insert_own" on public.user_practice_notes;
create policy "user_practice_notes_insert_own"
on public.user_practice_notes for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists "user_practice_notes_update_own" on public.user_practice_notes;
create policy "user_practice_notes_update_own"
on public.user_practice_notes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "user_practice_notes_delete_own" on public.user_practice_notes;
create policy "user_practice_notes_delete_own"
on public.user_practice_notes for delete to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "user_practice_notes_admin_all" on public.user_practice_notes;
create policy "user_practice_notes_admin_all"
on public.user_practice_notes for all to authenticated
using ((select public.is_admin_user()))
with check ((select public.is_admin_user()));

drop policy if exists "user_activity_feedback_select_own" on public.user_activity_feedback;
create policy "user_activity_feedback_select_own"
on public.user_activity_feedback for select to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "user_activity_feedback_insert_own" on public.user_activity_feedback;
create policy "user_activity_feedback_insert_own"
on public.user_activity_feedback for insert to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists "user_activity_feedback_update_own" on public.user_activity_feedback;
create policy "user_activity_feedback_update_own"
on public.user_activity_feedback for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "user_activity_feedback_delete_own" on public.user_activity_feedback;
create policy "user_activity_feedback_delete_own"
on public.user_activity_feedback for delete to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "user_activity_feedback_admin_all" on public.user_activity_feedback;
create policy "user_activity_feedback_admin_all"
on public.user_activity_feedback for all to authenticated
using ((select public.is_admin_user()))
with check ((select public.is_admin_user()));

revoke all on table public.learning_activities from public, anon, authenticated;
revoke all on table public.sql_datasets from public, anon, authenticated;
revoke all on table public.sql_practice_exercises from public, anon, authenticated;
revoke all on table public.sql_query_runs from public, anon, authenticated;
revoke all on table public.user_practice_attempts from public, anon, authenticated;
revoke all on table public.user_practice_notes from public, anon, authenticated;
revoke all on table public.user_activity_feedback from public, anon, authenticated;

grant select, insert, update, delete on table public.learning_activities to authenticated;
grant select, insert, update, delete on table public.sql_datasets to authenticated;
grant select, insert, update, delete on table public.sql_practice_exercises to authenticated;
grant select, insert on table public.sql_query_runs to authenticated;
grant select, insert on table public.user_practice_attempts to authenticated;
grant select, insert, update, delete on table public.user_practice_notes to authenticated;
grant select, insert, update, delete on table public.user_activity_feedback to authenticated;

insert into public.learning_activities (
  slug, activity_type, title, subtitle, track_slug, track_title,
  step_order, status, level_label, estimated_minutes, is_active, metadata
)
values
  (
    'sql-introducao', 'introduction', 'Introdução ao SQL',
    'Conteúdo introdutório validado localmente', 'sql-essencial', 'SQL Essencial',
    0, 'completed', 'SQL Junior', 8, true,
    '{"topic":"Base","source":"sql_practice_foundation_v1"}'::jsonb
  ),
  (
    'sql-essencial-filtros-where', 'practice', 'Etapa 1: Filtrando pedidos pagos',
    'Etapa 1 - Filtros com WHERE', 'sql-essencial', 'SQL Essencial',
    1, 'active', 'SQL Junior', 15, true,
    '{"topic":"WHERE + GROUP BY","source":"sql_practice_foundation_v1"}'::jsonb
  ),
  (
    'sql-essencial-count-nulos-distintos', 'practice', 'COUNT, nulos e distintos',
    'Etapa 2 - COUNT e Distintos', 'sql-essencial', 'SQL Essencial',
    2, 'coming_soon', 'SQL Junior', 12, true,
    '{"topic":"Agregações","source":"sql_practice_foundation_v1"}'::jsonb
  ),
  (
    'sql-essencial-filtro-antes-agregacao', 'practice', 'Filtro antes da agregação',
    'Etapa 3 - Filtro e Agregação', 'sql-essencial', 'SQL Essencial',
    3, 'coming_soon', 'SQL Junior', 15, true,
    '{"topic":"WHERE + GROUP BY","source":"sql_practice_foundation_v1"}'::jsonb
  ),
  (
    'sql-essencial-group-by', 'practice', 'Agrupamentos com GROUP BY',
    'Etapa 4 - GROUP BY', 'sql-essencial', 'SQL Essencial',
    4, 'coming_soon', 'SQL Junior', 18, true,
    '{"topic":"GROUP BY","source":"sql_practice_foundation_v1"}'::jsonb
  ),
  (
    'sql-essencial-join', 'practice', 'Relacionando tabelas com JOIN',
    'Etapa 5 - JOIN', 'sql-essencial', 'SQL Essencial',
    5, 'coming_soon', 'SQL Junior', 20, true,
    '{"topic":"JOIN","source":"sql_practice_foundation_v1"}'::jsonb
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

insert into public.sql_datasets (
  slug, title, description, schema_config, seed_data, sample_rows, is_active
)
values (
  'pedidos-sinteticos-v1',
  'Pedidos sintéticos',
  'Dataset local da prática de filtros e agrupamento.',
  '{
    "table":"pedidos",
    "columns":[
      {"name":"pedido_id","type":"integer","constraints":"primary key"},
      {"name":"status","type":"text","constraints":"not null"},
      {"name":"categoria","type":"text","constraints":"not null"},
      {"name":"valor","type":"numeric(10,2)","constraints":"not null"}
    ]
  }'::jsonb,
  '[
    {"pedido_id":1,"status":"pago","categoria":"eletrônicos","valor":129.90},
    {"pedido_id":2,"status":"pendente","categoria":"eletrônicos","valor":89.50},
    {"pedido_id":3,"status":"pago","categoria":"livros","valor":54.00},
    {"pedido_id":4,"status":"pago","categoria":"eletrônicos","valor":219.00},
    {"pedido_id":5,"status":"cancelado","categoria":"livros","valor":45.00},
    {"pedido_id":6,"status":"pago","categoria":"casa","valor":78.30},
    {"pedido_id":7,"status":"pago","categoria":"livros","valor":36.50}
  ]'::jsonb,
  '[
    {"pedido_id":1,"status":"pago","categoria":"eletrônicos","valor":129.90},
    {"pedido_id":2,"status":"pendente","categoria":"eletrônicos","valor":89.50},
    {"pedido_id":3,"status":"pago","categoria":"livros","valor":54.00},
    {"pedido_id":4,"status":"pago","categoria":"eletrônicos","valor":219.00},
    {"pedido_id":5,"status":"cancelado","categoria":"livros","valor":45.00},
    {"pedido_id":6,"status":"pago","categoria":"casa","valor":78.30},
    {"pedido_id":7,"status":"pago","categoria":"livros","valor":36.50}
  ]'::jsonb,
  true
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  schema_config = excluded.schema_config,
  seed_data = excluded.seed_data,
  sample_rows = excluded.sample_rows,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.sql_practice_exercises (
  activity_id, dataset_id, prompt, objective, theoretical_support,
  validation_config, expected_result, solution_sql, is_active
)
select
  activity.id,
  dataset.id,
  'Crie uma consulta para contar pedidos pagos por categoria. O filtro de status precisa acontecer antes do agrupamento.',
  'Treine como aplicar WHERE antes de contar ou resumir uma métrica.',
  '{
    "why":"Esta prática apareceu porque o diagnóstico mostrou que o resumo pode ficar correto na forma, mas errado no recorte.",
    "content_title":"Primeiro recorte, depois resumo",
    "content":"Quando a métrica é sobre um grupo específico, aplique o WHERE antes de contar ou somar.",
    "example":"select campo, count(*)\nfrom tabela\nwhere condicao\ngroup by campo;",
    "hint":"O enunciado pede pedidos pagos por categoria. Filtre status = ''pago'' antes do GROUP BY e agrupe por categoria.",
    "placeholder":"select campo_de_grupo, agregacao\nfrom tabela\nwhere condicao\ngroup by campo_de_grupo;"
  }'::jsonb,
  '{
    "validator":"paid_orders_by_category",
    "execution":"local",
    "requires":{
      "status_filter":"pago",
      "group_by":"categoria",
      "aggregate":"count"
    },
    "rejects":["group_by_status","category_without_count","total_without_category"]
  }'::jsonb,
  '{
    "columns":["categoria","total_pedidos"],
    "rows":[["casa",1],["eletrônicos",2],["livros",2]]
  }'::jsonb,
  'select categoria, count(*) as total_pedidos from pedidos where status = ''pago'' group by categoria;',
  true
from public.learning_activities activity
cross join public.sql_datasets dataset
where activity.slug = 'sql-essencial-filtros-where'
  and dataset.slug = 'pedidos-sinteticos-v1'
on conflict (activity_id) do update set
  dataset_id = excluded.dataset_id,
  prompt = excluded.prompt,
  objective = excluded.objective,
  theoretical_support = excluded.theoretical_support,
  validation_config = excluded.validation_config,
  expected_result = excluded.expected_result,
  solution_sql = excluded.solution_sql,
  is_active = excluded.is_active,
  updated_at = now();

-- A view e a unica leitura publica. Ela usa os privilegios do owner porque as
-- tabelas-base nao sao legiveis por anon ou usuario comum. A lista explicita
-- de colunas impede expor solution_sql, expected_result e validation_config.
create or replace view public.vw_sql_practice_exercises_public
with (security_barrier = true)
as
select
  activity.id as activity_id,
  exercise.id as exercise_id,
  dataset.id as dataset_id,
  activity.slug,
  activity.activity_type,
  activity.title,
  activity.subtitle,
  activity.track_slug,
  activity.track_title,
  activity.step_order,
  activity.status,
  activity.level_label,
  activity.estimated_minutes,
  activity.metadata,
  exercise.prompt,
  exercise.objective,
  exercise.theoretical_support,
  dataset.slug as dataset_slug,
  dataset.title as dataset_title,
  dataset.description as dataset_description,
  dataset.engine as dataset_engine,
  dataset.schema_config,
  dataset.seed_data,
  dataset.sample_rows
from public.learning_activities activity
left join public.sql_practice_exercises exercise
  on exercise.activity_id = activity.id
  and exercise.is_active = true
left join public.sql_datasets dataset
  on dataset.id = exercise.dataset_id
  and dataset.is_active = true
where activity.is_active = true
  and activity.status <> 'draft';

revoke all on table public.vw_sql_practice_exercises_public
from public, anon, authenticated;
grant select on table public.vw_sql_practice_exercises_public
to anon, authenticated;

commit;

-- Validacoes para executar depois da aplicacao manual

-- 1. As sete tabelas devem existir.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'learning_activities',
    'sql_datasets',
    'sql_practice_exercises',
    'sql_query_runs',
    'user_practice_attempts',
    'user_practice_notes',
    'user_activity_feedback'
  )
order by table_name;

-- 2. A view publica deve existir.
select table_name
from information_schema.views
where table_schema = 'public'
  and table_name = 'vw_sql_practice_exercises_public';

-- 3. Todas as tabelas novas devem estar com RLS ativo.
select relname as table_name, relrowsecurity as rls_enabled
from pg_catalog.pg_class
where relnamespace = 'public'::regnamespace
  and relname in (
    'learning_activities',
    'sql_datasets',
    'sql_practice_exercises',
    'sql_query_runs',
    'user_practice_attempts',
    'user_practice_notes',
    'user_activity_feedback'
  )
order by relname;

-- 4. Conferir policies criadas.
select tablename, policyname, roles, cmd
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in (
    'learning_activities',
    'sql_datasets',
    'sql_practice_exercises',
    'sql_query_runs',
    'user_practice_attempts',
    'user_practice_notes',
    'user_activity_feedback'
  )
order by tablename, policyname;

-- 5. A view deve ser legivel pelos clientes, mas anon nao pode ler as
-- tabelas-base que guardam respostas e criterios internos.
select
  pg_catalog.has_table_privilege(
    'anon',
    'public.vw_sql_practice_exercises_public',
    'select'
  ) as anon_can_read_view,
  pg_catalog.has_table_privilege(
    'authenticated',
    'public.vw_sql_practice_exercises_public',
    'select'
  ) as authenticated_can_read_view,
  pg_catalog.has_table_privilege(
    'anon',
    'public.sql_practice_exercises',
    'select'
  ) as anon_can_read_exercise_table,
  pg_catalog.has_table_privilege(
    'anon',
    'public.sql_datasets',
    'select'
  ) as anon_can_read_dataset_table;

-- 6. O seed da pratica deve existir na view.
select slug, title, status, dataset_slug
from public.vw_sql_practice_exercises_public
where slug = 'sql-essencial-filtros-where';

-- 7. Deve retornar zero: a view nao pode expor campos sensiveis.
select count(*) as sensitive_columns_exposed
from information_schema.columns
where table_schema = 'public'
  and table_name = 'vw_sql_practice_exercises_public'
  and column_name in (
    'solution_sql',
    'expected_result',
    'validation_config'
  );
