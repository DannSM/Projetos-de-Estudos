(function initStudyPlanContent(globalScope) {
  const TRACK_HREF = "index.html#trilhas";

  const plans = {
    Indicadores: {
      priority: "Indicadores e KPIs",
      concept: "Meta e resultado",
      whyNow: "Você precisa separar resultado observado, meta esperada e interpretação do desvio. Isso transforma números em decisão, não apenas em leitura de percentual.",
      studySteps: [
        "Entenda o que o indicador mede.",
        "Compare resultado contra meta.",
        "Explique o desvio em uma frase de negócio."
      ],
      quickStudy: "Um KPI não é só um número. Ele precisa ter contexto, meta e uma leitura acionável. Dizer que a satisfação foi 82% é diferente de dizer que ficou 5 p.p. abaixo da meta e exige investigar atendimento, prazo ou qualidade da solução.",
      attention: "Primeiro entenda o que está sendo medido; depois compare com a meta e interprete o desvio.",
      actionTitle: "Abrir trilha de Indicadores e KPIs",
      actionMeta: "Roteiro guiado · comece pelo conceito recomendado",
      actionDescription: "Esta trilha reúne os conceitos que você precisa consolidar antes de avançar para novas práticas.",
      actionType: "trilha",
      ctaLabel: "Ver trilha recomendada",
      href: TRACK_HREF
    },
    SQL: {
      priority: "SQL",
      concept: "Filtrar antes de agregar",
      whyNow: "Grande parte dos erros em SQL acontece quando a pessoa conta ou soma dados antes de aplicar o filtro correto. Aprender WHERE antes de GROUP BY evita conclusões erradas.",
      studySteps: [
        "Leia o enunciado procurando o filtro principal.",
        "Aplique WHERE antes de contar ou somar.",
        "Valide se o resultado responde exatamente à pergunta."
      ],
      quickStudy: "Em SQL, a ordem da pergunta importa. Se você precisa contar pedidos pagos, primeiro filtre os pedidos pagos e só depois faça a contagem. Isso evita misturar pedidos cancelados, pendentes ou inválidos no resultado.",
      attention: "Filtre o conjunto correto antes de usar COUNT, SUM ou qualquer agregação.",
      actionTitle: "Começar prática: Filtros com WHERE",
      actionMeta: "SQL Essencial · 10 min · Prática guiada",
      actionDescription: "Aplique filtros em uma consulta real e valide o resultado passo a passo.",
      actionType: "prática guiada",
      ctaLabel: "Começar prática recomendada",
      href: "praticas-sql.html?pratica=sql-essencial-filtros-where"
    },
    "Estatística": {
      priority: "Estatística para Dados",
      concept: "Média, mediana e dispersão",
      whyNow: "A média pode esconder diferenças importantes quando há valores extremos. Mediana e dispersão ajudam a interpretar melhor o comportamento dos dados.",
      studySteps: [
        "Compare média e mediana.",
        "Observe se há valores muito fora do padrão.",
        "Explique se a média representa bem o grupo."
      ],
      quickStudy: "Quando uma base tem valores muito altos ou muito baixos, a média pode contar uma história distorcida. A mediana mostra o ponto central e a dispersão ajuda a entender o quanto os dados variam.",
      attention: "Não resuma uma distribuição apenas pela média quando houver valores extremos.",
      actionTitle: "Abrir trilha de Estatística para Dados",
      actionMeta: "Roteiro guiado · comece pelo conceito recomendado",
      actionDescription: "Esta trilha reúne os conceitos que você precisa consolidar antes de avançar para novas práticas.",
      actionType: "trilha",
      ctaLabel: "Ver trilha recomendada",
      href: TRACK_HREF
    },
    "Lógica de dados": {
      priority: "Fundamentos de Dados",
      concept: "Granularidade e tipo de dado",
      whyNow: "Antes de calcular qualquer indicador, é preciso entender o que cada linha representa e se os tipos de dados estão corretos. Isso evita contagens duplicadas e análises inconsistentes.",
      studySteps: [
        "Identifique o que uma linha da base representa.",
        "Separe campos de texto, número e data.",
        "Verifique se o cálculo respeita a granularidade."
      ],
      quickStudy: "Granularidade é o nível de detalhe da base. Uma linha pode representar um pedido, um cliente, um atendimento ou um item vendido. Sem identificar isso, você pode contar a mesma coisa mais de uma vez.",
      attention: "Defina o que cada linha representa antes de contar, agrupar ou cruzar dados.",
      actionTitle: "Abrir trilha de Fundamentos de Dados",
      actionMeta: "Roteiro guiado · comece pelo conceito recomendado",
      actionDescription: "Esta trilha reúne os conceitos que você precisa consolidar antes de avançar para novas práticas.",
      actionType: "trilha",
      ctaLabel: "Ver trilha recomendada",
      href: TRACK_HREF
    },
    Excel: {
      priority: "Excel para Dados",
      concept: "Organização e resumo de dados",
      whyNow: "Excel continua sendo uma ferramenta importante para organizar, conferir e resumir dados antes de análises mais avançadas.",
      studySteps: [
        "Organize a base em formato tabular.",
        "Use filtros e tabelas dinâmicas para resumir.",
        "Valide totais antes de apresentar conclusões."
      ],
      quickStudy: "Uma análise começa com uma base organizada. Cabeçalhos claros, campos consistentes e ausência de linhas soltas tornam filtros, tabelas dinâmicas e cálculos muito mais confiáveis.",
      attention: "Valide estrutura, tipos e totais da base antes de montar o resumo final.",
      actionTitle: "Abrir trilha de Excel para Dados",
      actionMeta: "Roteiro guiado · comece pelo conceito recomendado",
      actionDescription: "Esta trilha reúne os conceitos que você precisa consolidar antes de avançar para novas práticas.",
      actionType: "trilha",
      ctaLabel: "Ver trilha recomendada",
      href: TRACK_HREF
    }
  };

  const aliases = {
    "Indicadores e KPIs": "Indicadores",
    "Estatística para Dados": "Estatística",
    "Fundamentos de Dados": "Lógica de dados",
    "Excel para Dados": "Excel"
  };

  function getStudyPlan(area) {
    const normalizedArea = aliases[area] || area;
    return plans[normalizedArea] || plans["Lógica de dados"];
  }

  globalScope.studyPlanContent = Object.freeze({ getStudyPlan });
})(window);
