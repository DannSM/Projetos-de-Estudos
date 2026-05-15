const diagnosticQuestions = [
  {
    area: "SQL",
    level: "Básico",
    concept: "SELECT e filtros",
    question: "Qual cláusula filtra linhas antes de uma agregação?",
    options: ["WHERE", "HAVING", "ORDER BY", "GROUP BY"],
    correct: 0,
    explanation: "WHERE filtra linhas antes do agrupamento. HAVING filtra depois que a agregação já foi calculada."
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
    explanation: "COUNT(*) conta todas as linhas retornadas. COUNT(coluna) ignora linhas em que aquela coluna está NULL."
  },
  {
    area: "Estatística",
    level: "Básico",
    concept: "Tendência central",
    question: "Qual medida costuma ser mais resistente a valores extremos?",
    options: ["Média", "Mediana", "Amplitude", "Soma"],
    correct: 1,
    explanation: "A mediana usa a posição central dos dados ordenados, então sofre menos impacto de valores muito altos ou baixos."
  },
  {
    area: "Excel",
    level: "Básico",
    concept: "Referência absoluta",
    question: "Ao arrastar uma fórmula para baixo, qual referência permanece fixa na mesma célula?",
    options: ["A1", "$A$1", "A$1 e $A1 sempre mudam igual", "Nenhuma referência pode ser fixa"],
    correct: 1,
    explanation: "A referência $A$1 fixa coluna e linha. Ao copiar a fórmula, o endereço continua apontando para a mesma célula."
  },
  {
    area: "SQL",
    level: "Intermediário",
    concept: "JOINs e cardinalidade",
    question: "Em um LEFT JOIN entre clientes e compras, o que acontece com clientes sem compras?",
    options: [
      "Eles são removidos do resultado.",
      "Eles aparecem uma vez, com NULL nos campos da tabela de compras.",
      "Eles aparecem apenas se houver chave duplicada.",
      "Eles são contados somente com COUNT(coluna)."
    ],
    correct: 1,
    explanation: "O LEFT JOIN preserva a tabela da esquerda. Sem correspondência, os campos da tabela da direita ficam NULL."
  },
  {
    area: "Lógica de dados",
    level: "Intermediário",
    concept: "Granularidade",
    question: "Uma tabela tem uma linha por item comprado. Qual cuidado é essencial ao contar pedidos únicos?",
    options: [
      "Somar todos os preços sem agrupar.",
      "Contar as linhas da tabela.",
      "Contar IDs de pedido distintos.",
      "Ordenar os itens por nome."
    ],
    correct: 2,
    explanation: "Se cada pedido pode ter vários itens, contar linhas mede itens. Para pedidos únicos, use IDs distintos."
  },
  {
    area: "Estatística",
    level: "Intermediário",
    concept: "Correlação",
    question: "Se duas métricas têm correlação positiva, qual leitura é mais adequada?",
    options: [
      "Quando uma aumenta, a outra tende a aumentar também.",
      "Uma causa obrigatoriamente a outra.",
      "As duas sempre terão o mesmo valor.",
      "Não existe relação possível entre elas."
    ],
    correct: 0,
    explanation: "Correlação indica associação, não causalidade. Ela sugere movimento conjunto, mas não prova causa."
  },
  {
    area: "Excel",
    level: "Intermediário",
    concept: "Tabela dinâmica",
    question: "Em uma Tabela Dinâmica, qual configuração ajuda a analisar receita por mês e categoria?",
    options: [
      "Linhas: mês, Colunas: categoria, Valores: soma de receita.",
      "Linhas: receita, Valores: texto da categoria.",
      "Linhas: mês, Valores: contagem de nomes de produto.",
      "Colunas: fórmula aleatória sem campo de valor."
    ],
    correct: 0,
    explanation: "A estrutura clássica usa dimensões em linhas/colunas e medida agregada em valores, como soma de receita."
  },
  {
    area: "Indicadores",
    level: "Avançado",
    concept: "Diagnóstico de performance",
    question: "Um KPI caiu apenas em uma região. Qual investigação tende a ser mais útil primeiro?",
    options: [
      "Alterar a meta de todas as regiões.",
      "Comparar canal, produto e período dentro dessa região.",
      "Parar de medir o indicador.",
      "Olhar apenas a média global."
    ],
    correct: 1,
    explanation: "Quando a queda está localizada, quebras por dimensões internas ajudam a encontrar a causa provável."
  },
  {
    area: "SQL",
    level: "Avançado",
    concept: "Análise por janela",
    question: "Qual recurso ajuda a ranquear vendas por cliente sem perder o detalhe das linhas?",
    options: [
      "WHERE",
      "ORDER BY simples no resultado final",
      "Função de janela como ROW_NUMBER() OVER(PARTITION BY cliente ORDER BY valor DESC)",
      "COUNT(*) sem agrupamento"
    ],
    correct: 2,
    explanation: "Funções de janela calculam rankings e acumulados mantendo o detalhe das linhas, diferente de um GROUP BY tradicional."
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
    explanation: "O LEFT JOIN mantém todos os clientes. Dois clientes sem compra geram 2 linhas com NULL, dois clientes com 1 compra geram 2 linhas e um cliente com 2 compras gera 2 linhas. Total: 6."
  },
  {
    category: "SQL Básico",
    level: "Básico",
    points: 10,
    question: "Qual comando ordena o resultado de uma consulta?",
    options: ["ORDER BY", "GROUP BY", "WHERE", "JOIN"],
    correct: 0,
    explanation: "ORDER BY define a ordenação final do resultado, seja crescente ou decrescente."
  },
  {
    category: "SQL Básico",
    level: "Básico",
    points: 10,
    question: "Qual função soma valores numéricos em SQL?",
    options: ["COUNT", "SUM", "AVG", "MAX"],
    correct: 1,
    explanation: "SUM soma valores. COUNT conta linhas ou valores não nulos, AVG calcula média e MAX retorna o maior valor."
  },
  {
    category: "SQL Intermediário",
    level: "Intermediário",
    points: 20,
    question: "Qual expressão evita contar o mesmo cliente mais de uma vez?",
    options: ["COUNT(cliente_id)", "COUNT(*)", "COUNT(DISTINCT cliente_id)", "SUM(cliente_id)"],
    correct: 2,
    explanation: "COUNT(DISTINCT cliente_id) conta clientes únicos, útil quando a base tem múltiplas linhas por cliente."
  },
  {
    category: "Excel e BI",
    level: "Intermediário",
    points: 15,
    question: "Em Excel, qual função é mais adequada para buscar valor por chave em outra tabela?",
    options: ["SE", "PROCV ou PROCX", "SOMA", "CONT.SE sem critério"],
    correct: 1,
    explanation: "PROCV/PROCX são funções de busca para relacionar uma chave com outro campo em uma tabela de apoio."
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
    explanation: "A mediana é o ponto central da lista ordenada. Ela não exige que todos os valores sejam iguais."
  },
  {
    category: "Estatística",
    level: "Intermediário",
    points: 15,
    question: "Qual cuidado tomar ao ver uma correlação alta entre duas métricas?",
    options: [
      "Assumir causalidade imediata.",
      "Investigar contexto, variáveis externas e hipótese de causalidade.",
      "Ignorar a relação.",
      "Trocar as métricas por texto."
    ],
    correct: 1,
    explanation: "Correlação é um sinal para investigar. Ela não prova causalidade sozinha."
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
    explanation: "A taxa por etapa mostra onde há perda no funil e orienta ações de melhoria."
  },
  {
    category: "Raciocínio analítico",
    level: "Intermediário",
    points: 15,
    question: "Uma campanha teve ROI maior, mas receita total menor. Qual hipótese deve ser verificada?",
    options: [
      "Se o investimento foi menor e concentrou vendas mais eficientes.",
      "Se o dashboard está com fundo escuro.",
      "Se o nome da campanha tem poucas letras.",
      "Se as colunas foram congeladas."
    ],
    correct: 0,
    explanation: "ROI mede eficiência relativa. Receita total pode cair mesmo com ROI maior se o investimento ou alcance forem menores."
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
    explanation: "Quando a queda está localizada, quebre por dimensões internas para encontrar a causa provável."
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
    why: "Estatística ajuda a não tirar conclusões frágeis a partir de médias ou variações isoladas."
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
