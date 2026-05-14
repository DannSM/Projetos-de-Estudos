const diagnosticQuestions = [
  {
    area: "SQL",
    level: "Básico",
    concept: "SELECT e filtros",
    question: "Qual cláusula é usada para filtrar linhas antes de uma agregação?",
    options: ["WHERE", "HAVING", "ORDER BY", "GROUP BY"],
    correct: 0,
    explanation: "WHERE filtra linhas antes do agrupamento. HAVING entra depois, quando a agregação já foi calculada."
  },
  {
    area: "SQL",
    level: "Básico",
    concept: "COUNT e valores nulos",
    question: "Qual a diferença prática entre COUNT(*) e COUNT(coluna)?",
    options: [
      "COUNT(*) conta linhas; COUNT(coluna) conta valores não nulos.",
      "COUNT(*) ignora duplicados; COUNT(coluna) conta duplicados.",
      "COUNT(*) só funciona com JOIN.",
      "Não existe diferença."
    ],
    correct: 0,
    explanation: "COUNT(*) conta todas as linhas retornadas. COUNT(coluna) ignora as linhas em que aquela coluna está NULL."
  },
  {
    area: "SQL",
    level: "Intermediário",
    concept: "JOINs e cardinalidade",
    question: "Em um LEFT JOIN entre clientes e compras, o que acontece com clientes que não possuem compras?",
    options: [
      "Eles são removidos do resultado.",
      "Eles aparecem uma vez, com NULL nos campos da tabela de compras.",
      "Eles aparecem apenas se houver uma chave duplicada.",
      "Eles são contados somente com COUNT(coluna)."
    ],
    correct: 1,
    explanation: "O LEFT JOIN preserva a tabela da esquerda. Quando não há correspondência, os campos da tabela da direita ficam NULL."
  },
  {
    area: "Estatística",
    level: "Básico",
    concept: "Medidas de tendência central",
    question: "Qual medida costuma ser mais resistente a valores extremos?",
    options: ["Média", "Mediana", "Amplitude", "Soma"],
    correct: 1,
    explanation: "A mediana usa a posição central dos dados ordenados, então sofre menos impacto de valores muito altos ou muito baixos."
  },
  {
    area: "Estatística",
    level: "Básico",
    concept: "Variabilidade",
    question: "Dois produtos possuem a mesma média de avaliação. O que o desvio padrão ajuda a comparar?",
    options: [
      "A quantidade de colunas da base.",
      "A dispersão das avaliações em torno da média.",
      "O nome mais frequente dos clientes.",
      "O total de categorias disponíveis."
    ],
    correct: 1,
    explanation: "Médias iguais podem esconder comportamentos diferentes. O desvio padrão mostra o quanto os valores variam em torno da média."
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
    explanation: "Correlação indica associação, não causalidade. Ela sugere movimento conjunto, mas não prova que uma métrica causa a outra."
  },
  {
    area: "Excel/BI",
    level: "Básico",
    concept: "Segmentação e filtros",
    question: "Em um dashboard de vendas, qual recurso ajuda o usuário a analisar por região, produto ou período?",
    options: ["Segmentador de dados", "Formatação condicional apenas", "Mesclar células", "Congelar painéis"],
    correct: 0,
    explanation: "Segmentadores e filtros permitem recortar os dados por dimensões relevantes, tornando a análise mais exploratória."
  },
  {
    area: "Excel/BI",
    level: "Intermediário",
    concept: "Modelo de dados",
    question: "Em BI, por que separar tabelas fato e dimensão costuma ajudar?",
    options: [
      "Porque elimina a necessidade de validar dados.",
      "Porque organiza métricas e contextos de análise, facilitando filtros e agregações.",
      "Porque impede o uso de relacionamentos.",
      "Porque transforma todos os dados em texto."
    ],
    correct: 1,
    explanation: "Tabelas fato guardam eventos e medidas. Dimensões descrevem contextos como produto, cliente e tempo."
  },
  {
    area: "Excel/BI",
    level: "Intermediário",
    concept: "Leitura de dashboard",
    question: "Qual prática melhora a leitura de um dashboard executivo?",
    options: [
      "Usar o maior número possível de gráficos.",
      "Destacar KPIs principais, contexto e filtros importantes.",
      "Remover títulos para economizar espaço.",
      "Usar apenas tabelas longas."
    ],
    correct: 1,
    explanation: "Um dashboard precisa orientar decisão. KPIs claros, contexto e filtros relevantes ajudam a pessoa a entender o que mudou e onde agir."
  },
  {
    area: "Lógica de dados",
    level: "Básico",
    concept: "Tipos de dados",
    question: "Por que é importante diferenciar texto, número e data em uma base?",
    options: [
      "Porque muda a cor automática das células.",
      "Porque cálculos, filtros e ordenações dependem do tipo correto.",
      "Porque todo dado deve virar texto.",
      "Porque datas não podem ser analisadas."
    ],
    correct: 1,
    explanation: "Tipos corretos evitam filtros errados, cálculos inválidos e ordenações enganosas, principalmente em datas e valores monetários."
  },
  {
    area: "Lógica de dados",
    level: "Intermediário",
    concept: "Granularidade",
    question: "Uma tabela possui uma linha por item comprado. Qual cuidado é essencial ao calcular pedidos únicos?",
    options: [
      "Somar todos os preços sem agrupar.",
      "Contar as linhas da tabela.",
      "Contar IDs de pedido distintos.",
      "Ordenar os itens por nome."
    ],
    correct: 2,
    explanation: "Se cada pedido pode ter vários itens, contar linhas mede itens, não pedidos. Para pedidos únicos, use COUNT(DISTINCT id_pedido)."
  },
  {
    area: "Lógica de dados",
    level: "Intermediário",
    concept: "Qualidade dos dados",
    question: "Qual sinal costuma indicar problema de qualidade em uma base de clientes?",
    options: [
      "IDs únicos e datas completas.",
      "Campos obrigatórios preenchidos.",
      "Clientes duplicados com e-mails diferentes ou datas inválidas.",
      "Nomes padronizados por categoria."
    ],
    correct: 2,
    explanation: "Duplicidades, datas inválidas e campos inconsistentes afetam contagens, segmentações e conclusões de negócio."
  },
  {
    area: "Interpretação de indicadores",
    level: "Básico",
    concept: "KPIs e contexto",
    question: "A taxa de conversão caiu, mas o volume de visitantes dobrou. Qual análise é mais adequada?",
    options: [
      "Concluir que o negócio piorou sem olhar receita.",
      "Avaliar conversões absolutas, receita, origem do tráfego e mudanças no público.",
      "Ignorar a queda porque visitantes aumentaram.",
      "Trocar o KPI imediatamente."
    ],
    correct: 1,
    explanation: "Indicadores precisam de contexto. Uma queda percentual pode conviver com aumento absoluto de conversões."
  },
  {
    area: "Interpretação de indicadores",
    level: "Intermediário",
    concept: "Variação percentual",
    question: "Receita saiu de R$ 100 mil para R$ 120 mil. Qual foi a variação percentual?",
    options: ["10%", "20%", "25%", "120%"],
    correct: 1,
    explanation: "A variação é (120 - 100) / 100 = 0,20. Portanto, a receita cresceu 20%."
  },
  {
    area: "Interpretação de indicadores",
    level: "Intermediário",
    concept: "Diagnóstico de performance",
    question: "Um KPI piorou em maio. Qual é a primeira investigação mais útil?",
    options: [
      "Trocar todas as metas do ano.",
      "Comparar por canal, produto, região e período para localizar a origem da queda.",
      "Apagar o mês do relatório.",
      "Olhar apenas a média anual."
    ],
    correct: 1,
    explanation: "Antes de agir, é preciso localizar onde a mudança aconteceu. Quebras por dimensão ajudam a transformar sintoma em hipótese."
  }
];

const challenges = [
  {
    category: "SQL Intermediário",
    level: "Intermediário",
    points: 20,
    question: "Qual o resultado da query abaixo?",
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
    category: "Indicadores e KPIs",
    level: "Básico",
    points: 10,
    question: "Uma meta era 80 e o resultado foi 72. Qual é o gap?",
    options: ["8 abaixo da meta", "8 acima da meta", "72%", "80%"],
    correct: 0,
    explanation: "O gap absoluto é resultado menos meta: 72 - 80 = -8. Está 8 unidades abaixo da meta."
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
    category: "SQL Básico",
    level: "Básico",
    points: 8,
    question: "O que essa query calcula?",
    code: `SELECT AVG(nota)\nFROM avaliacoes;`,
    context: "AVG calcula a média dos valores de uma coluna numérica.",
    options: ["A) menor nota", "B) maior nota", "C) média das notas", "D) quantidade de notas"]
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

const areaGoals = ["SQL", "Estatística", "Excel/BI", "Lógica de dados", "Interpretação de indicadores"];

const areaGuides = {
  SQL: {
    track: "SQL Essencial -> SQL Intermediário",
    next: "COUNT(DISTINCT), JOINs e consultas com GROUP BY",
    why: "SQL é a base para buscar, combinar e validar dados com autonomia."
  },
  "Estatística": {
    track: "Estatística para Dados",
    next: "mediana, dispersão, correlação e leitura de distribuição",
    why: "Estatística ajuda a não tirar conclusões frágeis a partir de médias ou variações isoladas."
  },
  "Excel/BI": {
    track: "BI e Dashboards",
    next: "segmentadores, modelo fato/dimensão e leitura executiva",
    why: "BI transforma dados em uma interface de decisão clara e fácil de consultar."
  },
  "Lógica de dados": {
    track: "Fundamentos de Dados",
    next: "granularidade, tipos de dados e qualidade da base",
    why: "A lógica da base evita contagens erradas e interpretações distorcidas."
  },
  "Interpretação de indicadores": {
    track: "Indicadores e KPIs",
    next: "contexto, variação percentual, metas e diagnóstico por dimensão",
    why: "Interpretar KPIs é o que conecta cálculo técnico com decisão de negócio."
  }
};
