-- Data Skill Map - Seed inicial do Question Bank
-- Fonte: arrays hardcoded atuais (src/data/content.js)
-- Idempotente via question_key.

insert into public.question_bank (
  question_key,
  mode,
  area,
  category,
  level,
  concept,
  question,
  code,
  context,
  options,
  correct_index,
  explanation,
  points,
  is_active,
  display_order,
  source
)
values
  (
    'diagnostico_001', 'diagnostico', 'SQL', null, 'Básico', 'SELECT e filtros',
    'Qual cláusula filtra linhas antes de uma agregação?', null, null,
    '["WHERE", "HAVING", "ORDER BY", "GROUP BY"]'::jsonb,
    0, 'WHERE filtra linhas antes do agrupamento. HAVING filtra após a agregação.',
    null, true, 1, 'hardcoded_migration'
  ),
  (
    'diagnostico_002', 'diagnostico', 'SQL', null, 'Básico', 'COUNT e valores nulos',
    'Qual diferença prática existe entre COUNT(*) e COUNT(coluna)?', null, null,
    '["COUNT(*) conta linhas; COUNT(coluna) conta valores não nulos.", "COUNT(*) ignora duplicados; COUNT(coluna) conta duplicados.", "COUNT(*) só funciona com JOIN.", "Não existe diferença."]'::jsonb,
    0, 'COUNT(*) conta todas as linhas. COUNT(coluna) ignora registros onde a coluna está NULL.',
    null, true, 2, 'hardcoded_migration'
  ),
  (
    'diagnostico_003', 'diagnostico', 'Estatística', null, 'Básico', 'Tendência central',
    'Qual medida costuma ser mais resistente a valores extremos?', null, null,
    '["Média", "Mediana", "Amplitude", "Soma"]'::jsonb,
    1, 'A mediana sofre menos impacto de outliers do que a média.',
    null, true, 3, 'hardcoded_migration'
  ),
  (
    'diagnostico_004', 'diagnostico', 'Excel', null, 'Básico', 'Referência absoluta',
    'Ao arrastar uma fórmula, qual referência permanece fixa na mesma célula?', null, null,
    '["A1", "$A$1", "A$1 e $A1 sempre mudam igual", "Nenhuma pode ser fixa"]'::jsonb,
    1, '$A$1 fixa coluna e linha, mantendo o endereço na cópia da fórmula.',
    null, true, 4, 'hardcoded_migration'
  ),
  (
    'diagnostico_005', 'diagnostico', 'Lógica de dados', null, 'Básico', 'Tipos de dados',
    'Por que diferenciar texto, número e data em uma base?', null, null,
    '["Porque muda apenas a cor da célula.", "Porque cálculos, filtros e ordenações dependem do tipo correto.", "Porque todo dado precisa virar texto.", "Porque datas não podem ser analisadas."]'::jsonb,
    1, 'Sem tipo correto, filtros e cálculos podem gerar interpretações erradas.',
    null, true, 5, 'hardcoded_migration'
  ),
  (
    'diagnostico_006', 'diagnostico', 'Indicadores', null, 'Básico', 'Meta e resultado',
    'Se a meta era 120 e o resultado foi 105, qual é o gap absoluto?', null, null,
    '["+15", "-15", "105%", "120%"]'::jsonb,
    1, 'Gap absoluto = resultado - meta. Nesse caso: 105 - 120 = -15.',
    null, true, 6, 'hardcoded_migration'
  ),
  (
    'diagnostico_007', 'diagnostico', 'SQL', null, 'Intermediário', 'JOINs e cardinalidade',
    'Em um LEFT JOIN entre clientes e compras, o que ocorre com clientes sem compra?', null, null,
    '["São removidos do resultado.", "Aparecem com NULL nas colunas da tabela de compras.", "Aparecem apenas se houver chave duplicada.", "São contados apenas com COUNT(coluna)."]'::jsonb,
    1, 'LEFT JOIN preserva a tabela da esquerda.',
    null, true, 7, 'hardcoded_migration'
  ),
  (
    'diagnostico_008', 'diagnostico', 'Lógica de dados', null, 'Intermediário', 'Granularidade',
    'Se uma tabela tem uma linha por item vendido, como contar pedidos únicos?', null, null,
    '["Contando linhas da tabela.", "Somando preço dos itens.", "Contando IDs de pedido distintos.", "Ordenando os itens por nome."]'::jsonb,
    2, 'Com uma linha por item, o pedido se repete. Use DISTINCT para pedidos únicos.',
    null, true, 8, 'hardcoded_migration'
  ),
  (
    'diagnostico_009', 'diagnostico', 'Estatística', null, 'Intermediário', 'Correlação',
    'Correlação positiva entre duas métricas indica que:', null, null,
    '["Uma causa obrigatoriamente a outra.", "Quando uma cresce, a outra tende a crescer também.", "As duas sempre terão o mesmo valor.", "Não existe relação possível."]'::jsonb,
    1, 'Correlação indica associação, não prova de causalidade.',
    null, true, 9, 'hardcoded_migration'
  ),
  (
    'diagnostico_010', 'diagnostico', 'Excel', null, 'Intermediário', 'Tabela dinâmica',
    'Em uma Tabela Dinâmica, qual configuração é adequada para receita por mês e categoria?', null, null,
    '["Linhas: mês; Colunas: categoria; Valores: soma da receita.", "Linhas: receita; Valores: texto da categoria.", "Linhas: mês; Valores: contagem de categoria.", "Colunas: fórmula sem campo de valor."]'::jsonb,
    0, 'Dimensões ficam em linhas/colunas e a medida agregada em valores.',
    null, true, 10, 'hardcoded_migration'
  ),
  (
    'diagnostico_011', 'diagnostico', 'Excel', null, 'Intermediário', 'Busca por chave',
    'Qual função é mais indicada para buscar preço por código em outra tabela?', null, null,
    '["SE", "PROCV/PROCX", "SOMA", "MÉDIA"]'::jsonb,
    1, 'PROCV e PROCX servem para localizar valores por chave em outra tabela.',
    null, true, 11, 'hardcoded_migration'
  ),
  (
    'diagnostico_012', 'diagnostico', 'Indicadores', null, 'Intermediário', 'Funil',
    'Qual KPI é mais acionável para entender perda no funil de vendas?', null, null,
    '["Cor do botão da página.", "Taxa de conversão por etapa.", "Quantidade de abas da planilha.", "Número de usuários no organograma."]'::jsonb,
    1, 'A taxa por etapa mostra em qual ponto a perda está maior.',
    null, true, 12, 'hardcoded_migration'
  ),
  (
    'diagnostico_013', 'diagnostico', 'SQL', null, 'Avançado', 'Análise por janela',
    'Qual recurso ranqueia vendas por cliente sem perder o detalhe das linhas?', null, null,
    '["GROUP BY cliente", "ORDER BY apenas no resultado final", "ROW_NUMBER() OVER(PARTITION BY cliente ORDER BY valor DESC)", "COUNT(*) sem agrupamento"]'::jsonb,
    2, 'Funções de janela preservam granularidade e adicionam cálculos analíticos.',
    null, true, 13, 'hardcoded_migration'
  ),
  (
    'diagnostico_014', 'diagnostico', 'SQL', null, 'Avançado', 'CTE',
    'Qual vantagem principal de usar CTE (WITH) em consultas longas?', null, null,
    '["Melhorar legibilidade e modularizar etapas da lógica.", "Substituir a necessidade de índices.", "Garantir sempre execução mais rápida.", "Evitar qualquer uso de JOIN."]'::jsonb,
    0, 'CTE ajuda na organização e manutenção da consulta.',
    null, true, 14, 'hardcoded_migration'
  ),
  (
    'diagnostico_015', 'diagnostico', 'Indicadores', null, 'Avançado', 'Diagnóstico por dimensão',
    'Um KPI caiu só em uma região. Qual análise tende a ser mais útil primeiro?', null, null,
    '["Alterar a meta global.", "Comparar canal, produto e período dentro dessa região.", "Parar de medir o indicador.", "Olhar apenas a média geral."]'::jsonb,
    1, 'Quando a queda é localizada, a quebra por dimensões aponta a causa provável.',
    null, true, 15, 'hardcoded_migration'
  ),
  (
    'diagnostico_016', 'diagnostico', 'Estatística', null, 'Avançado', 'Outliers',
    'Ao identificar um outlier extremo em receita, qual abordagem é mais adequada?', null, null,
    '["Remover sempre o valor sem investigar.", "Ignorar e seguir com a média.", "Investigar origem e comparar métricas robustas, como mediana.", "Trocar todos os valores por percentuais."]'::jsonb,
    2, 'Outlier pode ser erro ou evento real; é preciso investigar antes de decidir tratar.',
    null, true, 16, 'hardcoded_migration'
  ),
  (
    'diagnostico_017', 'diagnostico', 'Excel', null, 'Avançado', 'Modelagem analítica',
    'Em BI, por que separar fato e dimensão melhora análise?', null, null,
    '["Porque elimina validação de dados.", "Porque organiza medidas e contexto, facilitando filtros e agregações corretas.", "Porque impede relacionamento entre tabelas.", "Porque transforma tudo em texto."]'::jsonb,
    1, 'Fato guarda eventos e medidas; dimensão descreve contexto de análise.',
    null, true, 17, 'hardcoded_migration'
  ),
  (
    'diagnostico_018', 'diagnostico', 'Lógica de dados', null, 'Avançado', 'Duplicidade em JOIN',
    'Ao juntar pedidos e itens, o total de receita ficou dobrado. O que deve ser verificado primeiro?', null, null,
    '["A fonte da cor do dashboard.", "A cardinalidade do JOIN e a granularidade das tabelas.", "A ortografia dos nomes das colunas.", "A posição do ORDER BY."]'::jsonb,
    1, 'Dobra de valores geralmente indica problema de cardinalidade ou granularidade.',
    null, true, 18, 'hardcoded_migration'
  ),
  (
    'desafio_001', 'desafio', 'SQL Intermediário', 'SQL Intermediário', 'Intermediário', null,
    'Qual é o resultado da query abaixo?',
    $$SELECT COUNT(*)
FROM cliente c
LEFT JOIN compra cp
ON c.ID_CLIENTE = cp.ID_CLIENTE;$$,
    'Existem 5 clientes. Apenas 3 fizeram compra. Um deles fez 2 compras.',
    '["A) 3", "B) 5", "C) 6", "D) 7"]'::jsonb,
    2, 'O LEFT JOIN mantém todos os clientes. Nesse cenário, o total de linhas resultante é 6.',
    20, true, 1, 'hardcoded_migration'
  ),
  (
    'desafio_002', 'desafio', 'SQL Básico', 'SQL Básico', 'Básico', null,
    'Qual comando ordena o resultado de uma consulta?', null, null,
    '["ORDER BY", "GROUP BY", "WHERE", "JOIN"]'::jsonb,
    0, 'ORDER BY define a ordenação final do resultado.',
    10, true, 2, 'hardcoded_migration'
  ),
  (
    'desafio_003', 'desafio', 'SQL Básico', 'SQL Básico', 'Básico', null,
    'Qual função soma valores numéricos em SQL?', null, null,
    '["COUNT", "SUM", "AVG", "MAX"]'::jsonb,
    1, 'SUM soma valores; AVG calcula média; COUNT conta linhas/valores.',
    10, true, 3, 'hardcoded_migration'
  ),
  (
    'desafio_004', 'desafio', 'SQL Intermediário', 'SQL Intermediário', 'Intermediário', null,
    'Qual expressão evita contar o mesmo cliente mais de uma vez?', null, null,
    '["COUNT(cliente_id)", "COUNT(*)", "COUNT(DISTINCT cliente_id)", "SUM(cliente_id)"]'::jsonb,
    2, 'COUNT(DISTINCT) é usado para contagem de entidades únicas.',
    20, true, 4, 'hardcoded_migration'
  ),
  (
    'desafio_005', 'desafio', 'Excel e BI', 'Excel e BI', 'Intermediário', null,
    'Em Excel, qual função é adequada para buscar valor por chave em outra tabela?', null, null,
    '["SE", "PROCV ou PROCX", "SOMA", "CONT.SE sem critério"]'::jsonb,
    1, 'PROCV/PROCX realizam busca por chave em tabela de apoio.',
    15, true, 5, 'hardcoded_migration'
  ),
  (
    'desafio_006', 'desafio', 'Estatística', 'Estatística', 'Básico', null,
    'Se a mediana de uma lista é 50, o que isso significa?', null, null,
    '["Todos os valores são 50.", "O valor central dos dados ordenados é 50.", "A média necessariamente é 50.", "Não existem valores extremos."]'::jsonb,
    1, 'A mediana representa o ponto central da distribuição ordenada.',
    10, true, 6, 'hardcoded_migration'
  ),
  (
    'desafio_007', 'desafio', 'Estatística', 'Estatística', 'Intermediário', null,
    'Qual cuidado tomar ao ver correlação alta entre duas métricas?', null, null,
    '["Assumir causalidade imediata.", "Investigar contexto e hipóteses de causalidade.", "Ignorar a relação.", "Trocar as métricas por texto."]'::jsonb,
    1, 'Correlação é sinal de investigação, não prova de causa.',
    15, true, 7, 'hardcoded_migration'
  ),
  (
    'desafio_008', 'desafio', 'Indicadores e KPIs', 'Indicadores e KPIs', 'Intermediário', null,
    'Qual destes é um KPI mais acionável para um funil de vendas?', null, null,
    '["Cor favorita dos visitantes", "Taxa de conversão por etapa do funil", "Quantidade de fontes no dashboard", "Número de abas da planilha"]'::jsonb,
    1, 'A taxa por etapa mostra onde concentrar ações de melhoria.',
    15, true, 8, 'hardcoded_migration'
  ),
  (
    'desafio_009', 'desafio', 'Raciocínio analítico', 'Raciocínio analítico', 'Intermediário', null,
    'Uma campanha teve ROI maior, mas receita total menor. O que deve ser verificado?', null, null,
    '["Se o investimento foi menor e concentrou vendas mais eficientes.", "Se o dashboard está com fundo escuro.", "Se o nome da campanha tem poucas letras.", "Se as colunas foram congeladas."]'::jsonb,
    0, 'ROI é eficiência relativa; receita total depende também de volume/investimento.',
    15, true, 9, 'hardcoded_migration'
  ),
  (
    'desafio_010', 'desafio', 'Raciocínio analítico', 'Raciocínio analítico', 'Intermediário', null,
    'Um indicador caiu só em uma região. Qual próximo passo é mais útil?', null, null,
    '["Analisar canal, produto e período dentro dessa região.", "Alterar a meta de todas as regiões.", "Parar de medir o indicador.", "Comparar apenas com a média global."]'::jsonb,
    0, 'A quebra por dimensão local aumenta a chance de achar a causa raiz.',
    15, true, 10, 'hardcoded_migration'
  )
on conflict (question_key) do update
set
  mode = excluded.mode,
  area = excluded.area,
  category = excluded.category,
  level = excluded.level,
  concept = excluded.concept,
  question = excluded.question,
  code = excluded.code,
  context = excluded.context,
  options = excluded.options,
  correct_index = excluded.correct_index,
  explanation = excluded.explanation,
  points = excluded.points,
  is_active = excluded.is_active,
  display_order = excluded.display_order,
  source = excluded.source,
  updated_at = now();
