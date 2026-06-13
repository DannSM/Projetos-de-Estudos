-- Data Skill Map - alimentacao oficial das Etapas 3 a 5 da trilha SQL Essencial
--
-- Aplicacao manual no SQL Editor do Supabase, somente apos revisao e aprovacao.
-- Requer a estrutura criada por docs/supabase-sql-practice-foundation.sql.
-- Nao altera schema, RLS, policies, Auth, usuarios, progresso ou tentativas.
-- O script e idempotente e afeta somente as activities das Etapas 3 a 5,
-- seus exercicios e o dataset oficial necessario para JOIN.

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
values
  (
    'sql-essencial-filtro-antes-agregacao',
    'practice',
    'Filtro antes da agregação',
    'Etapa 3 - Filtro e Agregação',
    'sql-essencial',
    'SQL Essencial',
    3,
    'active',
    'SQL Junior',
    15,
    true,
    '{"topic":"WHERE + Agregações","source":"sql_practice_steps3_5_v1"}'::jsonb
  ),
  (
    'sql-essencial-group-by',
    'practice',
    'Agrupamentos com GROUP BY',
    'Etapa 4 - GROUP BY',
    'sql-essencial',
    'SQL Essencial',
    4,
    'active',
    'SQL Junior',
    18,
    true,
    '{"topic":"GROUP BY","source":"sql_practice_steps3_5_v1"}'::jsonb
  ),
  (
    'sql-essencial-join',
    'practice',
    'Relacionando tabelas com JOIN',
    'Etapa 5 - JOIN',
    'sql-essencial',
    'SQL Essencial',
    5,
    'active',
    'SQL Junior',
    20,
    true,
    '{"topic":"JOIN","source":"sql_practice_steps3_5_v1"}'::jsonb
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
  engine,
  schema_config,
  seed_data,
  sample_rows,
  is_active
)
values (
  'pedidos-clientes-join-v1',
  'Pedidos e clientes para JOIN',
  'Dataset sintético oficial para praticar relacionamento entre pedidos e clientes.',
  'postgresql',
  '{
    "tables":[
      {
        "table":"clientes",
        "columns":[
          {"name":"cliente_id","type":"integer","constraints":"primary key"},
          {"name":"nome","type":"text","constraints":"not null"},
          {"name":"cidade","type":"text","constraints":"not null"}
        ]
      },
      {
        "table":"pedidos",
        "columns":[
          {"name":"pedido_id","type":"integer","constraints":"primary key"},
          {"name":"cliente_id","type":"integer","constraints":"not null references clientes(cliente_id)"},
          {"name":"status","type":"text","constraints":"not null"},
          {"name":"valor","type":"numeric(10,2)","constraints":"not null"}
        ]
      }
    ]
  }'::jsonb,
  '[
    {
      "table":"clientes",
      "rows":[
        {"cliente_id":1,"nome":"Ana","cidade":"São Paulo"},
        {"cliente_id":2,"nome":"Bruno","cidade":"Belo Horizonte"},
        {"cliente_id":3,"nome":"Carla","cidade":"Recife"},
        {"cliente_id":4,"nome":"Diego","cidade":"Curitiba"}
      ]
    },
    {
      "table":"pedidos",
      "rows":[
        {"pedido_id":101,"cliente_id":1,"status":"pago","valor":120.00},
        {"pedido_id":102,"cliente_id":1,"status":"pendente","valor":80.00},
        {"pedido_id":103,"cliente_id":2,"status":"pago","valor":250.00},
        {"pedido_id":104,"cliente_id":3,"status":"pago","valor":90.00},
        {"pedido_id":105,"cliente_id":4,"status":"cancelado","valor":60.00},
        {"pedido_id":106,"cliente_id":2,"status":"pago","valor":150.00}
      ]
    }
  ]'::jsonb,
  '[
    {
      "table":"clientes",
      "rows":[
        {"cliente_id":1,"nome":"Ana","cidade":"São Paulo"},
        {"cliente_id":2,"nome":"Bruno","cidade":"Belo Horizonte"},
        {"cliente_id":3,"nome":"Carla","cidade":"Recife"},
        {"cliente_id":4,"nome":"Diego","cidade":"Curitiba"}
      ]
    },
    {
      "table":"pedidos",
      "rows":[
        {"pedido_id":101,"cliente_id":1,"status":"pago","valor":120.00},
        {"pedido_id":102,"cliente_id":1,"status":"pendente","valor":80.00},
        {"pedido_id":103,"cliente_id":2,"status":"pago","valor":250.00},
        {"pedido_id":104,"cliente_id":3,"status":"pago","valor":90.00},
        {"pedido_id":105,"cliente_id":4,"status":"cancelado","valor":60.00},
        {"pedido_id":106,"cliente_id":2,"status":"pago","valor":150.00}
      ]
    }
  ]'::jsonb,
  true
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  engine = excluded.engine,
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
  'Crie uma consulta para resumir apenas os pedidos pagos, retornando o total de pedidos pagos e o valor total vendido.',
  'Treine como aplicar WHERE antes de calcular métricas agregadas com COUNT() e SUM().',
  '{
    "content_title":"WHERE filtra antes do resumo",
    "content":"Quando usamos funções como COUNT() e SUM(), o banco calcula o resumo com base nas linhas disponíveis. A cláusula WHERE entra antes desse cálculo e define quais registros participam da agregação. Assim, primeiro filtramos os pedidos desejados e depois resumimos o resultado.",
    "example":"select\n  count(*) as total_pedidos_pagos,\n  sum(valor) as valor_total_vendido\nfrom pedidos\nwhere status = ''pago'';",
    "placeholder":"select\n  count(*) as total_pedidos_pagos,\n  sum(valor) as valor_total_vendido\nfrom pedidos\nwhere status = ''pago'';",
    "hint":"Use WHERE para manter somente os pedidos pagos antes de aplicar COUNT(*) e SUM(valor). O filtro vem antes do resumo.",
    "why":"Esta prática reforça que o recorte dos dados precisa acontecer antes do cálculo das métricas."
  }'::jsonb,
  '{
    "validator":"paid_orders_summary",
    "execution":"local",
    "requires":["table_pedidos","status_paid_filter","count_orders","sum_value"]
  }'::jsonb,
  '{
    "columns":["total_pedidos_pagos","valor_total_vendido"],
    "rows":[[5,517.70]]
  }'::jsonb,
  'select
    count(*) as total_pedidos_pagos,
    sum(valor) as valor_total_vendido
  from pedidos
  where status = ''pago'';',
  true
from public.learning_activities activity
cross join public.sql_datasets dataset
where activity.slug = 'sql-essencial-filtro-antes-agregacao'
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
  'Crie uma consulta para resumir os pedidos por categoria, retornando a categoria, a quantidade de pedidos e o valor total vendido em cada categoria.',
  'Treine como usar GROUP BY para resumir métricas por categoria.',
  '{
    "content_title":"GROUP BY cria um resumo por grupo",
    "content":"Quando usamos funções de agregação junto com uma coluna de categoria, precisamos informar ao banco como formar os grupos. O GROUP BY agrupa linhas que possuem o mesmo valor em uma coluna e calcula métricas para cada grupo.",
    "example":"select\n  categoria,\n  count(*) as total_pedidos,\n  sum(valor) as valor_total\nfrom pedidos\ngroup by categoria;",
    "placeholder":"select\n  categoria,\n  count(*) as total_pedidos,\n  sum(valor) as valor_total\nfrom pedidos\ngroup by categoria;",
    "hint":"Selecione a coluna categoria e use GROUP BY categoria para que COUNT(*) e SUM(valor) sejam calculados por grupo.",
    "why":"Esta prática mostra como sair de um resumo geral e passar para uma visão segmentada por categoria."
  }'::jsonb,
  '{
    "validator":"orders_by_category_summary",
    "execution":"local",
    "requires":["table_pedidos","category","count_orders","sum_value","group_by_category"]
  }'::jsonb,
  '{
    "columns":["categoria","total_pedidos","valor_total"],
    "rows":[
      ["casa",1,78.30],
      ["eletrônicos",3,438.40],
      ["livros",3,135.50]
    ]
  }'::jsonb,
  'select
    categoria,
    count(*) as total_pedidos,
    sum(valor) as valor_total
  from pedidos
  group by categoria;',
  true
from public.learning_activities activity
cross join public.sql_datasets dataset
where activity.slug = 'sql-essencial-group-by'
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
  'Crie uma consulta para listar os pedidos pagos com o nome do cliente, retornando pedido_id, nome do cliente e valor do pedido.',
  'Treine como usar JOIN para combinar informações de pedidos e clientes.',
  '{
    "content_title":"JOIN conecta informações de tabelas diferentes",
    "content":"Quando uma informação está dividida em mais de uma tabela, usamos JOIN para relacionar os registros. A chave de ligação normalmente aparece nas duas tabelas. Neste exercício, cliente_id conecta pedidos e clientes.",
    "example":"select\n  p.pedido_id,\n  c.nome,\n  p.valor\nfrom pedidos p\njoin clientes c\n  on c.cliente_id = p.cliente_id\nwhere p.status = ''pago'';",
    "placeholder":"select\n  p.pedido_id,\n  c.nome,\n  p.valor\nfrom pedidos p\njoin clientes c\n  on c.cliente_id = p.cliente_id\nwhere p.status = ''pago'';",
    "hint":"Use JOIN entre pedidos e clientes pela coluna cliente_id. Depois filtre apenas pedidos com status = ''pago''.",
    "why":"Esta prática mostra como combinar dados de tabelas diferentes sem perder o controle do filtro principal."
  }'::jsonb,
  '{
    "validator":"paid_orders_with_customers",
    "execution":"local",
    "requires":["table_pedidos","table_clientes","join_customer_id","status_paid_filter","order_customer_value"]
  }'::jsonb,
  '{
    "columns":["pedido_id","nome","valor"],
    "rows":[
      [101,"Ana",120.00],
      [103,"Bruno",250.00],
      [104,"Carla",90.00],
      [106,"Bruno",150.00]
    ]
  }'::jsonb,
  'select
    p.pedido_id,
    c.nome,
    p.valor
  from pedidos p
  join clientes c
    on c.cliente_id = p.cliente_id
  where p.status = ''pago'';',
  true
from public.learning_activities activity
cross join public.sql_datasets dataset
where activity.slug = 'sql-essencial-join'
  and dataset.slug = 'pedidos-clientes-join-v1'
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

-- Validacoes somente leitura para executar depois da aplicacao manual.

select
  activity.slug,
  activity.status,
  activity.title,
  activity.subtitle,
  activity.step_order,
  activity.level_label,
  activity.estimated_minutes,
  dataset.slug as dataset_slug,
  exercise.validation_config ->> 'validator' as validator,
  exercise.expected_result,
  exercise.is_active
from public.learning_activities activity
join public.sql_practice_exercises exercise
  on exercise.activity_id = activity.id
join public.sql_datasets dataset
  on dataset.id = exercise.dataset_id
where activity.slug in (
  'sql-essencial-filtro-antes-agregacao',
  'sql-essencial-group-by',
  'sql-essencial-join'
)
order by activity.step_order;

select
  slug,
  title,
  engine,
  jsonb_array_length(schema_config -> 'tables') as table_count,
  jsonb_array_length(seed_data) as seed_groups,
  is_active
from public.sql_datasets
where slug = 'pedidos-clientes-join-v1';

select
  slug,
  status,
  dataset_slug,
  prompt,
  objective,
  theoretical_support,
  schema_config,
  sample_rows
from public.vw_sql_practice_exercises_public
where slug in (
  'sql-essencial-filtro-antes-agregacao',
  'sql-essencial-group-by',
  'sql-essencial-join'
)
order by step_order;
