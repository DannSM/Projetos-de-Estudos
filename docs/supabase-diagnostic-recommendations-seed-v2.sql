-- Data Skill Map - Diagnostic Recommendations Seed v2
-- Execute apos docs/supabase-diagnostic-recommendations-seed.sql.
-- Este seed e idempotente via recommendation_key.
-- Depois execute docs/supabase-question-bank-recommendation-link-seed-v2.sql.
-- O frontend ainda sera conectado a esta camada em etapa futura.

insert into public.diagnostic_recommendations (
  recommendation_key,
  skill_code,
  area,
  level,
  concept,
  recommendation_type,
  severity,
  title,
  diagnosis_text,
  study_guidance,
  next_step,
  trigger_level,
  priority,
  is_active,
  source
)
values
  (
    'diag_rec_kpi_metric_tree_advanced_review_v1',
    'kpi.diagnosis.metric_tree',
    'Indicadores',
    'Avançado',
    'Árvore de métricas',
    'review',
    'high',
    'Conecte o KPI ao sistema de causas',
    'Você demonstrou dificuldade em decompor um indicador em uma árvore de métricas. Isso costuma acontecer quando o KPI é visto como um número isolado, sem relação clara com volume, taxa, mix, qualidade e tempo.',
    'No trabalho real, decisões ruins nascem quando uma queda de KPI é tratada como causa, não como sintoma. Revise decomposição de métricas, dimensões de análise e hipóteses multicausais antes de propor uma ação.',
    'Escolha um KPI principal e quebre em três camadas: métrica final, componentes diretos e dimensões que podem explicar a variação.',
    'Avançado',
    94,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_kpi_decomposition_intermediate_review_v1',
    'kpi.diagnosis.decomposition',
    'Indicadores',
    'Intermediário',
    'Decomposição de KPI',
    'review',
    'high',
    'Separe variação de volume, taxa e mix',
    'Você teve dificuldade em decompor um KPI. Isso geralmente acontece quando a análise olha apenas o resultado final e ignora quais componentes mudaram por trás dele.',
    'Em situações reais, receita, conversão e margem podem mudar por motivos diferentes. Antes de avançar, revise como separar efeito de volume, taxa, ticket, mix e segmento.',
    'Pegue um indicador que caiu e escreva uma hipótese para cada componente: volume, taxa, mix e período.',
    'Intermediário',
    90,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_kpi_definition_consistency_basic_review_v1',
    'kpi.definition.consistency',
    'Indicadores',
    'Básico',
    'Definição consistente',
    'review',
    'medium',
    'Padronize a definição antes de comparar',
    'Você demonstrou dificuldade em reconhecer quando um indicador precisa de definição consistente. Isso costuma aparecer quando times comparam números calculados com regras diferentes.',
    'No trabalho real, dois dashboards podem estar tecnicamente corretos e ainda assim divergir por usarem janelas, filtros ou critérios distintos. Revise regra de cálculo, periodicidade, filtros e dono da métrica.',
    'Escreva a ficha de um KPI com fórmula, período, filtros, fonte e regra de atualização.',
    'Básico',
    76,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_kpi_segment_benchmarking_intermediate_review_v1',
    'kpi.segment.benchmarking',
    'Indicadores',
    'Intermediário',
    'Benchmark por segmento',
    'review',
    'medium',
    'Compare segmentos equivalentes',
    'Você mostrou dificuldade em usar metas ou benchmarks por segmento. Isso costuma acontecer quando médias globais são usadas para grupos com comportamentos muito diferentes.',
    'Na prática, comparar lojas, canais ou produtos sem segmentação pode esconder gargalos ou punir grupos que operam em contextos distintos. Revise segmentação, baseline interno e comparação justa.',
    'Escolha uma métrica e compare o resultado por dois segmentos equivalentes, explicando se a diferença parece operacional ou estrutural.',
    'Intermediário',
    82,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_kpi_signal_noise_intermediate_review_v1',
    'kpi.signal.noise',
    'Indicadores',
    'Intermediário',
    'Sinal versus ruído',
    'review',
    'high',
    'Diferencie sinal real de oscilação normal',
    'Você teve dificuldade em distinguir sinal de ruído em indicadores. Isso costuma acontecer quando uma variação pontual é interpretada como tendência sem olhar histórico, volume e variabilidade.',
    'No trabalho real, reagir a ruído gera ações desnecessárias e muda prioridades sem evidência. Revise série histórica, tamanho da amostra, sazonalidade e limites de variação esperada.',
    'Analise um KPI por 12 períodos e marque quais variações parecem tendência, sazonalidade ou oscilação normal.',
    'Intermediário',
    86,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_data_logic_fact_dimension_intermediate_review_v1',
    'data_logic.modeling.fact_dimension',
    'Lógica de dados',
    'Intermediário',
    'Modelo fato dimensão',
    'review',
    'high',
    'Separe evento de contexto',
    'Você demonstrou dificuldade em modelagem fato e dimensão. Isso costuma acontecer quando medidas e atributos são misturados em uma única tabela sem clareza sobre o nível do evento.',
    'Em BI e analytics, fatos guardam eventos e medidas; dimensões descrevem contexto. Sem essa separação, filtros ficam frágeis, agregações duplicam valores e indicadores mudam sem explicação.',
    'Desenhe um mini-modelo com uma tabela de vendas e dimensões de cliente, produto e data, indicando a chave de cada relacionamento.',
    'Intermediário',
    91,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_data_logic_semantic_types_basic_review_v1',
    'data_logic.quality.semantic_types',
    'Lógica de dados',
    'Básico',
    'Tipos semânticos',
    'review',
    'medium',
    'Trate tipo de dado como regra de negócio',
    'Você demonstrou dificuldade em reconhecer tipos semânticos. Isso aparece quando número, texto, data e categoria são tratados apenas como formato visual.',
    'No trabalho real, tipo incorreto quebra filtros, ordenações, joins e cálculos. Revise o significado de cada coluna, não apenas o formato exibido na ferramenta.',
    'Escolha cinco colunas de uma base e classifique cada uma como identificador, data, medida, categoria ou texto livre.',
    'Básico',
    78,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_data_logic_referential_integrity_intermediate_review_v1',
    'data_logic.keys.referential_integrity',
    'Lógica de dados',
    'Intermediário',
    'Integridade referencial',
    'review',
    'high',
    'Valide se as chaves realmente se encontram',
    'Você teve dificuldade em interpretar falhas de integridade referencial. Isso costuma acontecer quando pedidos, clientes ou produtos são combinados sem validar se as chaves existem nos dois lados.',
    'Na prática, chave sem correspondência pode indicar atraso de carga, cadastro quebrado ou regra de negócio ausente. Revise chaves primárias, estrangeiras e relatórios de exceção antes de confiar no indicador.',
    'Crie uma consulta ou tabela de auditoria listando registros da fato sem correspondência na dimensão.',
    'Intermediário',
    88,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_data_logic_business_rule_intermediate_review_v1',
    'data_logic.semantic_layer.business_rule',
    'Lógica de dados',
    'Intermediário',
    'Regra de negócio centralizada',
    'review',
    'high',
    'Centralize regras que afetam KPI',
    'Você demonstrou dificuldade em reconhecer quando uma regra de negócio precisa ser centralizada. Isso acontece quando cada analista calcula cliente ativo, receita líquida ou churn com critérios próprios.',
    'No trabalho real, regras duplicadas geram divergência entre dashboards e corroem confiança nos dados. Revise camada semântica, definição oficial e reutilização de métricas antes de escalar análises.',
    'Escolha uma métrica crítica e escreva uma regra única com filtros, exceções e fonte oficial.',
    'Intermediário',
    84,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_stats_percent_change_basic_review_v1',
    'stats.percent.change_interpretation',
    'Estatística',
    'Básico',
    'Variação percentual',
    'review',
    'medium',
    'Interprete percentual junto com base absoluta',
    'Você demonstrou dificuldade em interpretar variação percentual. Isso costuma acontecer quando o percentual parece grande, mas a base absoluta é pequena, ou quando a diferença absoluta conta outra história.',
    'No trabalho real, uma variação de 50% pode ser irrelevante se saiu de 2 para 3 casos, e crítica se saiu de 2.000 para 3.000. Revise base, diferença absoluta e contexto antes de concluir.',
    'Compare três variações usando valor inicial, valor final, diferença absoluta e diferença percentual.',
    'Básico',
    74,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_stats_seasonality_intermediate_review_v1',
    'stats.time_series.seasonality',
    'Estatística',
    'Intermediário',
    'Sazonalidade',
    'review',
    'medium',
    'Compare períodos equivalentes',
    'Você teve dificuldade em reconhecer sazonalidade. Isso costuma acontecer quando se compara um mês forte com um mês fraco sem considerar calendário, campanha, feriado ou ciclo do negócio.',
    'Em análises reais, sazonalidade pode parecer crescimento ou queda estrutural. Revise comparação contra períodos equivalentes, média móvel e eventos de calendário antes de apontar causa.',
    'Compare uma métrica contra o mês anterior e contra o mesmo mês do ano anterior, explicando a diferença entre as leituras.',
    'Intermediário',
    80,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_stats_ab_test_intermediate_review_v1',
    'stats.inference.ab_test',
    'Estatística',
    'Intermediário',
    'Teste A/B',
    'review',
    'high',
    'Não escale teste A/B só pela diferença observada',
    'Você demonstrou dificuldade em interpretar teste A/B. Isso costuma acontecer quando a variante vencedora é escolhida apenas por ter uma taxa maior em amostra pequena.',
    'No trabalho real, uma decisão de experimento precisa combinar significância, tamanho de efeito, risco e custo de implementação. Revise hipótese, amostra mínima e intervalo de confiança antes de escalar.',
    'Leia um resultado de teste com conversão, amostra e diferença absoluta, e escreva se a decisão seria testar mais, escalar ou descartar.',
    'Intermediário',
    89,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_excel_filter_context_advanced_review_v1',
    'excel.model.filter_context',
    'Excel',
    'Avançado',
    'Contexto de filtro',
    'review',
    'high',
    'Entenda por que a medida muda com o filtro',
    'Você demonstrou dificuldade com contexto de filtro em modelo de dados. Isso acontece quando uma medida é lida como valor fixo, sem considerar quais filtros estão ativos no relatório.',
    'No trabalho real, contexto de filtro define como medidas reagem a categoria, período e relacionamento entre tabelas. Revise fatos, dimensões, relacionamentos e escopo da medida antes de validar o KPI.',
    'Monte uma medida simples de margem e observe como ela muda ao filtrar categoria, mês e canal.',
    'Avançado',
    87,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_sql_window_ranking_intermediate_review_v1',
    'sql.window.ranking',
    'SQL',
    'Intermediário',
    'Funções de janela',
    'review',
    'medium',
    'Use janela quando precisar manter o detalhe',
    'Você teve dificuldade em escolher funções de janela para ranking. Isso costuma acontecer quando GROUP BY é usado mesmo quando a análise precisa manter as linhas originais.',
    'No trabalho real, ranking por cliente, maior compra por produto e comparação dentro de grupos exigem preservar granularidade. Revise PARTITION BY, ORDER BY e ROW_NUMBER antes de agregar tudo.',
    'Crie uma consulta com ROW_NUMBER por cliente para identificar a maior compra sem perder as demais linhas.',
    'Intermediário',
    83,
    true,
    'diagnostic_recommendations_seed_v2'
  ),
  (
    'diag_rec_sql_distinct_entities_intermediate_review_v1',
    'sql.aggregation.distinct_entities',
    'SQL',
    'Intermediário',
    'Entidades distintas',
    'review',
    'high',
    'Conte entidades, não apenas linhas',
    'Você demonstrou dificuldade em contar entidades distintas. Isso costuma acontecer quando uma base por item, evento ou interação é usada para contar pedidos, clientes ou produtos.',
    'No trabalho real, esse erro infla indicadores e cria metas falsas. Revise qual entidade precisa ser única e use COUNT(DISTINCT chave) quando a tabela tiver múltiplas linhas por entidade.',
    'Compare COUNT(*), COUNT(pedido_id) e COUNT(DISTINCT pedido_id) em uma base por item vendido.',
    'Intermediário',
    88,
    true,
    'diagnostic_recommendations_seed_v2'
  )
on conflict (recommendation_key) do update
set
  skill_code = excluded.skill_code,
  area = excluded.area,
  level = excluded.level,
  concept = excluded.concept,
  recommendation_type = excluded.recommendation_type,
  severity = excluded.severity,
  title = excluded.title,
  diagnosis_text = excluded.diagnosis_text,
  study_guidance = excluded.study_guidance,
  next_step = excluded.next_step,
  trigger_level = excluded.trigger_level,
  priority = excluded.priority,
  is_active = excluded.is_active,
  source = excluded.source,
  updated_at = now();

-- Validacoes sugeridas apos executar:
--
-- Total de recomendacoes:
-- select count(*) as total_recommendations
-- from public.diagnostic_recommendations;
--
-- Recomendacoes por area:
-- select area, count(*) as total
-- from public.diagnostic_recommendations
-- group by area
-- order by area;
--
-- Cobertura de recommendation_key na question_bank:
-- select
--   count(*) filter (where mode = 'diagnostico' and is_active = true) as active_diagnostic_questions,
--   count(recommendation_key) filter (where mode = 'diagnostico' and is_active = true) as with_recommendation_key
-- from public.question_bank;
--
-- Chaves orfas:
-- select distinct question_bank.recommendation_key
-- from public.question_bank
-- left join public.diagnostic_recommendations
--   on diagnostic_recommendations.recommendation_key = question_bank.recommendation_key
-- where question_bank.recommendation_key is not null
--   and diagnostic_recommendations.recommendation_key is null
-- order by question_bank.recommendation_key;
