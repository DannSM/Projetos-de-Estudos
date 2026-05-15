const diagnosticQuestions = [
  {
    area: "SQL",
    level: "Basico",
    concept: "SELECT e filtros",
    question: "Qual clausula filtra linhas antes de uma agregacao?",
    options: ["WHERE", "HAVING", "ORDER BY", "GROUP BY"],
    correct: 0,
    explanation: "WHERE filtra linhas antes do agrupamento. HAVING filtra depois que a agregacao ja foi calculada."
  },
  {
    area: "SQL",
    level: "Basico",
    concept: "COUNT e valores nulos",
    question: "Qual diferenca pratica existe entre COUNT(*) e COUNT(coluna)?",
    options: [
      "COUNT(*) conta linhas; COUNT(coluna) conta valores nao nulos.",
      "COUNT(*) ignora duplicados; COUNT(coluna) conta duplicados.",
      "COUNT(*) so funciona com JOIN.",
      "Nao existe diferenca."
    ],
    correct: 0,
    explanation: "COUNT(*) conta todas as linhas retornadas. COUNT(coluna) ignora linhas em que aquela coluna esta NULL."
  },
  {
    area: "Estatistica",
    level: "Basico",
    concept: "Tendencia central",
    question: "Qual medida costuma ser mais resistente a valores extremos?",
    options: ["Media", "Mediana", "Amplitude", "Soma"],
    correct: 1,
    explanation: "A mediana usa a posicao central dos dados ordenados, entao sofre menos impacto de valores muito altos ou baixos."
  },
  {
    area: "Logica de dados",
    level: "Basico",
    concept: "Tipos de dados",
    question: "Por que diferenciar texto, numero e data em uma base?",
    options: [
      "Porque muda apenas a cor das celulas.",
      "Porque calculos, filtros e ordenacoes dependem do tipo correto.",
      "Porque todo dado precisa virar texto.",
      "Porque datas nao podem ser analisadas."
    ],
    correct: 1,
    explanation: "Tipos corretos evitam filtros errados, calculos invalidos e ordenacoes enganosas."
  },
  {
    area: "SQL",
    level: "Intermediario",
    concept: "JOINs e cardinalidade",
    question: "Em um LEFT JOIN entre clientes e compras, o que acontece com clientes sem compras?",
    options: [
      "Eles sao removidos do resultado.",
      "Eles aparecem uma vez, com NULL nos campos da tabela de compras.",
      "Eles aparecem apenas se houver chave duplicada.",
      "Eles sao contados somente com COUNT(coluna)."
    ],
    correct: 1,
    explanation: "O LEFT JOIN preserva a tabela da esquerda. Sem correspondencia, os campos da tabela da direita ficam NULL."
  },
  {
    area: "Logica de dados",
    level: "Intermediario",
    concept: "Granularidade",
    question: "Uma tabela tem uma linha por item comprado. Qual cuidado e essencial ao contar pedidos unicos?",
    options: [
      "Somar todos os precos sem agrupar.",
      "Contar as linhas da tabela.",
      "Contar IDs de pedido distintos.",
      "Ordenar os itens por nome."
    ],
    correct: 2,
    explanation: "Se cada pedido pode ter varios itens, contar linhas mede itens. Para pedidos unicos, use IDs distintos."
  },
  {
    area: "Estatistica",
    level: "Intermediario",
    concept: "Correlacao",
    question: "Se duas metricas tem correlacao positiva, qual leitura e mais adequada?",
    options: [
      "Quando uma aumenta, a outra tende a aumentar tambem.",
      "Uma causa obrigatoriamente a outra.",
      "As duas sempre terao o mesmo valor.",
      "Nao existe relacao possivel entre elas."
    ],
    correct: 0,
    explanation: "Correlacao indica associacao, nao causalidade. Ela sugere movimento conjunto, mas nao prova causa."
  },
  {
    area: "Excel/BI",
    level: "Intermediario",
    concept: "Modelo de dados",
    question: "Em BI, por que separar tabelas fato e dimensao costuma ajudar?",
    options: [
      "Porque elimina a necessidade de validar dados.",
      "Porque organiza metricas e contextos de analise, facilitando filtros e agregacoes.",
      "Porque impede o uso de relacionamentos.",
      "Porque transforma todos os dados em texto."
    ],
    correct: 1,
    explanation: "Tabelas fato guardam eventos e medidas. Dimensoes descrevem contextos como produto, cliente e tempo."
  },
  {
    area: "Indicadores",
    level: "Avancado",
    concept: "Diagnostico de performance",
    question: "Um KPI caiu apenas em uma regiao. Qual investigacao tende a ser mais util primeiro?",
    options: [
      "Alterar a meta de todas as regioes.",
      "Comparar canal, produto e periodo dentro dessa regiao.",
      "Parar de medir o indicador.",
      "Olhar apenas a media global."
    ],
    correct: 1,
    explanation: "Quando a queda esta localizada, quebras por dimensoes internas ajudam a encontrar a causa provavel."
  },
  {
    area: "SQL",
    level: "Avancado",
    concept: "Analise por janela",
    question: "Qual recurso ajuda a ranquear vendas por cliente sem perder o detalhe das linhas?",
    options: [
      "WHERE",
      "ORDER BY simples no resultado final",
      "Funcao de janela como ROW_NUMBER() OVER(PARTITION BY cliente ORDER BY valor DESC)",
      "COUNT(*) sem agrupamento"
    ],
    correct: 2,
    explanation: "Funcoes de janela calculam rankings e acumulados mantendo o detalhe das linhas, diferente de um GROUP BY tradicional."
  }
];
const challenges = [
  {
    category: "SQL Intermediario",
    level: "Intermediario",
    points: 20,
    question: "Qual o resultado da query abaixo?",
    code: `SELECT COUNT(*)\nFROM cliente c\nLEFT JOIN compra cp\nON c.ID_CLIENTE = cp.ID_CLIENTE;`,
    context: "Existem 5 clientes. Apenas 3 fizeram compra. Um deles fez 2 compras.",
    options: ["A) 3", "B) 5", "C) 6", "D) 7"],
    correct: 2,
    explanation: "O LEFT JOIN mantem todos os clientes. Dois clientes sem compra geram 2 linhas com NULL, dois clientes com 1 compra geram 2 linhas e um cliente com 2 compras gera 2 linhas. Total: 6."
  },
  {
    category: "SQL Basico",
    level: "Basico",
    points: 10,
    question: "Qual comando ordena o resultado de uma consulta?",
    options: ["ORDER BY", "GROUP BY", "WHERE", "JOIN"],
    correct: 0,
    explanation: "ORDER BY define a ordenacao final do resultado, seja crescente ou decrescente."
  },
  {
    category: "SQL Basico",
    level: "Basico",
    points: 10,
    question: "Qual funcao soma valores numericos em SQL?",
    options: ["COUNT", "SUM", "AVG", "MAX"],
    correct: 1,
    explanation: "SUM soma valores. COUNT conta linhas ou valores nao nulos, AVG calcula media e MAX retorna o maior valor."
  },
  {
    category: "SQL Intermediario",
    level: "Intermediario",
    points: 20,
    question: "Qual expressao evita contar o mesmo cliente mais de uma vez?",
    options: ["COUNT(cliente_id)", "COUNT(*)", "COUNT(DISTINCT cliente_id)", "SUM(cliente_id)"],
    correct: 2,
    explanation: "COUNT(DISTINCT cliente_id) conta clientes unicos, util quando a base tem multiplas linhas por cliente."
  },
  {
    category: "Estatistica",
    level: "Basico",
    points: 10,
    question: "Se a mediana de uma lista e 50, o que isso significa?",
    options: [
      "Todos os valores sao 50.",
      "O valor central dos dados ordenados e 50.",
      "A media necessariamente e 50.",
      "Nao existem valores extremos."
    ],
    correct: 1,
    explanation: "A mediana e o ponto central da lista ordenada. Ela nao exige que todos os valores sejam iguais."
  },
  {
    category: "Estatistica",
    level: "Intermediario",
    points: 15,
    question: "Qual cuidado tomar ao ver uma correlacao alta entre duas metricas?",
    options: [
      "Assumir causalidade imediata.",
      "Investigar contexto, variaveis externas e hipotese de causalidade.",
      "Ignorar a relacao.",
      "Trocar as metricas por texto."
    ],
    correct: 1,
    explanation: "Correlacao e um sinal para investigar. Ela nao prova causalidade sozinha."
  },
  {
    category: "Indicadores e KPIs",
    level: "Intermediario",
    points: 15,
    question: "Qual destes e um KPI mais acionavel para um funil de vendas?",
    options: [
      "Cor favorita dos visitantes",
      "Taxa de conversao por etapa do funil",
      "Quantidade de fontes no dashboard",
      "Numero de abas da planilha"
    ],
    correct: 1,
    explanation: "A taxa por etapa mostra onde ha perda no funil e orienta acões de melhoria."
  },
  {
    category: "Indicadores e KPIs",
    level: "Basico",
    points: 10,
    question: "Uma meta era 80 e o resultado foi 72. Qual e o gap?",
    options: ["8 abaixo da meta", "8 acima da meta", "72%", "80%"],
    correct: 0,
    explanation: "O gap absoluto e resultado menos meta: 72 - 80 = -8. Esta 8 unidades abaixo da meta."
  },
  {
    category: "Raciocinio analitico",
    level: "Intermediario",
    points: 15,
    question: "Uma campanha teve ROI maior, mas receita total menor. Qual hipotese deve ser verificada?",
    options: [
      "Se o investimento foi menor e concentrou vendas mais eficientes.",
      "Se o dashboard esta com fundo escuro.",
      "Se o nome da campanha tem poucas letras.",
      "Se as colunas foram congeladas."
    ],
    correct: 0,
    explanation: "ROI mede eficiencia relativa. Receita total pode cair mesmo com ROI maior se o investimento ou alcance forem menores."
  },
  {
    category: "Raciocinio analitico",
    level: "Intermediario",
    points: 15,
    question: "Um indicador caiu so em uma regiao. Qual proximo passo e mais util?",
    options: [
      "Analisar canal, produto e periodo dentro dessa regiao.",
      "Alterar a meta de todas as regiões.",
      "Parar de medir o indicador.",
      "Comparar apenas com a media global."
    ],
    correct: 0,
    explanation: "Quando a queda esta localizada, quebre por dimensões internas para encontrar a causa provavel."
  }
];

const heroPreviewChallenges = [
  {
    category: "SQL Basico",
    level: "Iniciante",
    points: 5,
    question: "Qual resultado a query retorna?",
    code: `SELECT COUNT(*)\nFROM clientes;`,
    context: "A tabela clientes possui 8 linhas cadastradas.",
    options: ["A) 1", "B) 5", "C) 8", "D) NULL"]
  },
  {
    category: "SQL Basico",
    level: "Iniciante",
    points: 5,
    question: "Qual filtro busca apenas vendas acima de 100?",
    code: `SELECT *\nFROM vendas\nWHERE valor > 100;`,
    context: "A clausula WHERE restringe quais linhas entram no resultado.",
    options: ["A) valor maior que 100", "B) valor igual a 100", "C) todos os valores", "D) valores vazios"]
  },
  {
    category: "SQL Basico",
    level: "Basico",
    points: 8,
    question: "Qual coluna sera usada para ordenar o resultado?",
    code: `SELECT nome, total\nFROM ranking_clientes\nORDER BY total DESC;`,
    context: "DESC mostra os maiores valores primeiro.",
    options: ["A) nome", "B) total", "C) ranking_clientes", "D) SELECT"]
  },
  {
    category: "SQL Basico",
    level: "Basico",
    points: 8,
    question: "O que essa query calcula?",
    code: `SELECT AVG(nota)\nFROM avaliacoes;`,
    context: "AVG calcula a media dos valores de uma coluna numerica.",
    options: ["A) menor nota", "B) maior nota", "C) media das notas", "D) quantidade de notas"]
  },
  {
    category: "Indicadores e KPIs",
    level: "Basico",
    points: 8,
    question: "Qual leitura combina melhor com esse indicador?",
    code: `conversao = vendas / visitantes`,
    context: "A taxa de conversao mede a proporcao de visitantes que viraram vendas.",
    options: ["A) eficiencia do funil", "B) estoque disponivel", "C) soma de visitas", "D) custo fixo"]
  }
];

const areaGoals = ["SQL", "Estatistica", "Excel/BI", "Logica de dados", "Indicadores"];

const areaGuides = {
  SQL: {
    track: "SQL Essencial -> SQL Intermediario",
    next: "COUNT(DISTINCT), JOINs, funcoes de janela e consultas com GROUP BY",
    why: "SQL e a base para buscar, combinar e validar dados com autonomia."
  },
  Estatistica: {
    track: "Estatistica para Dados",
    next: "mediana, dispersao, correlacao e leitura de distribuicao",
    why: "Estatistica ajuda a nao tirar conclusoes frageis a partir de medias ou variacoes isoladas."
  },
  "Excel/BI": {
    track: "BI e Dashboards",
    next: "segmentadores, modelo fato/dimensao e leitura executiva",
    why: "BI transforma dados em uma interface de decisao clara e facil de consultar."
  },
  "Logica de dados": {
    track: "Fundamentos de Dados",
    next: "granularidade, tipos de dados e qualidade da base",
    why: "A logica da base evita contagens erradas e interpretacoes distorcidas."
  },
  Indicadores: {
    track: "Indicadores e KPIs",
    next: "contexto, variacao percentual, metas e diagnostico por dimensao",
    why: "Interpretar KPIs conecta calculo tecnico com decisao de negocio."
  }
};
