-- Data Skill Map - Question Bank Recommendation Link Seed
-- Execute apos docs/supabase-question-bank-recommendation-link.sql
-- e apos docs/supabase-diagnostic-recommendations-seed.sql.
--
-- Este script e idempotente: pode ser reexecutado sem duplicar registros.
-- Ele preenche apenas perguntas ativas de diagnostico com mapeamento claro.
-- Perguntas sem correspondencia exata permanecem com campos null por seguranca.
-- Quando a recommendation_key nao existir em public.diagnostic_recommendations,
-- apenas skill_code e diagnostic_weight sao preenchidos.
-- O frontend ainda nao sera alterado para consumir estes campos.

with recommendation_map(area, level, concept, skill_code, recommendation_key, diagnostic_weight) as (
  values
    -- SQL
    ('SQL', 'Básico', 'Filtro de período', 'sql.filtering.where_logic', 'diag_rec_sql_filtering_where_logic_basic_review_v1', 1.10),
    ('SQL', 'Básico', 'Filtro antes de agregação', 'sql.filtering.where_logic', 'diag_rec_sql_filtering_where_logic_basic_review_v1', 1.10),
    ('SQL', 'Básico', 'Contagem com nulos', 'sql.aggregation.counting', 'diag_rec_sql_aggregation_counting_basic_review_v1', 1.20),
    ('SQL', 'Básico', 'Ordenação final', 'sql.result.ordering', null, 1.00),
    ('SQL', 'Básico', 'JOIN básico', 'sql.join.granularity', 'diag_rec_sql_join_granularity_intermediate_review_v1', 1.20),
    ('SQL', 'Intermediário', 'LEFT JOIN e cobertura', 'sql.join.granularity', 'diag_rec_sql_join_granularity_intermediate_review_v1', 1.40),
    ('SQL', 'Intermediário', 'Duplicidade em agregação', 'sql.join.granularity', 'diag_rec_sql_join_granularity_intermediate_review_v1', 1.50),
    ('SQL', 'Intermediário', 'DISTINCT em entidade', 'sql.aggregation.distinct_entities', null, 1.40),
    ('SQL', 'Intermediário', 'HAVING versus WHERE', 'sql.aggregation.group_filtering', 'diag_rec_sql_group_filtering_intermediate_review_v1', 1.40),
    ('SQL', 'Intermediário', 'CTE para legibilidade', 'sql.query_structure.cte', null, 1.20),
    ('SQL', 'Intermediário', 'Janela de ranking', 'sql.window.ranking', null, 1.50),
    ('SQL', 'Intermediário', 'Subconsulta correlacionada', 'sql.subquery.contextual_comparison', null, 1.50),
    ('SQL', 'Avançado', 'Churn com coorte', 'sql.analytics.cohort_churn', null, 1.80),
    ('SQL', 'Avançado', 'SCD e histórico', 'sql.modeling.scd_history', null, 1.90),
    ('SQL', 'Avançado', 'Qualidade de dados em pipeline', 'sql.pipeline.deduplication', null, 1.80),
    ('SQL', 'Avançado', 'Desempenho de consulta', 'sql.performance.index_strategy', null, 1.60),

    -- Excel
    ('Excel', 'Básico', 'Referência absoluta', 'excel.formula.references', null, 1.00),
    ('Excel', 'Básico', 'Busca por código', 'excel.lookup.key_quality', 'diag_rec_excel_lookup_key_quality_intermediate_review_v1', 1.10),
    ('Excel', 'Básico', 'Filtro em tabela', 'excel.table.filtering', null, 1.00),
    ('Excel', 'Básico', 'Soma condicional', 'excel.formula.conditional_aggregation', null, 1.10),
    ('Excel', 'Básico', 'Tipo de dado', 'excel.data_type.date_validation', 'diag_rec_excel_data_type_date_validation_basic_review_v1', 1.20),
    ('Excel', 'Intermediário', 'Tabela dinâmica', 'excel.pivot.analysis_layout', 'diag_rec_excel_pivot_analysis_layout_intermediate_review_v1', 1.30),
    ('Excel', 'Intermediário', 'Validação de dados', 'excel.data_quality.validation', null, 1.30),
    ('Excel', 'Intermediário', 'Erro de procura', 'excel.lookup.key_quality', 'diag_rec_excel_lookup_key_quality_intermediate_review_v1', 1.40),
    ('Excel', 'Intermediário', 'Intervalo dinâmico', 'excel.table.structured_range', null, 1.20),
    ('Excel', 'Intermediário', 'Auditoria de fórmula', 'excel.formula.auditability', null, 1.30),
    ('Excel', 'Intermediário', 'Segmentação por período', 'excel.pivot.analysis_layout', 'diag_rec_excel_pivot_analysis_layout_intermediate_review_v1', 1.30),
    ('Excel', 'Intermediário', 'Tratamento de duplicados', 'excel.data_quality.deduplication', 'diag_rec_excel_data_quality_deduplication_intermediate_review_v1', 1.40),
    ('Excel', 'Avançado', 'Power Query e ETL', 'excel.power_query.etl_steps', null, 1.70),
    ('Excel', 'Avançado', 'Modelo de dados', 'excel.model.filter_context', null, 1.70),
    ('Excel', 'Avançado', 'Medidas e contexto', 'excel.model.filter_context', null, 1.80),
    ('Excel', 'Avançado', 'Governança de planilha', 'excel.governance.protected_model', null, 1.60),

    -- Estatistica
    ('Estatística', 'Básico', 'Mediana e outlier', 'stats.distribution.robust_measures', 'diag_rec_stats_robust_measures_basic_review_v1', 1.10),
    ('Estatística', 'Básico', 'Percentual simples', 'stats.percent.change_interpretation', null, 1.00),
    ('Estatística', 'Básico', 'Leitura de variação', 'stats.percent.change_interpretation', null, 1.10),
    ('Estatística', 'Básico', 'Amostra e população', 'stats.sampling.bias', 'diag_rec_stats_sampling_bias_intermediate_review_v1', 1.20),
    ('Estatística', 'Básico', 'Dispersão', 'stats.distribution.variability', null, 1.10),
    ('Estatística', 'Intermediário', 'Correlação com cuidado', 'stats.relationship.correlation_vs_causation', 'diag_rec_stats_correlation_vs_causation_intermediate_review_v1', 1.40),
    ('Estatística', 'Intermediário', 'Taxa ponderada', 'stats.weighted_rate.interpretation', null, 1.30),
    ('Estatística', 'Intermediário', 'Sazonalidade', 'stats.time_series.seasonality', null, 1.30),
    ('Estatística', 'Intermediário', 'Intervalo de confiança', 'stats.inference.confidence_interval', null, 1.40),
    ('Estatística', 'Intermediário', 'Teste A B básico', 'stats.inference.ab_test', null, 1.50),
    ('Estatística', 'Intermediário', 'Distribuição assimétrica', 'stats.distribution.skewness', null, 1.30),
    ('Estatística', 'Intermediário', 'Risco de viés', 'stats.sampling.bias', 'diag_rec_stats_sampling_bias_intermediate_review_v1', 1.50),
    ('Estatística', 'Avançado', 'Controle de variáveis', 'stats.inference.ab_test', null, 1.70),
    ('Estatística', 'Avançado', 'Detecção de anomalia', 'stats.anomaly.detection', null, 1.70),
    ('Estatística', 'Avançado', 'Métrica de erro', 'stats.model.error_metric', null, 1.70),
    ('Estatística', 'Avançado', 'Drift de dados', 'stats.monitoring.data_drift', null, 1.80),

    -- Indicadores
    ('Indicadores', 'Básico', 'Meta e realizado', 'kpi.target.interpretation', 'diag_rec_kpi_target_interpretation_basic_review_v1', 1.10),
    ('Indicadores', 'Básico', 'KPI acionável', 'kpi.actionability.metric_quality', null, 1.10),
    ('Indicadores', 'Básico', 'Definição consistente', 'kpi.definition.consistency', null, 1.10),
    ('Indicadores', 'Básico', 'Indicador absoluto vs relativo', 'kpi.target.interpretation', 'diag_rec_kpi_target_interpretation_basic_review_v1', 1.10),
    ('Indicadores', 'Básico', 'Periodicidade', 'kpi.definition.consistency', null, 1.00),
    ('Indicadores', 'Intermediário', 'Decomposicao de KPI', 'kpi.diagnosis.decomposition', null, 1.40),
    ('Indicadores', 'Intermediário', 'Leading vs lagging', 'kpi.leading_lagging.selection', null, 1.30),
    ('Indicadores', 'Intermediário', 'Meta por segmento', 'kpi.segment.benchmarking', null, 1.30),
    ('Indicadores', 'Intermediário', 'Efeito composicao', 'kpi.diagnosis.decomposition', null, 1.40),
    ('Indicadores', 'Intermediário', 'Benchmark interno', 'kpi.segment.benchmarking', null, 1.30),
    ('Indicadores', 'Intermediário', 'KPI de qualidade', 'kpi.quality.metric_design', null, 1.30),
    ('Indicadores', 'Intermediário', 'Sinal versus ruido', 'kpi.signal.noise', null, 1.40),
    ('Indicadores', 'Avançado', 'Árvore de métricas', 'kpi.diagnosis.metric_tree', null, 1.80),
    ('Indicadores', 'Avançado', 'Meta dinâmica', 'kpi.target.dynamic_goal', null, 1.70),
    ('Indicadores', 'Avançado', 'Métrica norte', 'kpi.strategy.north_star', null, 1.80),
    ('Indicadores', 'Avançado', 'Diagnóstico multicausal', 'kpi.diagnosis.metric_tree', null, 1.90),

    -- Logica de dados
    ('Lógica de dados', 'Básico', 'Granularidade', 'data_logic.modeling.grain', 'diag_rec_data_logic_modeling_grain_basic_review_v1', 1.20),
    ('Lógica de dados', 'Básico', 'Tipo numérico', 'data_logic.quality.semantic_types', null, 1.10),
    ('Lógica de dados', 'Básico', 'Chave primária', 'data_logic.keys.primary_key', null, 1.10),
    ('Lógica de dados', 'Básico', 'Data de referência', 'data_logic.time.reference_date', null, 1.10),
    ('Lógica de dados', 'Básico', 'Consistência de categoria', 'data_logic.quality.semantic_types', null, 1.10),
    ('Lógica de dados', 'Intermediário', 'Modelo fato dimensão', 'data_logic.modeling.fact_dimension', null, 1.40),
    ('Lógica de dados', 'Intermediário', 'Conformidade de dimensão', 'data_logic.modeling.fact_dimension', null, 1.40),
    ('Lógica de dados', 'Intermediário', 'Linha do tempo de status', 'data_logic.events.status_timeline', null, 1.30),
    ('Lógica de dados', 'Intermediário', 'Nulo semantico', 'data_logic.nulls.semantics', 'diag_rec_data_logic_null_semantics_intermediate_review_v1', 1.50),
    ('Lógica de dados', 'Intermediário', 'Slowly changing context', 'data_logic.history.scd_context', null, 1.50),
    ('Lógica de dados', 'Intermediário', 'Regra de negócio centralizada', 'data_logic.semantic_layer.business_rule', null, 1.40),
    ('Lógica de dados', 'Intermediário', 'Integridade referencial', 'data_logic.keys.referential_integrity', null, 1.40),
    ('Lógica de dados', 'Avançado', 'Data contract', 'data_logic.governance.data_contract', null, 1.80),
    ('Lógica de dados', 'Avançado', 'Linhagem de dados', 'data_logic.governance.lineage', null, 1.80),
    ('Lógica de dados', 'Avançado', 'Reconciliação financeira', 'data_logic.reconciliation.transaction_match', null, 1.90),
    ('Lógica de dados', 'Avançado', 'Observabilidade de dados', 'data_logic.observability.quality_monitoring', null, 1.80)
),
resolved_map as (
  select
    recommendation_map.area,
    recommendation_map.level,
    recommendation_map.concept,
    recommendation_map.skill_code,
    case
      when diagnostic_recommendations.recommendation_key is not null
        then recommendation_map.recommendation_key
      else null
    end as recommendation_key,
    recommendation_map.diagnostic_weight
  from recommendation_map
  left join public.diagnostic_recommendations
    on diagnostic_recommendations.recommendation_key = recommendation_map.recommendation_key
),
cleared_unmapped as (
  update public.question_bank
  set
    skill_code = null,
    recommendation_key = null,
    diagnostic_weight = null,
    updated_at = now()
  where question_bank.mode = 'diagnostico'
    and question_bank.is_active = true
    and not exists (
      select 1
      from resolved_map
      where resolved_map.area = question_bank.area
        and resolved_map.level = question_bank.level
        and resolved_map.concept = question_bank.concept
    )
    and (
      question_bank.skill_code is not null
      or question_bank.recommendation_key is not null
      or question_bank.diagnostic_weight is not null
    )
  returning 1
)
update public.question_bank
set
  skill_code = resolved_map.skill_code,
  recommendation_key = resolved_map.recommendation_key,
  diagnostic_weight = resolved_map.diagnostic_weight,
  updated_at = now()
from resolved_map
where question_bank.mode = 'diagnostico'
  and question_bank.is_active = true
  and question_bank.area = resolved_map.area
  and question_bank.level = resolved_map.level
  and question_bank.concept = resolved_map.concept;

-- Validacoes sugeridas apos executar:
--
-- Total de questoes:
-- select count(*) as total_questions
-- from public.question_bank;
--
-- Totais de preenchimento:
-- select
--   count(*) as total_questions,
--   count(skill_code) as with_skill_code,
--   count(recommendation_key) as with_recommendation_key,
--   count(diagnostic_weight) as with_diagnostic_weight
-- from public.question_bank;
--
-- Distribuicao por area:
-- select
--   area,
--   count(*) as total,
--   count(skill_code) as with_skill_code,
--   count(recommendation_key) as with_recommendation_key,
--   count(diagnostic_weight) as with_diagnostic_weight
-- from public.question_bank
-- where mode = 'diagnostico'
--   and is_active = true
-- group by area
-- order by area;
--
-- Distribuicao por skill_code:
-- select
--   skill_code,
--   count(*) as total
-- from public.question_bank
-- where mode = 'diagnostico'
--   and is_active = true
--   and skill_code is not null
-- group by skill_code
-- order by total desc, skill_code;
--
-- Recommendation_keys sem correspondencia em diagnostic_recommendations:
-- select distinct question_bank.recommendation_key
-- from public.question_bank
-- left join public.diagnostic_recommendations
--   on diagnostic_recommendations.recommendation_key = question_bank.recommendation_key
-- where question_bank.recommendation_key is not null
--   and diagnostic_recommendations.recommendation_key is null
-- order by question_bank.recommendation_key;
