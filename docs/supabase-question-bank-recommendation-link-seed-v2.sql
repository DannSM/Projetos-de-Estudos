-- Data Skill Map - Question Bank Recommendation Link Seed v2
-- Execute apos docs/supabase-diagnostic-recommendations-seed-v2.sql.
-- Este script e idempotente.
-- Ele atualiza apenas perguntas ativas de diagnostico.
-- Preserva skill_code e diagnostic_weight ja preenchidos.
-- Nao sobrescreve recommendation_key existente.
-- So grava recommendation_key se ela existir em public.diagnostic_recommendations.
-- O frontend ainda nao sera alterado para consumir estes campos.

with link_map(area, level, skill_code, recommendation_key) as (
  values
    ('Indicadores', 'Avançado', 'kpi.diagnosis.metric_tree', 'diag_rec_kpi_metric_tree_advanced_review_v1'),
    ('Indicadores', 'Intermediário', 'kpi.diagnosis.decomposition', 'diag_rec_kpi_decomposition_intermediate_review_v1'),
    ('Indicadores', 'Básico', 'kpi.definition.consistency', 'diag_rec_kpi_definition_consistency_basic_review_v1'),
    ('Indicadores', 'Intermediário', 'kpi.segment.benchmarking', 'diag_rec_kpi_segment_benchmarking_intermediate_review_v1'),
    ('Indicadores', 'Intermediário', 'kpi.signal.noise', 'diag_rec_kpi_signal_noise_intermediate_review_v1'),
    ('Lógica de dados', 'Intermediário', 'data_logic.modeling.fact_dimension', 'diag_rec_data_logic_fact_dimension_intermediate_review_v1'),
    ('Lógica de dados', 'Básico', 'data_logic.quality.semantic_types', 'diag_rec_data_logic_semantic_types_basic_review_v1'),
    ('Lógica de dados', 'Intermediário', 'data_logic.keys.referential_integrity', 'diag_rec_data_logic_referential_integrity_intermediate_review_v1'),
    ('Lógica de dados', 'Intermediário', 'data_logic.semantic_layer.business_rule', 'diag_rec_data_logic_business_rule_intermediate_review_v1'),
    ('Estatística', 'Básico', 'stats.percent.change_interpretation', 'diag_rec_stats_percent_change_basic_review_v1'),
    ('Estatística', 'Intermediário', 'stats.time_series.seasonality', 'diag_rec_stats_seasonality_intermediate_review_v1'),
    ('Estatística', 'Intermediário', 'stats.inference.ab_test', 'diag_rec_stats_ab_test_intermediate_review_v1'),
    ('Excel', 'Avançado', 'excel.model.filter_context', 'diag_rec_excel_filter_context_advanced_review_v1'),
    ('SQL', 'Intermediário', 'sql.window.ranking', 'diag_rec_sql_window_ranking_intermediate_review_v1'),
    ('SQL', 'Intermediário', 'sql.aggregation.distinct_entities', 'diag_rec_sql_distinct_entities_intermediate_review_v1')
),
resolved_link as (
  select
    link_map.area,
    link_map.level,
    link_map.skill_code,
    link_map.recommendation_key
  from link_map
  inner join public.diagnostic_recommendations
    on diagnostic_recommendations.recommendation_key = link_map.recommendation_key
)
update public.question_bank
set
  recommendation_key = resolved_link.recommendation_key,
  updated_at = now()
from resolved_link
where question_bank.mode = 'diagnostico'
  and question_bank.is_active = true
  and question_bank.area = resolved_link.area
  and question_bank.level = resolved_link.level
  and question_bank.skill_code = resolved_link.skill_code
  and question_bank.recommendation_key is null;

-- Validacoes sugeridas apos executar:
--
-- Cobertura de recommendation_key na question_bank:
-- select
--   count(*) filter (where mode = 'diagnostico' and is_active = true) as active_diagnostic_questions,
--   count(skill_code) filter (where mode = 'diagnostico' and is_active = true) as with_skill_code,
--   count(recommendation_key) filter (where mode = 'diagnostico' and is_active = true) as with_recommendation_key,
--   count(diagnostic_weight) filter (where mode = 'diagnostico' and is_active = true) as with_diagnostic_weight
-- from public.question_bank;
--
-- Distribuicao por area:
-- select
--   area,
--   count(*) as total,
--   count(recommendation_key) as with_recommendation_key
-- from public.question_bank
-- where mode = 'diagnostico'
--   and is_active = true
-- group by area
-- order by area;
--
-- Chaves orfas:
-- select distinct question_bank.recommendation_key
-- from public.question_bank
-- left join public.diagnostic_recommendations
--   on diagnostic_recommendations.recommendation_key = question_bank.recommendation_key
-- where question_bank.recommendation_key is not null
--   and diagnostic_recommendations.recommendation_key is null
-- order by question_bank.recommendation_key;
--
-- Skills ainda sem recommendation_key:
-- select
--   skill_code,
--   count(*) as total
-- from public.question_bank
-- where mode = 'diagnostico'
--   and is_active = true
--   and skill_code is not null
--   and recommendation_key is null
-- group by skill_code
-- order by total desc, skill_code;
