# Mapeamento inicial de skills da question_bank

## Objetivo

Mapear a `question_bank` atual para uma taxonomia inicial de `skill_code` e possiveis `recommendation_key`, antes da criacao da tabela `diagnostic_recommendations`.

Este documento nao altera a estrutura da `question_bank`. Ele serve como ponte editorial e tecnica entre as perguntas reais ja cadastradas e a futura camada de recomendacoes premium.

## Arquivos analisados

- `docs/supabase-question-bank.sql`
- `docs/supabase-question-bank-v2.sql`
- `docs/supabase-question-bank-seed.sql`
- `docs/supabase-question-bank-reset-v1.sql`
- `docs/question-bank.md`
- `docs/diagnostic-recommendations-plan.md`
- `src/data/content.js`

## Base observada

A base oficial mais completa esta em `docs/supabase-question-bank-reset-v1.sql`.

Diagnostico:

- 80 perguntas ativas planejadas.
- 5 areas principais.
- 3 niveis: `Basico`, `Intermediario`, `Avancado`.
- Distribuicao por area:
  - SQL: 5 basicas, 7 intermediarias, 4 avancadas.
  - Excel: 5 basicas, 7 intermediarias, 4 avancadas.
  - Estatistica: 5 basicas, 7 intermediarias, 4 avancadas.
  - Indicadores: 5 basicas, 7 intermediarias, 4 avancadas.
  - Logica de dados: 5 basicas, 7 intermediarias, 4 avancadas.

Desafios:

- 20 desafios planejados.
- As areas usam nomes de produto, como `SQL pratico`, `Excel/BI` e `Logica analitica`.
- Para recomendacoes, esses nomes devem ser normalizados para as cinco areas principais.

Fallback local:

- `src/data/content.js` ainda possui perguntas e desafios hardcoded.
- Esse fallback e mais antigo e menor que a base v1, mas confirma os mesmos eixos: SQL, Estatistica, Excel, Logica de dados e Indicadores.

## Regra de normalizacao de areas

Para recomendacoes premium, toda habilidade deve pertencer a uma das cinco areas principais:

| Origem na question_bank | Area normalizada |
| --- | --- |
| `SQL`, `SQL pratico`, `SQL Basico`, `SQL Intermediario` | SQL |
| `Excel`, `Excel/BI`, `Excel e BI` | Excel |
| `Estatistica` | Estatistica |
| `Logica de dados`, `Logica analitica`, `Raciocinio analitico` | Logica de dados |
| `Indicadores`, `Indicadores e KPIs` | Indicadores |

## Padrao de nomes

### `skill_code`

Formato recomendado:

```text
{domain}.{topic}.{skill}
```

Exemplos:

- `sql.join.granularity`
- `sql.aggregation.grouping`
- `excel.lookup.key_quality`
- `stats.sampling.bias`
- `data_logic.nulls.semantics`
- `kpi.funnel.conversion_rate`

### `recommendation_key`

Formato recomendado:

```text
diag_rec_{area_slug}_{skill_slug}_{level_slug}_{intent}_v1
```

Exemplos:

- `diag_rec_sql_join_granularity_intermediate_review_v1`
- `diag_rec_excel_lookup_key_quality_intermediate_review_v1`
- `diag_rec_stats_sampling_bias_intermediate_review_v1`
- `diag_rec_data_logic_null_semantics_intermediate_review_v1`
- `diag_rec_kpi_funnel_conversion_intermediate_next_step_v1`

## Agrupamentos para evitar granularidade excessiva

O primeiro mapeamento nao deve criar um `skill_code` para cada conceito textual da `question_bank`. Muitos conceitos sao variacoes de uma mesma habilidade.

Regras recomendadas:

- Agrupar conceitos que diagnosticam o mesmo erro mental.
- Preferir uma habilidade reutilizavel em varias perguntas.
- Manter `concept` como rotulo editorial da pergunta.
- Usar `skill_code` como unidade de diagnostico e recomendacao.
- Criar skills novos apenas quando a recomendacao didatica precisar ser realmente diferente.

Exemplos de agrupamento:

| Conceitos atuais | Skill sugerida |
| --- | --- |
| `Filtro de periodo`, `Filtro antes de agregacao` | `sql.filtering.where_logic` |
| `Contagem com nulos`, `DISTINCT em entidade` | `sql.aggregation.counting` |
| `JOIN basico`, `LEFT JOIN e cobertura`, `Duplicidade em agregacao` | `sql.join.granularity` |
| `Busca por codigo`, `Erro de procura` | `excel.lookup.key_quality` |
| `Mediana e outlier`, `Distribuicao assimetrica` | `stats.distribution.robust_measures` |
| `Amostra e populacao`, `Risco de vies` | `stats.sampling.bias` |
| `Meta e realizado`, `Meta por segmento`, `Meta dinamica` | `kpi.target.interpretation` |
| `Granularidade`, `Modelo fato dimensao`, `Conformidade de dimensao` | `data_logic.modeling.grain` |
| `Nulo semantico`, `Tipo numerico`, `Tipo de dado` | `data_logic.quality.semantic_types` |

## Mapeamento por area

### SQL

| Nivel | Conceitos atuais | Skill sugerida | Recommendation key provavel | Fase |
| --- | --- | --- | --- | --- |
| Basico | Filtro de periodo; Filtro antes de agregacao | `sql.filtering.where_logic` | `diag_rec_sql_filtering_where_logic_basic_review_v1` | MVP |
| Basico | Contagem com nulos | `sql.aggregation.counting` | `diag_rec_sql_aggregation_counting_basic_review_v1` | MVP |
| Basico | Ordenacao final | `sql.result.ordering` | `diag_rec_sql_result_ordering_basic_review_v1` | Fase 2 |
| Basico/Intermediario | JOIN basico; LEFT JOIN e cobertura; Duplicidade em agregacao | `sql.join.granularity` | `diag_rec_sql_join_granularity_intermediate_review_v1` | MVP |
| Intermediario | DISTINCT em entidade | `sql.aggregation.distinct_entities` | `diag_rec_sql_distinct_entities_intermediate_review_v1` | MVP |
| Intermediario | HAVING versus WHERE | `sql.aggregation.group_filtering` | `diag_rec_sql_group_filtering_intermediate_review_v1` | MVP |
| Intermediario | CTE para legibilidade | `sql.query_structure.cte` | `diag_rec_sql_query_structure_cte_intermediate_review_v1` | Fase 2 |
| Intermediario | Janela de ranking | `sql.window.ranking` | `diag_rec_sql_window_ranking_intermediate_review_v1` | Fase 2 |
| Intermediario | Subconsulta correlacionada | `sql.subquery.contextual_comparison` | `diag_rec_sql_subquery_contextual_comparison_intermediate_review_v1` | Fase 2 |
| Avancado | Churn com coorte | `sql.analytics.cohort_churn` | `diag_rec_sql_cohort_churn_advanced_review_v1` | Fase 2 |
| Avancado | SCD e historico | `sql.modeling.scd_history` | `diag_rec_sql_scd_history_advanced_review_v1` | Fase 2 |
| Avancado | Qualidade de dados em pipeline | `sql.pipeline.deduplication` | `diag_rec_sql_pipeline_deduplication_advanced_review_v1` | Fase 2 |
| Avancado | Desempenho de consulta | `sql.performance.index_strategy` | `diag_rec_sql_performance_index_strategy_advanced_review_v1` | Fase 2 |

Lacunas percebidas:

- A area SQL cobre bem filtros, agregacoes, JOINs e alguns topicos avancados.
- Ha sobreposicao entre `sql.join.granularity`, `sql.aggregation.counting` e `sql.aggregation.distinct_entities`; o MVP deve tratar esses tres como bloco principal de risco analitico.
- Performance e modelagem historica devem ficar para fase 2, pois exigem recomendacoes mais contextuais.

### Excel

| Nivel | Conceitos atuais | Skill sugerida | Recommendation key provavel | Fase |
| --- | --- | --- | --- | --- |
| Basico | Referencia absoluta | `excel.formula.references` | `diag_rec_excel_formula_references_basic_review_v1` | Fase 2 |
| Basico/Intermediario | Busca por codigo; Erro de procura | `excel.lookup.key_quality` | `diag_rec_excel_lookup_key_quality_intermediate_review_v1` | MVP |
| Basico | Filtro em tabela | `excel.table.filtering` | `diag_rec_excel_table_filtering_basic_review_v1` | Fase 2 |
| Basico | Soma condicional | `excel.formula.conditional_aggregation` | `diag_rec_excel_conditional_aggregation_basic_review_v1` | MVP |
| Basico | Tipo de dado | `excel.data_type.date_validation` | `diag_rec_excel_data_type_date_validation_basic_review_v1` | MVP |
| Intermediario | Tabela dinamica; Segmentacao por periodo | `excel.pivot.analysis_layout` | `diag_rec_excel_pivot_analysis_layout_intermediate_review_v1` | MVP |
| Intermediario | Validacao de dados | `excel.data_quality.validation` | `diag_rec_excel_data_quality_validation_intermediate_review_v1` | MVP |
| Intermediario | Intervalo dinamico | `excel.table.structured_range` | `diag_rec_excel_structured_range_intermediate_review_v1` | Fase 2 |
| Intermediario | Auditoria de formula | `excel.formula.auditability` | `diag_rec_excel_formula_auditability_intermediate_review_v1` | Fase 2 |
| Intermediario | Tratamento de duplicados | `excel.data_quality.deduplication` | `diag_rec_excel_data_quality_deduplication_intermediate_review_v1` | MVP |
| Avancado | Power Query e ETL | `excel.power_query.etl_steps` | `diag_rec_excel_power_query_etl_steps_advanced_review_v1` | Fase 2 |
| Avancado | Modelo de dados; Medidas e contexto | `excel.model.filter_context` | `diag_rec_excel_model_filter_context_advanced_review_v1` | Fase 2 |
| Avancado | Governanca de planilha | `excel.governance.protected_model` | `diag_rec_excel_governance_protected_model_advanced_review_v1` | Fase 2 |

Lacunas percebidas:

- Excel mistura fundamentos de planilha, qualidade de dados e BI/modelo.
- O MVP deve priorizar erros que geram resultado errado: chave de busca, tipo de dado, tabela dinamica, validacao e duplicidade.
- Referencias absolutas e filtros sao importantes, mas podem ser recomendacoes simples de fase 2.

### Estatistica

| Nivel | Conceitos atuais | Skill sugerida | Recommendation key provavel | Fase |
| --- | --- | --- | --- | --- |
| Basico | Mediana e outlier | `stats.distribution.robust_measures` | `diag_rec_stats_robust_measures_basic_review_v1` | MVP |
| Basico | Percentual simples; Leitura de variacao | `stats.percent.change_interpretation` | `diag_rec_stats_percent_change_basic_review_v1` | MVP |
| Basico/Intermediario | Amostra e populacao; Risco de vies | `stats.sampling.bias` | `diag_rec_stats_sampling_bias_intermediate_review_v1` | MVP |
| Basico | Dispersao | `stats.distribution.variability` | `diag_rec_stats_distribution_variability_basic_review_v1` | Fase 2 |
| Intermediario | Correlacao com cuidado | `stats.relationship.correlation_vs_causation` | `diag_rec_stats_correlation_vs_causation_intermediate_review_v1` | MVP |
| Intermediario | Taxa ponderada | `stats.weighted_rate.interpretation` | `diag_rec_stats_weighted_rate_intermediate_review_v1` | Fase 2 |
| Intermediario | Sazonalidade | `stats.time_series.seasonality` | `diag_rec_stats_seasonality_intermediate_review_v1` | Fase 2 |
| Intermediario | Intervalo de confianca | `stats.inference.confidence_interval` | `diag_rec_stats_confidence_interval_intermediate_review_v1` | Fase 2 |
| Intermediario/Avancado | Teste A B basico; Controle de variaveis | `stats.inference.ab_test` | `diag_rec_stats_ab_test_advanced_review_v1` | MVP |
| Intermediario | Distribuicao assimetrica | `stats.distribution.skewness` | `diag_rec_stats_skewness_intermediate_review_v1` | Fase 2 |
| Avancado | Deteccao de anomalia | `stats.anomaly.detection` | `diag_rec_stats_anomaly_detection_advanced_review_v1` | Fase 2 |
| Avancado | Metrica de erro | `stats.model.error_metric` | `diag_rec_stats_error_metric_advanced_review_v1` | Fase 2 |
| Avancado | Drift de dados | `stats.monitoring.data_drift` | `diag_rec_stats_data_drift_advanced_review_v1` | Fase 2 |

Lacunas percebidas:

- Estatistica tem boa cobertura de interpretacao, mas precisa evitar fragmentar demais distribuicao, vies, inferencia e series temporais.
- O MVP deve focar em erros que afetam decisao: vies, correlacao versus causalidade, medidas robustas e leitura percentual.
- Drift, anomalia e metrica de erro sao valiosos, mas mais adequados para recomendacoes avancadas de fase 2.

### Indicadores

| Nivel | Conceitos atuais | Skill sugerida | Recommendation key provavel | Fase |
| --- | --- | --- | --- | --- |
| Basico | Meta e realizado; Indicador absoluto vs relativo | `kpi.target.interpretation` | `diag_rec_kpi_target_interpretation_basic_review_v1` | MVP |
| Basico | KPI acionavel | `kpi.actionability.metric_quality` | `diag_rec_kpi_actionability_metric_quality_basic_review_v1` | MVP |
| Basico | Definicao consistente; Periodicidade | `kpi.definition.consistency` | `diag_rec_kpi_definition_consistency_basic_review_v1` | MVP |
| Intermediario | Decomposicao de KPI; Efeito composicao | `kpi.diagnosis.decomposition` | `diag_rec_kpi_decomposition_intermediate_review_v1` | MVP |
| Intermediario | Leading vs lagging | `kpi.leading_lagging.selection` | `diag_rec_kpi_leading_lagging_intermediate_review_v1` | Fase 2 |
| Intermediario | Meta por segmento; Benchmark interno | `kpi.segment.benchmarking` | `diag_rec_kpi_segment_benchmarking_intermediate_review_v1` | Fase 2 |
| Intermediario | KPI de qualidade | `kpi.quality.metric_design` | `diag_rec_kpi_quality_metric_design_intermediate_review_v1` | Fase 2 |
| Intermediario | Sinal versus ruido | `kpi.signal.noise` | `diag_rec_kpi_signal_noise_intermediate_review_v1` | Fase 2 |
| Basico/Intermediario | Leitura de funil nos desafios; KPI acionavel | `kpi.funnel.conversion_rate` | `diag_rec_kpi_funnel_conversion_intermediate_next_step_v1` | MVP |
| Avancado | Arvore de metricas; Diagnostico multicausal | `kpi.diagnosis.metric_tree` | `diag_rec_kpi_metric_tree_advanced_review_v1` | Fase 2 |
| Avancado | Meta dinamica | `kpi.target.dynamic_goal` | `diag_rec_kpi_dynamic_goal_advanced_review_v1` | Fase 2 |
| Avancado | Metrica norte | `kpi.strategy.north_star` | `diag_rec_kpi_north_star_advanced_review_v1` | Fase 2 |

Lacunas percebidas:

- Indicadores cobre bem definicao, meta, decomposicao e diagnostico.
- O MVP deve transformar recomendacoes em orientacao de decisao, nao apenas revisao conceitual.
- Funil aparece com forca nos desafios e deve entrar no seed inicial mesmo que o diagnostico v1 trate mais amplamente KPI acionavel.

### Logica de dados

| Nivel | Conceitos atuais | Skill sugerida | Recommendation key provavel | Fase |
| --- | --- | --- | --- | --- |
| Basico | Granularidade | `data_logic.modeling.grain` | `diag_rec_data_logic_modeling_grain_basic_review_v1` | MVP |
| Basico | Tipo numerico; Consistencia de categoria | `data_logic.quality.semantic_types` | `diag_rec_data_logic_semantic_types_basic_review_v1` | MVP |
| Basico | Chave primaria | `data_logic.keys.primary_key` | `diag_rec_data_logic_primary_key_basic_review_v1` | MVP |
| Basico | Data de referencia | `data_logic.time.reference_date` | `diag_rec_data_logic_reference_date_basic_review_v1` | Fase 2 |
| Intermediario | Modelo fato dimensao; Conformidade de dimensao | `data_logic.modeling.fact_dimension` | `diag_rec_data_logic_fact_dimension_intermediate_review_v1` | MVP |
| Intermediario | Linha do tempo de status | `data_logic.events.status_timeline` | `diag_rec_data_logic_status_timeline_intermediate_review_v1` | Fase 2 |
| Intermediario | Nulo semantico | `data_logic.nulls.semantics` | `diag_rec_data_logic_null_semantics_intermediate_review_v1` | MVP |
| Intermediario | Slowly changing context | `data_logic.history.scd_context` | `diag_rec_data_logic_scd_context_intermediate_review_v1` | Fase 2 |
| Intermediario | Regra de negocio centralizada | `data_logic.semantic_layer.business_rule` | `diag_rec_data_logic_business_rule_intermediate_review_v1` | Fase 2 |
| Intermediario | Integridade referencial | `data_logic.keys.referential_integrity` | `diag_rec_data_logic_referential_integrity_intermediate_review_v1` | MVP |
| Avancado | Data contract | `data_logic.governance.data_contract` | `diag_rec_data_logic_data_contract_advanced_review_v1` | Fase 2 |
| Avancado | Linhagem de dados | `data_logic.governance.lineage` | `diag_rec_data_logic_lineage_advanced_review_v1` | Fase 2 |
| Avancado | Reconciliacao financeira | `data_logic.reconciliation.transaction_match` | `diag_rec_data_logic_transaction_reconciliation_advanced_review_v1` | Fase 2 |
| Avancado | Observabilidade de dados | `data_logic.observability.quality_monitoring` | `diag_rec_data_logic_observability_advanced_review_v1` | Fase 2 |

Lacunas percebidas:

- Logica de dados e a area mais transversal; ela se conecta a SQL, Excel e Indicadores.
- O MVP deve priorizar granularidade, chaves, nulos e modelagem fato/dimensao.
- Governanca, linhagem, contratos e observabilidade devem ficar para fase 2 por exigirem contexto mais maduro.

## Skills essenciais para MVP

Sugestao de conjunto inicial enxuto:

### SQL

- `sql.filtering.where_logic`
- `sql.aggregation.counting`
- `sql.aggregation.distinct_entities`
- `sql.aggregation.group_filtering`
- `sql.join.granularity`

### Excel

- `excel.lookup.key_quality`
- `excel.formula.conditional_aggregation`
- `excel.data_type.date_validation`
- `excel.pivot.analysis_layout`
- `excel.data_quality.validation`
- `excel.data_quality.deduplication`

### Estatistica

- `stats.distribution.robust_measures`
- `stats.percent.change_interpretation`
- `stats.sampling.bias`
- `stats.relationship.correlation_vs_causation`
- `stats.inference.ab_test`

### Indicadores

- `kpi.target.interpretation`
- `kpi.actionability.metric_quality`
- `kpi.definition.consistency`
- `kpi.diagnosis.decomposition`
- `kpi.funnel.conversion_rate`

### Logica de dados

- `data_logic.modeling.grain`
- `data_logic.quality.semantic_types`
- `data_logic.keys.primary_key`
- `data_logic.modeling.fact_dimension`
- `data_logic.nulls.semantics`
- `data_logic.keys.referential_integrity`

Total sugerido para MVP: 27 skills.

Para o primeiro seed de recomendacoes, nao e necessario cobrir todas as 27. O seed inicial deve conter as recomendacoes mais fortes e mais transversais.

## Skills para fase 2

Fase 2 deve incluir habilidades que exigem maior contexto, historico ou maturidade analitica:

- `sql.result.ordering`
- `sql.query_structure.cte`
- `sql.window.ranking`
- `sql.subquery.contextual_comparison`
- `sql.analytics.cohort_churn`
- `sql.modeling.scd_history`
- `sql.pipeline.deduplication`
- `sql.performance.index_strategy`
- `excel.formula.references`
- `excel.table.filtering`
- `excel.table.structured_range`
- `excel.formula.auditability`
- `excel.power_query.etl_steps`
- `excel.model.filter_context`
- `excel.governance.protected_model`
- `stats.distribution.variability`
- `stats.weighted_rate.interpretation`
- `stats.time_series.seasonality`
- `stats.inference.confidence_interval`
- `stats.distribution.skewness`
- `stats.anomaly.detection`
- `stats.model.error_metric`
- `stats.monitoring.data_drift`
- `kpi.leading_lagging.selection`
- `kpi.segment.benchmarking`
- `kpi.quality.metric_design`
- `kpi.signal.noise`
- `kpi.diagnosis.metric_tree`
- `kpi.target.dynamic_goal`
- `kpi.strategy.north_star`
- `data_logic.time.reference_date`
- `data_logic.events.status_timeline`
- `data_logic.history.scd_context`
- `data_logic.semantic_layer.business_rule`
- `data_logic.governance.data_contract`
- `data_logic.governance.lineage`
- `data_logic.reconciliation.transaction_match`
- `data_logic.observability.quality_monitoring`

## Recommendation keys sugeridas para o primeiro seed

Seed inicial recomendado com 15 recomendacoes fortes:

| Area | Skill | Recommendation key |
| --- | --- | --- |
| SQL | `sql.filtering.where_logic` | `diag_rec_sql_filtering_where_logic_basic_review_v1` |
| SQL | `sql.aggregation.counting` | `diag_rec_sql_aggregation_counting_basic_review_v1` |
| SQL | `sql.aggregation.group_filtering` | `diag_rec_sql_group_filtering_intermediate_review_v1` |
| SQL | `sql.join.granularity` | `diag_rec_sql_join_granularity_intermediate_review_v1` |
| Excel | `excel.lookup.key_quality` | `diag_rec_excel_lookup_key_quality_intermediate_review_v1` |
| Excel | `excel.data_type.date_validation` | `diag_rec_excel_data_type_date_validation_basic_review_v1` |
| Excel | `excel.pivot.analysis_layout` | `diag_rec_excel_pivot_analysis_layout_intermediate_review_v1` |
| Excel | `excel.data_quality.deduplication` | `diag_rec_excel_data_quality_deduplication_intermediate_review_v1` |
| Estatistica | `stats.distribution.robust_measures` | `diag_rec_stats_robust_measures_basic_review_v1` |
| Estatistica | `stats.sampling.bias` | `diag_rec_stats_sampling_bias_intermediate_review_v1` |
| Estatistica | `stats.relationship.correlation_vs_causation` | `diag_rec_stats_correlation_vs_causation_intermediate_review_v1` |
| Indicadores | `kpi.target.interpretation` | `diag_rec_kpi_target_interpretation_basic_review_v1` |
| Indicadores | `kpi.funnel.conversion_rate` | `diag_rec_kpi_funnel_conversion_intermediate_next_step_v1` |
| Logica de dados | `data_logic.modeling.grain` | `diag_rec_data_logic_modeling_grain_basic_review_v1` |
| Logica de dados | `data_logic.nulls.semantics` | `diag_rec_data_logic_null_semantics_intermediate_review_v1` |

Se o primeiro seed precisar ser menor, os 10 mais importantes sao:

- `diag_rec_sql_join_granularity_intermediate_review_v1`
- `diag_rec_sql_aggregation_counting_basic_review_v1`
- `diag_rec_sql_group_filtering_intermediate_review_v1`
- `diag_rec_excel_lookup_key_quality_intermediate_review_v1`
- `diag_rec_excel_pivot_analysis_layout_intermediate_review_v1`
- `diag_rec_stats_sampling_bias_intermediate_review_v1`
- `diag_rec_stats_correlation_vs_causation_intermediate_review_v1`
- `diag_rec_kpi_funnel_conversion_intermediate_next_step_v1`
- `diag_rec_data_logic_modeling_grain_basic_review_v1`
- `diag_rec_data_logic_null_semantics_intermediate_review_v1`

## Lacunas gerais percebidas

- A base ja cobre bem as cinco areas principais, mas os nomes de desafios precisam ser normalizados para as mesmas areas do diagnostico.
- Alguns conceitos aparecem em mais de uma area, como granularidade, duplicidade e modelagem; isso e bom para diagnostico, mas exige cuidado para nao duplicar recomendacoes quase iguais.
- `tags` ajudam, mas ainda nao substituem `skill_code`, porque podem variar em granularidade e idioma.
- O campo `concept` e editorial, nao deve ser usado como chave tecnica permanente.
- O primeiro seed deve priorizar recomendacoes que expliquem causa comum, risco pratico e proximo passo concreto.
- A camada premium deve registrar `recommendation_key` exibida no futuro, para medir se a recomendacao reduz lacuna recorrente.

## Ordem recomendada apos este mapeamento

1. Revisar este mapa e fechar a lista MVP de `skill_code`.
2. Criar a migration SQL da tabela `diagnostic_recommendations`.
3. Criar seed inicial com 10 a 15 recomendacoes fortes.
4. Em etapa separada, decidir como a `question_bank` recebera `skill_code`:
   - coluna direta em `question_bank`; ou
   - tabela de ligacao `question_skill_map`.
5. Conectar a camada ao Diagnostico 2.0.
6. Depois conectar ao Meu Progresso.
