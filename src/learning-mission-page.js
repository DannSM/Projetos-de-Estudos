(function initLearningMissionPrototype() {
  const mount = document.querySelector("#missionPageMount");
  if (!mount) {
    return;
  }

  const sqlValidation = window.SqlMissionValidation;
  const sqlPocEngine = window.SqlPocEngine;
  if (!sqlValidation || !sqlPocEngine) {
    mount.innerHTML = `
      <div class="mission-loading">
        <strong>Não foi possível carregar a bancada local de SQL.</strong>
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
      activityType: "sql_workbench",
      activityTitle: "Pratique agora",
      prompt: "Crie uma consulta para contar pedidos pagos por categoria. O filtro de status precisa acontecer antes do agrupamento.",
      context: ["Tabela: pedidos", "Colunas: pedido_id, status, categoria, valor"],
      placeholder: "select campo_de_grupo, agregação\nfrom tabela\nwhere condição\ngroup by campo_de_grupo;"
    }
  ];

  const state = {
    activeIndex: getInitialMissionIndex(),
    selectedOption: null,
    queryAnswer: "",
    attempts: {},
    feedback: null,
    started: false,
    sqlWorkbench: {
      status: "idle",
      engine: null,
      execution: null,
      executionQuery: "",
      error: ""
    }
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
    if (mission.activityType === "sql_workbench") {
      return renderSqlWorkbench(mission);
    }

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

  function renderDataTable(columns, rows, className = "") {
    if (!columns.length) {
      return `<p class="sql-workbench-empty">A consulta foi executada sem retornar colunas.</p>`;
    }

    return `
      <div class="sql-workbench-table-wrap ${escapeHtml(className)}">
        <table class="sql-workbench-table">
          <thead>
            <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                ${columns.map((column) => `<td>${escapeHtml(row[column] ?? "null")}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderSqlWorkbench(mission) {
    const workbench = state.sqlWorkbench;
    const schemaColumns = ["coluna", "tipo"];
    const schemaRows = sqlPocEngine.PEDIDOS_SCHEMA.map((column) => ({
      coluna: column.name,
      tipo: column.type
    }));
    const sampleColumns = ["pedido_id", "status", "categoria", "valor"];
    const query = state.queryAnswer.trim();
    const executionIsCurrent = workbench.execution && workbench.executionQuery === query;
    const executionIsEvaluable = sqlPocEngine.isEvaluableResult(workbench.execution);
    const canValidate = sqlPocEngine.canValidateExecution(workbench.execution, workbench.executionQuery, query);
    const isBusy = workbench.status === "loading" || workbench.status === "running";
    const canExecute = Boolean(query) && workbench.status === "ready";
    let validationHint = "Execute uma consulta válida antes de validar a missão.";

    if (workbench.status === "loading") {
      validationHint = "Aguarde a preparação do PostgreSQL local.";
    } else if (workbench.error) {
      validationHint = "Corrija o erro e execute a consulta novamente.";
    } else if (workbench.execution && !executionIsCurrent) {
      validationHint = "A consulta foi alterada. Execute novamente antes de validar.";
    } else if (workbench.execution && !executionIsEvaluable) {
      validationHint = "O resultado precisa ter colunas e linhas para ser validado.";
    } else if (canValidate) {
      validationHint = "Consulta executada. Valide para verificar se ela responde ao desafio.";
    }

    let technicalResult = `
      <div class="sql-workbench-status is-idle" data-sql-technical-result>
        <strong>Resultado técnico</strong>
        <p>Execute sua consulta para ver colunas, linhas ou erros do PostgreSQL local.</p>
      </div>
    `;

    if (workbench.status === "loading") {
      technicalResult = `
        <div class="sql-workbench-status is-loading" data-sql-technical-result>
          <strong>Preparando PostgreSQL local...</strong>
          <p>A base sintética está sendo carregada apenas na memória deste navegador.</p>
        </div>
      `;
    } else if (workbench.status === "running") {
      technicalResult = `
        <div class="sql-workbench-status is-loading" data-sql-technical-result>
          <strong>Executando consulta...</strong>
          <p>O resultado será exibido aqui antes da validação pedagógica.</p>
        </div>
      `;
    } else if (workbench.error) {
      technicalResult = `
        <div class="sql-workbench-status is-error" data-sql-technical-result tabindex="-1">
          <strong>Erro ao executar</strong>
          <p class="sql-workbench-technical-error">${escapeHtml(workbench.error)}</p>
          <div class="sql-workbench-guidance">
            <span>Como pensar sobre o erro</span>
            <p>${escapeHtml(getSqlErrorGuidance(query, workbench.error))}</p>
          </div>
        </div>
      `;
    } else if (workbench.execution) {
      const resultState = executionIsEvaluable ? "is-info" : "is-warning";
      const resultTitle = executionIsEvaluable
        ? `Consulta executada: ${workbench.execution.totalRows ?? workbench.execution.rows.length} linha(s)`
        : "Consulta executada, mas sem resultado útil";
      technicalResult = `
        <div class="sql-workbench-status ${resultState}" data-sql-technical-result tabindex="-1">
          <strong>${resultTitle}</strong>
          ${executionIsEvaluable
            ? `<p>Consulta executada. Agora valide se o resultado responde ao desafio.</p>
              ${renderDataTable(workbench.execution.columns, workbench.execution.rows, "is-result")}`
            : "<p>A consulta rodou, mas não retornou um resultado tabular útil para avaliar. Nesta missão, o resultado precisa trazer uma categoria e uma contagem.</p>"}
          ${workbench.execution.truncated
            ? `<p>Exibindo apenas as primeiras ${sqlPocEngine.MAX_RESULT_ROWS} linhas para manter a bancada responsiva.</p>`
            : ""}
          <p data-sql-stale-note ${executionIsCurrent ? "hidden" : ""}>O editor mudou. Execute novamente antes de validar.</p>
        </div>
      `;
    }

    return `
      <div class="sql-workbench">
        <div class="sql-workbench-reference">
          <section aria-label="Schema sintético da tabela pedidos">
            <div class="sql-workbench-heading">
              <span>Schema local</span>
              <strong>pedidos</strong>
            </div>
            ${renderDataTable(schemaColumns, schemaRows, "is-compact")}
          </section>
          <section aria-label="Amostra de dados sintéticos">
            <div class="sql-workbench-heading">
              <span>Amostra sintética</span>
              <strong>${sqlPocEngine.PEDIDOS_SAMPLE.length} registros</strong>
            </div>
            ${renderDataTable(sampleColumns, sqlPocEngine.PEDIDOS_SAMPLE, "is-sample")}
          </section>
        </div>
        <label class="sql-workbench-editor">
          <span>Sua consulta SQL</span>
          <textarea
            class="mission-query-input"
            data-query-answer
            rows="7"
            spellcheck="false"
            aria-label="Resposta em SQL"
            placeholder="${escapeHtml(mission.placeholder)}"
          >${escapeHtml(state.queryAnswer)}</textarea>
        </label>
        <div class="sql-workbench-actions">
          <button class="button button-secondary" type="button" data-execute-query ${!canExecute ? "disabled" : ""}>
            <i data-lucide="play" aria-hidden="true"></i>
            <span>Executar consulta</span>
          </button>
          <button class="button button-primary" type="button" data-validate-query ${!canValidate || isBusy ? "disabled" : ""}>
            <i data-lucide="badge-check" aria-hidden="true"></i>
            <span>Validar resultado</span>
          </button>
          <p class="sql-workbench-action-hint ${canValidate ? "is-ready" : ""}">${escapeHtml(validationHint)}</p>
        </div>
        ${technicalResult}
      </div>
    `;
  }

  function getSqlErrorGuidance(query, errorMessage) {
    const normalizedQuery = sqlValidation.normalizeSql(query);
    const normalizedError = String(errorMessage || "").toLowerCase();

    if (
      /^s(?:e(?:l(?:e(?:c(?:t)?)?)?)?)?$/.test(normalizedQuery) ||
      normalizedError.includes("sua consulta está incompleta")
    ) {
      return "Sua consulta está incompleta. Comece com SELECT e indique os campos que deseja consultar.";
    }

    if (normalizedError.includes("must appear in the group by")) {
      return "Você está exibindo uma coluna comum junto com uma contagem. O SQL precisa saber como agrupar essa coluna antes de contar.";
    }

    if (
      normalizedError.includes("syntax error") &&
      (normalizedError.includes('near "from"') || /\bselect\s+categoria\s+count\s*\(/.test(normalizedQuery))
    ) {
      return "Confira se os campos no SELECT estão separados corretamente. Cada campo selecionado precisa ser separado por vírgula.";
    }

    if (!/\bfrom\b/.test(normalizedQuery) || normalizedError.includes('column "categoria" does not exist')) {
      return "Você escolheu uma coluna, mas ainda não informou de qual tabela os dados vêm. Use FROM para indicar a fonte.";
    }

    if (normalizedError.includes("syntax error")) {
      return "Revise a ordem das cláusulas e confira se cada parte da consulta está completa.";
    }

    return "Leia a mensagem técnica e revise a parte da consulta indicada antes de executar novamente.";
  }

  function getResultMismatchGuidance(query) {
    const checks = sqlValidation.validatePaidOrdersByCategorySql(query).checks;

    if (!checks.hasWhere || !checks.hasStatusPaid) {
      return "A consulta executou, mas o resultado ainda não responde exatamente ao pedido da missão. Considere quais registros devem ser filtrados antes da contagem.";
    }

    if (!checks.hasCountStar) {
      return "A consulta executou, mas o resultado ainda não responde exatamente ao pedido da missão. Verifique se ele apresenta uma contagem por categoria.";
    }

    if (!checks.hasGroupByCategoria) {
      return "A consulta executou, mas o resultado ainda não responde exatamente ao pedido da missão. Verifique como a contagem deve ser organizada.";
    }

    return "A consulta executou, mas o resultado ainda não responde exatamente ao pedido da missão. Revise o recorte, a contagem e o agrupamento.";
  }

  function renderActivityActions(mission) {
    if (mission.activityType === "sql_workbench") {
      return "";
    }

    return `
      <div class="mission-submit-row">
        <button class="submit-button" type="button" data-submit-answer>
          <i data-lucide="send" aria-hidden="true"></i>
          <span>Enviar resposta</span>
        </button>
      </div>
    `;
  }

  function getEmptyFeedbackContent() {
    const mission = missions[state.activeIndex];
    const workbench = state.sqlWorkbench;
    const query = state.queryAnswer.trim();
    const executionIsCurrent = workbench.execution && workbench.executionQuery === query;
    const hasResultReady = mission.activityType === "sql_workbench"
      && executionIsCurrent
      && sqlPocEngine.isEvaluableResult(workbench.execution);

    if (hasResultReady) {
      return {
        title: "Resultado pronto para validar",
        message: "Resultado executado. Agora valide para comparar com o objetivo da missão."
      };
    }

    if (mission.activityType === "sql_workbench") {
      return {
        title: "Como receber feedback",
        message: "Execute sua consulta para ver o resultado. Depois valide se ela responde ao desafio."
      };
    }

    return {
      title: "Ver feedback",
      message: "Envie uma tentativa para receber feedback imediato. A missão só aparece como concluída depois da resposta."
    };
  }

  function renderFeedback() {
    if (!state.feedback) {
      const emptyFeedback = getEmptyFeedbackContent();

      return `
        <div class="mission-feedback mission-feedback--empty">
          <strong data-empty-feedback-title>${escapeHtml(emptyFeedback.title)}</strong>
          <p data-empty-feedback-message>${escapeHtml(emptyFeedback.message)}</p>
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
            ${renderActivityActions(mission)}
            ${renderFeedback()}
          </section>
          ${renderCompletionPanel()}
        </div>
      </div>
    `;

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }

    void ensureSqlWorkbench();
  }

  async function ensureSqlWorkbench() {
    const mission = missions[state.activeIndex];
    if (mission.activityType !== "sql_workbench" || state.sqlWorkbench.status !== "idle") {
      return;
    }

    state.sqlWorkbench.status = "loading";
    renderPage();

    try {
      state.sqlWorkbench.engine = await sqlPocEngine.createBrowserWorkbench();
      state.sqlWorkbench.status = "ready";
    } catch (error) {
      state.sqlWorkbench.status = "error-loading";
      state.sqlWorkbench.error = "Não foi possível iniciar o PostgreSQL local. Verifique sua conexão e recarregue a página.";
      console.error("Falha ao iniciar PGlite:", error);
    }

    renderPage();
  }

  async function executeSqlQuery() {
    const workbench = state.sqlWorkbench;
    if (!workbench.engine || workbench.status !== "ready") {
      return;
    }

    const query = state.queryAnswer.trim();
    workbench.status = "running";
    workbench.execution = null;
    workbench.executionQuery = "";
    workbench.error = "";
    state.feedback = null;
    renderPage();

    try {
      workbench.execution = await workbench.engine.execute(query);
      workbench.executionQuery = query;
    } catch (error) {
      workbench.error = error instanceof Error ? error.message : String(error);
    } finally {
      workbench.status = "ready";
    }

    renderPage();
    window.requestAnimationFrame(() => {
      document.querySelector("[data-sql-technical-result]")?.focus({ preventScroll: true });
      document.querySelector("[data-sql-technical-result]")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function validateSqlMission() {
    const mission = missions[state.activeIndex];
    const workbench = state.sqlWorkbench;
    const query = state.queryAnswer.trim();

    if (!workbench.execution || workbench.executionQuery !== query) {
      workbench.error = "Execute a versão atual da consulta antes de validar a missão.";
      renderPage();
      return;
    }

    const isCorrect = sqlPocEngine.validateMissionResult(workbench.execution, query);
    const result = isCorrect
      ? {
          status: "correct",
          title: "Correto",
          message: "A consulta executou sem erros e retornou a contagem esperada de pedidos pagos em cada categoria."
        }
      : {
          status: "partial",
          title: "Resultado diferente do esperado",
          message: getResultMismatchGuidance(query)
        };
    const previousAttemptCount = state.attempts[mission.slug]?.attemptCount || 0;

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

  function syncSqlWorkbenchControls() {
    const query = state.queryAnswer.trim();
    const workbench = state.sqlWorkbench;
    const executeButton = mount.querySelector("[data-execute-query]");
    const validateButton = mount.querySelector("[data-validate-query]");
    const actionHint = mount.querySelector(".sql-workbench-action-hint");
    const staleNote = mount.querySelector("[data-sql-stale-note]");
    const emptyFeedbackTitle = mount.querySelector("[data-empty-feedback-title]");
    const emptyFeedbackMessage = mount.querySelector("[data-empty-feedback-message]");
    const executionIsCurrent = workbench.execution && workbench.executionQuery === query;

    if (executeButton) {
      executeButton.disabled = !query || workbench.status !== "ready";
    }

    if (validateButton) {
      validateButton.disabled = !sqlPocEngine.canValidateExecution(
        workbench.execution,
        workbench.executionQuery,
        query
      );
    }

    if (actionHint) {
      actionHint.classList.remove("is-ready");
      actionHint.textContent = executionIsCurrent
        ? "Consulta executada. Valide para verificar se ela responde ao desafio."
        : workbench.execution
          ? "A consulta foi alterada. Execute novamente antes de validar."
          : "Execute uma consulta válida antes de validar o resultado.";
    }

    if (staleNote) {
      staleNote.hidden = Boolean(executionIsCurrent);
    }

    if (emptyFeedbackTitle && emptyFeedbackMessage) {
      const emptyFeedback = getEmptyFeedbackContent();
      emptyFeedbackTitle.textContent = emptyFeedback.title;
      emptyFeedbackMessage.textContent = emptyFeedback.message;
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

    const executeButton = event.target.closest("[data-execute-query]");
    if (executeButton && !executeButton.disabled) {
      state.started = true;
      void executeSqlQuery();
      return;
    }

    const validateButton = event.target.closest("[data-validate-query]");
    if (validateButton && !validateButton.disabled) {
      state.started = true;
      validateSqlMission();
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
      state.sqlWorkbench.error = "";
      syncSqlWorkbenchControls();
    }
  });

  renderPage();
})();
