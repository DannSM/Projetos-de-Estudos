(function initLearningMissionPrototype() {
  const mount = document.querySelector("#missionPageMount");
  if (!mount) {
    return;
  }

  const sqlValidation = window.SqlMissionValidation;
  if (!sqlValidation) {
    mount.innerHTML = `
      <div class="mission-loading">
        <strong>Não foi possível carregar a validação local de SQL.</strong>
        <span>Recarregue a página para tentar novamente.</span>
      </div>
    `;
    return;
  }

  // Protótipo local do piloto: dados controlados em memória, sem Supabase e sem progresso real.
  const missions = [
    {
      slug: "sql-essencial-filtros-where",
      title: "Missão recomendada: filtre exatamente o recorte pedido",
      gap: "filtros com WHERE",
      skillCode: "sql.filtering.where_logic",
      level: "Básico",
      estimatedMinutes: 10,
      objective: "Escolher o WHERE que traduz exatamente a pergunta de negócio.",
      why: "Esta missão apareceu porque o diagnóstico encontrou uma lacuna em filtros com SQL. Corrigir isso ajuda você a responder perguntas de negócio sem trazer dados fora do recorte.",
      contentTitle: "O que o WHERE precisa fazer",
      content: "O WHERE deve traduzir exatamente o recorte da pergunta. Se a pergunta pede pedidos pagos em janeiro, o filtro precisa limitar status e período ao mesmo tempo.",
      example: "select * from pedidos where status = 'pago' and data_pedido >= '2026-01-01' and data_pedido < '2026-02-01';",
      activityType: "multiple_choice",
      activityTitle: "Pratique agora",
      prompt: "A área comercial pediu pedidos pagos em janeiro de 2026. Qual WHERE responde exatamente ao recorte?",
      context: ["Tabela: pedidos", "Colunas: pedido_id, status, data_pedido, valor"],
      options: [
        "where status = 'pago'",
        "where status = 'pago' and data_pedido >= '2026-01-01' and data_pedido < '2026-02-01'",
        "where data_pedido >= '2026-01-01'"
      ],
      evaluate: ({ selectedOption }) => {
        const result = sqlValidation.validateWhereJanuarySql(missions[0].options[selectedOption]);

        if (result.status === "correct") {
          return {
            status: "correct",
            title: "Correto",
            message: "Correto. Você aplicou o raciocínio certo para esta lacuna. O filtro limita status e período, então responde ao recorte sem trazer registros indevidos."
          };
        }

        if (result.status === "partial") {
          return {
            status: "partial",
            title: "Parcial",
            message: "Quase lá. Você acertou parte do raciocínio, mas ainda falta ajustar um critério importante antes de concluir a missão."
          };
        }

        return {
          status: "incorrect",
          title: "Incorreto",
          message: "Ainda não. Esta resposta deixa passar um problema comum. Veja o feedback, ajuste o raciocínio e tente novamente."
        };
      }
    },
    {
      slug: "sql-essencial-count-nulos-distintos",
      title: "Missão recomendada: conte sem se enganar com nulos",
      gap: "COUNT, nulos e distintos",
      skillCode: "sql.aggregation.counting",
      level: "Básico",
      estimatedMinutes: 12,
      objective: "Escolher a contagem adequada para a pergunta e interpretar diferenças.",
      why: "Esta missão apareceu porque o diagnóstico indicou risco de confundir linhas, valores preenchidos e valores distintos.",
      contentTitle: "COUNT(*) não é sempre igual a COUNT(coluna)",
      content: "COUNT(*) conta linhas. COUNT(coluna) conta apenas linhas em que aquela coluna não está nula. COUNT(distinct coluna) conta valores distintos não nulos.",
      example: "select count(*) as linhas, count(email) as emails_preenchidos, count(distinct cliente_id) as clientes from clientes;",
      activityType: "multiple_choice",
      activityTitle: "Pratique agora",
      prompt: "Você quer saber quantas linhas existem na tabela pedidos, mesmo quando cliente_id estiver nulo. Qual expressão usar?",
      context: ["Tabela: pedidos", "Colunas: pedido_id, cliente_id, valor"],
      options: ["count(cliente_id)", "count(*)", "count(distinct cliente_id)"],
      evaluate: ({ selectedOption }) => {
        const result = sqlValidation.validateCountRowsExpression(missions[1].options[selectedOption]);

        if (result.status === "correct") {
          return {
            status: "correct",
            title: "Correto",
            message: "Correto. COUNT(*) conta todas as linhas, inclusive quando alguma coluna está nula."
          };
        }

        if (result.status === "partial") {
          return {
            status: "partial",
            title: "Parcial",
            message: "Quase lá. COUNT(cliente_id) conta algo útil, mas ignora linhas em que cliente_id está nulo."
          };
        }

        return {
          status: "incorrect",
          title: "Incorreto",
          message: "Ainda não. COUNT(distinct cliente_id) responde outra pergunta: quantos clientes diferentes aparecem com valor não nulo."
        };
      }
    },
    {
      slug: "sql-essencial-filtro-antes-agregacao",
      title: "Missão recomendada: filtre antes de resumir",
      gap: "filtro antes da agregação",
      skillCode: "sql.filtering.where_logic",
      level: "Básico",
      estimatedMinutes: 15,
      objective: "Aplicar filtro antes de contar ou resumir uma métrica.",
      why: "Esta missão apareceu porque o diagnóstico mostrou que o resumo pode ficar correto na forma, mas errado no recorte.",
      contentTitle: "Primeiro recorte, depois resumo",
      content: "Quando a métrica é sobre um grupo específico, aplique o WHERE antes de contar ou somar. A ordem lógica é: escolher os campos, indicar a fonte, filtrar o recorte e só então agrupar.",
      example: "select campo_de_grupo, count(*) from tabela where condição group by campo_de_grupo;",
      activityType: "query_fix",
      activityTitle: "Pratique agora",
      prompt: "Crie uma consulta para contar pedidos pagos por categoria. O filtro de status precisa acontecer antes do agrupamento.",
      context: ["Tabela: pedidos", "Colunas: pedido_id, status, categoria, valor"],
      placeholder: "select campo_de_grupo, agregação\nfrom tabela\nwhere condição\ngroup by campo_de_grupo;",
      evaluate: ({ queryAnswer }) => {
        const result = sqlValidation.validatePaidOrdersByCategorySql(queryAnswer);
        const checks = result.checks;

        if (result.status === "correct") {
          return {
            status: "correct",
            title: "Correto",
            message: "Correto. A consulta seleciona categoria e count(*), filtra pedidos pagos antes do agrupamento e agrupa por categoria."
          };
        }

        if (result.status === "partial") {
          const missing = [];
          if (!checks.hasSelectComma) {
            missing.push("a vírgula entre categoria e count(*)");
          }
          if (!checks.hasStatusPaid) {
            missing.push("o filtro where status = 'pago'");
          }
          if (!checks.hasGroupByCategoria) {
            missing.push("o group by categoria");
          }
          if (!checks.hasFromPedidos) {
            missing.push("o from pedidos");
          }

          return {
            status: "partial",
            title: "Parcial",
            message: `Quase lá. A consulta tem parte do raciocínio, mas ainda falta ajustar ${missing.slice(0, 2).join(" e ") || "a estrutura mínima"} antes de concluir a missão.`
          };
        }

        return {
          status: "incorrect",
          title: "Incorreto",
          message: checks.hasInvalidClauseOrder
            ? "Ainda não. O WHERE precisa vir antes do GROUP BY para filtrar pedidos pagos antes do agrupamento."
            : "Ainda não. A consulta está incompleta ou quebrada. Revise a lista do SELECT, a fonte dos dados, o filtro e o campo usado no agrupamento."
        };
      }
    }
  ];

  const state = {
    activeIndex: getInitialMissionIndex(),
    selectedOption: null,
    queryAnswer: "",
    attempts: {},
    feedback: null,
    started: false
  };

  function getInitialMissionIndex() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("missao");
    const index = missions.findIndex((mission) => mission.slug === slug);
    return index >= 0 ? index : 0;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getMissionStatus(index) {
    const mission = missions[index];
    const attempt = state.attempts[mission.slug];

    if (attempt?.status === "correct") {
      return "completed";
    }

    if (index === state.activeIndex) {
      return "current";
    }

    if (index < state.activeIndex) {
      return attempt ? "available" : "locked";
    }

    const previousMission = missions[index - 1];
    const previousAttempt = previousMission ? state.attempts[previousMission.slug] : null;
    return previousAttempt?.status === "correct" ? "available" : "locked";
  }

  function getCompletionText(status) {
    const labels = {
      completed: "concluída",
      current: "atual",
      available: "disponível",
      locked: "bloqueada"
    };

    return labels[status] || "bloqueada";
  }

  function getCompletedCount() {
    return missions.filter((mission) => state.attempts[mission.slug]?.status === "correct").length;
  }

  function renderMissionHero(mission) {
    return `
      <section class="mission-hero">
        <div class="mission-hero__content">
          <div class="mission-hero__primary">
            <span class="section-kicker">Missão recomendada</span>
            <h1>${escapeHtml(mission.title)}</h1>
            <p>${escapeHtml(mission.objective)}</p>
            <div class="mission-hero__meta" aria-label="Resumo da missão">
              <span><i data-lucide="scan-search" aria-hidden="true"></i>Lacuna: ${escapeHtml(mission.gap)}</span>
              <span><i data-lucide="clock-3" aria-hidden="true"></i>${mission.estimatedMinutes} min</span>
              <span><i data-lucide="signal" aria-hidden="true"></i>${escapeHtml(mission.level)}</span>
            </div>
            <div class="mission-hero__actions">
              <button class="button button-primary" type="button" data-start-mission>
                <i data-lucide="play" aria-hidden="true"></i>
                <span>Comece aqui</span>
              </button>
              <a class="button button-secondary" href="#atividade">
                <i data-lucide="arrow-down" aria-hidden="true"></i>
                <span>Pratique agora</span>
              </a>
            </div>
          </div>
          <aside class="mission-hero__brief" aria-label="Como avançar nesta missão">
            <span class="mission-side-card__label">Nesta sessão</span>
            <div>
              <i data-lucide="target" aria-hidden="true"></i>
              <p><strong>Você vai praticar</strong>${escapeHtml(mission.gap)}</p>
            </div>
            <div>
              <i data-lucide="shield-check" aria-hidden="true"></i>
              <p><strong>Critério para avançar</strong>Enviar uma resposta correta após receber feedback.</p>
            </div>
          </aside>
        </div>
      </section>
    `;
  }

  function renderActivity(mission) {
    if (mission.activityType === "query_fix") {
      return `
        <textarea
          class="mission-query-input"
          data-query-answer
          rows="6"
          aria-label="Resposta em SQL"
          placeholder="${escapeHtml(mission.placeholder)}"
        >${escapeHtml(state.queryAnswer)}</textarea>
      `;
    }

    return `
      <div class="mission-answer-list" role="radiogroup" aria-label="Opcoes de resposta">
        ${mission.options.map((option, index) => `
          <button
            class="answer-button mission-answer-button${state.selectedOption === index ? " selected" : ""}"
            type="button"
            role="radio"
            aria-checked="${state.selectedOption === index ? "true" : "false"}"
            data-option-index="${index}"
          >
            <span>${escapeHtml(option)}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  function renderFeedback() {
    if (!state.feedback) {
      return `
        <div class="mission-feedback mission-feedback--empty">
          <strong>Ver feedback</strong>
          <p>Envie uma tentativa para receber feedback imediato. A missão só aparece como concluída depois da resposta.</p>
        </div>
      `;
    }

    const icon = state.feedback.status === "correct" ? "check-circle-2" : state.feedback.status === "partial" ? "circle-alert" : "x-circle";
    const hasNextMission = state.activeIndex < missions.length - 1;
    const canContinue = state.feedback.status === "correct" && hasNextMission;
    let nextActionHtml = `
      <button class="button button-primary" type="button" data-next-mission disabled>
        <i data-lucide="arrow-right" aria-hidden="true"></i>
        <span>Continuar para próxima missão</span>
      </button>
    `;

    if (canContinue) {
      nextActionHtml = `
          <button class="button button-primary" type="button" data-next-mission>
            <i data-lucide="arrow-right" aria-hidden="true"></i>
            <span>Continuar para próxima missão</span>
          </button>
        `;
    } else if (state.feedback.status === "correct") {
      nextActionHtml = `
          <a class="button button-primary" href="#piloto-concluido">
            <i data-lucide="check-circle-2" aria-hidden="true"></i>
            <span>Ver fechamento do piloto</span>
          </a>
        `;
    }

    return `
      <div class="mission-feedback mission-feedback--${escapeHtml(state.feedback.status)}" tabindex="-1" data-feedback-card>
        <strong><i data-lucide="${icon}" aria-hidden="true"></i>${escapeHtml(state.feedback.title)}</strong>
        <p>${escapeHtml(state.feedback.message)}</p>
        <div class="mission-feedback__actions">
          ${nextActionHtml}
          <a class="button button-secondary" href="meu-progresso.html">
            <i data-lucide="line-chart" aria-hidden="true"></i>
            <span>Ver Meu Progresso</span>
          </a>
          <button class="button button-secondary" type="button" data-save-progress>
            <i data-lucide="log-in" aria-hidden="true"></i>
            <span>Entrar para salvar progresso</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderMissionContextPanel() {
    const completedCount = getCompletedCount();
    const currentMission = missions[state.activeIndex];
    const currentAttempt = state.attempts[currentMission.slug];
    const progressPercent = Math.round((completedCount / missions.length) * 100);
    const isPilotComplete = completedCount === missions.length;

    return `
      <section class="mission-context-panel" aria-label="Contexto e avanço da missão">
        <div class="mission-context-panel__intro">
          <div class="mission-sidebar-summary">
            <span class="mission-side-card__label">Por que esta missão?</span>
            <p>${escapeHtml(currentMission.why)}</p>
          </div>
          <small class="mission-prototype-note">Protótipo local: o progresso real será salvo após integração com Supabase.</small>
        </div>
        <div class="mission-context-panel__progress">
          <div class="mission-progress-panel__header">
            <span class="mission-side-card__label">Seu avanço</span>
            <strong>${completedCount} de ${missions.length} missões concluídas</strong>
            <p>${isPilotComplete ? "Piloto concluído com evidência em todas as missões." : "Pratique, envie uma tentativa e avance pela próxima lacuna liberada."}</p>
          </div>
          <div class="mission-progress-line" aria-label="${completedCount} de ${missions.length} missões concluídas">
            <span style="width: ${progressPercent}%"></span>
          </div>
          <div class="mission-progress-metrics" aria-label="Resumo da missão atual">
            <div>
              <span>Etapa atual</span>
              <strong>${state.activeIndex + 1}/${missions.length}</strong>
            </div>
            <div>
              <span>Tentativas</span>
              <strong>${currentAttempt?.attemptCount || 0}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>${currentAttempt?.status === "correct" ? "ok" : "em curso"}</strong>
            </div>
          </div>
          <div class="mission-completion-rule">
            <i data-lucide="shield-check" aria-hidden="true"></i>
            <span>Critério de conclusão: tentativa enviada, feedback exibido e resposta correta.</span>
          </div>
          ${isPilotComplete ? `
            <div class="mission-pilot-complete">
              <strong>SQL Essencial praticado</strong>
              <span>Filtros, contagens e filtro antes da agregação foram respondidos no protótipo local.</span>
            </div>
          ` : ""}
          <div class="mission-stepper mission-stepper--horizontal" aria-label="Etapas do piloto">
            ${missions.map((mission, index) => {
              const status = getMissionStatus(index);
              return `
                <button
                  class="mission-stepper-item is-${status}"
                  type="button"
                  data-select-mission="${index}"
                  ${status === "locked" ? "disabled" : ""}
                >
                  <span class="mission-stepper-dot">${index + 1}</span>
                  <span class="mission-stepper-copy">
                    <strong>${escapeHtml(mission.gap)}</strong>
                    <small>${escapeHtml(getCompletionText(status))} - ${mission.estimatedMinutes} min</small>
                  </span>
                </button>
              `;
            }).join("")}
          </div>
        </div>
      </section>
    `;
  }

  function renderCompletionPanel() {
    if (getCompletedCount() !== missions.length) {
      return "";
    }

    return `
      <section id="piloto-concluido" class="mission-complete-panel" aria-label="Piloto SQL Essencial concluído">
        <span class="section-kicker">Piloto SQL Essencial concluído</span>
        <h2>Você concluiu as 3 missões do piloto SQL Essencial.</h2>
        <p>Filtros com WHERE, contagens com nulos/distintos e filtro antes da agregação foram praticados nesta bancada.</p>
        <div class="mission-complete-actions">
          <a class="button button-primary" href="meu-progresso.html">
            <i data-lucide="line-chart" aria-hidden="true"></i>
            <span>Ver Meu Progresso</span>
          </a>
          <a class="button button-secondary" href="index.html#trilhas">
            <i data-lucide="route" aria-hidden="true"></i>
            <span>Voltar para Trilhas</span>
          </a>
          <a class="button button-secondary" href="diagnostico.html">
            <i data-lucide="clipboard-list" aria-hidden="true"></i>
            <span>Refazer diagnóstico</span>
          </a>
        </div>
      </section>
    `;
  }

  function renderPage() {
    const mission = missions[state.activeIndex];
    const attempt = state.attempts[mission.slug];

    mount.innerHTML = `
      <div class="mission-layout">
        ${renderMissionHero(mission)}
        ${renderMissionContextPanel()}
        <div class="mission-main">
          <section class="mission-content-card" aria-label="Conteúdo curto da missão">
            <span class="section-kicker">Conteúdo curto</span>
            <h2>${escapeHtml(mission.contentTitle)}</h2>
            <p>${escapeHtml(mission.content)}</p>
            <code class="code-block">${escapeHtml(mission.example)}</code>
          </section>

          <section id="atividade" class="mission-activity-card" aria-label="Atividade prática">
            <div class="mission-card-heading">
              <div>
                <span class="section-kicker">${escapeHtml(mission.activityTitle)}</span>
                <h2>${escapeHtml(mission.prompt)}</h2>
              </div>
              <span class="mission-attempt-pill">${attempt ? "Tentativa enviada" : "Aguardando tentativa"}</span>
            </div>
            <div class="mission-context-list">
              ${mission.context.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
            </div>
            ${renderActivity(mission)}
            <div class="mission-submit-row">
              <button class="submit-button" type="button" data-submit-answer>
                <i data-lucide="send" aria-hidden="true"></i>
                <span>Enviar resposta</span>
              </button>
            </div>
            ${renderFeedback()}
          </section>
          ${renderCompletionPanel()}
        </div>
      </div>
    `;

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function resetMissionInteraction() {
    const mission = missions[state.activeIndex];
    const attempt = state.attempts[mission.slug];
    state.selectedOption = null;
    state.queryAnswer = "";
    state.feedback = attempt
      ? { status: attempt.status, title: attempt.title, message: attempt.message }
      : null;
  }

  function selectMission(index) {
    const status = getMissionStatus(index);
    if (status === "locked") {
      return;
    }

    state.activeIndex = index;
    state.started = true;
    resetMissionInteraction();
    renderPage();
    window.requestAnimationFrame(() => {
      document.querySelector(".mission-hero")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function submitAnswer() {
    const mission = missions[state.activeIndex];
    const isQuery = mission.activityType === "query_fix";

    if (!isQuery && state.selectedOption === null) {
      state.feedback = {
        status: "incorrect",
        title: "Resposta pendente",
        message: "Escolha uma alternativa antes de enviar. A missão não conclui sem tentativa."
      };
      renderPage();
      return;
    }

    if (isQuery && !state.queryAnswer.trim()) {
      state.feedback = {
        status: "incorrect",
        title: "Resposta pendente",
        message: "Digite uma tentativa de query antes de enviar. A missão não conclui sem resposta."
      };
      renderPage();
      return;
    }

    const previousAttemptCount = state.attempts[mission.slug]?.attemptCount || 0;
    const result = mission.evaluate({
      selectedOption: state.selectedOption,
      queryAnswer: state.queryAnswer
    });

    state.feedback = result;
    state.attempts[mission.slug] = {
      ...result,
      attemptCount: previousAttemptCount + 1
    };

    renderPage();
    window.requestAnimationFrame(() => {
      document.querySelector("[data-feedback-card]")?.focus({ preventScroll: true });
      document.querySelector("[data-feedback-card]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  mount.addEventListener("click", (event) => {
    const startButton = event.target.closest("[data-start-mission]");
    if (startButton) {
      state.started = true;
      document.querySelector("#atividade")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const optionButton = event.target.closest("[data-option-index]");
    if (optionButton) {
      state.started = true;
      state.selectedOption = Number(optionButton.dataset.optionIndex);
      state.feedback = null;
      renderPage();
      return;
    }

    const submitButton = event.target.closest("[data-submit-answer]");
    if (submitButton) {
      state.started = true;
      submitAnswer();
      return;
    }

    const nextButton = event.target.closest("[data-next-mission]");
    if (nextButton && !nextButton.disabled) {
      const nextIndex = Math.min(state.activeIndex + 1, missions.length - 1);
      selectMission(nextIndex);
      return;
    }

    const saveButton = event.target.closest("[data-save-progress]");
    if (saveButton) {
      state.feedback = {
        status: "partial",
        title: "Protótipo local",
        message: "Entrar para salvar progresso será conectado depois da integração com Supabase. Nesta tela, o progresso é simulado apenas em memória."
      };
      renderPage();
      return;
    }

    const missionButton = event.target.closest("[data-select-mission]");
    if (missionButton) {
      selectMission(Number(missionButton.dataset.selectMission));
    }
  });

  mount.addEventListener("input", (event) => {
    if (event.target.matches("[data-query-answer]")) {
      state.started = true;
      state.queryAnswer = event.target.value;
      state.feedback = null;
    }
  });

  renderPage();
})();
