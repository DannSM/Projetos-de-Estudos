const diagnosticQuestions = [
  {
    area: "SQL",
    level: "Básico",
    concept: "SELECT e filtros",
    question: "Qual cláusula filtra linhas antes de uma agregação?",
    options: ["WHERE", "HAVING", "ORDER BY", "GROUP BY"],
    correct: 0,
    explanation: "WHERE filtra linhas antes do agrupamento. HAVING filtra após a agregação."
  },
  {
    area: "SQL",
    level: "Básico",
    concept: "COUNT e valores nulos",
    question: "Qual diferença prática existe entre COUNT(*) e COUNT(coluna)?",
    options: [
      "COUNT(*) conta linhas; COUNT(coluna) conta valores não nulos.",
      "COUNT(*) ignora duplicados; COUNT(coluna) conta duplicados.",
      "COUNT(*) só funciona com JOIN.",
      "Não existe diferença."
    ],
    correct: 0,
    explanation: "COUNT(*) conta todas as linhas. COUNT(coluna) ignora registros onde a coluna está NULL."
  },
  {
    area: "Estatística",
    level: "Básico",
    concept: "Tendência central",
    question: "Qual medida costuma ser mais resistente a valores extremos?",
    options: ["Média", "Mediana", "Amplitude", "Soma"],
    correct: 1,
    explanation: "A mediana sofre menos impacto de outliers do que a média."
  },
  {
    area: "Excel",
    level: "Básico",
    concept: "Referência absoluta",
    question: "Ao arrastar uma fórmula, qual referência permanece fixa na mesma célula?",
    options: ["A1", "$A$1", "A$1 e $A1 sempre mudam igual", "Nenhuma pode ser fixa"],
    correct: 1,
    explanation: "$A$1 fixa coluna e linha, mantendo o endereço na cópia da fórmula."
  },
  {
    area: "Lógica de dados",
    level: "Básico",
    concept: "Tipos de dados",
    question: "Por que diferenciar texto, número e data em uma base?",
    options: [
      "Porque muda apenas a cor da célula.",
      "Porque cálculos, filtros e ordenações dependem do tipo correto.",
      "Porque todo dado precisa virar texto.",
      "Porque datas não podem ser analisadas."
    ],
    correct: 1,
    explanation: "Sem tipo correto, filtros e cálculos podem gerar interpretações erradas."
  },
  {
    area: "Indicadores",
    level: "Básico",
    concept: "Meta e resultado",
    question: "Se a meta era 120 e o resultado foi 105, qual é o gap absoluto?",
    options: ["+15", "-15", "105%", "120%"],
    correct: 1,
    explanation: "Gap absoluto = resultado - meta. Nesse caso: 105 - 120 = -15."
  },
  {
    area: "SQL",
    level: "Intermediário",
    concept: "JOINs e cardinalidade",
    question: "Em um LEFT JOIN entre clientes e compras, o que ocorre com clientes sem compra?",
    options: [
      "São removidos do resultado.",
      "Aparecem com NULL nas colunas da tabela de compras.",
      "Aparecem apenas se houver chave duplicada.",
      "São contados apenas com COUNT(coluna)."
    ],
    correct: 1,
    explanation: "LEFT JOIN preserva a tabela da esquerda."
  },
  {
    area: "Lógica de dados",
    level: "Intermediário",
    concept: "Granularidade",
    question: "Se uma tabela tem uma linha por item vendido, como contar pedidos únicos?",
    options: [
      "Contando linhas da tabela.",
      "Somando preço dos itens.",
      "Contando IDs de pedido distintos.",
      "Ordenando os itens por nome."
    ],
    correct: 2,
    explanation: "Com uma linha por item, o pedido se repete. Use DISTINCT para pedidos únicos."
  },
  {
    area: "Estatística",
    level: "Intermediário",
    concept: "Correlação",
    question: "Correlação positiva entre duas métricas indica que:",
    options: [
      "Uma causa obrigatoriamente a outra.",
      "Quando uma cresce, a outra tende a crescer também.",
      "As duas sempre terão o mesmo valor.",
      "Não existe relação possível."
    ],
    correct: 1,
    explanation: "Correlação indica associação, não prova de causalidade."
  },
  {
    area: "Excel",
    level: "Intermediário",
    concept: "Tabela dinâmica",
    question: "Em uma Tabela Dinâmica, qual configuração é adequada para receita por mês e categoria?",
    options: [
      "Linhas: mês; Colunas: categoria; Valores: soma da receita.",
      "Linhas: receita; Valores: texto da categoria.",
      "Linhas: mês; Valores: contagem de categoria.",
      "Colunas: fórmula sem campo de valor."
    ],
    correct: 0,
    explanation: "Dimensões ficam em linhas/colunas e a medida agregada em valores."
  },
  {
    area: "Excel",
    level: "Intermediário",
    concept: "Busca por chave",
    question: "Qual função é mais indicada para buscar preço por código em outra tabela?",
    options: ["SE", "PROCV/PROCX", "SOMA", "MÉDIA"],
    correct: 1,
    explanation: "PROCV e PROCX servem para localizar valores por chave em outra tabela."
  },
  {
    area: "Indicadores",
    level: "Intermediário",
    concept: "Funil",
    question: "Qual KPI é mais acionável para entender perda no funil de vendas?",
    options: [
      "Cor do botão da página.",
      "Taxa de conversão por etapa.",
      "Quantidade de abas da planilha.",
      "Número de usuários no organograma."
    ],
    correct: 1,
    explanation: "A taxa por etapa mostra em qual ponto a perda está maior."
  },
  {
    area: "SQL",
    level: "Avançado",
    concept: "Análise por janela",
    question: "Qual recurso ranqueia vendas por cliente sem perder o detalhe das linhas?",
    options: [
      "GROUP BY cliente",
      "ORDER BY apenas no resultado final",
      "ROW_NUMBER() OVER(PARTITION BY cliente ORDER BY valor DESC)",
      "COUNT(*) sem agrupamento"
    ],
    correct: 2,
    explanation: "Funções de janela preservam granularidade e adicionam cálculos analíticos."
  },
  {
    area: "SQL",
    level: "Avançado",
    concept: "CTE",
    question: "Qual vantagem principal de usar CTE (WITH) em consultas longas?",
    options: [
      "Melhorar legibilidade e modularizar etapas da lógica.",
      "Substituir a necessidade de índices.",
      "Garantir sempre execução mais rápida.",
      "Evitar qualquer uso de JOIN."
    ],
    correct: 0,
    explanation: "CTE ajuda na organização e manutenção da consulta."
  },
  {
    area: "Indicadores",
    level: "Avançado",
    concept: "Diagnóstico por dimensão",
    question: "Um KPI caiu só em uma região. Qual análise tende a ser mais útil primeiro?",
    options: [
      "Alterar a meta global.",
      "Comparar canal, produto e período dentro dessa região.",
      "Parar de medir o indicador.",
      "Olhar apenas a média geral."
    ],
    correct: 1,
    explanation: "Quando a queda é localizada, a quebra por dimensões aponta a causa provável."
  },
  {
    area: "Estatística",
    level: "Avançado",
    concept: "Outliers",
    question: "Ao identificar um outlier extremo em receita, qual abordagem é mais adequada?",
    options: [
      "Remover sempre o valor sem investigar.",
      "Ignorar e seguir com a média.",
      "Investigar origem e comparar métricas robustas, como mediana.",
      "Trocar todos os valores por percentuais."
    ],
    correct: 2,
    explanation: "Outlier pode ser erro ou evento real; é preciso investigar antes de decidir tratar."
  },
  {
    area: "Excel",
    level: "Avançado",
    concept: "Modelagem analítica",
    question: "Em BI, por que separar fato e dimensão melhora análise?",
    options: [
      "Porque elimina validação de dados.",
      "Porque organiza medidas e contexto, facilitando filtros e agregações corretas.",
      "Porque impede relacionamento entre tabelas.",
      "Porque transforma tudo em texto."
    ],
    correct: 1,
    explanation: "Fato guarda eventos e medidas; dimensão descreve contexto de análise."
  },
  {
    area: "Lógica de dados",
    level: "Avançado",
    concept: "Duplicidade em JOIN",
    question: "Ao juntar pedidos e itens, o total de receita ficou dobrado. O que deve ser verificado primeiro?",
    options: [
      "A fonte da cor do dashboard.",
      "A cardinalidade do JOIN e a granularidade das tabelas.",
      "A ortografia dos nomes das colunas.",
      "A posição do ORDER BY."
    ],
    correct: 1,
    explanation: "Dobra de valores geralmente indica problema de cardinalidade ou granularidade."
  }
];

const challenges = [
  {
    category: "SQL Intermediário",
    level: "Intermediário",
    points: 20,
    question: "Qual é o resultado da query abaixo?",
    code: `SELECT COUNT(*)\nFROM cliente c\nLEFT JOIN compra cp\nON c.ID_CLIENTE = cp.ID_CLIENTE;`,
    context: "Existem 5 clientes. Apenas 3 fizeram compra. Um deles fez 2 compras.",
    options: ["A) 3", "B) 5", "C) 6", "D) 7"],
    correct: 2,
    explanation: "O LEFT JOIN mantém todos os clientes. Nesse cenário, o total de linhas resultante é 6."
  },
  {
    category: "SQL Básico",
    level: "Básico",
    points: 10,
    question: "Qual comando ordena o resultado de uma consulta?",
    options: ["ORDER BY", "GROUP BY", "WHERE", "JOIN"],
    correct: 0,
    explanation: "ORDER BY define a ordenação final do resultado."
  },
  {
    category: "SQL Básico",
    level: "Básico",
    points: 10,
    question: "Qual função soma valores numéricos em SQL?",
    options: ["COUNT", "SUM", "AVG", "MAX"],
    correct: 1,
    explanation: "SUM soma valores; AVG calcula média; COUNT conta linhas/valores."
  },
  {
    category: "SQL Intermediário",
    level: "Intermediário",
    points: 20,
    question: "Qual expressão evita contar o mesmo cliente mais de uma vez?",
    options: ["COUNT(cliente_id)", "COUNT(*)", "COUNT(DISTINCT cliente_id)", "SUM(cliente_id)"],
    correct: 2,
    explanation: "COUNT(DISTINCT) é usado para contagem de entidades únicas."
  },
  {
    category: "Excel e BI",
    level: "Intermediário",
    points: 15,
    question: "Em Excel, qual função é adequada para buscar valor por chave em outra tabela?",
    options: ["SE", "PROCV ou PROCX", "SOMA", "CONT.SE sem critério"],
    correct: 1,
    explanation: "PROCV/PROCX realizam busca por chave em tabela de apoio."
  },
  {
    category: "Estatística",
    level: "Básico",
    points: 10,
    question: "Se a mediana de uma lista é 50, o que isso significa?",
    options: [
      "Todos os valores são 50.",
      "O valor central dos dados ordenados é 50.",
      "A média necessariamente é 50.",
      "Não existem valores extremos."
    ],
    correct: 1,
    explanation: "A mediana representa o ponto central da distribuição ordenada."
  },
  {
    category: "Estatística",
    level: "Intermediário",
    points: 15,
    question: "Qual cuidado tomar ao ver correlação alta entre duas métricas?",
    options: [
      "Assumir causalidade imediata.",
      "Investigar contexto e hipóteses de causalidade.",
      "Ignorar a relação.",
      "Trocar as métricas por texto."
    ],
    correct: 1,
    explanation: "Correlação é sinal de investigação, não prova de causa."
  },
  {
    category: "Indicadores e KPIs",
    level: "Intermediário",
    points: 15,
    question: "Qual destes é um KPI mais acionável para um funil de vendas?",
    options: [
      "Cor favorita dos visitantes",
      "Taxa de conversão por etapa do funil",
      "Quantidade de fontes no dashboard",
      "Número de abas da planilha"
    ],
    correct: 1,
    explanation: "A taxa por etapa mostra onde concentrar ações de melhoria."
  },
  {
    category: "Raciocínio analítico",
    level: "Intermediário",
    points: 15,
    question: "Uma campanha teve ROI maior, mas receita total menor. O que deve ser verificado?",
    options: [
      "Se o investimento foi menor e concentrou vendas mais eficientes.",
      "Se o dashboard está com fundo escuro.",
      "Se o nome da campanha tem poucas letras.",
      "Se as colunas foram congeladas."
    ],
    correct: 0,
    explanation: "ROI é eficiência relativa; receita total depende também de volume/investimento."
  },
  {
    category: "Raciocínio analítico",
    level: "Intermediário",
    points: 15,
    question: "Um indicador caiu só em uma região. Qual próximo passo é mais útil?",
    options: [
      "Analisar canal, produto e período dentro dessa região.",
      "Alterar a meta de todas as regiões.",
      "Parar de medir o indicador.",
      "Comparar apenas com a média global."
    ],
    correct: 0,
    explanation: "A quebra por dimensão local aumenta a chance de achar a causa raiz."
  }
];

const heroPreviewChallenges = [
  {
    category: "SQL Básico",
    level: "Iniciante",
    points: 5,
    question: "Qual resultado a query retorna?",
    code: `SELECT COUNT(*)\nFROM clientes;`,
    context: "A tabela clientes possui 8 linhas cadastradas.",
    options: ["A) 1", "B) 5", "C) 8", "D) NULL"]
  },
  {
    category: "SQL Básico",
    level: "Iniciante",
    points: 5,
    question: "Qual filtro busca apenas vendas acima de 100?",
    code: `SELECT *\nFROM vendas\nWHERE valor > 100;`,
    context: "A cláusula WHERE restringe quais linhas entram no resultado.",
    options: ["A) valor maior que 100", "B) valor igual a 100", "C) todos os valores", "D) valores vazios"]
  },
  {
    category: "SQL Básico",
    level: "Básico",
    points: 8,
    question: "Qual coluna será usada para ordenar o resultado?",
    code: `SELECT nome, total\nFROM ranking_clientes\nORDER BY total DESC;`,
    context: "DESC mostra os maiores valores primeiro.",
    options: ["A) nome", "B) total", "C) ranking_clientes", "D) SELECT"]
  },
  {
    category: "Excel e BI",
    level: "Básico",
    points: 8,
    question: "Qual função calcula a média em uma planilha?",
    code: `=MÉDIA(B2:B12)`,
    context: "A função MÉDIA retorna o valor médio do intervalo.",
    options: ["A) SOMA", "B) MÉDIA", "C) MÁXIMO", "D) CONT.VALORES"]
  },
  {
    category: "Indicadores e KPIs",
    level: "Básico",
    points: 8,
    question: "Qual leitura combina melhor com esse indicador?",
    code: `conversao = vendas / visitantes`,
    context: "A taxa de conversão mede a proporção de visitantes que viraram vendas.",
    options: ["A) eficiência do funil", "B) estoque disponível", "C) soma de visitas", "D) custo fixo"]
  }
];

const areaGoals = ["SQL", "Estatística", "Excel", "Lógica de dados", "Indicadores"];

const areaGuides = {
  SQL: {
    track: "SQL Essencial -> SQL Intermediário",
    next: "COUNT(DISTINCT), JOINs, funções de janela e consultas com GROUP BY",
    why: "SQL é a base para buscar, combinar e validar dados com autonomia."
  },
  "Estatística": {
    track: "Estatística para Dados",
    next: "mediana, dispersão, correlação e leitura de distribuição",
    why: "Estatística ajuda a não tirar conclusões frágeis com base em médias isoladas."
  },
  Excel: {
    track: "Excel e BI Aplicado",
    next: "PROCV/PROCX, SOMASES, tabela dinâmica e organização por dimensões",
    why: "Excel acelera análises rápidas e BI transforma isso em leitura gerencial clara."
  },
  "Lógica de dados": {
    track: "Fundamentos de Dados",
    next: "granularidade, tipos de dados e qualidade da base",
    why: "A lógica da base evita contagens erradas e interpretações distorcidas."
  },
  Indicadores: {
    track: "Indicadores e KPIs",
    next: "contexto, variação percentual, metas e diagnóstico por dimensão",
    why: "Interpretar KPIs conecta cálculo técnico com decisão de negócio."
  }
};

window.diagnosticQuestions = diagnosticQuestions;
window.challenges = challenges;
