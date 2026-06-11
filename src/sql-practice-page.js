(function initSqlPracticePage(globalScope) {
  const mount = document.querySelector("#sqlPracticePageMount");
  if (!mount) {
    return;
  }

  const sqlValidation = globalScope.SqlMissionValidation;
  const sqlPocEngine = globalScope.SqlPocEngine;
  if (!sqlValidation || !sqlPocEngine) {
    mount.innerHTML = `
      <div class="mission-loading">
        <strong>Não foi possível carregar a Central SQL.</strong>
        <span>Recarregue a página para tentar novamente.</span>
      </div>
    `;
    return;
  }

  const PRACTICE_NOTE_STORAGE_PREFIX = "dsm:sql-practice-note";
  const PRACTICE_FEEDBACK_STORAGE_PREFIX = "dsm:sql-practice-feedback";

  const practices = [
    {
      slug: "sql-introducao",
      navTitle: "Introdução ao SQL",
      shortTitle: "Introdução ao SQL",
      status: "completed",
      estimatedMinutes: 8,
      level: "SQL Junior",
      topic: "Base",
      note: "validada localmente"
    },
    {
      slug: "sql-essencial-filtros-where",
      navTitle: "Etapa 1 - Filtros com WHERE",
      shortTitle: "Etapa 1: Filtrando pedidos pagos",
      status: "active",
      estimatedMinutes: 15,
      level: "SQL Junior",
      topic: "WHERE + GROUP BY",
      table: "pedidos",
      columns: "pedido_id, status, categoria, valor",
      prompt: "Crie uma consulta para contar pedidos pagos por categoria. O filtro de status precisa acontecer antes do agrupamento.",
      objective: "Treine como aplicar WHERE antes de contar ou resumir uma métrica.",
      why: "Esta prática apareceu porque o diagnóstico mostrou que o resumo pode ficar correto na forma, mas errado no recorte.",
      contentTitle: "Primeiro recorte, depois resumo",
      content: "Quando a métrica é sobre um grupo específico, aplique o WHERE antes de contar ou somar.",
      example: "select campo, count(*)\nfrom tabela\nwhere condicao\ngroup by campo;",
      hintText: "O enunciado pede pedidos pagos por categoria. Filtre status = 'pago' antes do GROUP BY e agrupe por categoria.",
      solutionText: "Uma solução possível: select categoria, count(*) from pedidos where status = 'pago' group by categoria;",
      placeholder: "select campo_de_grupo, agregacao\nfrom tabela\nwhere condicao\ngroup by campo_de_grupo;"
    },
    {
      slug: "sql-essencial-count-nulos-distintos",
      navTitle: "Etapa 2 - COUNT e Distintos",
      shortTitle: "COUNT, nulos e distintos",
      status: "soon",
      estimatedMinutes: 12,
      level: "SQL Junior",
      topic: "Agregações",
      note: "em breve"
    },
    {
      slug: "sql-essencial-filtro-antes-agregacao",
      navTitle: "Etapa 3 - Filtro e Agregacao",
      shortTitle: "Filtro antes da agregacao",
      status: "soon",
      estimatedMinutes: 15,
      level: "SQL Junior",
      topic: "WHERE + GROUP BY",
      note: "em breve"
    },
    {
      slug: "sql-essencial-group-by",
      navTitle: "Etapa 4 - GROUP BY",
      shortTitle: "Agrupamentos com GROUP BY",
      status: "soon",
      estimatedMinutes: 18,
      level: "SQL Junior",
      topic: "GROUP BY",
      note: "em breve"
    },
    {
      slug: "sql-essencial-join",
      navTitle: "Etapa 5 - JOIN",
      shortTitle: "Relacionando tabelas com JOIN",
      status: "soon",
      estimatedMinutes: 20,
      level: "SQL Junior",
      topic: "JOIN",
      note: "em breve"
    }
  ];

  const activePracticeIndex = Math.max(1, getInitialPracticeIndex());

  const state = {
    activeIndex: practices[activePracticeIndex]?.status === "active" ? activePracticeIndex : 1,
    queryAnswer: "",
    attempts: {},
    feedback: null,
    sqlWorkbench: {
      status: "idle",
      engine: null,
      execution: null,
      executionQuery: "",
      error: ""
    },
    practiceNote: "",
    noteStatus: "",
    practiceFeedback: {
      difficulty: "",
      confidence: "",
      comment: ""
    },
    feedbackStatus: "",
    activeUtility: ""
  };

  function getInitialPracticeIndex() {
    const params = new URLSearchParams(globalScope.location.search);
    const slug = params.get("pratica") || params.get("missao") || "sql-essencial-filtros-where";
    const index = practices.findIndex((practice) => practice.slug === slug);
    return index >= 0 ? index : 1;
  }

  function getStorageKey(prefix, slug) {
    return `${prefix}:${slug}`;
  }

  function readLocalJson(key, fallback) {
    try {
      const rawValue = globalScope.localStorage.getItem(key);
      return rawValue ? JSON.parse(rawValue) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeLocalJson(key, value) {
    try {
      globalScope.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeLocalItem(key) {
    try {
      globalScope.localStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadLocalPracticeDrafts(practice) {
    state.practiceNote = readLocalJson(getStorageKey(PRACTICE_NOTE_STORAGE_PREFIX, practice.slug), "");
    state.practiceFeedback = readLocalJson(
      getStorageKey(PRACTICE_FEEDBACK_STORAGE_PREFIX, practice.slug),
      { difficulty: "", confidence: "", comment: "" }
    );
    state.noteStatus = "";
    state.feedbackStatus = "";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getActivePractice() {
    return practices[state.activeIndex] || practices[1];
  }

  function getAttemptCount(practice) {
    return state.attempts[practice.slug]?.attemptCount || 0;
  }

  function getRuntimeStatus(practice) {
    const attempt = state.attempts[practice.slug];
    const workbench = state.sqlWorkbench;

    if (attempt?.status === "correct") return { label: "Correto", tone: "correct" };
    if (state.feedback?.status === "partial") return { label: "Incorreto", tone: "warning" };
    if (workbench.error) return { label: "Erro de SQL", tone: "error" };
    if (workbench.status === "loading") return { label: "Preparando ambiente", tone: "info" };
    if (workbench.status === "running") return { label: "Executando consulta", tone: "info" };
    if (workbench.execution) return { label: "Resultado pronto", tone: "ready" };
    return { label: "Aguardando tentativa", tone: "idle" };
  }

  function getSidebarStatus(practice, index) {
    if (practice.status === "completed") return "completed";
    if (index === state.activeIndex) {
      return state.attempts[practice.slug]?.status === "correct" ? "completed" : "active";
    }
    return "locked";
  }

  function getSidebarIcon(status) {
    if (status === "completed") return "check-circle-2";
    if (status === "active") return "play-circle";
    return "lock";
  }

  function getSidebarLabel(status) {
    if (status === "completed") return "validada local";
    if (status === "active") return "ativa";
    return "em breve";
  }

  function renderSidebar() {
    return `
      <aside class="sql-practice-sidebar" aria-label="Roteiro SQL Essencial">
        <div class="sql-practice-sidebar__header">
          <h1>SQL Essencial <span aria-hidden="true">·</span> Trilha de prática</h1>
        </div>
        <nav class="sql-practice-steps" aria-label="Etapas da Central SQL">
          ${practices.map((practice, index) => {
            const status = getSidebarStatus(practice, index);
            const isLocked = status === "locked";
            return `
              <button
                class="sql-practice-step is-${status}"
                type="button"
                data-select-practice="${index}"
                ${isLocked ? "disabled" : ""}
              >
                <span class="sql-practice-step__icon" aria-hidden="true">
                  <i data-lucide="${getSidebarIcon(status)}"></i>
                </span>
                <span class="sql-practice-step__copy">
                  <strong>${escapeHtml(practice.navTitle)}</strong>
                  <small>${escapeHtml(getSidebarLabel(status))} - ${practice.estimatedMinutes} min</small>
                </span>
              </button>
            `;
          }).join("")}
        </nav>
        <div class="sql-practice-sidebar__footer">
          <a class="button button-secondary" href="meu-progresso.html">
            <i data-lucide="line-chart" aria-hidden="true"></i>
            <span>Ver Meu Progresso</span>
          </a>
          <a class="button button-secondary" href="index.html#trilhas">
            <i data-lucide="route" aria-hidden="true"></i>
            <span>Voltar para Trilhas</span>
          </a>
        </div>
      </aside>
    `;
  }

  function renderWorkspaceHeader(practice) {
    const status = getRuntimeStatus(practice);
    return `
      <header class="sql-practice-workspace__header">
        <div class="sql-practice-workspace__title">
          <span class="section-kicker">Prática ativa</span>
          <h2>${escapeHtml(practice.shortTitle)}</h2>
        </div>
        <div class="sql-practice-workspace__tools" aria-label="Ações da prática">
          <span class="sql-practice-status is-${status.tone}">
            <span aria-hidden="true"></span>
            ${escapeHtml(status.label)}
          </span>
          <span class="sql-practice-counter">${getAttemptCount(practice)} tentativa(s)</span>
          <button class="sql-practice-tool" type="button" data-open-practice-utility="hint" aria-label="Abrir dica rápida" title="Dica rápida">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
          </button>
          <button class="sql-practice-tool" type="button" data-open-practice-utility="notes" aria-label="Abrir anotações pessoais" title="Anotações pessoais">
            <i data-lucide="sticky-note" aria-hidden="true"></i>
          </button>
          <button class="sql-practice-tool" type="button" data-open-practice-utility="feedback" aria-label="Abrir feedback da prática" title="Feedback da prática">
            <i data-lucide="message-square" aria-hidden="true"></i>
          </button>
        </div>
      </header>
    `;
  }

  function renderTags(practice) {
    return `
      <div class="mission-context-list sql-practice-tags" aria-label="Contexto da prática">
        <span><i data-lucide="table-2" aria-hidden="true"></i>Tabela: ${escapeHtml(practice.table)}</span>
        <span><i data-lucide="graduation-cap" aria-hidden="true"></i>Nível: ${escapeHtml(practice.level)}</span>
        <span><i data-lucide="shield-check" aria-hidden="true"></i>Validação local</span>
        <details class="sql-practice-columns">
          <summary><i data-lucide="columns-3" aria-hidden="true"></i>Colunas: ver detalhes</summary>
          <div>${escapeHtml(practice.columns)}</div>
        </details>
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

  function renderSupportPanels(practice) {
    const schemaColumns = ["coluna", "tipo"];
    const schemaRows = sqlPocEngine.PEDIDOS_SCHEMA.map((column) => ({
      coluna: column.name,
      tipo: column.type
    }));

    return `
      <aside class="sql-practice-support" id="apoio-sql" aria-label="Apoio da prática SQL">
        <section class="mission-learning-card sql-support-card">
          <header class="sql-support-card__header">
            <strong><i data-lucide="book-open" aria-hidden="true"></i>Apoio teórico</strong>
          </header>
          <h3>${escapeHtml(practice.contentTitle)}</h3>
          <p>${escapeHtml(practice.content)}</p>
          <code class="code-block">${escapeHtml(practice.example)}</code>
        </section>
        <section class="mission-learning-card sql-support-card">
          <header class="sql-support-card__header">
            <strong><i data-lucide="table-2" aria-hidden="true"></i>Schema local</strong>
            <small>${sqlPocEngine.PEDIDOS_SAMPLE.length} registros</small>
          </header>
          ${renderDataTable(schemaColumns, schemaRows, "is-compact")}
        </section>
        <section class="mission-learning-card sql-support-card sql-support-chat">
          <header class="sql-support-card__header">
            <strong><i data-lucide="bot" aria-hidden="true"></i>Chat com IA</strong>
            <small>Em breve</small>
          </header>
          <p>IA tutora em breve. Aqui você poderá pedir ajuda sobre o enunciado, erro da query ou explicação da solução.</p>
          <div class="sql-support-chat__composer" aria-label="Chat com IA indisponivel">
            <input type="text" placeholder="Pergunte algo sobre este exercício..." disabled>
            <button type="button" disabled aria-label="Enviar mensagem">
              <i data-lucide="send" aria-hidden="true"></i>
            </button>
          </div>
        </section>
      </aside>
    `;
  }

  function renderTechnicalResult() {
    const workbench = state.sqlWorkbench;
    const query = state.queryAnswer.trim();
    const executionIsCurrent = workbench.execution && workbench.executionQuery === query;
    const executionIsEvaluable = sqlPocEngine.isEvaluableResult(workbench.execution);

    if (workbench.status === "loading") {
      return `
        <div class="sql-workbench-status is-loading" data-sql-technical-result>
          <strong>Preparando PostgreSQL local...</strong>
          <p>A base sintetica esta sendo carregada apenas na memoria deste navegador.</p>
        </div>
      `;
    }

    if (workbench.status === "running") {
      return `
        <div class="sql-workbench-status is-loading" data-sql-technical-result>
          <strong>Executando consulta...</strong>
          <p>O resultado será exibido aqui antes da validação didática.</p>
        </div>
      `;
    }

    if (workbench.error) {
      return `
        <div class="sql-workbench-status is-error" data-sql-technical-result>
          <strong>Erro ao executar</strong>
          <p class="sql-workbench-technical-error">${escapeHtml(workbench.error)}</p>
          <div class="sql-workbench-guidance">
            <span>Como pensar sobre o erro</span>
            <p>${escapeHtml(getSqlErrorGuidance(query, workbench.error))}</p>
          </div>
        </div>
      `;
    }

    if (workbench.execution) {
      const resultState = executionIsEvaluable ? "is-info" : "is-warning";
      const resultTitle = executionIsEvaluable
        ? `Consulta executada: ${workbench.execution.totalRows ?? workbench.execution.rows.length} linha(s)`
        : "Consulta executada, mas sem resultado util";

      return `
        <div class="sql-workbench-status ${resultState}" data-sql-technical-result>
          <strong>${escapeHtml(resultTitle)}</strong>
          ${executionIsEvaluable
            ? `<p>Consulta executada. Agora valide se o resultado responde ao exercício.</p>
              ${renderDataTable(workbench.execution.columns, workbench.execution.rows, "is-result")}`
            : "<p>A consulta rodou, mas não retornou um resultado tabular útil para avaliar. Nesta prática, o resultado precisa trazer uma categoria e uma contagem.</p>"}
          ${workbench.execution.truncated
            ? `<p>Exibindo apenas as primeiras ${sqlPocEngine.MAX_RESULT_ROWS} linhas para manter a bancada responsiva.</p>`
            : ""}
          <p data-sql-stale-note ${executionIsCurrent ? "hidden" : ""}>O editor mudou. Execute novamente antes de validar.</p>
        </div>
      `;
    }

    return `
      <div class="sql-workbench-status is-idle" data-sql-technical-result>
        <strong>Escreva sua consulta e execute</strong>
        <p>O resultado do PostgreSQL local aparecerá aqui após a execução.</p>
      </div>
    `;
  }

  function getSqlErrorGuidance(query, errorMessage) {
    const normalizedQuery = sqlValidation.normalizeSql(query);
    const normalizedError = String(errorMessage || "").toLowerCase();

    if (/^s(?:e(?:l(?:e(?:c(?:t)?)?)?)?)?$/.test(normalizedQuery) || normalizedError.includes("sua consulta esta incompleta")) {
      return "Sua consulta esta incompleta. Comece com SELECT e indique os campos que deseja consultar.";
    }

    if (normalizedError.includes("must appear in the group by")) {
      return "Você exibiu uma coluna comum junto com uma contagem. Para contar por categoria, agrupe usando GROUP BY categoria.";
    }

    if (
      normalizedError.includes("syntax error") &&
      (normalizedError.includes('near "from"') || /\bselect\s+categoria\s+count\s*\(/.test(normalizedQuery))
    ) {
      return "Confira se os campos no SELECT estao separados corretamente. Cada campo selecionado precisa ser separado por virgula.";
    }

    if (!/\bfrom\b/.test(normalizedQuery) || normalizedError.includes('column "categoria" does not exist')) {
      return "Você escolheu uma coluna, mas ainda não informou de qual tabela os dados vêm. Use FROM pedidos.";
    }

    if (normalizedError.includes("syntax error")) {
      return "Revise a ordem das clausulas: SELECT, FROM, WHERE e depois GROUP BY.";
    }

    return "Leia a mensagem tecnica e revise a parte da consulta indicada antes de executar novamente.";
  }

  function getResultMismatchGuidance(query) {
    const checks = sqlValidation.validatePaidOrdersByCategorySql(query).checks;
    const normalizedQuery = sqlValidation.normalizeSql(query);

    if (!checks.hasCountStar) {
      return "Sua consulta listou categorias, mas ainda não contou os pedidos. Use COUNT(*) e agrupe por categoria.";
    }

    if (/\bselect\s+categoria\s*,\s*count\s*\(\s*\*\s*\)\s+from\s+pedidos\b/.test(normalizedQuery) && !checks.hasGroupByCategoria) {
      return "Você misturou uma coluna comum com uma contagem. Para contar por categoria, use GROUP BY categoria.";
    }

    if (!checks.hasWhere || !checks.hasStatusPaid) {
      return "Você agrupou por categoria, mas ainda precisa filtrar apenas pedidos pagos antes do agrupamento. Use WHERE status = 'pago' antes do GROUP BY.";
    }

    if (checks.hasWhere && checks.hasStatusPaid && checks.hasGroupByStatus && !checks.hasGroupByCategoria) {
      return "Você filtrou os pedidos pagos, mas agrupou por status. O exercício pede a contagem de pedidos pagos por categoria.";
    }

    if (!checks.hasGroupByCategoria) {
      return "A consulta executou, mas ainda precisa organizar a contagem por categoria. Use GROUP BY categoria.";
    }

    return "A consulta executou, mas ainda não responde exatamente ao exercício. Revise o recorte, a contagem e o agrupamento.";
  }

  function getEmptyFeedbackContent() {
    const workbench = state.sqlWorkbench;
    const query = state.queryAnswer.trim();
    const executionIsCurrent = workbench.execution && workbench.executionQuery === query;
    const hasResultReady = executionIsCurrent && sqlPocEngine.isEvaluableResult(workbench.execution);

    if (hasResultReady) {
      return {
        title: "Resultado pronto para validar",
        message: "Resultado executado. Agora valide para comparar com o objetivo da prática."
      };
    }

    return {
      title: "Como receber feedback",
      message: "Execute sua consulta para ver o resultado. Depois valide se ela responde ao exercício."
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

    const icon = state.feedback.status === "correct" ? "check-circle-2" : "circle-alert";
    return `
      <div class="mission-feedback mission-feedback--${escapeHtml(state.feedback.status)}" data-feedback-card>
        <strong><i data-lucide="${icon}" aria-hidden="true"></i>${escapeHtml(state.feedback.title)}</strong>
        <p>${escapeHtml(state.feedback.message)}</p>
        <div class="mission-feedback__actions">
          <a class="button button-secondary" href="meu-progresso.html">
            <i data-lucide="line-chart" aria-hidden="true"></i>
            <span>Ver Meu Progresso</span>
          </a>
          <button class="button button-secondary" type="button" data-save-progress>
            <i data-lucide="info" aria-hidden="true"></i>
            <span>Sobre progresso oficial</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderEditorPanel(practice) {
    const workbench = state.sqlWorkbench;
    const query = state.queryAnswer.trim();
    const canExecute = Boolean(query) && workbench.status === "ready";
    const canValidate = sqlPocEngine.canValidateExecution(workbench.execution, workbench.executionQuery, query);
    const isBusy = workbench.status === "loading" || workbench.status === "running";
    let validationHint = "Execute uma consulta válida antes de validar o exercício.";

    if (workbench.status === "loading") {
      validationHint = "Aguarde a preparacao do PostgreSQL local.";
    } else if (workbench.error) {
      validationHint = "Corrija o erro e execute a consulta novamente.";
    } else if (workbench.execution && workbench.executionQuery !== query) {
      validationHint = "A consulta foi alterada. Execute novamente antes de validar.";
    } else if (workbench.execution && !sqlPocEngine.isEvaluableResult(workbench.execution)) {
      validationHint = "O resultado precisa ter colunas e linhas para ser validado.";
    } else if (canValidate) {
      validationHint = "Consulta executada. Valide para verificar se ela responde ao exercício.";
    }

    return `
      <section class="sql-practice-editor-panel" id="atividade" aria-label="Editor e resultado SQL">
        <div class="sql-workbench-editor">
          <div class="sql-workbench-editor__header">
            <strong>Sua consulta SQL</strong>
            <span>PostgreSQL</span>
          </div>
          <textarea
            class="mission-query-input"
            data-query-answer
            rows="8"
            spellcheck="false"
            aria-label="Resposta em SQL"
            placeholder="-- Escreva sua consulta SQL aqui&#10;-- Ctrl+Enter para executar"
          >${escapeHtml(state.queryAnswer)}</textarea>
        </div>
        <div class="sql-workbench-actions">
          <button class="button button-secondary" type="button" data-execute-query ${!canExecute ? "disabled" : ""}>
            <i data-lucide="play" aria-hidden="true"></i>
            <span>Executar consulta</span>
          </button>
          <button class="button button-primary" type="button" data-validate-query ${!canValidate || isBusy ? "disabled" : ""}>
            <i data-lucide="badge-check" aria-hidden="true"></i>
            <span>Validar exercício</span>
          </button>
          <button class="button button-secondary" type="button" data-clear-query ${!state.queryAnswer ? "disabled" : ""}>
            <i data-lucide="eraser" aria-hidden="true"></i>
            <span>Limpar</span>
          </button>
          <p class="sql-workbench-action-hint ${canValidate ? "is-ready" : ""}">${escapeHtml(validationHint)}</p>
        </div>
        <div class="sql-practice-result-grid">
          <section class="sql-practice-output-card" aria-label="Resultado da execução">
            <h3><i data-lucide="table-properties" aria-hidden="true"></i>Resultado da execução</h3>
            ${renderTechnicalResult()}
          </section>
          <section class="sql-practice-output-card" aria-label="Feedback da validação">
            <h3><i data-lucide="shield-check" aria-hidden="true"></i>Feedback da validação</h3>
            ${renderFeedback()}
          </section>
        </div>
      </section>
    `;
  }

  function renderPracticeNotes(practice) {
    return `
      <div class="mission-local-card__body" id="anotacoes-sql">
        <p class="sql-practice-utility-note">Salvo apenas neste navegador. Não altera o progresso oficial.</p>
          <textarea
            class="mission-local-textarea"
            data-practice-note
            rows="4"
            maxlength="800"
            placeholder="Registre uma duvida, insight ou query que queira revisar depois."
          >${escapeHtml(state.practiceNote)}</textarea>
          <div class="mission-local-actions">
            <button class="button button-secondary" type="button" data-save-note>
              <i data-lucide="save" aria-hidden="true"></i>
              <span>Salvar anotação</span>
            </button>
            <button class="button button-secondary" type="button" data-clear-note ${!state.practiceNote ? "disabled" : ""}>
              <i data-lucide="trash-2" aria-hidden="true"></i>
              <span>Limpar</span>
            </button>
          </div>
          ${state.noteStatus ? `<small class="mission-local-status">${escapeHtml(state.noteStatus)}</small>` : ""}
      </div>
    `;
  }

  function renderPracticeFeedbackForm(practice) {
    const feedback = state.practiceFeedback || {};
    const difficultyOptions = [
      { value: "Facil", label: "Fácil" },
      { value: "Media", label: "Média" },
      { value: "Dificil", label: "Difícil" }
    ];
    const confidenceOptions = [
      { value: "Baixa", label: "Baixa" },
      { value: "Media", label: "Média" },
      { value: "Alta", label: "Alta" }
    ];
    const renderOptions = (name, options, selectedValue) => options.map((option) => `
      <label>
        <input type="radio" name="${name}" value="${escapeHtml(option.value)}" ${selectedValue === option.value ? "checked" : ""}>
        <span>${escapeHtml(option.label)}</span>
      </label>
    `).join("");

    return `
      <div class="mission-local-card__body" id="feedback-local-sql">
        <p class="sql-practice-utility-note">Este feedback fica somente neste navegador e não altera o progresso oficial.</p>
          <div class="mission-local-fieldset" data-practice-feedback-group="difficulty">
            <strong>Dificuldade percebida</strong>
            <div>${renderOptions("practiceDifficulty", difficultyOptions, feedback.difficulty)}</div>
          </div>
          <div class="mission-local-fieldset" data-practice-feedback-group="confidence">
            <strong>Confiança no tema</strong>
            <div>${renderOptions("practiceConfidence", confidenceOptions, feedback.confidence)}</div>
          </div>
          <textarea
            class="mission-local-textarea"
            data-practice-feedback-comment
            rows="3"
            maxlength="500"
            placeholder="Comentário opcional sobre esta prática."
          >${escapeHtml(feedback.comment || "")}</textarea>
          <button class="button button-secondary sql-practice-feedback-submit" type="button" data-save-practice-feedback>
            <i data-lucide="message-square-check" aria-hidden="true"></i>
            <span>Salvar feedback local</span>
          </button>
          ${state.feedbackStatus ? `<small class="mission-local-status">${escapeHtml(state.feedbackStatus)}</small>` : ""}
      </div>
    `;
  }

  function renderPracticeUtility(practice) {
    if (!state.activeUtility) {
      return "";
    }

    const utilityContent = {
      hint: {
        icon: "lightbulb",
        title: "Dica rápida",
        content: `
          <div class="sql-practice-hint">
            <p>${escapeHtml(practice.hintText)}</p>
          </div>
        `
      },
      notes: {
        icon: "sticky-note",
        title: "Anotações pessoais",
        content: renderPracticeNotes(practice)
      },
      feedback: {
        icon: "message-square",
        title: "Feedback da prática",
        content: renderPracticeFeedbackForm(practice)
      }
    }[state.activeUtility];

    if (!utilityContent) {
      return "";
    }

    return `
      <div class="sql-practice-utility-backdrop" data-close-practice-utility>
        <section
          class="sql-practice-utility is-${escapeHtml(state.activeUtility)}"
          role="dialog"
          aria-modal="true"
          aria-label="${escapeHtml(utilityContent.title)}"
          data-practice-utility-panel
        >
          <header>
            <strong><i data-lucide="${utilityContent.icon}" aria-hidden="true"></i>${escapeHtml(utilityContent.title)}</strong>
            <button type="button" data-close-practice-utility aria-label="Fechar">
              <i data-lucide="x" aria-hidden="true"></i>
            </button>
          </header>
          ${utilityContent.content}
        </section>
      </div>
    `;
  }

  function renderWorkspace(practice) {
    return `
      <main class="sql-practice-workspace" aria-label="Central SQL">
        ${renderWorkspaceHeader(practice)}
        <div class="sql-practice-workspace__scroll">
          <section class="sql-practice-brief" aria-label="Enunciado da prática">
            <div>
              <span class="section-kicker">Pratique agora</span>
              <h1>${escapeHtml(practice.prompt)}</h1>
            </div>
            ${renderTags(practice)}
          </section>
          <section class="sql-practice-app-grid" aria-label="Workspace de execução SQL">
            ${renderSupportPanels(practice)}
            ${renderEditorPanel(practice)}
          </section>
        </div>
        ${renderPracticeUtility(practice)}
      </main>
    `;
  }

  function renderPage() {
    const practice = getActivePractice();
    mount.innerHTML = `
      <div class="sql-practice-app">
        ${renderSidebar()}
        ${renderWorkspace(practice)}
      </div>
    `;

    if (globalScope.lucide && typeof globalScope.lucide.createIcons === "function") {
      globalScope.lucide.createIcons();
    }

    void ensureSqlWorkbench();
  }

  async function ensureSqlWorkbench() {
    if (state.sqlWorkbench.status !== "idle") {
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
  }

  function validateSqlPractice() {
    const practice = getActivePractice();
    const workbench = state.sqlWorkbench;
    const query = state.queryAnswer.trim();

    if (!workbench.execution || workbench.executionQuery !== query) {
      workbench.error = "Execute a versão atual da consulta antes de validar o exercício.";
      renderPage();
      return;
    }

    const isCorrect = sqlPocEngine.validateMissionResult(workbench.execution, query);
    const result = isCorrect
      ? {
          status: "correct",
          title: "Correto",
          message: "Correto. Você filtrou os pedidos pagos antes do agrupamento e contou os pedidos por categoria."
        }
      : {
          status: "partial",
          title: "Resultado diferente do esperado",
          message: getResultMismatchGuidance(query)
        };
    const previousAttemptCount = state.attempts[practice.slug]?.attemptCount || 0;

    state.feedback = result;
    state.attempts[practice.slug] = {
      ...result,
      attemptCount: previousAttemptCount + 1
    };

    renderPage();
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
      validateButton.disabled = !sqlPocEngine.canValidateExecution(workbench.execution, workbench.executionQuery, query);
    }

    if (actionHint) {
      actionHint.classList.remove("is-ready");
      actionHint.textContent = executionIsCurrent
        ? "Consulta executada. Valide para verificar se ela responde ao exercício."
        : workbench.execution
          ? "A consulta foi alterada. Execute novamente antes de validar."
          : "Execute uma consulta válida antes de validar o exercício.";
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

  function resetPracticeInteraction(practice) {
    const attempt = state.attempts[practice.slug];
    state.queryAnswer = "";
    state.feedback = attempt
      ? { status: attempt.status, title: attempt.title, message: attempt.message }
      : null;
    state.sqlWorkbench.error = "";
    state.sqlWorkbench.execution = null;
    state.sqlWorkbench.executionQuery = "";
    state.activeUtility = "";
    loadLocalPracticeDrafts(practice);
  }

  function selectPractice(index) {
    const practice = practices[index];
    if (!practice || practice.status !== "active") {
      return;
    }

    state.activeIndex = index;
    resetPracticeInteraction(practice);
    const nextUrl = new URL(globalScope.location.href);
    nextUrl.searchParams.set("pratica", practice.slug);
    globalScope.history.replaceState({}, "", nextUrl);
    renderPage();
  }

  mount.addEventListener("click", (event) => {
    const utilityPanel = event.target.closest("[data-practice-utility-panel]");
    const closeUtilityButton = event.target.closest("[data-close-practice-utility]");
    if (closeUtilityButton && (!utilityPanel || event.target.closest("button[data-close-practice-utility]"))) {
      state.activeUtility = "";
      renderPage();
      return;
    }

    const openUtilityButton = event.target.closest("[data-open-practice-utility]");
    if (openUtilityButton) {
      state.activeUtility = openUtilityButton.dataset.openPracticeUtility;
      renderPage();
      return;
    }

    const executeButton = event.target.closest("[data-execute-query]");
    if (executeButton && !executeButton.disabled) {
      void executeSqlQuery();
      return;
    }

    const validateButton = event.target.closest("[data-validate-query]");
    if (validateButton && !validateButton.disabled) {
      validateSqlPractice();
      return;
    }

    const clearQueryButton = event.target.closest("[data-clear-query]");
    if (clearQueryButton && !clearQueryButton.disabled) {
      state.queryAnswer = "";
      state.feedback = null;
      state.sqlWorkbench.error = "";
      state.sqlWorkbench.execution = null;
      state.sqlWorkbench.executionQuery = "";
      renderPage();
      return;
    }

    const saveButton = event.target.closest("[data-save-progress]");
    if (saveButton) {
      state.feedback = {
        status: "partial",
        title: "Validação local",
        message: "Esta prática ainda não altera progresso oficial. Ela treina e valida no navegador para preparar a futura missão oficial."
      };
      renderPage();
      return;
    }

    const saveNoteButton = event.target.closest("[data-save-note]");
    if (saveNoteButton) {
      const practice = getActivePractice();
      const noteInput = mount.querySelector("[data-practice-note]");
      state.practiceNote = noteInput ? noteInput.value : state.practiceNote;
      state.noteStatus = writeLocalJson(getStorageKey(PRACTICE_NOTE_STORAGE_PREFIX, practice.slug), state.practiceNote)
        ? "Anotação salva apenas neste navegador."
        : "Não foi possível salvar a anotação neste navegador.";
      renderPage();
      return;
    }

    const clearNoteButton = event.target.closest("[data-clear-note]");
    if (clearNoteButton && !clearNoteButton.disabled) {
      const practice = getActivePractice();
      state.practiceNote = "";
      state.noteStatus = removeLocalItem(getStorageKey(PRACTICE_NOTE_STORAGE_PREFIX, practice.slug))
        ? "Anotação local removida."
        : "Não foi possível remover a anotação local.";
      renderPage();
      return;
    }

    const savePracticeFeedbackButton = event.target.closest("[data-save-practice-feedback]");
    if (savePracticeFeedbackButton) {
      const practice = getActivePractice();
      const difficulty = mount.querySelector('input[name="practiceDifficulty"]:checked')?.value || "";
      const confidence = mount.querySelector('input[name="practiceConfidence"]:checked')?.value || "";
      const comment = mount.querySelector("[data-practice-feedback-comment]")?.value || "";
      state.practiceFeedback = { difficulty, confidence, comment };
      state.feedbackStatus = writeLocalJson(getStorageKey(PRACTICE_FEEDBACK_STORAGE_PREFIX, practice.slug), state.practiceFeedback)
        ? "Feedback salvo localmente neste navegador."
        : "Não foi possível salvar o feedback neste navegador.";
      renderPage();
      return;
    }

    const practiceButton = event.target.closest("[data-select-practice]");
    if (practiceButton) {
      selectPractice(Number(practiceButton.dataset.selectPractice));
    }
  });

  mount.addEventListener("input", (event) => {
    if (event.target.matches("[data-query-answer]")) {
      state.queryAnswer = event.target.value;
      state.feedback = null;
      state.sqlWorkbench.error = "";
      syncSqlWorkbenchControls();
    }

    if (event.target.matches("[data-practice-note]")) {
      state.practiceNote = event.target.value;
      state.noteStatus = "";
    }

    if (event.target.matches("[data-practice-feedback-comment]")) {
      state.practiceFeedback = {
        ...state.practiceFeedback,
        comment: event.target.value
      };
      state.feedbackStatus = "";
    }

    if (event.target.matches('input[name="practiceDifficulty"]')) {
      state.practiceFeedback = {
        ...state.practiceFeedback,
        difficulty: event.target.value
      };
      state.feedbackStatus = "";
    }

    if (event.target.matches('input[name="practiceConfidence"]')) {
      state.practiceFeedback = {
        ...state.practiceFeedback,
        confidence: event.target.value
      };
      state.feedbackStatus = "";
    }
  });

  mount.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.activeUtility) {
      state.activeUtility = "";
      renderPage();
      return;
    }

    if (!event.target.matches("[data-query-answer]")) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      const executeButton = mount.querySelector("[data-execute-query]");
      if (executeButton && !executeButton.disabled) {
        void executeSqlQuery();
      }
    }
  });

  loadLocalPracticeDrafts(getActivePractice());
  renderPage();
})(window);
