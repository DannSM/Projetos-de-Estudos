-- Data Skill Map - Etapa 2 da trilha SQL Essencial
-- COUNT, nulos e distintos
--
-- Aplicacao manual no SQL Editor do Supabase, somente apos revisao.
-- Requer a estrutura criada por docs/supabase-sql-practice-foundation.sql.
-- Nao altera tabelas, RLS, policies ou a view publica.

begin;

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
  'sql-essencial-count-nulos-distintos',
  'practice',
  'COUNT, nulos e distintos',
  'Etapa 2 - COUNT e Distintos',
  'sql-essencial',
  'SQL Essencial',
  2,
  'active',
  'SQL Junior',
  12,
  true,
  '{"topic":"Agregacoes","source":"sql_practice_step2_v1"}'::jsonb
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
  slug,
  title,
  description,
  schema_config,
  seed_data,
  sample_rows,
  is_active
)
values (
  'pedidos-count-nulos-distintos-v1',
  'Pedidos com clientes e cupons',
  'Dataset sintetico para comparar COUNT(*), COUNT(coluna), nulos e valores distintos.',
  '{
    "table":"pedidos",
    "columns":[
      {"name":"pedido_id","type":"integer","constraints":"primary key"},
      {"name":"cliente_id","type":"integer","constraints":"not null"},
      {"name":"status","type":"text","constraints":"not null"},
      {"name":"cupom","type":"text","constraints":""},
      {"name":"valor","type":"numeric(10,2)","constraints":"not null"}
    ]
  }'::jsonb,
  '[
    {"pedido_id":1,"cliente_id":101,"status":"pago","cupom":"MELI10","valor":129.90},
    {"pedido_id":2,"cliente_id":102,"status":"pago","cupom":null,"valor":89.50},
    {"pedido_id":3,"cliente_id":101,"status":"pago","cupom":"FRETE","valor":54.00},
    {"pedido_id":4,"cliente_id":103,"status":"pendente","cupom":null,"valor":219.00},
    {"pedido_id":5,"cliente_id":104,"status":"pago","cupom":null,"valor":45.00},
    {"pedido_id":6,"cliente_id":105,"status":"cancelado","cupom":null,"valor":78.30},
    {"pedido_id":7,"cliente_id":102,"status":"pago","cupom":"ANIVERSARIO","valor":36.50},
    {"pedido_id":8,"cliente_id":105,"status":"pago","cupom":null,"valor":150.00}
  ]'::jsonb,
  '[
    {"pedido_id":1,"cliente_id":101,"status":"pago","cupom":"MELI10","valor":129.90},
    {"pedido_id":2,"cliente_id":102,"status":"pago","cupom":null,"valor":89.50},
    {"pedido_id":3,"cliente_id":101,"status":"pago","cupom":"FRETE","valor":54.00},
    {"pedido_id":4,"cliente_id":103,"status":"pendente","cupom":null,"valor":219.00},
    {"pedido_id":5,"cliente_id":104,"status":"pago","cupom":null,"valor":45.00},
    {"pedido_id":6,"cliente_id":105,"status":"cancelado","cupom":null,"valor":78.30},
    {"pedido_id":7,"cliente_id":102,"status":"pago","cupom":"ANIVERSARIO","valor":36.50},
    {"pedido_id":8,"cliente_id":105,"status":"pago","cupom":null,"valor":150.00}
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
  activity_id,
  dataset_id,
  prompt,
  objective,
  theoretical_support,
  validation_config,
  expected_result,
  solution_sql,
  is_active
)
select
  activity.id,
  dataset.id,
  'Crie uma consulta para resumir os pedidos, retornando o total de pedidos, quantos possuem cupom preenchido, quantos estao sem cupom e quantos clientes distintos realizaram pedidos.',
  'Compare COUNT(*), COUNT(coluna) e COUNT(DISTINCT coluna) para interpretar linhas, nulos e valores unicos.',
  '{
    "why":"Contagens diferentes respondem perguntas diferentes quando existem valores nulos ou clientes repetidos.",
    "content_title":"COUNT nao conta tudo do mesmo jeito",
    "content":"COUNT(*) conta todas as linhas. COUNT(coluna) conta apenas os registros em que a coluna esta preenchida. COUNT(DISTINCT coluna) conta valores unicos.",
    "example":"select\n  count(*) as total_linhas,\n  count(campo) as campo_preenchido,\n  count(distinct outro_campo) as valores_unicos\nfrom tabela;",
    "hint":"Compare COUNT(*) com COUNT(cupom) para identificar pedidos sem cupom e use COUNT(DISTINCT cliente_id) para contar clientes unicos.",
    "placeholder":"select\n  count(*) as total_pedidos,\n  count(cupom) as pedidos_com_cupom,\n  ... as pedidos_sem_cupom,\n  count(distinct cliente_id) as clientes_distintos\nfrom pedidos;"
  }'::jsonb,
  '{
    "validator":"count_nulls_distincts",
    "execution":"local",
    "requires":[
      "count_all_rows",
      "count_non_null_coupon",
      "count_null_coupon",
      "count_distinct_customer"
    ]
  }'::jsonb,
  '{
    "metrics":{
      "total_pedidos":8,
      "pedidos_com_cupom":3,
      "pedidos_sem_cupom":5,
      "clientes_distintos":5
    }
  }'::jsonb,
  'select
    count(*) as total_pedidos,
    count(cupom) as pedidos_com_cupom,
    count(*) - count(cupom) as pedidos_sem_cupom,
    count(distinct cliente_id) as clientes_distintos
  from pedidos;',
  true
from public.learning_activities activity
cross join public.sql_datasets dataset
where activity.slug = 'sql-essencial-count-nulos-distintos'
  and dataset.slug = 'pedidos-count-nulos-distintos-v1'
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

commit;

-- Validacoes para executar depois da aplicacao manual.

-- 1. A Etapa 2 deve aparecer ativa na view publica com dataset e exercicio.
select
  slug,
  title,
  subtitle,
  status,
  estimated_minutes,
  dataset_slug,
  exercise_id
from public.vw_sql_practice_exercises_public
where slug = 'sql-essencial-count-nulos-distintos';

-- 2. O dataset deve conter oito registros e o schema esperado.
select
  slug,
  jsonb_array_length(seed_data) as seed_rows,
  schema_config ->> 'table' as table_name,
  jsonb_array_length(schema_config -> 'columns') as column_count
from public.sql_datasets
where slug = 'pedidos-count-nulos-distintos-v1';

-- 3. A configuracao privada deve conter o validator e as quatro metricas.
select
  activity.slug,
  exercise.validation_config ->> 'validator' as validator,
  exercise.expected_result -> 'metrics' as expected_metrics
from public.sql_practice_exercises exercise
join public.learning_activities activity
  on activity.id = exercise.activity_id
where activity.slug = 'sql-essencial-count-nulos-distintos';

-- 4. Deve retornar zero: a view publica nao pode expor respostas ou criterios.
select count(*) as sensitive_columns_exposed
from information_schema.columns
where table_schema = 'public'
  and table_name = 'vw_sql_practice_exercises_public'
  and column_name in (
    'solution_sql',
    'expected_result',
    'validation_config'
  );
