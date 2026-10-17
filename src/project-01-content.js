(function initProject01Content(globalScope) {
  const TRACK_SLUG = "projetos-praticos";
  const TRACK_TITLE = "Projetos Práticos";

  const CLIENTS = Object.freeze([
    { cliente_id: 1, nome: "Ana Souza", segmento: "Varejo" },
    { cliente_id: 2, nome: "Bruno Lima", segmento: "Varejo" },
    { cliente_id: 3, nome: "Carla Mendes", segmento: "Varejo" },
    { cliente_id: 4, nome: "Diego Alves", segmento: "Varejo" },
    { cliente_id: 5, nome: "Empório Aurora", segmento: "Pequenas empresas" },
    { cliente_id: 6, nome: "Flora Digital", segmento: "Pequenas empresas" },
    { cliente_id: 7, nome: "Garagem Central", segmento: "Pequenas empresas" },
    { cliente_id: 8, nome: "Grupo Atlas", segmento: "Corporativo" },
    { cliente_id: 9, nome: "Horizonte Logística", segmento: "Corporativo" },
    { cliente_id: 10, nome: "Inova Serviços", segmento: "Corporativo" }
  ]);

  function buildOrders() {
    const definitions = [
      {
        clientIds: [1, 2, 3, 4],
        paidValues: [180, 240, 320, 410, 150, 275, 360, 425, 190, 230, 345, 390, 205, 260, 315, 455],
        otherOrders: [
          { status: "pendente", valor: 280 },
          { status: "cancelado", valor: 370 },
          { status: "pendente", valor: 215 },
          { status: "cancelado", valor: 445 }
        ]
      },
      {
        clientIds: [5, 6, 7],
        paidValues: [650, 720, 830, 910, 680, 760, 840, 930, 700, 780, 860, 950],
        otherOrders: [
          { status: "pendente", valor: 810 },
          { status: "cancelado", valor: 690 },
          { status: "pendente", valor: 880 }
        ]
      },
      {
        clientIds: [8, 9, 10],
        paidValues: [1400, 1650, 1800, 2100, 1500, 1750, 1950, 2300, 1600, 2200],
        otherOrders: [
          { status: "cancelado", valor: 1850 },
          { status: "pendente", valor: 2400 },
          { status: "cancelado", valor: 1700 },
          { status: "pendente", valor: 2050 },
          { status: "cancelado", valor: 2250 }
        ]
      }
    ];
    const orders = [];

    definitions.forEach((definition) => {
      [...definition.paidValues.map((valor) => ({ status: "pago", valor })), ...definition.otherOrders]
        .forEach((order, index) => {
          const orderNumber = orders.length + 1;
          orders.push({
            pedido_id: orderNumber,
            cliente_id: definition.clientIds[index % definition.clientIds.length],
            data_pedido: `2026-${String(1 + Math.floor((orderNumber - 1) / 17)).padStart(2, "0")}-${String(1 + ((orderNumber - 1) % 17)).padStart(2, "0")}`,
            status: order.status,
            valor: order.valor
          });
        });
    });

    return orders;
  }

  const ORDERS = Object.freeze(buildOrders());
  const EXPECTED_ROWS = Object.freeze([
    ["Corporativo", 10, 3, 18250],
    ["Pequenas empresas", 12, 3, 9610],
    ["Varejo", 16, 4, 4750]
  ]);

  const DATASET_CONFIG = Object.freeze({
    schemaConfig: {
      tables: [
        {
          table: "clientes",
          columns: [
            { name: "cliente_id", type: "integer", constraints: "primary key" },
            { name: "nome", type: "text", constraints: "not null" },
            { name: "segmento", type: "text", constraints: "not null" }
          ]
        },
        {
          table: "pedidos",
          columns: [
            { name: "pedido_id", type: "integer", constraints: "primary key" },
            { name: "cliente_id", type: "integer", constraints: "not null references clientes(cliente_id)" },
            { name: "data_pedido", type: "date", constraints: "not null" },
            { name: "status", type: "text", constraints: "not null" },
            { name: "valor", type: "numeric(10,2)", constraints: "not null" }
          ]
        }
      ]
    },
    seedData: [
      { table: "clientes", rows: CLIENTS },
      { table: "pedidos", rows: ORDERS }
    ]
  });

  const GUIDED_ACTIVITIES = Object.freeze({
    "projeto-01-escopo-pergunta": {
      id: null,
      slug: "projeto-01-escopo-pergunta",
      activityType: "project",
      title: "Escopo e pergunta analítica",
      subtitle: "Projeto 01 — Análise de Vendas",
      trackSlug: TRACK_SLUG,
      trackTitle: TRACK_TITLE,
      stepKey: "projetos-01-escopo-pergunta",
      level: "Aplicado",
      estimatedMinutes: 10,
      objective: "Definir o recorte correto para calcular o faturamento efetivamente realizado.",
      contentVersion: 1,
      responseSchema: "single_choice",
      scenario: {
        title: "Quais segmentos sustentam o faturamento?",
        context: "Uma empresa de comércio eletrônico quer identificar quais segmentos de clientes geram mais faturamento e quais resultados merecem investigação. A base reúne 50 pedidos pagos, pendentes e cancelados."
      },
      indicatorTitle: "Delimite o que entra na análise",
      indicatorDescription: "Antes de escrever SQL, confirme a regra de negócio usada nas três etapas do projeto.",
      indicatorData: [
        { label: "Pedidos", value: "50 registros" },
        { label: "Clientes", value: "10 clientes" },
        { label: "Segmentos", value: "3 grupos" },
        { label: "Status", value: "pago, pendente e cancelado" }
      ],
      question: "Quais pedidos devem entrar no cálculo do faturamento realizado?",
      options: [
        { id: "A", text: "Todos os pedidos, porque representam intenção de compra." },
        { id: "B", text: "Somente os pedidos pagos, porque representam faturamento efetivamente realizado." },
        { id: "C", text: "Pedidos pagos e pendentes, porque ambos podem gerar receita." },
        { id: "D", text: "Somente os pedidos cancelados, para medir a receita perdida." }
      ],
      correctOption: "B",
      feedback: "O faturamento realizado deve considerar somente pedidos com status pago. Pedidos pendentes ainda não viraram receita confirmada e pedidos cancelados não geraram faturamento.",
      attention: "Misturar pedidos pendentes ou cancelados infla a métrica e pode mudar indevidamente a comparação entre segmentos.",
      thinkingSteps: [
        ["Qual é a métrica?", "Faturamento realizado."],
        ["Qual é o recorte?", "Somente pedidos pagos."],
        ["Qual é a dimensão?", "Segmento do cliente."]
      ],
      conclusion: "Você definiu a população correta da análise: pedidos pagos, relacionados aos clientes e resumidos por segmento.",
      completionTitle: "Escopo analítico definido",
      nextAction: {
        href: "praticas-sql.html?pratica=projeto-01-consulta-validacao",
        label: "Continuar para a consulta SQL",
        title: "Etapa 2 — Consulta e validação",
        description: "Use SQL para relacionar clientes e pedidos e validar as métricas do projeto."
      }
    },
    "projeto-01-insight-recomendacao": {
      id: null,
      slug: "projeto-01-insight-recomendacao",
      activityType: "project",
      title: "Insight e recomendação",
      subtitle: "Projeto 01 — Análise de Vendas",
      trackSlug: TRACK_SLUG,
      trackTitle: TRACK_TITLE,
      stepKey: "projetos-03-insight-recomendacao",
      level: "Aplicado",
      estimatedMinutes: 10,
      objective: "Transformar o resultado segmentado em uma recomendação de negócio defensável.",
      contentVersion: 1,
      responseSchema: "single_choice",
      scenario: {
        title: "Do resultado SQL à decisão",
        context: "A consulta validada mostrou que o segmento Corporativo tem o maior faturamento, mesmo com menos pedidos do que Varejo. A decisão deve reconhecer o valor do segmento sem ignorar a concentração em poucos clientes."
      },
      indicatorTitle: "Resultados dos pedidos pagos",
      indicatorDescription: "As métricas abaixo são as mesmas calculadas sobre o dataset da etapa SQL.",
      indicatorData: [
        { label: "Corporativo", value: "10 pedidos · 3 clientes · R$ 18.250" },
        { label: "Pequenas empresas", value: "12 pedidos · 3 clientes · R$ 9.610" },
        { label: "Varejo", value: "16 pedidos · 4 clientes · R$ 4.750" },
        { label: "Faturamento total", value: "R$ 32.610" }
      ],
      question: "Qual recomendação é mais defensável a partir desses resultados?",
      options: [
        { id: "A", text: "Abandonar Varejo, porque seu faturamento foi menor neste recorte." },
        { id: "B", text: "Priorizar a investigação e retenção do Corporativo, avaliando a concentração do faturamento em poucos clientes antes de ampliar o investimento." },
        { id: "C", text: "Considerar todos os segmentos equivalentes, porque todos possuem pedidos pagos." },
        { id: "D", text: "Somar pedidos pendentes e cancelados para confirmar a liderança do Corporativo." }
      ],
      correctOption: "B",
      feedback: "Corporativo responde por R$ 18.250 de R$ 32.610, cerca de 56% do faturamento realizado. Como esse valor vem de apenas três clientes, a melhor recomendação combina retenção, análise de concentração e investigação antes de escalar a estratégia.",
      attention: "O resultado indica prioridade de investigação, não causalidade. O dataset não explica sozinho margem, recorrência futura ou custo de aquisição.",
      thinkingSteps: [
        ["O que se destaca?", "Corporativo lidera em faturamento."],
        ["Qual é a ressalva?", "O valor está concentrado em três clientes."],
        ["O que recomendar?", "Investigar e reter antes de escalar."]
      ],
      conclusion: "Você conectou regra de negócio, consulta validada e recomendação com ressalvas sobre concentração e limites da análise.",
      completionTitle: "Projeto 01 concluído",
      competencies: [
        "Definição de escopo e métrica",
        "JOIN, filtro e agregação em SQL",
        "Validação de resultados",
        "Comunicação de insight e recomendação"
      ],
      nextAction: {
        href: "meu-progresso.html",
        label: "Ver projeto em Meu Progresso",
        title: "Competências demonstradas",
        description: "Confira a conclusão do projeto e as competências demonstradas no seu histórico."
      }
    }
  });

  const SQL_PRACTICE = Object.freeze({
    slug: "projeto-01-consulta-validacao",
    navTitle: "Etapa 2 - Consulta e validação",
    shortTitle: "Projeto 01: faturamento por segmento",
    status: "active",
    estimatedMinutes: 25,
    level: "SQL Aplicado",
    topic: "JOIN + WHERE + GROUP BY",
    trackSlug: TRACK_SLUG,
    trackTitle: TRACK_TITLE,
    stepKey: "projetos-02-consulta-validacao",
    table: "clientes, pedidos",
    tables: ["clientes", "pedidos"],
    columns: "clientes.cliente_id, clientes.nome, clientes.segmento, pedidos.pedido_id, pedidos.cliente_id, pedidos.data_pedido, pedidos.status, pedidos.valor",
    datasetTables: DATASET_CONFIG.schemaConfig.tables.map((table) => ({
      ...table,
      seedData: DATASET_CONFIG.seedData.find((entry) => entry.table === table.table)?.rows || [],
      sampleRows: (DATASET_CONFIG.seedData.find((entry) => entry.table === table.table)?.rows || []).slice(0, 5)
    })),
    datasetConfig: DATASET_CONFIG,
    prompt: "Relacione clientes e pedidos, considere somente pedidos pagos e retorne, por segmento, a quantidade de pedidos, a quantidade de clientes distintos e o faturamento total.",
    objective: "Construir e validar uma consulta que conecte duas tabelas e produza métricas de negócio consistentes.",
    why: "O projeto combina definição de escopo, relacionamento entre tabelas e interpretação de métricas no mesmo cenário.",
    contentTitle: "Conecte dimensão e fatos antes de resumir",
    content: "Use clientes para obter o segmento e pedidos para obter status e valor. Filtre apenas status pago antes do agrupamento.",
    example: "select\n  dimensao,\n  count(...),\n  count(distinct ...),\n  sum(...)\nfrom fatos\njoin dimensao_tabela on ... = ...\nwhere ...\ngroup by dimensao;",
    hintText: "Relacione clientes.cliente_id a pedidos.cliente_id, filtre pedidos.status = 'pago' e agrupe por clientes.segmento.",
    solutionText: "Uma solução possível usa JOIN por cliente_id, WHERE status = 'pago', GROUP BY segmento, COUNT(pedido_id), COUNT(DISTINCT cliente_id) e SUM(valor).",
    placeholder: "select\n  c.segmento,\n  count(...) as quantidade_pedidos,\n  count(distinct ...) as clientes_distintos,\n  sum(...) as faturamento\nfrom clientes c\njoin pedidos p on ...\nwhere ...\ngroup by ...;",
    validationConfig: { validator: "project_sales_by_segment" },
    expectedResult: { rows: EXPECTED_ROWS },
    nextAction: {
      href: "pratica-guiada.html?atividade=projeto-01-insight-recomendacao",
      label: "Continuar para insight e recomendação"
    }
  });

  const api = Object.freeze({
    TRACK_SLUG,
    TRACK_TITLE,
    CLIENTS,
    ORDERS,
    EXPECTED_ROWS,
    DATASET_CONFIG,
    GUIDED_ACTIVITIES,
    SQL_PRACTICE
  });

  globalScope.Project01Content = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
