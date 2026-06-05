-- Data Skill Map - plano documental de schema para missoes pos-diagnostico
--
-- IMPORTANTE:
-- - Este arquivo e um PLANO DOCUMENTAL revisavel.
-- - Este SQL NAO foi aplicado no Supabase.
-- - Nao executar sem revisao tecnica, revisao pedagogica e aprovacao explicita.
-- - Nao e migration aplicada e nao deve ser tratado como alteracao de banco.
-- - Faz parte do piloto de missoes pos-diagnostico para SQL Essencial.
--
-- Objetivo do modelo:
-- - `learning_missions` vira a unidade real de estudo pos-diagnostico.
-- - `learning_paths` e `learning_path_steps` continuam como catalogo/organizacao.
-- - Progresso nao pode ser concluido apenas por clique.
-- - Conclusao deve depender de tentativa, atividade ou evidencia registrada.
-- - Tentativas devem alimentar progresso, Meu Progresso e analytics.
-- - Sempre que possivel, manter a origem diagnostica via `source_attempt_id`.
--
-- Riscos que precisam ser revisados antes de aplicar:
-- - Validacao client-side pode expor `expected_answer` e `validation_rules`.
-- - RLS e grants precisam de revisao antes de exposicao via Data API.
-- - Seeds abaixo precisam de revisao pedagogica antes de producao.
-- - Nao misturar missao com a tela antiga de trilha/passos concluiveis.
-- - Nao atualizar `user_learning_progress` sem tentativa registrada.

create extension if not exists pgcrypto;

-- Reutiliza helper ja adotado pelo projeto em outros scripts.
-- Revisar se a funcao ja existe antes de executar em ambiente real.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1) learning_missions
-- ============================================================================
-- Finalidade:
-- Unidade principal de estudo pos-diagnostico. Cada linha representa uma
-- missao curta/microdesafio conectada a uma lacuna, habilidade e recomendacao.
-- Esta tabela complementa `learning_paths` e `learning_path_steps`, mas nao
-- usa esses passos como prova de estudo.

create table if not exists public.learning_missions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  objective text,
  skill_area text not null,
  skill_code text not null,
  recommendation_key text,
  level text,
  mission_kind text not null default 'practice',
  estimated_minutes integer,
  path_id uuid references public.learning_paths(id) on delete set null,
  step_id uuid references public.learning_path_steps(id) on delete set null,
  status text not null default 'draft',
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_missions_mission_kind_check check (
    mission_kind in ('concept', 'practice', 'decision', 'project')
  ),
  constraint learning_missions_status_check check (
    status in ('draft', 'active', 'archived')
  ),
  constraint learning_missions_estimated_minutes_check check (
    estimated_minutes is null or estimated_minutes between 1 and 180
  )
);

create index if not exists idx_learning_missions_status
  on public.learning_missions (status);

create index if not exists idx_learning_missions_skill_area
  on public.learning_missions (skill_area);

create index if not exists idx_learning_missions_skill_code
  on public.learning_missions (skill_code);

create index if not exists idx_learning_missions_recommendation_key
  on public.learning_missions (recommendation_key)
  where recommendation_key is not null;

create index if not exists idx_learning_missions_path_id
  on public.learning_missions (path_id)
  where path_id is not null;

create index if not exists idx_learning_missions_active_order
  on public.learning_missions (status, display_order, slug);

drop trigger if exists trg_learning_missions_set_updated_at on public.learning_missions;
create trigger trg_learning_missions_set_updated_at
before update on public.learning_missions
for each row
execute function public.set_updated_at();

-- ============================================================================
-- 2) learning_mission_contents
-- ============================================================================
-- Finalidade:
-- Blocos curtos de conteudo dentro da missao. Servem para explicacao objetiva,
-- exemplo minimo, contexto de dados, dica ou apoio antes da pratica ativa.
-- Conteudo visto nao conclui missao sozinho.

create table if not exists public.learning_mission_contents (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.learning_missions(id) on delete cascade,
  content_key text,
  content_type text not null default 'explanation',
  title text,
  body text not null,
  example_payload jsonb not null default '{}'::jsonb,
  estimated_minutes integer,
  status text not null default 'draft',
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_mission_contents_content_type_check check (
    content_type in ('explanation', 'example', 'hint', 'dataset_context', 'reference')
  ),
  constraint learning_mission_contents_status_check check (
    status in ('draft', 'active', 'archived')
  ),
  constraint learning_mission_contents_estimated_minutes_check check (
    estimated_minutes is null or estimated_minutes between 1 and 60
  )
);

create unique index if not exists learning_mission_contents_mission_key_uidx
  on public.learning_mission_contents (mission_id, content_key)
  where content_key is not null;

create index if not exists idx_learning_mission_contents_mission_id
  on public.learning_mission_contents (mission_id);

create index if not exists idx_learning_mission_contents_status
  on public.learning_mission_contents (status);

create index if not exists idx_learning_mission_contents_order
  on public.learning_mission_contents (mission_id, status, display_order);

drop trigger if exists trg_learning_mission_contents_set_updated_at on public.learning_mission_contents;
create trigger trg_learning_mission_contents_set_updated_at
before update on public.learning_mission_contents
for each row
execute function public.set_updated_at();

-- ============================================================================
-- 3) learning_mission_activities
-- ============================================================================
-- Finalidade:
-- Atividades avaliaveis da missao. Cada atividade exige resposta, query,
-- decisao, checklist ou submissao. Ela e a base da tentativa e da evidencia.
-- CUIDADO: `expected_answer` e `validation_rules` podem expor resposta correta
-- se forem consumidos diretamente pelo frontend. Revisar validacao server-side
-- futura via RPC/Edge Function para atividades sensiveis.

create table if not exists public.learning_mission_activities (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.learning_missions(id) on delete cascade,
  activity_key text,
  activity_type text not null,
  title text,
  prompt text not null,
  dataset_context jsonb not null default '{}'::jsonb,
  options jsonb not null default '[]'::jsonb,
  expected_answer jsonb not null default '{}'::jsonb,
  validation_rules jsonb not null default '{}'::jsonb,
  feedback_correct text,
  feedback_partial text,
  feedback_incorrect text,
  max_attempts integer not null default 3,
  estimated_minutes integer,
  status text not null default 'draft',
  display_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_mission_activities_activity_type_check check (
    activity_type in ('multiple_choice', 'query_choice', 'query_fix', 'short_answer', 'checklist', 'decision_case')
  ),
  constraint learning_mission_activities_status_check check (
    status in ('draft', 'active', 'archived')
  ),
  constraint learning_mission_activities_max_attempts_check check (
    max_attempts between 1 and 10
  ),
  constraint learning_mission_activities_estimated_minutes_check check (
    estimated_minutes is null or estimated_minutes between 1 and 90
  )
);

create unique index if not exists learning_mission_activities_mission_key_uidx
  on public.learning_mission_activities (mission_id, activity_key)
  where activity_key is not null;

create index if not exists idx_learning_mission_activities_mission_id
  on public.learning_mission_activities (mission_id);

create index if not exists idx_learning_mission_activities_status
  on public.learning_mission_activities (status);

create index if not exists idx_learning_mission_activities_type
  on public.learning_mission_activities (activity_type);

create index if not exists idx_learning_mission_activities_order
  on public.learning_mission_activities (mission_id, status, display_order);

drop trigger if exists trg_learning_mission_activities_set_updated_at on public.learning_mission_activities;
create trigger trg_learning_mission_activities_set_updated_at
before update on public.learning_mission_activities
for each row
execute function public.set_updated_at();

-- ============================================================================
-- 4) learning_activity_attempts
-- ============================================================================
-- Finalidade:
-- Registro imutavel ou quase imutavel da evidencia de estudo. Cada tentativa
-- salva resposta do usuario, resultado, feedback entregue, origem diagnostica
-- e timestamp. A missao so pode ser concluida a partir dessas evidencias.

create table if not exists public.learning_activity_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  anonymous_user_id text,
  mission_id uuid not null references public.learning_missions(id) on delete cascade,
  activity_id uuid not null references public.learning_mission_activities(id) on delete cascade,
  attempt_number integer not null default 1,
  answer_payload jsonb not null default '{}'::jsonb,
  result_status text not null default 'submitted',
  is_correct boolean,
  score_percent numeric(5,2),
  feedback text,
  source_attempt_id text,
  answered_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint learning_activity_attempts_actor_check check (
    user_id is not null or anonymous_user_id is not null
  ),
  constraint learning_activity_attempts_attempt_number_check check (
    attempt_number >= 1
  ),
  constraint learning_activity_attempts_result_status_check check (
    result_status in ('submitted', 'correct', 'partial', 'incorrect', 'skipped')
  ),
  constraint learning_activity_attempts_score_check check (
    score_percent is null or (score_percent >= 0 and score_percent <= 100)
  )
);

create index if not exists idx_learning_activity_attempts_user_id
  on public.learning_activity_attempts (user_id)
  where user_id is not null;

create index if not exists idx_learning_activity_attempts_anon_id
  on public.learning_activity_attempts (anonymous_user_id)
  where anonymous_user_id is not null;

create index if not exists idx_learning_activity_attempts_mission_id
  on public.learning_activity_attempts (mission_id);

create index if not exists idx_learning_activity_attempts_activity_id
  on public.learning_activity_attempts (activity_id);

create index if not exists idx_learning_activity_attempts_source_attempt
  on public.learning_activity_attempts (source_attempt_id)
  where source_attempt_id is not null;

create index if not exists idx_learning_activity_attempts_user_recent
  on public.learning_activity_attempts (user_id, answered_at desc)
  where user_id is not null;

create index if not exists idx_learning_activity_attempts_result_status
  on public.learning_activity_attempts (result_status);

-- Intencao de modelagem:
-- Evitar UPDATE/DELETE publico nesta tabela. Se for necessario corrigir algo,
-- preferir nova tentativa ou acao administrativa auditada.

-- ============================================================================
-- 5) learning_progress_events
-- ============================================================================
-- Finalidade:
-- Linha do tempo de eventos de aprendizagem para progresso, analytics e D7.
-- Eventos nao substituem tentativas, mas ajudam a medir inicio, feedback visto,
-- conclusao da missao, abertura de proxima missao e retorno.

create table if not exists public.learning_progress_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  anonymous_user_id text,
  event_type text not null,
  mission_id uuid references public.learning_missions(id) on delete set null,
  activity_id uuid references public.learning_mission_activities(id) on delete set null,
  attempt_id uuid references public.learning_activity_attempts(id) on delete set null,
  source_attempt_id text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint learning_progress_events_actor_check check (
    user_id is not null or anonymous_user_id is not null
  ),
  constraint learning_progress_events_type_check check (
    event_type in (
      'mission_recommended',
      'mission_started',
      'content_viewed',
      'activity_started',
      'activity_submitted',
      'feedback_viewed',
      'mission_completed',
      'next_mission_opened',
      'progress_viewed',
      'returned_d7'
    )
  )
);

create index if not exists idx_learning_progress_events_user_id
  on public.learning_progress_events (user_id)
  where user_id is not null;

create index if not exists idx_learning_progress_events_anon_id
  on public.learning_progress_events (anonymous_user_id)
  where anonymous_user_id is not null;

create index if not exists idx_learning_progress_events_mission_id
  on public.learning_progress_events (mission_id)
  where mission_id is not null;

create index if not exists idx_learning_progress_events_activity_id
  on public.learning_progress_events (activity_id)
  where activity_id is not null;

create index if not exists idx_learning_progress_events_attempt_id
  on public.learning_progress_events (attempt_id)
  where attempt_id is not null;

create index if not exists idx_learning_progress_events_source_attempt
  on public.learning_progress_events (source_attempt_id)
  where source_attempt_id is not null;

create index if not exists idx_learning_progress_events_type_time
  on public.learning_progress_events (event_type, occurred_at desc);

create index if not exists idx_learning_progress_events_user_recent
  on public.learning_progress_events (user_id, occurred_at desc)
  where user_id is not null;

-- ============================================================================
-- RLS proposta - NAO APLICAR SEM REVISAO
-- ============================================================================
-- A documentacao atual do Supabase reforca:
-- - RLS deve estar habilitado em tabelas do schema public quando expostas.
-- - `auth.uid()` retorna null para usuarios nao autenticados.
-- - Policies devem usar `to anon` / `to authenticated` conforme o modelo.
-- - Indexar colunas usadas em policies, como `user_id`, ajuda performance.
--
-- Sugestao de RLS/policies para revisao futura:
--
-- alter table public.learning_missions enable row level security;
-- alter table public.learning_mission_contents enable row level security;
-- alter table public.learning_mission_activities enable row level security;
-- alter table public.learning_activity_attempts enable row level security;
-- alter table public.learning_progress_events enable row level security;
--
-- -- Catalogo publico ativo: missoes, conteudos e atividades.
-- create policy "learning_missions_select_active_public"
-- on public.learning_missions
-- for select
-- to anon, authenticated
-- using (status = 'active');
--
-- create policy "learning_mission_contents_select_active_public"
-- on public.learning_mission_contents
-- for select
-- to anon, authenticated
-- using (
--   status = 'active'
--   and exists (
--     select 1
--     from public.learning_missions lm
--     where lm.id = learning_mission_contents.mission_id
--       and lm.status = 'active'
--   )
-- );
--
-- create policy "learning_mission_activities_select_active_public"
-- on public.learning_mission_activities
-- for select
-- to anon, authenticated
-- using (
--   status = 'active'
--   and exists (
--     select 1
--     from public.learning_missions lm
--     where lm.id = learning_mission_activities.mission_id
--       and lm.status = 'active'
--   )
-- );
--
-- -- Escrita de catalogo: apenas admin.
-- -- Revisar nome real da funcao admin do projeto antes de aplicar.
-- create policy "learning_missions_admin_write"
-- on public.learning_missions
-- for all
-- to authenticated
-- using (public.is_admin_user())
-- with check (public.is_admin_user());
--
-- create policy "learning_mission_contents_admin_write"
-- on public.learning_mission_contents
-- for all
-- to authenticated
-- using (public.is_admin_user())
-- with check (public.is_admin_user());
--
-- create policy "learning_mission_activities_admin_write"
-- on public.learning_mission_activities
-- for all
-- to authenticated
-- using (public.is_admin_user())
-- with check (public.is_admin_user());
--
-- -- Tentativas: usuario autenticado so ve/insere as proprias.
-- create policy "learning_activity_attempts_select_own_or_admin"
-- on public.learning_activity_attempts
-- for select
-- to authenticated
-- using (
--   ((select auth.uid()) is not null and user_id = (select auth.uid()))
--   or public.is_admin_user()
-- );
--
-- create policy "learning_activity_attempts_insert_own"
-- on public.learning_activity_attempts
-- for insert
-- to authenticated
-- with check (
--   (select auth.uid()) is not null
--   and user_id = (select auth.uid())
-- );
--
-- -- Opcional: tentativa anonima limitada, se o MVP permitir pratica sem login.
-- -- create policy "learning_activity_attempts_insert_anon"
-- -- on public.learning_activity_attempts
-- -- for insert
-- -- to anon
-- -- with check (
-- --   user_id is null
-- --   and anonymous_user_id is not null
-- -- );
--
-- -- Eventos: usuario autenticado so ve/insere os proprios; admin ve tudo.
-- create policy "learning_progress_events_select_own_or_admin"
-- on public.learning_progress_events
-- for select
-- to authenticated
-- using (
--   ((select auth.uid()) is not null and user_id = (select auth.uid()))
--   or public.is_admin_user()
-- );
--
-- create policy "learning_progress_events_insert_own"
-- on public.learning_progress_events
-- for insert
-- to authenticated
-- with check (
--   (select auth.uid()) is not null
--   and user_id = (select auth.uid())
-- );
--
-- -- Opcional: eventos anonimos limitados, se o MVP permitir pratica sem login.
-- -- create policy "learning_progress_events_insert_anon"
-- -- on public.learning_progress_events
-- -- for insert
-- -- to anon
-- -- with check (
-- --   user_id is null
-- --   and anonymous_user_id is not null
-- -- );
--
-- -- Grants devem ser minimos e revisados junto com as policies.
-- -- revoke all on table public.learning_missions from public, anon, authenticated;
-- -- revoke all on table public.learning_mission_contents from public, anon, authenticated;
-- -- revoke all on table public.learning_mission_activities from public, anon, authenticated;
-- -- revoke all on table public.learning_activity_attempts from public, anon, authenticated;
-- -- revoke all on table public.learning_progress_events from public, anon, authenticated;
-- -- grant select on table public.learning_missions to anon, authenticated;
-- -- grant select on table public.learning_mission_contents to anon, authenticated;
-- -- grant select on table public.learning_mission_activities to anon, authenticated;
-- -- grant select, insert on table public.learning_activity_attempts to authenticated;
-- -- grant select, insert on table public.learning_progress_events to authenticated;
-- -- grant insert on table public.learning_activity_attempts to anon;
-- -- grant insert on table public.learning_progress_events to anon;

-- ============================================================================
-- Seeds documentais - piloto SQL Essencial - NAO APLICAR SEM REVISAO
-- ============================================================================
-- Escopo piloto:
-- 1. Filtros com WHERE.
-- 2. Contagens com COUNT, nulos e distintos.
-- 3. Filtro antes da agregacao.
--
-- Cada lacuna possui 1 missao, conteudo curto e 2 atividades. As respostas e
-- regras abaixo sao demonstrativas e precisam de revisao pedagogica.

with mission_seed as (
  select *
  from (
    values
      (
        'sql-essencial-filtros-where',
        'Missao recomendada: filtre exatamente o recorte pedido',
        'Pratique a escolha do WHERE correto para responder uma pergunta de negocio sem trazer registros indevidos.',
        'Identificar e aplicar filtros simples com WHERE.',
        'SQL',
        'sql.filtering.where_logic',
        'diag_rec_sql_filtering_where_logic_basic_review_v1',
        'Basico',
        'practice',
        10,
        10,
        jsonb_build_object(
          'pilot', 'sql_essencial',
          'gap_type', 'practice',
          'completion_rule', 'requires_activity_attempt',
          'source', 'learning_missions_schema_plan'
        )
      ),
      (
        'sql-essencial-count-nulos-distintos',
        'Missao recomendada: conte sem se enganar com nulos',
        'Compare COUNT(*), COUNT(coluna) e contagem distinta para evitar conclusoes erradas.',
        'Escolher a contagem adequada para a pergunta e interpretar diferencas.',
        'SQL',
        'sql.aggregation.counting',
        'diag_rec_sql_aggregation_counting_basic_review_v1',
        'Basico',
        'decision',
        12,
        20,
        jsonb_build_object(
          'pilot', 'sql_essencial',
          'gap_type', 'decision',
          'completion_rule', 'requires_activity_attempt',
          'source', 'learning_missions_schema_plan'
        )
      ),
      (
        'sql-essencial-filtro-antes-agregacao',
        'Missao recomendada: filtre antes de resumir',
        'Combine WHERE e agregacao simples para gerar uma metrica fiel ao recorte solicitado.',
        'Aplicar filtro antes do agrupamento ou resumo.',
        'SQL',
        'sql.filtering.where_logic',
        'diag_rec_sql_filtering_where_logic_basic_review_v1',
        'Basico',
        'practice',
        15,
        30,
        jsonb_build_object(
          'pilot', 'sql_essencial',
          'gap_type', 'practice',
          'related_skill_codes', jsonb_build_array('sql.aggregation.counting'),
          'completion_rule', 'requires_activity_attempt',
          'source', 'learning_missions_schema_plan'
        )
      )
  ) as missions (
    slug,
    title,
    description,
    objective,
    skill_area,
    skill_code,
    recommendation_key,
    level,
    mission_kind,
    estimated_minutes,
    display_order,
    metadata
  )
),
upsert_missions as (
  insert into public.learning_missions (
    slug,
    title,
    description,
    objective,
    skill_area,
    skill_code,
    recommendation_key,
    level,
    mission_kind,
    estimated_minutes,
    status,
    display_order,
    metadata
  )
  select
    slug,
    title,
    description,
    objective,
    skill_area,
    skill_code,
    recommendation_key,
    level,
    mission_kind,
    estimated_minutes,
    'draft',
    display_order,
    metadata
  from mission_seed
  on conflict (slug) do update
    set title = excluded.title,
        description = excluded.description,
        objective = excluded.objective,
        skill_area = excluded.skill_area,
        skill_code = excluded.skill_code,
        recommendation_key = excluded.recommendation_key,
        level = excluded.level,
        mission_kind = excluded.mission_kind,
        estimated_minutes = excluded.estimated_minutes,
        status = excluded.status,
        display_order = excluded.display_order,
        metadata = excluded.metadata,
        updated_at = now()
  returning id, slug
),
content_seed as (
  select *
  from (
    values
      (
        'sql-essencial-filtros-where',
        'where-explicacao-curta',
        'explanation',
        'O que o WHERE precisa fazer',
        'O WHERE deve traduzir exatamente o recorte da pergunta. Se a pergunta pede pedidos pagos no mes, o filtro precisa limitar status e periodo, sem incluir cancelados ou meses fora do contexto.',
        jsonb_build_object(
          'example_query', 'select * from pedidos where status = ''pago'' and data_pedido >= ''2026-01-01'' and data_pedido < ''2026-02-01'';'
        ),
        2,
        10
      ),
      (
        'sql-essencial-count-nulos-distintos',
        'count-explicacao-curta',
        'explanation',
        'COUNT(*) nao e sempre igual a COUNT(coluna)',
        'COUNT(*) conta linhas. COUNT(coluna) conta apenas linhas em que a coluna nao esta nula. COUNT(distinct coluna) conta valores distintos nao nulos.',
        jsonb_build_object(
          'example_query', 'select count(*) as linhas, count(email) as emails_preenchidos, count(distinct cliente_id) as clientes from clientes;'
        ),
        3,
        10
      ),
      (
        'sql-essencial-filtro-antes-agregacao',
        'filtro-agregacao-explicacao-curta',
        'explanation',
        'Primeiro recorte, depois resumo',
        'Quando a metrica e sobre um grupo especifico, aplique o WHERE antes de contar ou somar. Assim o resumo responde ao recorte certo.',
        jsonb_build_object(
          'example_query', 'select categoria, count(*) from pedidos where status = ''pago'' group by categoria;'
        ),
        3,
        10
      )
  ) as contents (
    mission_slug,
    content_key,
    content_type,
    title,
    body,
    example_payload,
    estimated_minutes,
    display_order
  )
)
insert into public.learning_mission_contents (
  mission_id,
  content_key,
  content_type,
  title,
  body,
  example_payload,
  estimated_minutes,
  status,
  display_order,
  metadata
)
select
  m.id,
  c.content_key,
  c.content_type,
  c.title,
  c.body,
  c.example_payload,
  c.estimated_minutes,
  'draft',
  c.display_order,
  jsonb_build_object('source', 'learning_missions_schema_plan')
from content_seed c
join upsert_missions m
  on m.slug = c.mission_slug
on conflict (mission_id, content_key)
where content_key is not null
do update
  set content_type = excluded.content_type,
      title = excluded.title,
      body = excluded.body,
      example_payload = excluded.example_payload,
      estimated_minutes = excluded.estimated_minutes,
      status = excluded.status,
      display_order = excluded.display_order,
      metadata = excluded.metadata,
      updated_at = now();

with mission_lookup as (
  select id, slug
  from public.learning_missions
  where slug in (
    'sql-essencial-filtros-where',
    'sql-essencial-count-nulos-distintos',
    'sql-essencial-filtro-antes-agregacao'
  )
),
activity_seed as (
  select *
  from (
    values
      (
        'sql-essencial-filtros-where',
        'where-escolha-filtro-correto',
        'multiple_choice',
        'Escolha o filtro correto',
        'A area comercial pediu pedidos pagos em janeiro de 2026. Qual WHERE responde exatamente ao recorte?',
        jsonb_build_object(
          'table', 'pedidos',
          'columns', jsonb_build_array('pedido_id', 'status', 'data_pedido', 'valor')
        ),
        jsonb_build_array(
          'where status = ''pago''',
          'where status = ''pago'' and data_pedido >= ''2026-01-01'' and data_pedido < ''2026-02-01''',
          'where data_pedido >= ''2026-01-01'''
        ),
        jsonb_build_object('correct_option_index', 1),
        jsonb_build_object('rule', 'selected_option_equals', 'value', 1),
        'Correto. O filtro limita status e periodo, entao responde ao recorte sem trazer registros indevidos.',
        'Quase. Voce considerou parte do recorte, mas faltou limitar status ou periodo.',
        'Esse filtro deixa passar registros fora do pedido. Releia a pergunta e confira status e datas.',
        5,
        1,
        10
      ),
      (
        'sql-essencial-filtros-where',
        'where-corrigir-query-ampla',
        'query_fix',
        'Corrija a query ampla demais',
        'A query abaixo inclui pedidos cancelados. Ajuste o WHERE para retornar apenas pedidos pagos de janeiro de 2026.',
        jsonb_build_object(
          'base_query', 'select pedido_id, valor from pedidos where data_pedido >= ''2026-01-01'' and data_pedido < ''2026-02-01'';',
          'table', 'pedidos'
        ),
        '[]'::jsonb,
        jsonb_build_object(
          'must_include', jsonb_build_array('status = ''pago''', 'data_pedido >= ''2026-01-01''', 'data_pedido < ''2026-02-01''')
        ),
        jsonb_build_object(
          'required_fragments', jsonb_build_array('status', 'pago', '2026-01-01', '2026-02-01')
        ),
        'Correto. A query agora filtra status e periodo antes de retornar os pedidos.',
        'Parcial. A query melhorou, mas ainda falta uma das condicoes principais.',
        'Ainda ha registros indevidos. A pergunta exige status pago e o intervalo completo de janeiro.',
        5,
        2,
        20
      ),
      (
        'sql-essencial-count-nulos-distintos',
        'count-escolher-funcao',
        'multiple_choice',
        'Escolha a contagem adequada',
        'Voce quer saber quantas linhas existem na tabela pedidos, mesmo quando cliente_id estiver nulo. Qual expressao usar?',
        jsonb_build_object('table', 'pedidos', 'columns', jsonb_build_array('pedido_id', 'cliente_id', 'valor')),
        jsonb_build_array(
          'count(cliente_id)',
          'count(*)',
          'count(distinct cliente_id)'
        ),
        jsonb_build_object('correct_option_index', 1),
        jsonb_build_object('rule', 'selected_option_equals', 'value', 1),
        'Correto. COUNT(*) conta todas as linhas, inclusive quando alguma coluna esta nula.',
        'Parcial. A expressao escolhida conta algo util, mas nao todas as linhas.',
        'Nao e essa. Para contar linhas independentemente de nulos, use COUNT(*).',
        4,
        1,
        10
      ),
      (
        'sql-essencial-count-nulos-distintos',
        'count-interpretar-diferenca',
        'decision_case',
        'Interprete a diferenca entre totais',
        'Uma consulta retornou count(*) = 1000 e count(email) = 850. Qual conclusao e sustentada?',
        jsonb_build_object('context', 'cadastro de clientes com campo email opcional'),
        jsonb_build_array(
          'Existem 150 linhas sem email preenchido.',
          'Existem 150 emails duplicados.',
          'A tabela tem apenas 850 clientes.'
        ),
        jsonb_build_object('correct_option_index', 0),
        jsonb_build_object('rule', 'selected_option_equals', 'value', 0),
        'Correto. A diferenca indica linhas em que email esta nulo.',
        'Parcial. Voce percebeu que ha uma diferenca, mas ela nao prova duplicidade.',
        'Essa conclusao nao e sustentada. COUNT(email) ignora nulos, nao linhas inteiras.',
        5,
        2,
        20
      ),
      (
        'sql-essencial-filtro-antes-agregacao',
        'filtro-agregacao-montar-query',
        'query_fix',
        'Monte o resumo com filtro',
        'Crie uma consulta para contar pedidos pagos por categoria. O filtro de status precisa acontecer antes do agrupamento.',
        jsonb_build_object(
          'table', 'pedidos',
          'columns', jsonb_build_array('pedido_id', 'status', 'categoria', 'valor')
        ),
        '[]'::jsonb,
        jsonb_build_object(
          'expected_fragments', jsonb_build_array('select', 'categoria', 'count', 'from pedidos', 'where', 'status', 'pago', 'group by categoria')
        ),
        jsonb_build_object(
          'required_fragments', jsonb_build_array('where', 'status', 'pago', 'group by', 'categoria', 'count')
        ),
        'Correto. O WHERE limita pedidos pagos antes do agrupamento por categoria.',
        'Parcial. A consulta tem parte da estrutura, mas ainda falta filtro, contagem ou agrupamento.',
        'A consulta ainda nao garante a metrica pedida. Primeiro filtre pagos, depois agrupe por categoria.',
        7,
        1,
        10
      ),
      (
        'sql-essencial-filtro-antes-agregacao',
        'filtro-agregacao-escolher-conclusao',
        'decision_case',
        'Escolha a conclusao sustentada',
        'A consulta conta pedidos pagos por categoria. Qual conclusao pode ser feita com seguranca?',
        jsonb_build_object(
          'query', 'select categoria, count(*) as pedidos_pagos from pedidos where status = ''pago'' group by categoria;'
        ),
        jsonb_build_array(
          'A categoria com maior contagem teve mais pedidos pagos no recorte consultado.',
          'A categoria com maior contagem teve maior receita total.',
          'Todas as categorias tiveram a mesma taxa de pagamento.'
        ),
        jsonb_build_object('correct_option_index', 0),
        jsonb_build_object('rule', 'selected_option_equals', 'value', 0),
        'Correto. A consulta sustenta comparacao de quantidade de pedidos pagos por categoria.',
        'Parcial. Receita e taxa exigiriam outras colunas ou outros calculos.',
        'Essa conclusao extrapola a consulta. Ela conta pedidos pagos, nao receita nem taxa.',
        5,
        2,
        20
      )
  ) as activities (
    mission_slug,
    activity_key,
    activity_type,
    title,
    prompt,
    dataset_context,
    options,
    expected_answer,
    validation_rules,
    feedback_correct,
    feedback_partial,
    feedback_incorrect,
    estimated_minutes,
    max_attempts,
    display_order
  )
)
insert into public.learning_mission_activities (
  mission_id,
  activity_key,
  activity_type,
  title,
  prompt,
  dataset_context,
  options,
  expected_answer,
  validation_rules,
  feedback_correct,
  feedback_partial,
  feedback_incorrect,
  estimated_minutes,
  max_attempts,
  status,
  display_order,
  metadata
)
select
  m.id,
  a.activity_key,
  a.activity_type,
  a.title,
  a.prompt,
  a.dataset_context,
  a.options,
  a.expected_answer,
  a.validation_rules,
  a.feedback_correct,
  a.feedback_partial,
  a.feedback_incorrect,
  a.estimated_minutes,
  a.max_attempts,
  'draft',
  a.display_order,
  jsonb_build_object(
    'source', 'learning_missions_schema_plan',
    'pilot', 'sql_essencial',
    'requires_attempt_for_completion', true
  )
from activity_seed a
join mission_lookup m
  on m.slug = a.mission_slug
on conflict (mission_id, activity_key)
where activity_key is not null
do update
  set activity_type = excluded.activity_type,
      title = excluded.title,
      prompt = excluded.prompt,
      dataset_context = excluded.dataset_context,
      options = excluded.options,
      expected_answer = excluded.expected_answer,
      validation_rules = excluded.validation_rules,
      feedback_correct = excluded.feedback_correct,
      feedback_partial = excluded.feedback_partial,
      feedback_incorrect = excluded.feedback_incorrect,
      estimated_minutes = excluded.estimated_minutes,
      max_attempts = excluded.max_attempts,
      status = excluded.status,
      display_order = excluded.display_order,
      metadata = excluded.metadata,
      updated_at = now();

-- ============================================================================
-- Observacoes finais antes de qualquer execucao real
-- ============================================================================
-- 1. Revisar se `public.is_admin_user()` e o helper correto no ambiente atual.
-- 2. Revisar grants conforme Data API e roles `anon`/`authenticated`.
-- 3. Revisar se tentativas anonimas serao permitidas no MVP.
-- 4. Revisar se `expected_answer` pode ir ao client neste piloto.
-- 5. Se houver validacao server-side, mover regras sensiveis para RPC/Edge.
-- 6. Antes de atualizar `user_learning_progress`, exigir tentativa registrada.
-- 7. Antes de atualizar `learning_recommendations.status`, exigir evidencia.
-- 8. Seeds devem permanecer `draft` ate revisao pedagogica final.
