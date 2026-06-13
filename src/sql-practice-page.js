(function initSqlPracticePage(globalScope) {
  const mount = document.querySelector("#sqlPracticePageMount");
  if (!mount) {
    return;
  }

  const sqlValidation = globalScope.SqlMissionValidation;
  const sqlPocEngine = globalScope.SqlPocEngine;
  const sqlPracticeService = globalScope.sqlPracticeService;
  const sqlAiTutor = globalScope.SqlAiTutor;
  if (!sqlValidation || !sqlPocEngine || !sqlAiTutor) {
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

  let practices = [
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
      status: "active",
      estimatedMinutes: 12,
      level: "SQL Junior",
      topic: "Agregações",
      table: "pedidos",
      columns: "pedido_id, cliente_id, status, cupom, valor",
      schemaColumns: [
        { name: "pedido_id", type: "integer", constraints: "primary key" },
        { name: "cliente_id", type: "integer", constraints: "not null" },
        { name: "status", type: "text", constraints: "not null" },
        { name: "cupom", type: "text" },
        { name: "valor", type: "numeric(10,2)", constraints: "not null" }
      ],
      sampleRows: [
        { pedido_id: 1, cliente_id: 101, status: "pago", cupom: "MELI10", valor: 129.9 },
        { pedido_id: 2, cliente_id: 102, status: "pago", cupom: null, valor: 89.5 },
        { pedido_id: 3, cliente_id: 101, status: "pago", cupom: "FRETE", valor: 54 },
        { pedido_id: 4, cliente_id: 103, status: "pendente", cupom: null, valor: 219 },
        { pedido_id: 5, cliente_id: 104, status: "pago", cupom: null, valor: 45 },
        { pedido_id: 6, cliente_id: 105, status: "cancelado", cupom: null, valor: 78.3 },
        { pedido_id: 7, cliente_id: 102, status: "pago", cupom: "ANIVERSARIO", valor: 36.5 },
        { pedido_id: 8, cliente_id: 105, status: "pago", cupom: null, valor: 150 }
      ],
      datasetConfig: {
        schemaConfig: {
          table: "pedidos",
          columns: [
            { name: "pedido_id", type: "integer", constraints: "primary key" },
            { name: "cliente_id", type: "integer", constraints: "not null" },
            { name: "status", type: "text", constraints: "not null" },
            { name: "cupom", type: "text" },
            { name: "valor", type: "numeric(10,2)", constraints: "not null" }
          ]
        },
        seedData: [
          { pedido_id: 1, cliente_id: 101, status: "pago", cupom: "MELI10", valor: 129.9 },
          { pedido_id: 2, cliente_id: 102, status: "pago", cupom: null, valor: 89.5 },
          { pedido_id: 3, cliente_id: 101, status: "pago", cupom: "FRETE", valor: 54 },
          { pedido_id: 4, cliente_id: 103, status: "pendente", cupom: null, valor: 219 },
          { pedido_id: 5, cliente_id: 104, status: "pago", cupom: null, valor: 45 },
          { pedido_id: 6, cliente_id: 105, status: "cancelado", cupom: null, valor: 78.3 },
          { pedido_id: 7, cliente_id: 102, status: "pago", cupom: "ANIVERSARIO", valor: 36.5 },
          { pedido_id: 8, cliente_id: 105, status: "pago", cupom: null, valor: 150 }
        ]
      },
      prompt: "Crie uma consulta para resumir os pedidos, retornando o total de pedidos, quantos possuem cupom preenchido, quantos estão sem cupom e quantos clientes distintos realizaram pedidos.",
      objective: "Compare COUNT(*), COUNT(coluna) e COUNT(DISTINCT coluna) para interpretar linhas, nulos e valores únicos.",
      why: "Contagens diferentes respondem perguntas diferentes quando existem valores nulos ou clientes repetidos.",
      contentTitle: "COUNT não conta tudo do mesmo jeito",
      content: "COUNT(*) conta todas as linhas. COUNT(coluna) conta apenas os registros em que a coluna está preenchida. COUNT(DISTINCT coluna) conta valores únicos.",
      example: "select\n  count(*) as total,\n  count(campo) as preenchidos,\n  count(distinct campo) as unicos\nfrom tabela;",
      hintText: "Compare COUNT(*) com COUNT(cupom) para identificar pedidos sem cupom e use COUNT(DISTINCT cliente_id) para contar clientes únicos.",
      solutionText: "Uma solução possível: select count(*) as total_pedidos, count(cupom) as pedidos_com_cupom, count(*) - count(cupom) as pedidos_sem_cupom, count(distinct cliente_id) as clientes_distintos from pedidos;",
      placeholder: "select\n  count(*) as total_pedidos,\n  count(cupom) as pedidos_com_cupom,\n  ... as pedidos_sem_cupom,\n  count(distinct cliente_id) as clientes_distintos\nfrom pedidos;",
      validationConfig: { validator: "count_nulls_distincts" },
      expectedResult: {
        metrics: {
          total_pedidos: 8,
          pedidos_com_cupom: 3,
          pedidos_sem_cupom: 5,
          clientes_distintos: 5
        }
      }
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
    activeUtility: "",
    dataSource: "loading",
    sourceStatus: "Carregando dados da prática...",
    isAuthenticated: false,
    studentName: "Você",
    schemaCollapsed: Boolean(globalScope.matchMedia?.("(max-width: 620px)")?.matches),
    lastQueryRunId: null,
    persistenceStatus: "",
    aiTutor: {
      draft: "",
      status: "idle",
      messages: [],
      error: "",
      metadata: null,
      shouldScroll: false
    }
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

  function getFirstName(value) {
    const normalized = String(value || "").trim();
    return normalized ? normalized.split(/\s+/)[0].slice(0, 40) : "";
  }

  function resolveStudentName(user) {
    const metadataName = getFirstName(
      user?.user_metadata?.display_name || user?.user_metadata?.name
    );
    return metadataName || "Você";
  }

  function getActivePractice() {
    return practices[state.activeIndex] || practices[1];
  }

  function getPracticeSchemaColumns(practice) {
    return Array.isArray(practice.schemaColumns) && practice.schemaColumns.length
      ? practice.schemaColumns
      : sqlPocEngine.PEDIDOS_SCHEMA;
  }

  function getPracticeSampleRows(practice) {
    return Array.isArray(practice.sampleRows) && practice.sampleRows.length
      ? practice.sampleRows
      : sqlPocEngine.PEDIDOS_SAMPLE;
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

  function getAiValidationStatus(practice) {
    const attempt = state.attempts[practice.slug];
    if (attempt?.status === "correct") return "correct";
    if (state.feedback?.status === "partial") return "incorrect";
    if (state.sqlWorkbench.error) return "error";
    if (state.sqlWorkbench.execution) return "executed";
    return "idle";
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
    const sourceTone = state.dataSource === "supabase"
      ? "remote"
      : state.dataSource === "loading"
        ? "loading"
        : "fallback";
    return `
      <header class="sql-practice-workspace__header">
        <div class="sql-practice-workspace__title">
          <span class="section-kicker">Prática ativa</span>
          <h2>${escapeHtml(practice.shortTitle)}</h2>
        </div>
        <div class="sql-practice-workspace__tools" aria-label="Ações da prática">
          <span class="sql-practice-source is-${sourceTone}" title="${escapeHtml(state.sourceStatus)}">
            ${state.dataSource === "supabase" ? "Dados Supabase" : state.dataSource === "loading" ? "Carregando dados" : "Modo local"}
          </span>
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
    const schemaRows = getPracticeSchemaColumns(practice).map((column) => ({
      coluna: column.name,
      tipo: column.type
    }));
    const sampleRows = getPracticeSampleRows(practice);

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
        <section class="mission-learning-card sql-support-card sql-support-schema ${state.schemaCollapsed ? "is-collapsed" : ""}">
          <header class="sql-support-card__header">
            <strong><i data-lucide="table-2" aria-hidden="true"></i>Schema da prática</strong>
            <div class="sql-support-card__header-actions">
              <small>${sampleRows.length} registros</small>
              <button
                type="button"
                class="sql-support-card__toggle"
                data-toggle-practice-schema
                aria-expanded="${state.schemaCollapsed ? "false" : "true"}"
                aria-label="${state.schemaCollapsed ? "Expandir" : "Recolher"} schema da prática"
                title="${state.schemaCollapsed ? "Expandir schema" : "Recolher schema"}"
              >
                <i data-lucide="${state.schemaCollapsed ? "chevron-down" : "chevron-up"}" aria-hidden="true"></i>
              </button>
            </div>
          </header>
          <div class="sql-support-schema__content" ${state.schemaCollapsed ? "hidden" : ""}>
            ${renderDataTable(schemaColumns, schemaRows, "is-compact")}
          </div>
        </section>
        <section class="mission-learning-card sql-support-card sql-support-chat">
          <header class="sql-support-card__header">
            <strong><i data-lucide="sparkles" aria-hidden="true"></i>Chat com IA</strong>
            <small>Tutora IA</small>
          </header>
          <div
            class="sql-support-chat__messages ${state.aiTutor.messages.length || state.aiTutor.status === "loading" || state.aiTutor.error ? "has-conversation" : "is-empty"}"
            data-ai-tutor-messages
            aria-live="polite"
          >
            ${state.aiTutor.messages.length
              ? state.aiTutor.messages.map((message) => `
                  <div class="sql-support-chat__message is-${escapeHtml(message.role)}">
                    <strong>${message.role === "assistant" ? "Tutora IA" : escapeHtml(state.studentName)}</strong>
                    <p>${escapeHtml(message.content).replace(/\n/g, "<br>")}</p>
                  </div>
                `).join("")
              : `
                <div class="sql-support-chat__welcome">
                  <i data-lucide="message-circle-question" aria-hidden="true"></i>
                  <p>Tire dúvidas sobre esta prática sem receber a resposta pronta.</p>
                </div>
              `}
            ${state.aiTutor.status === "loading"
              ? `
                <div class="sql-support-chat__loading">
                  <span>Pensando</span>
                  <span class="sql-support-chat__typing" aria-hidden="true"><i></i><i></i><i></i></span>
                </div>
              `
              : ""}
            ${state.aiTutor.error
              ? `<p class="sql-support-chat__error" role="alert">${escapeHtml(state.aiTutor.error)}</p>`
              : ""}
          </div>
          <div class="sql-support-chat__quick-actions" aria-label="Ações rápidas da tutora">
            ${getAiQuickActions(practice).map((action) => `
              <button
                type="button"
                data-ai-quick-action="${escapeHtml(action.action)}"
                ${state.aiTutor.status === "loading" ? "disabled" : ""}
              >${escapeHtml(action.label)}</button>
            `).join("")}
          </div>
          <div class="sql-support-chat__composer" aria-label="Pergunta para a tutora SQL">
            <input
              type="text"
              maxlength="${sqlAiTutor.MAX_PROMPT_CHARS}"
              value="${escapeHtml(state.aiTutor.draft)}"
              placeholder="Pergunte algo sobre este exercício..."
              data-ai-tutor-input
              ${state.aiTutor.status === "loading" ? "disabled" : ""}
            >
            <button
              type="button"
              data-ai-tutor-send
              ${!state.aiTutor.draft.trim() || state.aiTutor.status === "loading" ? "disabled" : ""}
              aria-label="Enviar mensagem"
            >
              <i data-lucide="send" aria-hidden="true"></i>
            </button>
          </div>
          ${state.aiTutor.metadata
            ? `
              <small
                class="sql-support-chat__meta"
                title="${escapeHtml(`${state.aiTutor.metadata.provider} · ${state.aiTutor.metadata.model}`)}"
              >IA Cloudflare <span aria-hidden="true">•</span> ${escapeHtml(formatAiDuration(state.aiTutor.metadata.durationMs))}</small>
            `
            : ""}
        </section>
      </aside>
    `;
  }

  function getAiQuickActions(practice) {
    const status = getAiValidationStatus(practice);
    const query = state.queryAnswer.trim();
    const lastStudentMessage = [...state.aiTutor.messages]
      .reverse()
      .find((message) => message.role === "student")?.content || "";
    const lastAssistantMessage = [...state.aiTutor.messages]
      .reverse()
      .find((message) => message.role === "assistant")?.content || "";
    const intention = detectAiStudentIntention(lastStudentMessage);
    const assistantSuggestedAttempt = /tente|escreva|comece|primeiro trecho|execute/i.test(
      normalizeAiIntentText(lastAssistantMessage)
    );

    if (status === "correct") {
      return [
        { action: "learning_summary", label: "Resumo do que aprendi" },
        { action: "next_concept", label: "Próximo conceito" },
        { action: "next_practice", label: "Próxima prática" }
      ];
    }
    if (status === "incorrect") {
      return [
        { action: "compare_objective", label: "Comparar com objetivo" },
        { action: "what_to_validate", label: "O que falta validar?" },
        { action: "review_query", label: "Revise minha query" }
      ];
    }
    if (status === "error") {
      return [
        { action: "explain_error", label: "Explique meu erro" },
        { action: "how_to_fix", label: "Como corrigir?" },
        { action: "where_is_problem", label: "Onde está o problema?" }
      ];
    }
    if (status === "executed") {
      return [
        { action: "compare_objective", label: "Comparar com objetivo" },
        { action: "what_to_validate", label: "O que falta validar?" },
        { action: "review_query", label: "Revise minha query" }
      ];
    }
    if (intention === "ready_query") {
      return [
        { action: "build_in_parts", label: "Me guie por partes" },
        { action: "first_snippet", label: "Primeiro trecho" },
        { action: "review_attempt", label: "Revisar tentativa" }
      ];
    }
    if (query) {
      return [
        { action: "review_query", label: "Revise minha query" },
        { action: "what_is_missing", label: "O que falta?" },
        { action: "can_execute", label: "Posso executar?" }
      ];
    }
    if (state.aiTutor.messages.length) {
      if (assistantSuggestedAttempt) {
        return [
          { action: "review_attempt", label: "Revisar tentativa" },
          { action: "column_to_use", label: "Qual coluna usar?" },
          { action: "build_in_parts", label: "Montar por partes" }
        ];
      }
      return [
        { action: "column_to_use", label: "Qual coluna usar?" },
        { action: "function_to_use", label: "Qual função usar?" },
        { action: "build_in_parts", label: "Montar por partes" }
      ];
    }
    return [
      { action: "how_to_start", label: "Como começo?" },
      { action: "hint", label: "Me dê uma dica" },
      { action: "what_to_observe", label: "O que observar?" }
    ];
  }

  function normalizeAiIntentText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function detectAiStudentIntention(message) {
    const normalized = normalizeAiIntentText(message);
    if (/(query|consulta).*(pronta|completa)|me (passe|passa|manda|de) a (query|consulta)|resposta pronta/.test(normalized)) {
      return "ready_query";
    }
    if (/qual coluna|coluna devo|coloco primeiro|campo devo/.test(normalized)) {
      return "column";
    }
    if (/qual funcao|funcao devo/.test(normalized)) {
      return "function";
    }
    if (/revise|revisa|esta certa|esta correto/.test(normalized)) {
      return "review";
    }
    return "general";
  }

  function formatAiDuration(durationMs) {
    const milliseconds = Number(durationMs);
    if (!Number.isFinite(milliseconds)) {
      return "";
    }
    return `${(milliseconds / 1000).toFixed(1).replace(".", ",")}s`;
  }

  function getAiTutorContext(practice) {
    const execution = state.sqlWorkbench.execution;
    return {
      practiceSlug: practice.slug,
      practiceTitle: practice.shortTitle,
      practicePrompt: practice.prompt,
      practiceObjective: practice.objective,
      studentQuery: state.queryAnswer,
      lastResultPreview: Array.isArray(execution?.rows) ? execution.rows : [],
      lastError: state.sqlWorkbench.error,
      validationStatus: getAiValidationStatus(practice),
      attemptCount: getAttemptCount(practice),
      recentMessages: state.aiTutor.messages,
      schema: {
        table: practice.table,
        columns: getPracticeSchemaColumns(practice)
      }
    };
  }

  function getAiActionLabel(quickAction) {
    return {
      how_to_start: "Como começo?",
      hint: "Me dê uma dica",
      explain_error: "Explique meu erro",
      review_query: "Revise minha query",
      what_to_observe: "O que observar?",
      how_to_fix: "Como corrigir?",
      what_is_missing: "O que está faltando?",
      validate_reasoning: "Validar raciocínio",
      another_hint: "Me dê outra dica",
      review_reasoning: "Revise meu raciocínio",
      learning_summary: "Resumo do que aprendi",
      next_concept: "Próximo conceito",
      column_to_use: "Qual coluna usar?",
      function_to_use: "Qual função usar?",
      build_in_parts: "Montar por partes",
      first_snippet: "Primeiro trecho",
      review_attempt: "Revisar tentativa",
      can_execute: "Posso executar?",
      result_sense: "O resultado faz sentido?",
      what_to_validate: "O que falta validar?",
      where_is_problem: "Onde está o problema?",
      compare_objective: "Comparar com objetivo",
      next_practice: "Próxima prática"
    }[quickAction] || "";
  }

  async function sendAiTutorMessage(quickAction, prompt = "") {
    if (state.aiTutor.status === "loading") {
      return;
    }

    const payload = sqlAiTutor.buildPayload(
      getAiTutorContext(getActivePractice()),
      quickAction,
      prompt
    );
    if (!payload) {
      state.aiTutor.error = "Digite uma pergunta ou escolha uma ação rápida.";
      state.aiTutor.shouldScroll = true;
      renderPage();
      return;
    }

    state.aiTutor.messages.push({
      role: "student",
      content: prompt.trim() || getAiActionLabel(quickAction)
    });
    state.aiTutor.draft = "";
    state.aiTutor.status = "loading";
    state.aiTutor.error = "";
    state.aiTutor.metadata = null;
    state.aiTutor.shouldScroll = true;
    renderPage();

    const result = await sqlAiTutor.requestTutor(payload);
    state.aiTutor.status = "idle";
    if (result.ok) {
      state.aiTutor.messages.push({ role: "assistant", content: result.answer });
      state.aiTutor.metadata = {
        provider: result.provider,
        model: result.model,
        durationMs: result.durationMs
      };
    } else {
      state.aiTutor.error = result.message;
    }
    state.aiTutor.shouldScroll = true;
    renderPage();
  }

  function renderTechnicalResult() {
    const practice = getActivePractice();
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
            : `<p>${escapeHtml(
              practice.validationConfig?.validator === "count_nulls_distincts"
                ? "A consulta rodou, mas não retornou as quatro métricas necessárias para avaliar a prática."
                : "A consulta rodou, mas não retornou um resultado tabular útil para avaliar. Nesta prática, o resultado precisa trazer uma categoria e uma contagem."
            )}</p>`}
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
    const practice = getActivePractice();
    if (practice.validationConfig?.validator === "count_nulls_distincts") {
      return "A consulta executou, mas ainda não traz todas as métricas esperadas. Revise COUNT(*), COUNT(cupom), pedidos sem cupom e COUNT(DISTINCT cliente_id).";
    }

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
    const storageDescription = state.isAuthenticated
      ? "Salva na sua conta. Não altera o progresso oficial."
      : "Salva apenas neste navegador. Não altera o progresso oficial.";
    return `
      <div class="mission-local-card__body" id="anotacoes-sql">
        <p class="sql-practice-utility-note">${escapeHtml(storageDescription)}</p>
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
    const storageDescription = state.isAuthenticated
      ? "Este feedback é salvo na sua conta e não altera o progresso oficial."
      : "Este feedback fica somente neste navegador e não altera o progresso oficial.";

    return `
      <div class="mission-local-card__body" id="feedback-local-sql">
        <p class="sql-practice-utility-note">${escapeHtml(storageDescription)}</p>
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
            <span>Salvar feedback</span>
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
            ${state.persistenceStatus ? `<small class="sql-practice-persistence-status">${escapeHtml(state.persistenceStatus)}</small>` : ""}
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

    if (state.aiTutor.shouldScroll) {
      const scrollToLatestMessage = () => {
        const messages = mount.querySelector("[data-ai-tutor-messages]");
        if (messages) {
          messages.scrollTop = messages.scrollHeight;
        }
        state.aiTutor.shouldScroll = false;
      };
      if (typeof globalScope.requestAnimationFrame === "function") {
        globalScope.requestAnimationFrame(scrollToLatestMessage);
      } else {
        globalScope.setTimeout(scrollToLatestMessage, 0);
      }
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
      state.sqlWorkbench.engine = await sqlPocEngine.createBrowserWorkbench(getActivePractice().datasetConfig);
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

    if (sqlPracticeService) {
      const saveResult = await sqlPracticeService.saveQueryRun(
        getActivePractice(),
        query,
        workbench.execution,
        workbench.error
      );
      state.lastQueryRunId = saveResult.ok ? saveResult.id : null;
      if (saveResult.authenticated && !saveResult.ok) {
        state.persistenceStatus = "A consulta rodou localmente, mas não foi possível salvar esta execução.";
        renderPage();
      }
    }
  }

  async function validateSqlPractice() {
    const practice = getActivePractice();
    const workbench = state.sqlWorkbench;
    const query = state.queryAnswer.trim();

    if (!workbench.execution || workbench.executionQuery !== query) {
      workbench.error = "Execute a versão atual da consulta antes de validar o exercício.";
      renderPage();
      return;
    }

    const validator = practice.validationConfig?.validator || "paid_orders_by_category";
    const validationDetails = validator === "count_nulls_distincts"
      ? sqlValidation.validateCountNullsDistinctsSql(query)
      : sqlValidation.validatePaidOrdersByCategorySql(query);
    const isCorrect = sqlPocEngine.validateConfiguredResult(
      workbench.execution,
      query,
      practice.validationConfig || { validator: "paid_orders_by_category" },
      practice.expectedResult
    );
    const result = isCorrect
      ? {
          status: "correct",
          title: "Correto",
          message: validator === "count_nulls_distincts"
            ? "Correto. Você comparou contagens totais, valores preenchidos, nulos e clientes distintos."
            : "Correto. Você filtrou os pedidos pagos antes do agrupamento e contou os pedidos por categoria.",
          details: validationDetails.checks
        }
      : {
          status: "partial",
          title: "Resultado diferente do esperado",
          message: getResultMismatchGuidance(query),
          details: validationDetails.checks
        };
    const previousAttemptCount = state.attempts[practice.slug]?.attemptCount || 0;

    state.feedback = result;
    state.attempts[practice.slug] = {
      ...result,
      attemptCount: previousAttemptCount + 1
    };

    renderPage();

    if (sqlPracticeService) {
      const saveResult = await sqlPracticeService.saveAttempt(
        practice,
        state.lastQueryRunId,
        result,
        previousAttemptCount + 1
      );
      if (saveResult.authenticated && !saveResult.ok) {
        state.persistenceStatus = "A validação local foi concluída, mas a tentativa não pôde ser salva.";
        renderPage();
      }

      if (isCorrect && saveResult.ok) {
        const progressResult = await sqlPracticeService.savePracticeProgress(practice);
        if (progressResult.ok) {
          state.persistenceStatus = "Progresso da trilha atualizado.";
          renderPage();
        } else if (progressResult.authenticated && !progressResult.skipped) {
          console.warn("[Central SQL] A prática foi validada, mas o progresso da trilha não foi atualizado.", progressResult.error || progressResult.reason);
        }
      }
    }
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
    state.lastQueryRunId = null;
    state.activeUtility = "";
    state.aiTutor = {
      draft: "",
      status: "idle",
      messages: [],
      error: "",
      metadata: null,
      shouldScroll: false
    };
    loadLocalPracticeDrafts(practice);
  }

  async function persistNote(practice) {
    const localSaved = writeLocalJson(
      getStorageKey(PRACTICE_NOTE_STORAGE_PREFIX, practice.slug),
      state.practiceNote
    );
    const remoteResult = sqlPracticeService
      ? await sqlPracticeService.saveNote(practice, state.practiceNote)
      : { ok: false, skipped: true, authenticated: false };

    if (remoteResult.ok) {
      state.noteStatus = "Anotação salva na sua conta.";
    } else if (remoteResult.authenticated) {
      state.noteStatus = localSaved
        ? "Falha ao salvar na conta. A anotação ficou salva neste navegador."
        : "Não foi possível salvar a anotação.";
    } else {
      state.noteStatus = localSaved
        ? "Anotação salva apenas neste navegador."
        : "Não foi possível salvar a anotação neste navegador.";
    }
    renderPage();
  }

  async function persistFeedback(practice) {
    const localSaved = writeLocalJson(
      getStorageKey(PRACTICE_FEEDBACK_STORAGE_PREFIX, practice.slug),
      state.practiceFeedback
    );
    const remoteResult = sqlPracticeService
      ? await sqlPracticeService.saveFeedback(practice, state.practiceFeedback)
      : { ok: false, skipped: true, authenticated: false };

    if (remoteResult.ok) {
      state.feedbackStatus = "Feedback salvo na sua conta.";
    } else if (remoteResult.authenticated) {
      state.feedbackStatus = localSaved
        ? "Falha ao salvar na conta. O feedback ficou salvo neste navegador."
        : "Não foi possível salvar o feedback.";
    } else {
      state.feedbackStatus = localSaved
        ? "Feedback salvo localmente neste navegador."
        : "Não foi possível salvar o feedback neste navegador.";
    }
    renderPage();
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

    const schemaToggleButton = event.target.closest("[data-toggle-practice-schema]");
    if (schemaToggleButton) {
      state.schemaCollapsed = !state.schemaCollapsed;
      renderPage();
      return;
    }

    const aiQuickActionButton = event.target.closest("[data-ai-quick-action]");
    if (aiQuickActionButton && !aiQuickActionButton.disabled) {
      void sendAiTutorMessage(aiQuickActionButton.dataset.aiQuickAction);
      return;
    }

    const aiSendButton = event.target.closest("[data-ai-tutor-send]");
    if (aiSendButton && !aiSendButton.disabled) {
      void sendAiTutorMessage("free_question", state.aiTutor.draft);
      return;
    }

    const executeButton = event.target.closest("[data-execute-query]");
    if (executeButton && !executeButton.disabled) {
      void executeSqlQuery();
      return;
    }

    const validateButton = event.target.closest("[data-validate-query]");
    if (validateButton && !validateButton.disabled) {
      void validateSqlPractice();
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
        title: "Progresso oficial",
        message: state.isAuthenticated && getActivePractice().exerciseId
          ? "Ao validar corretamente e salvar a tentativa, esta prática atualiza o progresso oficial da trilha."
          : "A validação funciona localmente. Entre na sua conta e use uma prática publicada no Supabase para atualizar o progresso oficial."
      };
      renderPage();
      return;
    }

    const saveNoteButton = event.target.closest("[data-save-note]");
    if (saveNoteButton) {
      const practice = getActivePractice();
      const noteInput = mount.querySelector("[data-practice-note]");
      state.practiceNote = noteInput ? noteInput.value : state.practiceNote;
      void persistNote(practice);
      return;
    }

    const clearNoteButton = event.target.closest("[data-clear-note]");
    if (clearNoteButton && !clearNoteButton.disabled) {
      const practice = getActivePractice();
      state.practiceNote = "";
      removeLocalItem(getStorageKey(PRACTICE_NOTE_STORAGE_PREFIX, practice.slug));
      void persistNote(practice);
      return;
    }

    const savePracticeFeedbackButton = event.target.closest("[data-save-practice-feedback]");
    if (savePracticeFeedbackButton) {
      const practice = getActivePractice();
      const difficulty = mount.querySelector('input[name="practiceDifficulty"]:checked')?.value || "";
      const confidence = mount.querySelector('input[name="practiceConfidence"]:checked')?.value || "";
      const comment = mount.querySelector("[data-practice-feedback-comment]")?.value || "";
      state.practiceFeedback = { difficulty, confidence, comment };
      void persistFeedback(practice);
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

    if (event.target.matches("[data-ai-tutor-input]")) {
      state.aiTutor.draft = event.target.value.slice(0, sqlAiTutor.MAX_PROMPT_CHARS);
      state.aiTutor.error = "";
      const sendButton = mount.querySelector("[data-ai-tutor-send]");
      if (sendButton) {
        sendButton.disabled = !state.aiTutor.draft.trim();
      }
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

    if (event.target.matches("[data-ai-tutor-input]") && event.key === "Enter") {
      event.preventDefault();
      if (state.aiTutor.draft.trim() && state.aiTutor.status !== "loading") {
        void sendAiTutorMessage("free_question", state.aiTutor.draft);
      }
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

  async function initializePage() {
    const params = new URLSearchParams(globalScope.location.search);
    const slug = params.get("pratica") || params.get("missao") || "sql-essencial-filtros-where";

    if (sqlPracticeService) {
      const loadResult = await sqlPracticeService.loadPractice(slug);
      if (loadResult.ok) {
        const localPractice = practices.find((item) => item.slug === loadResult.practice.slug) || {};
        const mergedPractice = {
          ...localPractice,
          ...loadResult.practice,
          solutionText: localPractice.solutionText || "",
          validationConfig: localPractice.validationConfig || { validator: "paid_orders_by_category" },
          expectedResult: localPractice.expectedResult
        };
        practices = (loadResult.catalog || []).map((item) =>
          item.slug === mergedPractice.slug ? mergedPractice : {
            ...(practices.find((localItem) => localItem.slug === item.slug) || {}),
            ...item
          }
        );
        state.activeIndex = Math.max(
          0,
          practices.findIndex((item) => item.slug === mergedPractice.slug)
        );
        state.dataSource = "supabase";
        state.sourceStatus = "Conteúdo público e dataset carregados do Supabase; validação executada localmente.";

        loadLocalPracticeDrafts(mergedPractice);
        const userState = await sqlPracticeService.loadUserState(mergedPractice);
        state.isAuthenticated = Boolean(userState.authenticated);
        if (userState.ok && userState.authenticated) {
          state.studentName = resolveStudentName(userState.user);
          if (userState.hasNote) {
            state.practiceNote = userState.note || "";
          }
          if (userState.hasFeedback) {
            state.practiceFeedback = userState.feedback;
          }
          state.attempts[mergedPractice.slug] = {
            attemptCount: userState.attemptCount || 0
          };
        } else {
          if (userState.authenticated) {
            state.persistenceStatus = "Não foi possível carregar seus dados salvos. O modo local continua disponível.";
          }
        }
      } else {
        state.dataSource = "fallback";
        state.sourceStatus = loadResult.notFound
          ? "Prática não encontrada no Supabase. Usando conteúdo local."
          : "Supabase indisponível. Usando conteúdo local.";
        state.activeIndex = Math.max(1, getInitialPracticeIndex());
        loadLocalPracticeDrafts(getActivePractice());
      }
    } else {
      state.dataSource = "fallback";
      state.sourceStatus = "Service do Supabase indisponível. Usando conteúdo local.";
      loadLocalPracticeDrafts(getActivePractice());
    }

    renderPage();
  }

  void initializePage();
})(window);
