(function initDiagnosticV2Catalog(globalScope) {
  // Nomes derivados da matriz editorial local de 80 itens; não incluem enunciados nem gabaritos.
  const skillNames = Object.freeze({
    "data_logic.events.status_timeline": "Linha do tempo de status",
    "data_logic.governance.data_contract": "Contrato de dados",
    "data_logic.governance.lineage": "Linhagem de dados",
    "data_logic.history.scd_context": "Histórico de mudanças nos dados",
    "data_logic.keys.primary_key": "Chave primária",
    "data_logic.keys.referential_integrity": "Integridade referencial",
    "data_logic.modeling.fact_dimension": "Modelo de fatos e dimensões",
    "data_logic.modeling.grain": "Granularidade dos dados",
    "data_logic.nulls.semantics": "Significado dos valores nulos",
    "data_logic.observability.quality_monitoring": "Monitoramento da qualidade dos dados",
    "data_logic.quality.semantic_types": "Tipos e categorias de dados",
    "data_logic.reconciliation.transaction_match": "Reconciliação de transações",
    "data_logic.semantic_layer.business_rule": "Regras de negócio centralizadas",
    "data_logic.time.reference_date": "Data de referência",
    "excel.data_quality.deduplication": "Tratamento de duplicados",
    "excel.data_quality.validation": "Validação de dados",
    "excel.data_type.date_validation": "Validação de datas",
    "excel.formula.auditability": "Auditoria de fórmulas",
    "excel.formula.conditional_aggregation": "Soma condicional",
    "excel.formula.references": "Referências em fórmulas",
    "excel.governance.protected_model": "Proteção e governança de planilhas",
    "excel.lookup.key_quality": "Busca por código e qualidade das chaves",
    "excel.model.filter_context": "Modelo de dados e contexto de filtros",
    "excel.pivot.analysis_layout": "Análise em tabela dinâmica",
    "excel.power_query.etl_steps": "Etapas de tratamento no Power Query",
    "excel.table.filtering": "Filtros em tabelas",
    "excel.table.structured_range": "Intervalos dinâmicos",
    "kpi.actionability.metric_quality": "Indicadores que orientam ações",
    "kpi.definition.consistency": "Definição e periodicidade de indicadores",
    "kpi.diagnosis.decomposition": "Decomposição de indicadores",
    "kpi.diagnosis.metric_tree": "Árvore de métricas",
    "kpi.leading_lagging.selection": "Indicadores de antecipação e resultado",
    "kpi.quality.metric_design": "Qualidade dos indicadores",
    "kpi.segment.benchmarking": "Metas por segmento e comparação interna",
    "kpi.signal.noise": "Sinal e ruído nos indicadores",
    "kpi.strategy.north_star": "Métrica principal do produto",
    "kpi.target.dynamic_goal": "Metas dinâmicas",
    "kpi.target.interpretation": "Interpretação de metas e resultados",
    "sql.aggregation.counting": "Contagem com valores nulos",
    "sql.aggregation.distinct_entities": "Contagem de entidades distintas",
    "sql.aggregation.group_filtering": "Filtros com WHERE e HAVING",
    "sql.analytics.cohort_churn": "Análise de cancelamento por coorte",
    "sql.filtering.where_logic": "Filtros de dados com WHERE",
    "sql.join.granularity": "Relacionamentos JOIN e granularidade",
    "sql.modeling.scd_history": "Histórico de mudanças em dimensões",
    "sql.performance.index_strategy": "Índices e desempenho de consultas",
    "sql.pipeline.deduplication": "Remoção de duplicados em pipelines",
    "sql.query_structure.cte": "Organização de consultas com CTE",
    "sql.result.ordering": "Ordenação de resultados",
    "sql.subquery.contextual_comparison": "Comparações com subconsultas",
    "sql.window.ranking": "Ranking com funções de janela",
    "stats.anomaly.detection": "Detecção de anomalias",
    "stats.distribution.robust_measures": "Mediana e valores extremos",
    "stats.distribution.skewness": "Distribuições assimétricas",
    "stats.distribution.variability": "Dispersão dos dados",
    "stats.inference.ab_test": "Testes A/B e controle de variáveis",
    "stats.inference.confidence_interval": "Intervalos de confiança",
    "stats.model.error_metric": "Métricas de erro",
    "stats.monitoring.data_drift": "Mudanças na distribuição dos dados",
    "stats.percent.change_interpretation": "Interpretação de percentuais",
    "stats.relationship.correlation_vs_causation": "Correlação e causalidade",
    "stats.sampling.bias": "Amostragem e viés",
    "stats.time_series.seasonality": "Sazonalidade",
    "stats.weighted_rate.interpretation": "Taxas ponderadas"
  });
  const destinations = Object.freeze({
    "sql.filtering.where_logic": {
      href: "praticas-sql.html?pratica=sql-essencial-filtros-where",
      label: "Praticar filtros com WHERE", type: "Prática"
    },
    "sql.aggregation.counting": {
      href: "praticas-sql.html?pratica=sql-essencial-count-nulos-distintos",
      label: "Praticar contagens e valores nulos", type: "Prática"
    },
    "sql.aggregation.distinct_entities": {
      href: "praticas-sql.html?pratica=sql-essencial-count-nulos-distintos",
      label: "Praticar contagem de entidades distintas", type: "Prática"
    }
  });
  const guidance = Object.freeze({
    collect_more_evidence: "Há poucas evidências nesta área. Retome os fundamentos e faça um novo diagnóstico quando houver mais conteúdo disponível.",
    review_fundamentals: "Revise os fundamentos desta área antes de avançar.",
    study_intermediate: "Consolide os conceitos intermediários com exemplos e exercícios.",
    deepen_advanced: "Continue praticando em situações mais complexas. O nível avançado ainda é provisório."
  });

  function resolve(areaResult) {
    if (areaResult?.recommendation_code === "collect_more_evidence") return null;
    const gap = (areaResult?.skills || []).find((skill) =>
      Number(skill.total) > Number(skill.correct) && destinations[skill.skill_code]);
    return gap ? { ...destinations[gap.skill_code], skillCode: gap.skill_code } : null;
  }
  function describe(code) { return guidance[code] || "Continue estudando esta área."; }
  function hasSkillName(code) { return Object.prototype.hasOwnProperty.call(skillNames, code); }
  function skillName(code, area) {
    return hasSkillName(code)
      ? skillNames[code] : `Competência em ${area || "dados"} ainda sem nome editorial`;
  }
  const api = { resolve, describe, skillName, hasSkillName };
  globalScope.diagnosticV2Catalog = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
