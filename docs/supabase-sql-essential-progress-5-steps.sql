-- Data Skill Map - progresso oficial da trilha SQL Essencial com 5 etapas
--
-- Aplicacao manual no SQL Editor do Supabase, somente apos revisao e aprovacao.
-- Nao altera schema, RLS, policies, Auth, usuarios, tentativas ou progresso real.
-- O script complementa o catalogo learning_path_steps de forma idempotente.

begin;

with target_path as (
  select id
  from public.learning_paths
  where slug = 'sql-essencial'
),
missing_steps (
  step_key,
  title,
  description,
  skill_area,
  content_type,
  display_order,
  estimated_minutes,
  metadata
) as (
  values
    (
      'sql-essencial-04-group-by',
      'Agrupamentos com GROUP BY',
      'Pratique resumos por categoria usando GROUP BY.',
      'SQL',
      'practice',
      4,
      18,
      '{
        "source":"sql_essential_5_steps_progress_v1",
        "concept":"GROUP BY",
        "practice_slug":"sql-essencial-group-by",
        "skill_code":"sql.aggregation.group_by",
        "activity_slug":"sql-essencial-group-by"
      }'::jsonb
    ),
    (
      'sql-essencial-05-join',
      'Relacionando tabelas com JOIN',
      'Pratique relacionamento entre pedidos e clientes usando JOIN.',
      'SQL',
      'practice',
      5,
      20,
      '{
        "source":"sql_essential_5_steps_progress_v1",
        "concept":"JOIN",
        "practice_slug":"sql-essencial-join",
        "skill_code":"sql.join.basic_relationship",
        "activity_slug":"sql-essencial-join"
      }'::jsonb
    )
)
insert into public.learning_path_steps (
  path_id,
  step_key,
  title,
  description,
  skill_area,
  content_type,
  display_order,
  estimated_minutes,
  status,
  metadata
)
select
  target_path.id,
  missing_steps.step_key,
  missing_steps.title,
  missing_steps.description,
  missing_steps.skill_area,
  missing_steps.content_type,
  missing_steps.display_order,
  missing_steps.estimated_minutes,
  'active',
  missing_steps.metadata
from target_path
cross join missing_steps
on conflict (path_id, step_key)
where step_key is not null
do update set
  title = excluded.title,
  description = excluded.description,
  skill_area = excluded.skill_area,
  content_type = excluded.content_type,
  display_order = excluded.display_order,
  estimated_minutes = excluded.estimated_minutes,
  status = excluded.status,
  metadata = coalesce(public.learning_path_steps.metadata, '{}'::jsonb) || excluded.metadata,
  updated_at = now();

with practice_mapping (step_key, practice_slug) as (
  values
    ('sql-essencial-01-where', 'sql-essencial-filtros-where'),
    ('sql-essencial-02-contagens', 'sql-essencial-count-nulos-distintos'),
    ('sql-essencial-03-filtro-mais-agregacao', 'sql-essencial-filtro-antes-agregacao')
)
update public.learning_path_steps step
set
  metadata = coalesce(step.metadata, '{}'::jsonb) || jsonb_build_object(
    'practice_slug', practice_mapping.practice_slug,
    'activity_slug', practice_mapping.practice_slug
  ),
  updated_at = now()
from public.learning_paths path,
practice_mapping
where step.path_id = path.id
  and path.slug = 'sql-essencial'
  and step.step_key = practice_mapping.step_key;

commit;

-- Validacao somente leitura para executar depois da aplicacao manual.
select
  path.slug as path_slug,
  step.step_key,
  step.title,
  step.content_type,
  step.content_url,
  step.display_order,
  step.status,
  step.estimated_minutes,
  step.metadata
from public.learning_paths path
join public.learning_path_steps step
  on step.path_id = path.id
where path.slug = 'sql-essencial'
order by step.display_order;
