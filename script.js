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

const areaGoals = ["SQL", "Estatística", "Excel/BI", "Lógica de dados", "Interpretação de indicadores"];

const areaGuides = {
  SQL: {
    track: "SQL Essencial -> SQL Intermediário",
    next: "COUNT(DISTINCT), JOINs e consultas com GROUP BY",
    why: "SQL é a base para buscar, combinar e validar dados com autonomia."
  },
  Estatística: {
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

const state = {
  currentQuestion: 0,
  diagnosticAnswers: [],
  areaScore: {},
  challengeScore: 0,
  completedChallenges: new Set(),
  selectedChallengeOptions: {},
  heroPreviewIndex: 0,
  heroPreviewTimer: null,
  heroPreviewTransitioning: false
};

const quizMount = document.querySelector("#quizMount");
const resultSection = document.querySelector("#resultado");
const resultMount = document.querySelector("#resultMount");
const challengeMount = document.querySelector("#challengeMount");
const challengeScore = document.querySelector("#challengeScore");
const areaList = document.querySelector("#areaList");
const heroPreviewCategory = document.querySelector("#heroPreviewCategory");
const heroPreviewLevel = document.querySelector("#heroPreviewLevel");
const heroPreviewPoints = document.querySelector("#heroPreviewPoints");
const heroPreviewQuestion = document.querySelector("#heroPreviewQuestion");
const heroPreviewCode = document.querySelector("#heroPreviewCode");
const heroPreviewOptions = document.querySelector("#heroPreviewOptions");
const heroPreviewHint = document.querySelector("#heroPreviewHint");
const heroPreviewControls = document.querySelector("#heroPreviewControls");

function init() {
  renderHeroPreview();
  startHeroPreviewRotation();
  renderAreaList();
  resetDiagnostic();
  renderChallenges("Todos");
  bindFilters();
}

function renderHeroPreview(index = state.heroPreviewIndex) {
  if (!heroPreviewQuestion) return;

  const featuredChallenges = challenges.slice(0, 5);
  const challenge = featuredChallenges[index % featuredChallenges.length];
  state.heroPreviewIndex = index % featuredChallenges.length;

  heroPreviewCategory.textContent = challenge.category;
  heroPreviewCategory.className = `category-tag ${challenge.category.includes("SQL") ? "badge-sql" : ""}`;
  heroPreviewLevel.textContent = challenge.level;
  heroPreviewPoints.textContent = `${challenge.points} pontos`;
  heroPreviewQuestion.textContent = challenge.question;
  heroPreviewHint.textContent = challenge.context || challenge.explanation;

  if (challenge.code) {
    heroPreviewCode.hidden = false;
    heroPreviewCode.textContent = challenge.code;
  } else {
    heroPreviewCode.hidden = true;
    heroPreviewCode.textContent = "";
  }

  heroPreviewOptions.innerHTML = challenge.options.map((option) => `
    <span>${option}</span>
  `).join("");

  heroPreviewControls.innerHTML = featuredChallenges.map((_, dotIndex) => `
    <button class="preview-dot ${dotIndex === state.heroPreviewIndex ? "active" : ""}" type="button" data-preview-index="${dotIndex}" aria-label="Mostrar desafio ${dotIndex + 1}"></button>
  `).join("");

  heroPreviewControls.querySelectorAll("[data-preview-index]").forEach((button) => {
    button.addEventListener("click", () => {
      transitionHeroPreview(Number(button.dataset.previewIndex));
      startHeroPreviewRotation();
    });
  });
}

function transitionHeroPreview(nextIndex) {
  if (!heroPreviewQuestion || state.heroPreviewTransitioning) return;

  const previewBody = document.querySelector("#heroPreviewBody");
  state.heroPreviewTransitioning = true;
  previewBody.classList.add("is-leaving");

  setTimeout(() => {
    renderHeroPreview(nextIndex);
    previewBody.classList.remove("is-leaving");
    previewBody.classList.add("is-entering");

    setTimeout(() => {
      previewBody.classList.remove("is-entering");
      state.heroPreviewTransitioning = false;
    }, 260);
  }, 210);
}

function startHeroPreviewRotation() {
  if (state.heroPreviewTimer) {
    clearInterval(state.heroPreviewTimer);
  }

  state.heroPreviewTimer = setInterval(() => {
    transitionHeroPreview(state.heroPreviewIndex + 1);
  }, 5200);
}

function renderAreaList() {
  areaList.innerHTML = areaGoals.map((area) => `
    <div class="area-pill">
      <strong>${area}</strong>
      <span>0/${countQuestionsByArea(area)}</span>
    </div>
  `).join("");
}

function countQuestionsByArea(area) {
  return diagnosticQuestions.filter((question) => question.area === area).length;
}

function resetDiagnostic() {
  state.currentQuestion = 0;
  state.diagnosticAnswers = [];
  state.areaScore = areaGoals.reduce((scores, area) => {
    scores[area] = { correct: 0, total: countQuestionsByArea(area), misses: [], hits: [] };
    return scores;
  }, {});
  resultSection.classList.add("hidden");
  renderQuestion();
  renderAreaProgress();
}

function renderAreaProgress() {
  areaList.innerHTML = areaGoals.map((area) => {
    const score = state.areaScore[area];
    const percent = score.total ? Math.round((score.correct / score.total) * 100) : 0;
    return `
      <div class="area-pill">
        <strong>${area}</strong>
        <span>${score.correct}/${score.total} · ${percent}%</span>
      </div>
    `;
  }).join("");
}

function renderQuestion() {
  const question = diagnosticQuestions[state.currentQuestion];
  const progress = (state.currentQuestion / diagnosticQuestions.length) * 100;

  quizMount.innerHTML = `
    <div class="progress-line" aria-label="Progresso do diagnóstico">
      <span style="width: ${progress}%"></span>
    </div>
    <div class="quiz-top">
      <span>Pergunta ${state.currentQuestion + 1} de ${diagnosticQuestions.length}</span>
      <span>${question.area}</span>
    </div>
    <div class="concept-row">
      <span class="concept-tag">${question.concept}</span>
      <span class="level-tag">${question.level}</span>
    </div>
    <h3 class="question-title">${question.question}</h3>
    <div class="answer-list">
      ${question.options.map((option, index) => `
        <button class="answer-button" data-answer="${index}">
          ${String.fromCharCode(65 + index)}) ${option}
        </button>
      `).join("")}
    </div>
    <div id="feedbackMount"></div>
  `;

  quizMount.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", () => handleDiagnosticAnswer(Number(button.dataset.answer)));
  });
}

function handleDiagnosticAnswer(selectedIndex) {
  const question = diagnosticQuestions[state.currentQuestion];
  const isCorrect = selectedIndex === question.correct;
  const buttons = quizMount.querySelectorAll("[data-answer]");

  buttons.forEach((button, index) => {
    button.disabled = true;
    if (index === question.correct) button.classList.add("correct");
    if (index === selectedIndex && !isCorrect) button.classList.add("incorrect");
  });

  if (isCorrect) {
    state.areaScore[question.area].correct += 1;
    state.areaScore[question.area].hits.push(question.concept);
  } else {
    state.areaScore[question.area].misses.push(question.concept);
  }

  state.diagnosticAnswers.push({ area: question.area, correct: isCorrect, concept: question.concept });
  renderAreaProgress();

  document.querySelector("#feedbackMount").innerHTML = `
    <div class="feedback-box ${isCorrect ? "success" : "error"}">
      <strong>${isCorrect ? "Boa! Resposta correta." : "Boa tentativa. Vamos revisar o conceito."}</strong>
      <p class="explanation">${question.explanation}</p>
      <button class="submit-button" id="nextQuestion">
        ${state.currentQuestion === diagnosticQuestions.length - 1 ? "Ver resultado" : "Próxima pergunta"}
      </button>
    </div>
  `;

  document.querySelector("#nextQuestion").addEventListener("click", advanceDiagnostic);
}

function advanceDiagnostic() {
  if (state.currentQuestion < diagnosticQuestions.length - 1) {
    state.currentQuestion += 1;
    renderQuestion();
    return;
  }

  showResult();
}

function showResult() {
  const totalCorrect = Object.values(state.areaScore).reduce((sum, area) => sum + area.correct, 0);
  const percent = totalCorrect / diagnosticQuestions.length;
  const profile = getProfile(percent, state.areaScore);
  const insights = buildAreaInsights(state.areaScore);
  const recommendations = buildRecommendations(state.areaScore, profile, insights);
  const strongest = insights[0];
  const weakest = [...insights].reverse()[0];

  quizMount.innerHTML = `
    <div class="feedback-box success">
      <strong>Diagnóstico concluído</strong>
      <p class="explanation">Você acertou ${totalCorrect} de ${diagnosticQuestions.length} perguntas. A leitura detalhada está logo abaixo.</p>
      <button class="restart-button" id="restartDiagnostic">Refazer diagnóstico</button>
    </div>
  `;

  document.querySelector("#restartDiagnostic").addEventListener("click", resetDiagnostic);

  resultMount.innerHTML = `
    <article class="result-card result-dashboard">
      <div class="profile-title">
        <div>
          <span class="section-kicker">Resultado</span>
          <h2>${profile.name}</h2>
        </div>
        <span class="profile-badge">${Math.round(percent * 100)}% de domínio</span>
      </div>
      <p class="profile-detail">${profile.description}</p>

      <div class="result-metrics">
        <div class="metric-card">
          <strong>${totalCorrect}/${diagnosticQuestions.length}</strong>
          <span>acertos no diagnóstico</span>
        </div>
        <div class="metric-card">
          <strong>${strongest.area}</strong>
          <span>área mais forte agora</span>
        </div>
        <div class="metric-card">
          <strong>${weakest.area}</strong>
          <span>maior prioridade de estudo</span>
        </div>
      </div>

      <div class="result-block">
        <h3>Mapa por área</h3>
        <div class="score-bars">
          ${insights.map((item) => `
            <div class="score-row">
              <strong>${item.area}</strong>
              <div class="score-track"><div class="score-fill" style="width: ${item.percent}%"></div></div>
              <span>${item.correct}/${item.total}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="result-block">
        <h3>Leitura do resultado</h3>
        <div class="insight-grid">
          ${insights.map((item) => `
            <article class="insight-card ${item.statusClass}">
              <strong>${item.area} · ${item.label}</strong>
              <p>${item.message}</p>
            </article>
          `).join("")}
        </div>
      </div>

      <div class="priority-card">
        <span class="section-kicker">Prioridade recomendada</span>
        <h3>${recommendations.priority.title}</h3>
        <p>${recommendations.priority.text}</p>
      </div>

      <div class="recommendation-grid">
        ${recommendations.cards.map((item) => `
          <article class="recommendation-card">
            <span class="concept-tag">${item.level}</span>
            <h3>${item.title}</h3>
            <p>${item.text}</p>
            <p><strong>Próximo desafio:</strong> ${item.next}</p>
          </article>
        `).join("")}
      </div>

      <div class="result-block">
        <h3>Plano de estudo sugerido</h3>
        <ul class="action-list">
          ${recommendations.plan.map((step) => `<li>${step}</li>`).join("")}
        </ul>
      </div>
    </article>
  `;

  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getProfile(percent, scoreByArea) {
  const sqlScore = getAreaPercent(scoreByArea.SQL);
  const lowAreas = Object.values(scoreByArea).filter((score) => getAreaPercent(score) < 0.45).length;
  const highAreas = Object.values(scoreByArea).filter((score) => getAreaPercent(score) >= 0.75).length;

  if (percent < 0.4 || lowAreas >= 3) {
    return {
      name: "Iniciante em Dados",
      description: "Sua base ainda está em construção. O melhor caminho é fortalecer fundamentos antes de acelerar para análises mais complexas."
    };
  }

  if (sqlScore < 0.5) {
    return {
      name: "Aprendiz de SQL",
      description: "Você já tem noções importantes, mas SQL ainda limita sua autonomia. Reforçar consultas, contagens e JOINs vai destravar o resto da trilha."
    };
  }

  if (percent < 0.68 || highAreas < 2) {
    return {
      name: "Analista em Formação",
      description: "Você já entende parte do raciocínio de dados. Agora precisa conectar técnica, contexto e prática para ganhar consistência."
    };
  }

  if (percent < 0.86) {
    return {
      name: "Analista Intermediário",
      description: "Você tem boa leitura técnica e já pode praticar problemas mais próximos do trabalho real, com métricas, modelagem e investigação."
    };
  }

  return {
    name: "Pronto para Projetos Reais",
    description: "Você demonstrou maturidade para aplicar dados em cenários práticos. O foco agora é projeto completo, narrativa analítica e validação de hipóteses."
  };
}

function getAreaPercent(score) {
  return score.total ? score.correct / score.total : 0;
}

function buildAreaInsights(scoreByArea) {
  return Object.entries(scoreByArea)
    .map(([area, score]) => {
      const ratio = getAreaPercent(score);
      const percent = Math.round(ratio * 100);
      const misses = [...new Set(score.misses)];
      const guide = areaGuides[area];
      let label = "Ponto forte";
      let statusClass = "status-strong";
      let message = `Você mostrou boa segurança. Continue praticando ${guide.next} para transformar esse domínio em repertório aplicado.`;

      if (ratio < 0.45) {
        label = "Prioridade alta";
        statusClass = "status-low";
        message = `Reforce ${guide.next}. ${guide.why}`;
      } else if (ratio < 0.75) {
        label = "Em consolidação";
        statusClass = "status-medium";
        message = misses.length
          ? `Você está perto de consolidar. Revise ${misses.join(", ")} e faça exercícios curtos com explicação.`
          : `Você está no caminho certo. Faça mais prática guiada em ${guide.next}.`;
      }

      return { area, correct: score.correct, total: score.total, percent, misses, label, statusClass, message };
    })
    .sort((a, b) => b.percent - a.percent);
}

function buildRecommendations(scoreByArea, profile, insights) {
  const priority = [...insights].reverse()[0];
  const secondPriority = [...insights].reverse()[1] || priority;
  const priorityGuide = areaGuides[priority.area];
  const missedConcepts = Object.values(scoreByArea).flatMap((score) => score.misses);
  const uniqueConcepts = [...new Set(missedConcepts)];
  const reviewText = uniqueConcepts.length
    ? `Revise ${uniqueConcepts.join(", ")}. Esses pontos apareceram como lacunas reais no seu diagnóstico.`
    : "Você não deixou lacunas no diagnóstico. Mantenha revisão espaçada e avance para casos completos.";

  return {
    priority: {
      title: `${priority.area}: comece por ${priorityGuide.track}`,
      text: `${priority.message} Esta é a área com maior ganho potencial agora, então ela deve vir antes de novos conteúdos avançados.`
    },
    cards: [
      {
        level: "Agora",
        title: "Primeiro foco",
        text: `Estude ${priorityGuide.next}. ${priorityGuide.why}`,
        next: `Filtre os desafios por ${mapAreaToChallenge(priority.area)}.`
      },
      {
        level: "Revisão",
        title: "Conceitos para revisar",
        text: reviewText,
        next: "Refaça os cards em que você errou antes de avançar."
      },
      {
        level: profile.name,
        title: "Trilha sugerida",
        text: getTrackSuggestion(profile.name, priority.area),
        next: "Depois faça um mini-projeto com SQL, KPI e uma conclusão de negócio."
      }
    ],
    plan: [
      `<strong>1. Base:</strong> faça 20 minutos de revisão em ${priorityGuide.next}.`,
      `<strong>2. Prática:</strong> resolva desafios de ${mapAreaToChallenge(priority.area)} e ${mapAreaToChallenge(secondPriority.area)}.`,
      `<strong>3. Aplicação:</strong> escolha uma base simples e responda 3 perguntas de negócio com números.`,
      `<strong>4. Comunicação:</strong> escreva uma conclusão curta: o que mudou, onde mudou e qual ação você recomenda.`
    ]
  };
}

function mapAreaToChallenge(area) {
  const map = {
    SQL: "SQL Básico ou SQL Intermediário",
    Estatística: "Estatística",
    "Excel/BI": "Indicadores e KPIs",
    "Lógica de dados": "Raciocínio analítico",
    "Interpretação de indicadores": "Indicadores e KPIs"
  };

  return map[area] || "Todos";
}

function getTrackSuggestion(profileName, priorityArea) {
  const tracks = {
    "Iniciante em Dados": "Fundamentos de Dados -> SQL Essencial -> Indicadores básicos.",
    "Aprendiz de SQL": "SQL Essencial -> SQL Intermediário -> exercícios de contagem com JOIN.",
    "Analista em Formação": "SQL Intermediário -> Estatística para Dados -> Indicadores e KPIs.",
    "Analista Intermediário": "Projetos Práticos -> dashboard operacional -> validação de hipóteses.",
    "Pronto para Projetos Reais": "Projeto completo com problema de negócio, análise, visualização e recomendação final."
  };

  return `${tracks[profileName]} Como sua prioridade atual é ${priorityArea}, comece essa trilha por esse tema.`;
}

function bindFilters() {
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderChallenges(button.dataset.filter);
    });
  });
}

function renderChallenges(filter) {
  const visibleChallenges = filter === "Todos"
    ? challenges
    : challenges.filter((challenge) => challenge.category === filter);

  challengeMount.innerHTML = visibleChallenges.map((challenge) => {
    const id = challenges.indexOf(challenge);
    const answered = state.completedChallenges.has(id);
    return `
      <article class="challenge-card" data-challenge-card="${id}">
        <div class="challenge-head">
          <span class="category-tag ${challenge.category.includes("SQL") ? "badge-sql" : ""}">${challenge.category}</span>
          <span class="level-tag">${challenge.level}</span>
        </div>
        <h3>${challenge.question}</h3>
        ${challenge.code ? `<code class="code-block">${challenge.code}</code>` : ""}
        ${challenge.context ? `<p class="question-meta">${challenge.context}</p>` : ""}
        <div class="answer-list">
          ${challenge.options.map((option, optionIndex) => `
            <button class="answer-button" data-challenge="${id}" data-option="${optionIndex}" ${answered ? "disabled" : ""}>
              ${option}
            </button>
          `).join("")}
        </div>
        <div class="question-meta">Pontuação: ${challenge.points} pontos</div>
        <button class="submit-button" data-submit-challenge="${id}" ${answered ? "disabled" : ""}>Responder</button>
        <div id="challengeFeedback${id}"></div>
      </article>
    `;
  }).join("");

  if (!visibleChallenges.length) {
    challengeMount.innerHTML = `<p class="question-meta">Nenhum desafio encontrado para esta categoria.</p>`;
  }

  challengeMount.querySelectorAll("[data-challenge]").forEach((button) => {
    button.addEventListener("click", () => selectChallengeAnswer(Number(button.dataset.challenge), Number(button.dataset.option)));
  });

  challengeMount.querySelectorAll("[data-submit-challenge]").forEach((button) => {
    button.addEventListener("click", () => handleChallengeAnswer(Number(button.dataset.submitChallenge)));
  });

  updateChallengeScore();
}

function selectChallengeAnswer(challengeIndex, selectedIndex) {
  state.selectedChallengeOptions[challengeIndex] = selectedIndex;
  const card = document.querySelector(`[data-challenge-card="${challengeIndex}"]`);

  card.querySelectorAll("[data-option]").forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.option) === selectedIndex);
  });
}

function handleChallengeAnswer(challengeIndex) {
  const selectedIndex = state.selectedChallengeOptions[challengeIndex];
  const feedbackMount = document.querySelector(`#challengeFeedback${challengeIndex}`);

  if (selectedIndex === undefined) {
    feedbackMount.innerHTML = `
      <div class="feedback-box error">
        <strong>Escolha uma alternativa antes de responder.</strong>
      </div>
    `;
    return;
  }

  const challenge = challenges[challengeIndex];
  const card = document.querySelector(`[data-challenge-card="${challengeIndex}"]`);
  const buttons = card.querySelectorAll("[data-option]");
  const isCorrect = selectedIndex === challenge.correct;

  buttons.forEach((button) => {
    const optionIndex = Number(button.dataset.option);
    button.disabled = true;
    button.classList.remove("selected");
    if (optionIndex === challenge.correct) button.classList.add("correct");
    if (optionIndex === selectedIndex && !isCorrect) button.classList.add("incorrect");
  });

  card.querySelector("[data-submit-challenge]").disabled = true;

  if (isCorrect && !state.completedChallenges.has(challengeIndex)) {
    state.challengeScore += challenge.points;
    state.completedChallenges.add(challengeIndex);
  }

  feedbackMount.innerHTML = `
    <div class="feedback-box ${isCorrect ? "success" : "error"}">
      <strong>${isCorrect ? "Excelente! Resposta correta." : "Boa tentativa. Veja a explicação."}</strong>
      <p class="explanation">${challenge.explanation}</p>
    </div>
  `;

  updateChallengeScore();
}

function updateChallengeScore() {
  challengeScore.textContent = `Pontuação dos desafios: ${state.challengeScore}`;
}

init();
