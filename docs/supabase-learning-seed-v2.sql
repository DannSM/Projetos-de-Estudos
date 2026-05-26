-- Seed mínimo revisável para trilhas iniciais do Data Skill Map.
-- NÃO executar sem aprovação explícita.
-- Popula apenas tabelas existentes:
-- - public.learning_paths
-- - public.learning_path_steps
--
-- Idempotência:
-- - learning_paths: on conflict (slug) do update
-- - learning_path_steps: on conflict (path_id, step_key) where step_key is not null do update

with upsert_paths as (
  insert into public.learning_paths (
    slug,
    title,
    description,
    skill_area,
    level,
    estimated_minutes,
    status,
    display_order,
    metadata
  )
  values
    (
      'fundamentos-de-dados',
      'Fundamentos de Dados',
      'Base para entender tipos semânticos, granularidade, regras de negócio e organização lógica dos dados.',
      'Lógica de dados',
      'Básico',
      120,
      'active',
      10,
      jsonb_build_object(
        'related_skill_codes', jsonb_build_array(
          'data_logic.quality.semantic_types',
          'data_logic.modeling.grain',
          'data_logic.modeling.fact_dimension'
        ),
        'related_recommendation_keys', jsonb_build_array(
          'diag_rec_data_logic_semantic_types_basic_review_v1',
          'diag_rec_data_logic_modeling_grain_basic_review_v1',
          'diag_rec_data_logic_fact_dimension_intermediate_review_v1'
        ),
        'related_areas', jsonb_build_array('Lógica de dados'),
        'related_levels', jsonb_build_array('Básico', 'Intermediário'),
        'source', 'minimal_learning_paths_seed_v2'
      )
    ),
    (
      'sql-essencial',
      'SQL Essencial',
      'Consultas básicas para filtrar, contar e resumir dados com segurança.',
      'SQL',
      'Básico',
      150,
      'active',
      20,
      jsonb_build_object(
        'related_skill_codes', jsonb_build_array(
          'sql.filtering.where_logic',
          'sql.aggregation.counting'
        ),
        'related_recommendation_keys', jsonb_build_array(
          'diag_rec_sql_filtering_where_logic_basic_review_v1',
          'diag_rec_sql_aggregation_counting_basic_review_v1'
        ),
        'related_areas', jsonb_build_array('SQL'),
        'related_levels', jsonb_build_array('Básico'),
        'source', 'minimal_learning_paths_seed_v2'
      )
    ),
    (
      'sql-intermediario',
      'SQL Intermediário',
      'JOINs, granularidade, entidades distintas, filtros em agregações e funções de janela.',
      'SQL',
      'Intermediário',
      180,
      'active',
      30,
      jsonb_build_object(
        'related_skill_codes', jsonb_build_array(
          'sql.join.granularity',
          'sql.aggregation.distinct_entities',
          'sql.aggregation.group_filtering',
          'sql.window.ranking'
        ),
        'related_recommendation_keys', jsonb_build_array(
          'diag_rec_sql_join_granularity_intermediate_review_v1',
          'diag_rec_sql_distinct_entities_intermediate_review_v1',
          'diag_rec_sql_group_filtering_intermediate_review_v1',
          'diag_rec_sql_window_ranking_intermediate_review_v1'
        ),
        'related_areas', jsonb_build_array('SQL'),
        'related_levels', jsonb_build_array('Intermediário'),
        'source', 'minimal_learning_paths_seed_v2'
      )
    ),
    (
      'estatistica-para-dados',
      'Estatística para Dados',
      'Medidas robustas, variação percentual, correlação, sazonalidade, teste A/B e vieses de amostra.',
      'Estatística',
      'Básico',
      150,
      'active',
      40,
      jsonb_build_object(
        'related_skill_codes', jsonb_build_array(
          'stats.distribution.robust_measures',
          'stats.percent.change_interpretation',
          'stats.relationship.correlation_vs_causation',
          'stats.sampling.bias'
        ),
        'related_recommendation_keys', jsonb_build_array(
          'diag_rec_stats_robust_measures_basic_review_v1',
          'diag_rec_stats_percent_change_basic_review_v1',
          'diag_rec_stats_correlation_vs_causation_intermediate_review_v1',
          'diag_rec_stats_sampling_bias_intermediate_review_v1'
        ),
        'related_areas', jsonb_build_array('Estatística'),
        'related_levels', jsonb_build_array('Básico', 'Intermediário'),
        'source', 'minimal_learning_paths_seed_v2'
      )
    ),
    (
      'indicadores-e-kpis',
      'Indicadores e KPIs',
      'Metas, definição consistente, decomposição de KPI, funil de conversão e leitura de sinal versus ruído.',
      'Indicadores',
      'Básico',
      120,
      'active',
      50,
      jsonb_build_object(
        'related_skill_codes', jsonb_build_array(
          'kpi.target.interpretation',
          'kpi.definition.consistency',
          'kpi.diagnosis.decomposition',
          'kpi.funnel.conversion_rate',
          'kpi.signal.noise'
        ),
        'related_recommendation_keys', jsonb_build_array(
          'diag_rec_kpi_target_interpretation_basic_review_v1',
          'diag_rec_kpi_definition_consistency_basic_review_v1',
          'diag_rec_kpi_decomposition_intermediate_review_v1',
          'diag_rec_kpi_funnel_conversion_intermediate_next_step_v1',
          'diag_rec_kpi_signal_noise_intermediate_review_v1'
        ),
        'related_areas', jsonb_build_array('Indicadores'),
        'related_levels', jsonb_build_array('Básico', 'Intermediário'),
        'source', 'minimal_learning_paths_seed_v2'
      )
    ),
    (
      'projetos-praticos',
      'Projetos Práticos',
      'Aplicação integrada de SQL, estatística, indicadores e lógica de dados em problemas de negócio.',
      'Projetos',
      'Intermediário',
      240,
      'active',
      60,
      jsonb_build_object(
        'integration_track', true,
        'related_skill_codes', jsonb_build_array(
          'sql.join.granularity',
          'sql.aggregation.group_filtering',
          'stats.relationship.correlation_vs_causation',
          'kpi.diagnosis.decomposition',
          'data_logic.modeling.fact_dimension'
        ),
        'related_recommendation_keys', jsonb_build_array(),
        'related_areas', jsonb_build_array('SQL', 'Estatística', 'Indicadores', 'Lógica de dados'),
        'related_levels', jsonb_build_array('Intermediário'),
        'note', 'Trilha integradora sem recommendation_key direta em diagnostic_recommendations.',
        'source', 'minimal_learning_paths_seed_v2'
      )
    )
  on conflict (slug) do update
    set title = excluded.title,
        description = excluded.description,
        skill_area = excluded.skill_area,
        level = excluded.level,
        estimated_minutes = excluded.estimated_minutes,
        status = excluded.status,
        display_order = excluded.display_order,
        metadata = excluded.metadata,
        updated_at = now()
  returning id, slug
),
all_paths as (
  select id, slug
  from upsert_paths
  union
  select id, slug
  from public.learning_paths
  where slug in (
    'fundamentos-de-dados',
    'sql-essencial',
    'sql-intermediario',
    'estatistica-para-dados',
    'indicadores-e-kpis',
    'projetos-praticos'
  )
),
seed_steps as (
  select *
  from (
    values
      ('fundamentos-de-dados', 'fundamentos-01-tipos-semanticos', 'Tipos semânticos', 'Identifique se um campo representa categoria, data, medida, chave ou status antes de analisar.', 'Lógica de dados', 'lesson', 1, 25, jsonb_build_object('concept', 'Tipos semânticos', 'skill_code', 'data_logic.quality.semantic_types', 'recommendation_key', 'diag_rec_data_logic_semantic_types_basic_review_v1', 'source', 'minimal_learning_paths_seed_v2')),
      ('fundamentos-de-dados', 'fundamentos-02-granularidade', 'Granularidade', 'Reconheça o nível de detalhe de uma base para evitar contagens e comparações distorcidas.', 'Lógica de dados', 'practice', 2, 30, jsonb_build_object('concept', 'Granularidade', 'skill_code', 'data_logic.modeling.grain', 'recommendation_key', 'diag_rec_data_logic_modeling_grain_basic_review_v1', 'source', 'minimal_learning_paths_seed_v2')),
      ('fundamentos-de-dados', 'fundamentos-03-modelo-fato-dimensao', 'Fato e dimensão', 'Separe eventos, medidas e atributos descritivos para estruturar análises mais consistentes.', 'Lógica de dados', 'lesson', 3, 35, jsonb_build_object('concept', 'Modelo fato dimensão', 'skill_code', 'data_logic.modeling.fact_dimension', 'recommendation_key', 'diag_rec_data_logic_fact_dimension_intermediate_review_v1', 'source', 'minimal_learning_paths_seed_v2')),

      ('sql-essencial', 'sql-essencial-01-where', 'Filtros com WHERE', 'Pratique filtros que respondem exatamente ao recorte pedido pela pergunta de negócio.', 'SQL', 'lesson', 1, 30, jsonb_build_object('concept', 'Filtros com WHERE', 'skill_code', 'sql.filtering.where_logic', 'recommendation_key', 'diag_rec_sql_filtering_where_logic_basic_review_v1', 'source', 'minimal_learning_paths_seed_v2')),
      ('sql-essencial', 'sql-essencial-02-contagens', 'Contagens e nulos', 'Use COUNT e agregações simples considerando campos nulos e registros ausentes.', 'SQL', 'practice', 2, 35, jsonb_build_object('concept', 'Contagens e nulos', 'skill_code', 'sql.aggregation.counting', 'recommendation_key', 'diag_rec_sql_aggregation_counting_basic_review_v1', 'source', 'minimal_learning_paths_seed_v2')),
      ('sql-essencial', 'sql-essencial-03-filtro-mais-agregacao', 'Filtro antes do resumo', 'Combine filtros e agregações para gerar métricas simples e auditáveis.', 'SQL', 'practice', 3, 35, jsonb_build_object('concept', 'Filtros e contagens', 'skill_code', 'sql.filtering.where_logic', 'recommendation_key', 'diag_rec_sql_filtering_where_logic_basic_review_v1', 'source', 'minimal_learning_paths_seed_v2')),

      ('sql-intermediario', 'sql-intermediario-01-join-granularity', 'Granularidade de JOINs', 'Entenda quando um JOIN multiplica linhas e muda o significado da métrica.', 'SQL', 'lesson', 1, 40, jsonb_build_object('concept', 'Granularidade de JOINs', 'skill_code', 'sql.join.granularity', 'recommendation_key', 'diag_rec_sql_join_granularity_intermediate_review_v1', 'source', 'minimal_learning_paths_seed_v2')),
      ('sql-intermediario', 'sql-intermediario-02-entidades-distintas', 'Entidades distintas', 'Use contagens distintas para separar registros, eventos e entidades de negócio.', 'SQL', 'practice', 2, 35, jsonb_build_object('concept', 'Entidades distintas', 'skill_code', 'sql.aggregation.distinct_entities', 'recommendation_key', 'diag_rec_sql_distinct_entities_intermediate_review_v1', 'source', 'minimal_learning_paths_seed_v2')),
      ('sql-intermediario', 'sql-intermediario-03-group-filtering', 'Filtros em agregações', 'Aplique filtros antes e depois do agrupamento sem confundir WHERE e HAVING.', 'SQL', 'practice', 3, 40, jsonb_build_object('concept', 'Filtros em agregações', 'skill_code', 'sql.aggregation.group_filtering', 'recommendation_key', 'diag_rec_sql_group_filtering_intermediate_review_v1', 'source', 'minimal_learning_paths_seed_v2')),
      ('sql-intermediario', 'sql-intermediario-04-window-ranking', 'Ranking com janela', 'Use funções de janela para comparar posições sem perder o detalhe das linhas.', 'SQL', 'lesson', 4, 40, jsonb_build_object('concept', 'Funções de janela', 'skill_code', 'sql.window.ranking', 'recommendation_key', 'diag_rec_sql_window_ranking_intermediate_review_v1', 'source', 'minimal_learning_paths_seed_v2')),

      ('estatistica-para-dados', 'estatistica-01-medidas-robustas', 'Medidas robustas', 'Compare média, mediana e leitura de distribuição quando há assimetria ou outliers.', 'Estatística', 'lesson', 1, 30, jsonb_build_object('concept', 'Medidas robustas', 'skill_code', 'stats.distribution.robust_measures', 'recommendation_key', 'diag_rec_stats_robust_measures_basic_review_v1', 'source', 'minimal_learning_paths_seed_v2')),
      ('estatistica-para-dados', 'estatistica-02-variacao-percentual', 'Variação percentual', 'Interprete crescimento, queda e diferença relativa com cuidado sobre a base de comparação.', 'Estatística', 'practice', 2, 30, jsonb_build_object('concept', 'Variação percentual', 'skill_code', 'stats.percent.change_interpretation', 'recommendation_key', 'diag_rec_stats_percent_change_basic_review_v1', 'source', 'minimal_learning_paths_seed_v2')),
      ('estatistica-para-dados', 'estatistica-03-correlacao-causalidade', 'Correlação e causalidade', 'Leia associação entre variáveis sem transformar correlação em conclusão causal automática.', 'Estatística', 'lesson', 3, 35, jsonb_build_object('concept', 'Correlação e causalidade', 'skill_code', 'stats.relationship.correlation_vs_causation', 'recommendation_key', 'diag_rec_stats_correlation_vs_causation_intermediate_review_v1', 'source', 'minimal_learning_paths_seed_v2')),
      ('estatistica-para-dados', 'estatistica-04-vies-amostra', 'Viés de amostra', 'Avalie se a amostra sustenta a conclusão antes de recomendar uma ação.', 'Estatística', 'practice', 4, 35, jsonb_build_object('concept', 'Viés de amostra', 'skill_code', 'stats.sampling.bias', 'recommendation_key', 'diag_rec_stats_sampling_bias_intermediate_review_v1', 'source', 'minimal_learning_paths_seed_v2')),

      ('indicadores-e-kpis', 'indicadores-01-meta-resultado', 'Meta e resultado', 'Separe resultado observado, meta esperada e interpretação do desvio.', 'Indicadores', 'lesson', 1, 25, jsonb_build_object('concept', 'Meta e resultado', 'skill_code', 'kpi.target.interpretation', 'recommendation_key', 'diag_rec_kpi_target_interpretation_basic_review_v1', 'source', 'minimal_learning_paths_seed_v2')),
      ('indicadores-e-kpis', 'indicadores-02-definicao-consistente', 'Definição consistente', 'Garanta que todos estejam medindo o mesmo indicador antes de comparar períodos ou áreas.', 'Indicadores', 'lesson', 2, 25, jsonb_build_object('concept', 'Definição consistente', 'skill_code', 'kpi.definition.consistency', 'recommendation_key', 'diag_rec_kpi_definition_consistency_basic_review_v1', 'source', 'minimal_learning_paths_seed_v2')),
      ('indicadores-e-kpis', 'indicadores-03-decomposicao-kpi', 'Decomposição de KPI', 'Quebre um indicador em componentes para localizar a causa provável da variação.', 'Indicadores', 'practice', 3, 40, jsonb_build_object('concept', 'Decomposição de KPI', 'skill_code', 'kpi.diagnosis.decomposition', 'recommendation_key', 'diag_rec_kpi_decomposition_intermediate_review_v1', 'source', 'minimal_learning_paths_seed_v2')),
      ('indicadores-e-kpis', 'indicadores-04-funil-conversao', 'Funil de conversão', 'Leia taxas por etapa para priorizar onde agir primeiro.', 'Indicadores', 'practice', 4, 35, jsonb_build_object('concept', 'Funil de conversão', 'skill_code', 'kpi.funnel.conversion_rate', 'recommendation_key', 'diag_rec_kpi_funnel_conversion_intermediate_next_step_v1', 'source', 'minimal_learning_paths_seed_v2')),

      ('projetos-praticos', 'projetos-01-escopo-pergunta', 'Escopo e pergunta analítica', 'Defina pergunta, recorte, métrica e granularidade antes de consultar os dados.', 'Projetos', 'lesson', 1, 35, jsonb_build_object('concept', 'Escopo analítico', 'integration_track', true, 'source', 'minimal_learning_paths_seed_v2')),
      ('projetos-praticos', 'projetos-02-consulta-validacao', 'Consulta e validação', 'Combine JOINs, filtros e checagens de granularidade para evitar conclusões distorcidas.', 'Projetos', 'practice', 2, 55, jsonb_build_object('concept', 'Consulta validada', 'integration_track', true, 'related_skill_codes', jsonb_build_array('sql.join.granularity', 'sql.aggregation.group_filtering', 'data_logic.modeling.fact_dimension'), 'source', 'minimal_learning_paths_seed_v2')),
      ('projetos-praticos', 'projetos-03-insight-recomendacao', 'Insight e recomendação', 'Conecte evidência, KPI, contexto estatístico e ação recomendada em uma conclusão curta.', 'Projetos', 'project', 3, 60, jsonb_build_object('concept', 'Narrativa analítica', 'integration_track', true, 'related_skill_codes', jsonb_build_array('kpi.diagnosis.decomposition', 'stats.relationship.correlation_vs_causation'), 'source', 'minimal_learning_paths_seed_v2'))
  ) as steps (
    path_slug,
    step_key,
    title,
    description,
    skill_area,
    content_type,
    display_order,
    estimated_minutes,
    metadata
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
  p.id,
  s.step_key,
  s.title,
  s.description,
  s.skill_area,
  s.content_type,
  s.display_order,
  s.estimated_minutes,
  'active',
  s.metadata
from seed_steps s
join all_paths p
  on p.slug = s.path_slug
on conflict (path_id, step_key)
where step_key is not null
do update
  set title = excluded.title,
      description = excluded.description,
      skill_area = excluded.skill_area,
      content_type = excluded.content_type,
      display_order = excluded.display_order,
      estimated_minutes = excluded.estimated_minutes,
      status = excluded.status,
      metadata = excluded.metadata,
      updated_at = now();