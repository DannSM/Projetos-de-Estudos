# Revisão v1.4 - Amostra do Question Bank Reset v1

- Fonte: `docs/supabase-question-bank-reset-v1.sql`
- Critério da amostra: diagnóstico (2 Básico + 2 Intermediário + 1 Avançado por área) e desafio (2 por trilha).

## Diagnóstico - SQL

### diagnostico_v1_001
- mode: diagnostico
- area: SQL
- category: SQL
- level: Básico
- concept: Filtro de período
- question: Você recebeu um pedido para mostrar apenas as vendas dos últimos 30 dias. Qual abordagem SQL atende melhor ao pedido?
- options: ["Aplicar WHERE data_venda >= data atual menos 30 dias","Ordenar por data_venda descendente","Usar GROUP BY data_venda","Usar DISTINCT em data_venda"]
- correct_index: 0
- alternativa correta textual: Aplicar WHERE data_venda >= data atual menos 30 dias
- explanation: Para limitar linhas por período, o filtro deve estar no WHERE.
- difficulty_score: 2
- question_type: cenario
- tags: sql, where, filtro_data
- estimated_time_seconds: 60

### diagnostico_v1_002
- mode: diagnostico
- area: SQL
- category: SQL
- level: Básico
- concept: Contagem com nulos
- question: Em um relatório de contatos, a coluna email tem campos vazios. Qual contagem retorna apenas registros com email preenchido?
- options: ["COUNT(*)","COUNT(email)","COUNT(DISTINCT email)","COUNT(1)"]
- correct_index: 1
- alternativa correta textual: COUNT(email)
- explanation: COUNT(coluna) ignora valores nulos e conta somente os preenchidos.
- difficulty_score: 2
- question_type: conceitual
- tags: sql, count, null
- estimated_time_seconds: 45

### diagnostico_v1_006
- mode: diagnostico
- area: SQL
- category: SQL
- level: Intermediário
- concept: LEFT JOIN e cobertura
- question: A equipe quer uma lista de todos os clientes, inclusive os sem pedidos. Qual estratégia evita perder esses clientes?
- options: ["INNER JOIN clientes-pedidos","LEFT JOIN clientes para pedidos","RIGHT JOIN pedidos para clientes","UNION sem chave"]
- correct_index: 1
- alternativa correta textual: LEFT JOIN clientes para pedidos
- explanation: LEFT JOIN preserva a tabela da esquerda e mostra nulos quando não há pedido.
- difficulty_score: 3
- question_type: cenario
- tags: sql, left_join, cobertura
- estimated_time_seconds: 75

### diagnostico_v1_007
- mode: diagnostico
- area: SQL
- category: SQL
- level: Intermediário
- concept: Duplicidade em agregação
- question: Depois de juntar pedidos e itens, a receita total ficou maior que o esperado. Qual verificação é mais importante primeiro?
- options: ["Checar cardinalidade do JOIN e granularidade","Trocar SUM por COUNT para reduzir duplicidade","Ordenar por valor total por pedido","Aplicar DISTINCT na consulta inteira sem revisar a junção"]
- correct_index: 0
- alternativa correta textual: Checar cardinalidade do JOIN e granularidade
- explanation: Inflação da SOMA costuma ser problema de cardinalidade ou granularidade do relacionamento.
- difficulty_score: 3
- question_type: interpretacao
- tags: sql, join, granularidade
- estimated_time_seconds: 90

### diagnostico_v1_013
- mode: diagnostico
- area: SQL
- category: SQL
- level: Avançado
- concept: Churn com coorte
- question: Você precisa medir churn mensal por coorte de entrada. Qual estrutura ajuda a manter consistência entre meses?
- options: ["Agrupar apenas por mês corrente","Definir coorte fixa de entrada e acompanhar retenção por período","Usar somente total acumulado anual","Filtrar apenas clientes ativos"]
- correct_index: 1
- alternativa correta textual: Definir coorte fixa de entrada e acompanhar retenção por período
- explanation: Análise de coorte compara grupos equivalentes ao longo do tempo.
- difficulty_score: 5
- question_type: negocio
- tags: sql, coorte, churn
- estimated_time_seconds: 90

## Diagnóstico - Excel

### diagnostico_v1_017
- mode: diagnostico
- area: Excel
- category: Excel
- level: Básico
- concept: Referência absoluta
- question: Você precisa copiar uma fórmula de meta fixa para várias linhas. Qual referência deve ficar travada?
- options: ["B1","$B$1","B$1 e $B1 sempre equivalentes","Nenhuma referência pode travar"]
- correct_index: 1
- alternativa correta textual: $B$1
- explanation: A referência absoluta fixa linha e coluna ao copiar fórmula.
- difficulty_score: 1
- question_type: conceitual
- tags: excel, referencia_absoluta
- estimated_time_seconds: 45

### diagnostico_v1_018
- mode: diagnostico
- area: Excel
- category: Excel
- level: Básico
- concept: Busca por código
- question: Você quer trazer a descrição do produto a partir do código em outra aba. Qual função é mais indicada?
- options: ["SOMA","SE","PROCV ou PROCX","MÉDIA"]
- correct_index: 2
- alternativa correta textual: PROCV ou PROCX
- explanation: Funções de busca retornam valores associados a uma chave.
- difficulty_score: 2
- question_type: cenario
- tags: excel, procv, procx
- estimated_time_seconds: 60

### diagnostico_v1_022
- mode: diagnostico
- area: Excel
- category: Excel
- level: Intermediário
- concept: Tabela dinâmica
- question: Você quer receita por mês nas linhas e por categoria nas colunas. Qual configuração é correta?
- options: ["Linhas: mês; Colunas: categoria; Valores: SOMA da receita","Linhas: receita; Colunas: mês; Valores: categoria","Linhas: categoria; Valores: texto","Colunas: receita; Valores: mês"]
- correct_index: 0
- alternativa correta textual: Linhas: mês; Colunas: categoria; Valores: SOMA da receita
- explanation: Tabela dinâmica separa dimensões em linhas e colunas e mede no campo valores.
- difficulty_score: 3
- question_type: cenario
- tags: excel, tabela_dinamica, agregacao
- estimated_time_seconds: 75

### diagnostico_v1_023
- mode: diagnostico
- area: Excel
- category: Excel
- level: Intermediário
- concept: Validação de dados
- question: Usuários digitam status fora do padrão e quebram os indicadores. Qual controle reduz esse problema na origem?
- options: ["Formatação condicional","Validação de dados com lista permitida","Classificação por cor","Mesclar células de status"]
- correct_index: 1
- alternativa correta textual: Validação de dados com lista permitida
- explanation: Validação com lista restringe entradas e melhora consistência da base.
- difficulty_score: 3
- question_type: negocio
- tags: excel, qualidade_dados, validacao
- estimated_time_seconds: 75

### diagnostico_v1_029
- mode: diagnostico
- area: Excel
- category: Excel
- level: Avançado
- concept: Power Query e ETL
- question: Dados chegam de três arquivos com colunas inconsistentes todo dia. Qual abordagem reduz retrabalho manual?
- options: ["Power Query com etapas de transformação salvas","Copiar e colar manualmente com checklist","Padronizar cabeçalhos com fórmulas sem pipeline de carga","Usar apenas filtro visual na planilha final"]
- correct_index: 0
- alternativa correta textual: Power Query com etapas de transformação salvas
- explanation: Power Query permite padronizar e repetir transformações com menor erro operacional.
- difficulty_score: 4
- question_type: cenario
- tags: excel, power_query, etl
- estimated_time_seconds: 90

## Diagnóstico - Estatística

### diagnostico_v1_033
- mode: diagnostico
- area: Estatística
- category: Estatística
- level: Básico
- concept: Mediana e outlier
- question: Um conjunto tem alguns valores extremos muito altos. Qual medida tende a representar melhor o centro nesse caso?
- options: ["Média","Mediana","Soma","Amplitude"]
- correct_index: 1
- alternativa correta textual: Mediana
- explanation: Mediana e menos sensível a extremos do que a MÉDIA.
- difficulty_score: 1
- question_type: conceitual
- tags: estatistica, mediana, outlier
- estimated_time_seconds: 45

### diagnostico_v1_034
- mode: diagnostico
- area: Estatística
- category: Estatística
- level: Básico
- concept: Percentual simples
- question: A meta era 200 e o realizado foi 150. Qual percentual de atingimento foi obtido?
- options: ["75%","50%","125%","25%"]
- correct_index: 0
- alternativa correta textual: 75%
- explanation: Atingimento = realizado dividido pela meta: 150/200 = 75%.
- difficulty_score: 1
- question_type: conceitual
- tags: estatistica, percentual, meta
- estimated_time_seconds: 45

### diagnostico_v1_038
- mode: diagnostico
- area: Estatística
- category: Estatística
- level: Intermediário
- concept: Correlação com cuidado
- question: Você encontrou correlação alta entre visitas e vendas. Qual conclusão é mais adequada?
- options: ["Prova causalidade direta","Indica associação e exige investigação de causa","Significa que uma variável é inútil","Dispensa análise de contexto"]
- correct_index: 1
- alternativa correta textual: Indica associação e exige investigação de causa
- explanation: Correlação sinaliza associação, não comprova causa por si só.
- difficulty_score: 3
- question_type: interpretacao
- tags: estatistica, correlacao, causalidade
- estimated_time_seconds: 75

### diagnostico_v1_039
- mode: diagnostico
- area: Estatística
- category: Estatística
- level: Intermediário
- concept: Taxa ponderada
- question: Uma loja pequena converte 80% em 10 leads e outra 40% em 100 leads. Como comparar sem distorção?
- options: ["Tirar MÉDIA simples das taxas","Calcular taxa global ponderada pelo volume","Olhar apenas a maior taxa","Comparar apenas o número de lojas"]
- correct_index: 1
- alternativa correta textual: Calcular taxa global ponderada pelo volume
- explanation: Taxa ponderada respeita diferentes volumes de observações.
- difficulty_score: 3
- question_type: cenario
- tags: estatistica, ponderacao, taxa
- estimated_time_seconds: 75

### diagnostico_v1_045
- mode: diagnostico
- area: Estatística
- category: Estatística
- level: Avançado
- concept: Controle de variáveis
- question: Conversão subiu após nova campanha, mas também houve desconto no mesmo período. Qual abordagem ajuda a separar efeitos?
- options: ["Comparar apenas MÉDIA antes e depois","Controlar variáveis relevantes em modelo apropriado","Ignorar período de desconto","Usar apenas opinião comercial"]
- correct_index: 1
- alternativa correta textual: Controlar variáveis relevantes em modelo apropriado
- explanation: Controlar variáveis reduz atribuição incorreta de efeito.
- difficulty_score: 5
- question_type: negocio
- tags: estatistica, causalidade, controle
- estimated_time_seconds: 90

## Diagnóstico - Indicadores

### diagnostico_v1_049
- mode: diagnostico
- area: Indicadores
- category: Indicadores
- level: Básico
- concept: Meta e realizado
- question: Um time bateu 92 de uma meta de 100. Qual leitura está correta?
- options: ["Atingimento de 92% com gap de -8","Atingimento de 108% com gap de +8","Atingimento de 8% com gap de -92","Não é possível calcular"]
- correct_index: 0
- alternativa correta textual: Atingimento de 92% com gap de -8
- explanation: Atingimento é realizado dividido pela meta; gap absoluto é realizado menos meta.
- difficulty_score: 1
- question_type: conceitual
- tags: kpi, meta, gap
- estimated_time_seconds: 45

### diagnostico_v1_050
- mode: diagnostico
- area: Indicadores
- category: Indicadores
- level: Básico
- concept: KPI acionável
- question: Qual indicador é mais útil para agir sobre perda em funil comercial?
- options: ["Taxa de conversão por etapa","Taxa de clique no CTA da página","Tempo médio entre etapas do funil","Percentual de leads qualificados por canal"]
- correct_index: 0
- alternativa correta textual: Taxa de conversão por etapa
- explanation: Taxa por etapa mostra onde ocorre a maior perda e orienta ação.
- difficulty_score: 2
- question_type: negocio
- tags: kpi, funil, conversao
- estimated_time_seconds: 60

### diagnostico_v1_054
- mode: diagnostico
- area: Indicadores
- category: Indicadores
- level: Intermediário
- concept: Decomposicao de KPI
- question: A margem caiu no trimestre. Qual análise inicial aumenta chance de achar causa raiz?
- options: ["Quebrar por preço, custo e mix por segmento","Olhar apenas MÉDIA geral","Trocar meta do trimestre","Ignorar histórico"]
- correct_index: 0
- alternativa correta textual: Quebrar por preço, custo e mix por segmento
- explanation: Decompor componentes evita conclusões superficiais sobre o indicador.
- difficulty_score: 3
- question_type: cenario
- tags: kpi, margem, decomposicao
- estimated_time_seconds: 75

### diagnostico_v1_055
- mode: diagnostico
- area: Indicadores
- category: Indicadores
- level: Intermediário
- concept: Leading vs lagging
- question: Qual exemplo representa melhor um indicador leading para receita futura?
- options: ["Taxa de conversão de proposta em andamento","Receita fechada do mês passado","Lucro contábil já auditado","DRE anual fechada"]
- correct_index: 0
- alternativa correta textual: Taxa de conversão de proposta em andamento
- explanation: Leading indicator antecede o resultado final e ajuda ação preventiva.
- difficulty_score: 3
- question_type: conceitual
- tags: kpi, leading_indicator
- estimated_time_seconds: 75

### diagnostico_v1_061
- mode: diagnostico
- area: Indicadores
- category: Indicadores
- level: Avançado
- concept: Árvore de métricas
- question: Para explicar variação de lucro para diretoria, qual abordagem melhora transparência causal?
- options: ["Construir Árvore de métricas com contribuição de cada driver","Mostrar apenas lucro final","Remover detalhes de custo","Comparar somente com ano passado"]
- correct_index: 0
- alternativa correta textual: Construir Árvore de métricas com contribuição de cada driver
- explanation: Árvore de métricas torna explícita a contribuição de cada componente.
- difficulty_score: 5
- question_type: negocio
- tags: kpi, drivers, lucro
- estimated_time_seconds: 90

## Diagnóstico - Lógica de dados

### diagnostico_v1_065
- mode: diagnostico
- area: Lógica de dados
- category: Lógica de dados
- level: Básico
- concept: Granularidade
- question: Uma base tem uma linha por item. O gestor quer número de pedidos. Qual cuidado e essencial?
- options: ["Contar pedidos distintos","Contar linhas da tabela","Somar ids","Ordenar por nome do item"]
- correct_index: 0
- alternativa correta textual: Contar pedidos distintos
- explanation: Granularidade por item exige DISTINCT para contar pedidos.
- difficulty_score: 2
- question_type: cenario
- tags: logica_dados, granularidade, distinct
- estimated_time_seconds: 60

### diagnostico_v1_066
- mode: diagnostico
- area: Lógica de dados
- category: Lógica de dados
- level: Básico
- concept: Tipo numérico
- question: A coluna valor chegou como texto e a SOMA não funciona. Qual ação resolve a causa do problema?
- options: ["Converter a coluna para numérico","Aplicar arredondamento antes de corrigir o tipo","Remover separador de milhar sem validar decimal","Trocar apenas o formato da célula para Número"]
- correct_index: 0
- alternativa correta textual: Converter a coluna para numérico
- explanation: Operações matemáticas exigem tipo numérico válido.
- difficulty_score: 1
- question_type: conceitual
- tags: logica_dados, tipo_dado, numerico
- estimated_time_seconds: 45

### diagnostico_v1_070
- mode: diagnostico
- area: Lógica de dados
- category: Lógica de dados
- level: Intermediário
- concept: Modelo fato dimensão
- question: Por que separar tabela fato e dimensão facilita análise?
- options: ["Organiza medidas e contexto com menor redundância","Impede filtros por categoria","Elimina necessidade de chaves","Substitui validação de dados"]
- correct_index: 0
- alternativa correta textual: Organiza medidas e contexto com menor redundância
- explanation: Separação entre eventos e atributos melhora flexibilidade e consistência.
- difficulty_score: 3
- question_type: conceitual
- tags: logica_dados, modelagem, fato_dimensao
- estimated_time_seconds: 75

### diagnostico_v1_071
- mode: diagnostico
- area: Lógica de dados
- category: Lógica de dados
- level: Intermediário
- concept: Conformidade de dimensão
- question: Uma empresa tem duas tabelas de produto com códigos diferentes por canal. Qual risco principal surge sem dimensão conformada?
- options: ["Comparação inconsistente entre canais","Aumento automático de desempenho","Eliminação de duplicatas","Redução de volume de dados"]
- correct_index: 0
- alternativa correta textual: Comparação inconsistente entre canais
- explanation: Sem dimensão conformada, indicadores podem não ser comparáveis.
- difficulty_score: 3
- question_type: negocio
- tags: logica_dados, dimensao_conformada
- estimated_time_seconds: 75

### diagnostico_v1_077
- mode: diagnostico
- area: Lógica de dados
- category: Lógica de dados
- level: Avançado
- concept: Data contract
- question: Times de engenharia e analytics discutem schema a cada deploy. Qual prática reduz quebra inesperada?
- options: ["Adotar contrato de dados versionado com validação automática","Alterar schema sem aviso","Depender de comunicação informal","Remover testes de carga"]
- correct_index: 0
- alternativa correta textual: Adotar contrato de dados versionado com validação automática
- explanation: Data contracts formalizam expectativas e previnem quebras silenciosas.
- difficulty_score: 5
- question_type: negocio
- tags: logica_dados, data_contract, pipeline
- estimated_time_seconds: 90

## Desafio - SQL prático

### desafio_v1_001
- mode: desafio
- area: SQL prático
- category: SQL prático
- level: Básico
- concept: Filtro em data
- question: Você recebeu um chamado para auditar pedidos recentes. Qual consulta retorna somente pedidos dos últimos 7 dias?
- options: ["WHERE data_pedido >= data atual menos 7 dias","WHERE data_pedido entre início do mês e hoje","WHERE data_pedido <= data atual menos 7 dias","HAVING COUNT(*) > 0"]
- correct_index: 0
- alternativa correta textual: WHERE data_pedido >= data atual menos 7 dias
- explanation: A restrição temporal deve entrar no WHERE para limitar as linhas.
- difficulty_score: 2
- question_type: codigo
- tags: desafio, sql, where, data
- estimated_time_seconds: 60

### desafio_v1_002
- mode: desafio
- area: SQL prático
- category: SQL prático
- level: Intermediário
- concept: Contagem única
- question: Você quer contar clientes distintos que compraram no mês. Qual expressão está correta?
- options: ["COUNT(cliente_id)","COUNT(*)","COUNT(DISTINCT cliente_id)","SUM(cliente_id)"]
- correct_index: 2
- alternativa correta textual: COUNT(DISTINCT cliente_id)
- explanation: COUNT(DISTINCT) remove repetições de cliente_id.
- difficulty_score: 3
- question_type: cenario
- tags: desafio, sql, distinct
- estimated_time_seconds: 75

## Desafio - Excel/BI

### desafio_v1_005
- mode: desafio
- area: Excel/BI
- category: Excel/BI
- level: Básico
- concept: Procura por chave
- question: Em uma planilha de atendimento, você digitou o código do cliente e precisa retornar automaticamente o nome. Qual função resolve isso?
- options: ["SOMA","PROCV ou PROCX","CONT.SE","MAX"]
- correct_index: 1
- alternativa correta textual: PROCV ou PROCX
- explanation: PROCV/PROCX fazem busca por chave em tabela de referência.
- difficulty_score: 2
- question_type: cenario
- tags: desafio, excel, procx
- estimated_time_seconds: 60

### desafio_v1_006
- mode: desafio
- area: Excel/BI
- category: Excel/BI
- level: Intermediário
- concept: Tabela dinâmica
- question: Em uma tabela dinâmica, onde deve ficar a medida de receita?
- options: ["Em Linhas como texto","Em Valores com agregação","Em Filtros com MÉDIA de receita","Em Colunas com faixas de receita sem agregação"]
- correct_index: 1
- alternativa correta textual: Em Valores com agregação
- explanation: Medidas numéricas devem ir em Valores para agregação correta.
- difficulty_score: 3
- question_type: conceitual
- tags: desafio, excel, tabela_dinamica
- estimated_time_seconds: 75

## Desafio - Indicadores

### desafio_v1_009
- mode: desafio
- area: Indicadores
- category: Indicadores
- level: Básico
- concept: Gap de meta
- question: Meta de NPS era 70 e resultado foi 64. Qual gap absoluto?
- options: ["+6","-6","64%","70%"]
- correct_index: 1
- alternativa correta textual: -6
- explanation: Gap absoluto e resultado menos meta: 64 - 70 = -6.
- difficulty_score: 2
- question_type: conceitual
- tags: desafio, kpi, gap
- estimated_time_seconds: 60

### desafio_v1_010
- mode: desafio
- area: Indicadores
- category: Indicadores
- level: Intermediário
- concept: Leitura de funil
- question: Qual métrica mostra melhor onde o funil comercial está perdendo mais oportunidades?
- options: ["Receita total do trimestre","Taxa de conversão por etapa","Tempo médio de avanço entre etapas","Total de leads em cada etapa"]
- correct_index: 1
- alternativa correta textual: Taxa de conversão por etapa
- explanation: Taxa por etapa evidencia gargalo operacional no funil.
- difficulty_score: 3
- question_type: cenario
- tags: desafio, kpi, funil
- estimated_time_seconds: 75

## Desafio - Estatística

### desafio_v1_013
- mode: desafio
- area: Estatística
- category: Estatística
- level: Básico
- concept: Medida robusta
- question: Em um painel com poucos pedidos muito altos e muitos pedidos médios, qual medida tende a representar melhor o centro dos dados?
- options: ["Média","Mediana","Soma","Máximo"]
- correct_index: 1
- alternativa correta textual: Mediana
- explanation: Mediana reduz influência de valores extremos.
- difficulty_score: 2
- question_type: conceitual
- tags: desafio, estatistica, mediana
- estimated_time_seconds: 60

### desafio_v1_014
- mode: desafio
- area: Estatística
- category: Estatística
- level: Intermediário
- concept: Correlação
- question: O que uma correlação alta entre duas variáveis indica?
- options: ["Existe causalidade comprovada","Há associação e precisa de investigação adicional","As variáveis são idênticas","Uma variável deve ser removida"]
- correct_index: 1
- alternativa correta textual: Há associação e precisa de investigação adicional
- explanation: Correlação não comprova causa; apenas sinaliza relação estatística.
- difficulty_score: 3
- question_type: interpretacao
- tags: desafio, estatistica, correlacao
- estimated_time_seconds: 75

## Desafio - Lógica analítica

### desafio_v1_017
- mode: desafio
- area: Lógica analítica
- category: Lógica analítica
- level: Básico
- concept: Granularidade
- question: Se a base possui uma linha por item vendido, como contar pedidos corretamente?
- options: ["COUNT(*)","COUNT(DISTINCT pedido_id)","COUNT(pedido_id)","SUM(valor_total)"]
- correct_index: 1
- alternativa correta textual: COUNT(DISTINCT pedido_id)
- explanation: Com granularidade por item, DISTINCT evita supercontagem de pedidos.
- difficulty_score: 2
- question_type: cenario
- tags: desafio, logica, granularidade
- estimated_time_seconds: 60

### desafio_v1_018
- mode: desafio
- area: Lógica analítica
- category: Lógica analítica
- level: Intermediário
- concept: Integridade de chave
- question: Pedidos com cliente_id inexistente na dimensão clientes sugerem qual problema?
- options: ["Quebra de integridade referencial","Melhora de desempenho","Aumento de conversão","Erro apenas visual"]
- correct_index: 0
- alternativa correta textual: Quebra de integridade referencial
- explanation: Falta de correspondência de chave indica problema de integridade.
- difficulty_score: 3
- question_type: interpretacao
- tags: desafio, logica, integridade
- estimated_time_seconds: 75

## Checklist automático v1.4
- total diagnóstico: 80
- total desafio: 20
- correct_index válido (100/100): sim
- question_type inválido: 0
- duplicidade literal de enunciado: 0
- mojibake detectado: não