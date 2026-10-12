-- PROPOSTA DE CARGA — NÃO EXECUTADA
-- Projeto 01 — Análise de Vendas
-- Revisar integralmente antes de aplicar em qualquer ambiente.
-- Este arquivo adiciona somente conteúdo e vínculos. Não altera schema, views,
-- RLS, policies, Auth, permissões ou configurações do Supabase.

begin;

insert into public.learning_activities (
  slug, activity_type, title, subtitle, track_slug, track_title, step_order,
  status, level_label, estimated_minutes, is_active, metadata
)
values
  (
    'projeto-01-escopo-pergunta',
    'practice',
    'Escopo e pergunta analítica',
    'Projeto 01 — Análise de Vendas',
    'projetos-praticos',
    'Projetos Práticos',
    1,
    'active',
    'Aplicado',
    10,
    true,
    jsonb_build_object(
      'format', 'guided_practice',
      'content_version', 1,
      'source', 'projeto_01_analise_vendas_v1',
      'step_key', 'projetos-01-escopo-pergunta',
      'objective', 'Definir o recorte correto para calcular o faturamento efetivamente realizado.',
      'scenario', jsonb_build_object(
        'title', 'Quais segmentos sustentam o faturamento?',
        'context', 'Uma empresa de comércio eletrônico quer identificar quais segmentos de clientes geram mais faturamento e quais resultados merecem investigação. A base reúne 50 pedidos pagos, pendentes e cancelados.'
      ),
      'indicator_title', 'Delimite o que entra na análise',
      'indicator_description', 'Antes de escrever SQL, confirme a regra de negócio usada nas três etapas do projeto.',
      'indicator_data', jsonb_build_array(
        jsonb_build_object('label', 'Pedidos', 'value', '50 registros'),
        jsonb_build_object('label', 'Clientes', 'value', '10 clientes'),
        jsonb_build_object('label', 'Segmentos', 'value', '3 grupos'),
        jsonb_build_object('label', 'Status', 'value', 'pago, pendente e cancelado')
      ),
      'question', 'Quais pedidos devem entrar no cálculo do faturamento realizado?',
      'response_schema', 'single_choice',
      'options', jsonb_build_array(
        jsonb_build_object('id', 'A', 'text', 'Todos os pedidos, porque representam intenção de compra.'),
        jsonb_build_object('id', 'B', 'text', 'Somente os pedidos pagos, porque representam faturamento efetivamente realizado.'),
        jsonb_build_object('id', 'C', 'text', 'Pedidos pagos e pendentes, porque ambos podem gerar receita.'),
        jsonb_build_object('id', 'D', 'text', 'Somente os pedidos cancelados, para medir a receita perdida.')
      ),
      'correct_option', 'B',
      'feedback', 'O faturamento realizado deve considerar somente pedidos com status pago. Pedidos pendentes ainda não viraram receita confirmada e pedidos cancelados não geraram faturamento.',
      'attention', 'Misturar pedidos pendentes ou cancelados infla a métrica e pode mudar indevidamente a comparação entre segmentos.',
      'conclusion', 'Você definiu a população correta da análise: pedidos pagos, relacionados aos clientes e resumidos por segmento.',
      'completion_title', 'Escopo analítico definido',
      'next_action', jsonb_build_object(
        'href', 'praticas-sql.html?pratica=projeto-01-consulta-validacao',
        'label', 'Continuar para a consulta SQL',
        'title', 'Etapa 2 — Consulta e validação'
      )
    )
  ),
  (
    'projeto-01-consulta-validacao',
    'practice',
    'Consulta e validação',
    'Projeto 01 — Análise de Vendas',
    'projetos-praticos',
    'Projetos Práticos',
    2,
    'active',
    'SQL Aplicado',
    25,
    true,
    jsonb_build_object(
      'format', 'sql_practice',
      'content_version', 1,
      'source', 'projeto_01_analise_vendas_v1',
      'step_key', 'projetos-02-consulta-validacao',
      'topic', 'JOIN + WHERE + GROUP BY'
    )
  ),
  (
    'projeto-01-insight-recomendacao',
    'practice',
    'Insight e recomendação',
    'Projeto 01 — Análise de Vendas',
    'projetos-praticos',
    'Projetos Práticos',
    3,
    'active',
    'Aplicado',
    10,
    true,
    jsonb_build_object(
      'format', 'guided_practice',
      'content_version', 1,
      'source', 'projeto_01_analise_vendas_v1',
      'step_key', 'projetos-03-insight-recomendacao',
      'objective', 'Transformar o resultado segmentado em uma recomendação de negócio defensável.',
      'scenario', jsonb_build_object(
        'title', 'Do resultado SQL à decisão',
        'context', 'A consulta validada mostrou que o segmento Corporativo tem o maior faturamento, mesmo com menos pedidos do que Varejo. A decisão deve reconhecer o valor do segmento sem ignorar a concentração em poucos clientes.'
      ),
      'indicator_title', 'Resultados dos pedidos pagos',
      'indicator_description', 'As métricas abaixo são as mesmas calculadas sobre o dataset da etapa SQL.',
      'indicator_data', jsonb_build_array(
        jsonb_build_object('label', 'Corporativo', 'value', '10 pedidos · 3 clientes · R$ 18.250'),
        jsonb_build_object('label', 'Pequenas empresas', 'value', '12 pedidos · 3 clientes · R$ 9.610'),
        jsonb_build_object('label', 'Varejo', 'value', '16 pedidos · 4 clientes · R$ 4.750'),
        jsonb_build_object('label', 'Faturamento total', 'value', 'R$ 32.610')
      ),
      'question', 'Qual recomendação é mais defensável a partir desses resultados?',
      'response_schema', 'single_choice',
      'options', jsonb_build_array(
        jsonb_build_object('id', 'A', 'text', 'Abandonar Varejo, porque seu faturamento foi menor neste recorte.'),
        jsonb_build_object('id', 'B', 'text', 'Priorizar a investigação e retenção do Corporativo, avaliando a concentração do faturamento em poucos clientes antes de ampliar o investimento.'),
        jsonb_build_object('id', 'C', 'text', 'Considerar todos os segmentos equivalentes, porque todos possuem pedidos pagos.'),
        jsonb_build_object('id', 'D', 'text', 'Somar pedidos pendentes e cancelados para confirmar a liderança do Corporativo.')
      ),
      'correct_option', 'B',
      'feedback', 'Corporativo responde por R$ 18.250 de R$ 32.610, cerca de 56% do faturamento realizado. Como esse valor vem de apenas três clientes, a melhor recomendação combina retenção, análise de concentração e investigação antes de escalar a estratégia.',
      'attention', 'O resultado indica prioridade de investigação, não causalidade. O dataset não explica sozinho margem, recorrência futura ou custo de aquisição.',
      'conclusion', 'Você conectou regra de negócio, consulta validada e recomendação com ressalvas sobre concentração e limites da análise.',
      'completion_title', 'Projeto 01 concluído',
      'competencies', jsonb_build_array(
        'Definição de escopo e métrica',
        'JOIN, filtro e agregação em SQL',
        'Validação de resultados',
        'Comunicação de insight e recomendação'
      ),
      'next_action', jsonb_build_object(
        'href', 'meu-progresso.html',
        'label', 'Ver projeto em Meu Progresso',
        'title', 'Competências demonstradas'
      )
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

with
clients as (
  select * from (values
    (1, 'Ana Souza', 'Varejo'),
    (2, 'Bruno Lima', 'Varejo'),
    (3, 'Carla Mendes', 'Varejo'),
    (4, 'Diego Alves', 'Varejo'),
    (5, 'Empório Aurora', 'Pequenas empresas'),
    (6, 'Flora Digital', 'Pequenas empresas'),
    (7, 'Garagem Central', 'Pequenas empresas'),
    (8, 'Grupo Atlas', 'Corporativo'),
    (9, 'Horizonte Logística', 'Corporativo'),
    (10, 'Inova Serviços', 'Corporativo')
  ) as client_rows(cliente_id, nome, segmento)
),
order_blueprints as (
  select
    1 as group_order,
    array[1,2,3,4]::integer[] as client_ids,
    array[180,240,320,410,150,275,360,425,190,230,345,390,205,260,315,455,280,370,215,445]::numeric[] as amounts,
    array['pago','pago','pago','pago','pago','pago','pago','pago','pago','pago','pago','pago','pago','pago','pago','pago','pendente','cancelado','pendente','cancelado']::text[] as statuses
  union all
  select
    2,
    array[5,6,7]::integer[],
    array[650,720,830,910,680,760,840,930,700,780,860,950,810,690,880]::numeric[],
    array['pago','pago','pago','pago','pago','pago','pago','pago','pago','pago','pago','pago','pendente','cancelado','pendente']::text[]
  union all
  select
    3,
    array[8,9,10]::integer[],
    array[1400,1650,1800,2100,1500,1750,1950,2300,1600,2200,1850,2400,1700,2050,2250]::numeric[],
    array['pago','pago','pago','pago','pago','pago','pago','pago','pago','pago','cancelado','pendente','cancelado','pendente','cancelado']::text[]
),
raw_orders as (
  select
    blueprint.group_order,
    entry.position,
    blueprint.client_ids[1 + ((entry.position - 1) % cardinality(blueprint.client_ids))] as cliente_id,
    entry.status,
    entry.amount
  from order_blueprints blueprint
  cross join lateral unnest(blueprint.amounts, blueprint.statuses)
    with ordinality as entry(amount, status, position)
),
numbered_orders as (
  select
    row_number() over (order by group_order, position)::integer as pedido_id,
    cliente_id,
    status,
    amount as valor
  from raw_orders
),
orders as (
  select
    pedido_id,
    cliente_id,
    make_date(
      2026,
      1 + ((pedido_id - 1) / 17),
      1 + ((pedido_id - 1) % 17)
    ) as data_pedido,
    status,
    valor
  from numbered_orders
),
dataset_payload as (
  select
    jsonb_build_object(
      'tables', jsonb_build_array(
        jsonb_build_object(
          'table', 'clientes',
          'columns', jsonb_build_array(
            jsonb_build_object('name', 'cliente_id', 'type', 'integer', 'constraints', 'primary key'),
            jsonb_build_object('name', 'nome', 'type', 'text', 'constraints', 'not null'),
            jsonb_build_object('name', 'segmento', 'type', 'text', 'constraints', 'not null')
          )
        ),
        jsonb_build_object(
          'table', 'pedidos',
          'columns', jsonb_build_array(
            jsonb_build_object('name', 'pedido_id', 'type', 'integer', 'constraints', 'primary key'),
            jsonb_build_object('name', 'cliente_id', 'type', 'integer', 'constraints', 'not null references clientes(cliente_id)'),
            jsonb_build_object('name', 'data_pedido', 'type', 'date', 'constraints', 'not null'),
            jsonb_build_object('name', 'status', 'type', 'text', 'constraints', 'not null'),
            jsonb_build_object('name', 'valor', 'type', 'numeric(10,2)', 'constraints', 'not null')
          )
        )
      )
    ) as schema_config,
    jsonb_build_array(
      jsonb_build_object(
        'table', 'clientes',
        'rows', (select jsonb_agg(to_jsonb(client_row) order by cliente_id) from clients client_row)
      ),
      jsonb_build_object(
        'table', 'pedidos',
        'rows', (
          select jsonb_agg(
            jsonb_build_object(
              'pedido_id', pedido_id,
              'cliente_id', cliente_id,
              'data_pedido', to_char(data_pedido, 'YYYY-MM-DD'),
              'status', status,
              'valor', valor
            ) order by pedido_id
          )
          from orders
        )
      )
    ) as seed_data,
    jsonb_build_array(
      jsonb_build_object(
        'table', 'clientes',
        'rows', (select jsonb_agg(to_jsonb(client_row) order by cliente_id) from clients client_row where cliente_id <= 5)
      ),
      jsonb_build_object(
        'table', 'pedidos',
        'rows', (
          select jsonb_agg(
            jsonb_build_object(
              'pedido_id', pedido_id,
              'cliente_id', cliente_id,
              'data_pedido', to_char(data_pedido, 'YYYY-MM-DD'),
              'status', status,
              'valor', valor
            ) order by pedido_id
          )
          from orders
          where pedido_id <= 5
        )
      )
    ) as sample_rows
)
insert into public.sql_datasets (
  slug, title, description, engine, schema_config, seed_data, sample_rows, is_active
)
select
  'projeto-01-vendas-segmentos-v1',
  'Projeto 01 — Vendas por segmento',
  'Dataset sintético determinístico com 10 clientes e 50 pedidos.',
  'postgresql',
  schema_config,
  seed_data,
  sample_rows,
  true
from dataset_payload
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
  activity_id, dataset_id, prompt, objective, theoretical_support,
  validation_config, expected_result, solution_sql, is_active
)
select
  activity.id,
  dataset.id,
  'Relacione clientes e pedidos, considere somente pedidos pagos e retorne, por segmento, a quantidade de pedidos, a quantidade de clientes distintos e o faturamento total.',
  'Construir e validar uma consulta que conecte duas tabelas e produza métricas de negócio consistentes.',
  jsonb_build_object(
    'why', 'O projeto combina definição de escopo, relacionamento entre tabelas e interpretação de métricas no mesmo cenário.',
    'content_title', 'Conecte dimensão e fatos antes de resumir',
    'content', 'Use clientes para obter o segmento e pedidos para obter status e valor. Filtre apenas status pago antes do agrupamento.',
    'example', E'select\n  dimensao,\n  count(...),\n  count(distinct ...),\n  sum(...)\nfrom fatos\njoin dimensao_tabela on ... = ...\nwhere ...\ngroup by dimensao;',
    'hint', 'Relacione clientes.cliente_id a pedidos.cliente_id, filtre pedidos.status = ''pago'' e agrupe por clientes.segmento.',
    'placeholder', E'select\n  c.segmento,\n  count(...) as quantidade_pedidos,\n  count(distinct ...) as clientes_distintos,\n  sum(...) as faturamento\nfrom clientes c\njoin pedidos p on ...\nwhere ...\ngroup by ...;'
  ),
  jsonb_build_object('validator', 'project_sales_by_segment'),
  jsonb_build_object(
    'rows', jsonb_build_array(
      jsonb_build_array('Corporativo', 10, 3, 18250),
      jsonb_build_array('Pequenas empresas', 12, 3, 9610),
      jsonb_build_array('Varejo', 16, 4, 4750)
    )
  ),
  E'select\n  c.segmento,\n  count(p.pedido_id) as quantidade_pedidos,\n  count(distinct p.cliente_id) as clientes_distintos,\n  sum(p.valor) as faturamento\nfrom clientes c\njoin pedidos p on p.cliente_id = c.cliente_id\nwhere p.status = ''pago''\ngroup by c.segmento\norder by c.segmento;',
  true
from public.learning_activities activity
cross join public.sql_datasets dataset
where activity.slug = 'projeto-01-consulta-validacao'
  and dataset.slug = 'projeto-01-vendas-segmentos-v1'
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

update public.learning_path_steps
set
  content_url = case step_key
    when 'projetos-01-escopo-pergunta' then 'pratica-guiada.html?atividade=projeto-01-escopo-pergunta'
    when 'projetos-02-consulta-validacao' then 'praticas-sql.html?pratica=projeto-01-consulta-validacao'
    when 'projetos-03-insight-recomendacao' then 'pratica-guiada.html?atividade=projeto-01-insight-recomendacao'
  end,
  metadata = coalesce(metadata, '{}'::jsonb) || case step_key
    when 'projetos-01-escopo-pergunta' then jsonb_build_object('activity_slug', 'projeto-01-escopo-pergunta', 'format', 'guided_practice')
    when 'projetos-02-consulta-validacao' then jsonb_build_object('activity_slug', 'projeto-01-consulta-validacao', 'practice_slug', 'projeto-01-consulta-validacao', 'format', 'sql_practice')
    when 'projetos-03-insight-recomendacao' then jsonb_build_object('activity_slug', 'projeto-01-insight-recomendacao', 'format', 'guided_practice')
  end,
  updated_at = now()
where step_key in (
  'projetos-01-escopo-pergunta',
  'projetos-02-consulta-validacao',
  'projetos-03-insight-recomendacao'
);

-- Verificações de revisão antes da aplicação:
-- 1. As três atividades devem aparecer nas views públicas existentes.
-- 2. vw_sql_practice_exercises_public deve continuar sem validation_config,
--    expected_result e solution_sql.
-- 3. O dataset deve ter 10 clientes, 50 pedidos e as métricas esperadas:
--    Corporativo 10/3/18250; Pequenas empresas 12/3/9610; Varejo 16/4/4750.

commit;
