(function initGuidedPracticePage(globalScope) {
  const mount = document.getElementById("guidedPracticeMount");
  const service = globalScope.guidedPracticeService;
  if (!mount || !service) return;

  const state = {
    activity: null,
    selectedOption: "",
    validation: null,
    isAuthenticated: false,
    isSaving: false,
    saveStatus: "",
    startedAt: new Date().toISOString(),
    note: "",
    noteStatus: ""
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function refreshIcons() {
    globalScope.lucide?.createIcons?.();
  }

  function getStorageKey(activity, suffix) {
    return `data_skill_map_guided_practice_${activity.slug}_${suffix}`;
  }

  function loadLocalNote(activity) {
    try {
      state.note = globalScope.localStorage.getItem(getStorageKey(activity, "note")) || "";
    } catch (error) {
      state.note = "";
    }
  }

  function saveLocalNote() {
    try {
      globalScope.localStorage.setItem(getStorageKey(state.activity, "note"), state.note);
      state.noteStatus = "Anotação salva neste navegador.";
    } catch (error) {
      state.noteStatus = "Não foi possível salvar a anotação neste navegador.";
    }
    render();
  }

  function renderIndicatorCards(activity) {
    return activity.indicatorData.map((item, index) => `
      <article class="guided-metric-card ${index === 2 ? "guided-metric-card-alert" : ""}">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
      </article>
    `).join("");
  }

  function renderOptions(activity) {
    return activity.options.map((option) => {
      const selected = state.selectedOption === option.id;
      const optionClass = state.validation
        ? option.id === activity.correctOption
          ? "is-correct"
          : selected
            ? "is-incorrect"
            : ""
        : "";
      return `
        <label class="guided-option ${selected ? "is-selected" : ""} ${optionClass}">
          <input type="radio" name="guidedPracticeAnswer" value="${escapeHtml(option.id)}" ${selected ? "checked" : ""}>
          <span class="guided-option-letter">${escapeHtml(option.id)}</span>
          <span class="guided-option-text">${escapeHtml(option.text)}</span>
        </label>
      `;
    }).join("");
  }

  function getVisualProgress() {
    if (state.validation?.isCorrect) {
      return { value: 100, label: "Concluída", detail: "4 de 4 etapas concluídas", step: 3 };
    }
    if (state.validation || state.selectedOption) {
      return { value: 75, label: "Em andamento", detail: "3 de 4 etapas concluídas", step: 2 };
    }
    return { value: 25, label: "Em andamento", detail: "1 de 4 etapas concluídas", step: 1 };
  }

  function renderPracticeRail() {
    const progress = getVisualProgress();
    return `
      <aside class="guided-practice-rail" aria-label="Roteiro e status da prática">
        <section class="guided-rail-card guided-rail-roadmap">
          <h2>Roteiro da prática</h2>
          <ol class="guided-roadmap-list">
            <li class="${progress.step >= 1 ? "is-active" : ""}">
              <span>01</span>
              <div><strong>Observe</strong><small>Entenda o cenário e o indicador</small></div>
            </li>
            <li class="${progress.step >= 2 ? "is-active" : ""}">
              <span>02</span>
              <div><strong>Analise</strong><small>Compare meta e resultado</small></div>
            </li>
            <li class="${progress.step >= 3 ? "is-active" : ""}">
              <span>03</span>
              <div><strong>Conclua</strong><small>Leia o desvio e prossiga</small></div>
            </li>
          </ol>
        </section>

        <section class="guided-rail-card guided-rail-status">
          <h2>Status da prática</h2>
          <div class="guided-status-pill ${progress.value === 100 ? "is-complete" : ""}">
            <span aria-hidden="true"></span>${progress.label}
          </div>
          <div class="guided-progress-heading"><span>Progresso geral</span><strong>${progress.value}%</strong></div>
          <div class="guided-progress-track" aria-label="Progresso visual da prática: ${progress.value}%">
            <span style="width: ${progress.value}%"></span>
          </div>
          <small>${progress.detail}</small>
        </section>

        <section class="guided-rail-card guided-rail-tip">
          <div class="guided-rail-tip-title"><i data-lucide="lightbulb" aria-hidden="true"></i><h2>Dica</h2></div>
          <p>Siga o roteiro para completar a prática e registrar seu progresso.</p>
        </section>
      </aside>
    `;
  }

  function renderNextAction() {
    return `
      <section class="guided-aside-card guided-next-card">
        <div class="guided-aside-title">
          <i data-lucide="rocket" aria-hidden="true"></i>
          <div><span class="section-kicker">Próxima ação</span><h2>Acompanhe seu avanço</h2></div>
        </div>
        <p>Conclua a prática para registrar seu progresso. Depois, acompanhe sua evolução no Meu Progresso.</p>
        <a class="submit-button" href="meu-progresso.html">Ver Meu Progresso <i data-lucide="arrow-right" aria-hidden="true"></i></a>
        <a class="guided-back-link" href="index.html#trilhas">Voltar às trilhas</a>
      </section>
    `;
  }

  function renderFeedback(activity) {
    if (!state.validation) {
      return `
        <div class="guided-feedback-empty">
          <i data-lucide="message-circle" aria-hidden="true"></i>
          <div>
            <strong>Seu feedback aparece aqui</strong>
            <span>Escolha uma leitura e confira o raciocínio.</span>
          </div>
        </div>
      `;
    }

    const correct = state.validation.isCorrect;
    return `
      <div class="guided-feedback ${correct ? "guided-feedback-correct" : "guided-feedback-incorrect"}" role="status">
        <span class="guided-feedback-icon"><i data-lucide="${correct ? "check-circle-2" : "search"}" aria-hidden="true"></i></span>
        <div>
          <span class="section-kicker">${correct ? "Leitura acionável" : "Revise a comparação"}</span>
          <h3>${correct ? "Você conectou número e decisão" : "O resultado precisa ser comparado com a meta"}</h3>
          <p>${escapeHtml(activity.feedback)}</p>
          <div class="guided-attention">
            <i data-lucide="lightbulb" aria-hidden="true"></i>
            <span><strong>Ponto de atenção:</strong> ${escapeHtml(activity.attention)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderCompletion(activity) {
    if (!state.validation?.isCorrect) return "";
    return `
      <section class="guided-completion-card guided-order-completion" aria-labelledby="guidedCompletionTitle">
        <div class="guided-completion-icon"><i data-lucide="badge-check" aria-hidden="true"></i></div>
        <div>
          <span class="section-kicker">Prática concluída</span>
          <h2 id="guidedCompletionTitle">Do percentual ao diagnóstico</h2>
          <p>${escapeHtml(activity.conclusion)}</p>
          ${state.saveStatus ? `<p class="guided-save-status">${escapeHtml(state.saveStatus)}</p>` : ""}
        </div>
        <div class="guided-completion-actions">
          <a class="submit-button" href="meu-progresso.html">Ver Meu Progresso</a>
          <a class="filter-button" href="index.html#trilhas">Voltar às trilhas</a>
        </div>
      </section>
    `;
  }

  function render() {
    const activity = state.activity;
    if (!activity) return;

    mount.innerHTML = `
      <nav class="guided-breadcrumb" aria-label="Navegação estrutural">
        <a href="index.html#trilhas">Trilhas</a>
        <i data-lucide="chevron-right" aria-hidden="true"></i>
        <span>${escapeHtml(activity.trackTitle)}</span>
      </nav>

      <section class="guided-practice-hero">
        <div class="guided-practice-hero-copy">
          <div class="guided-practice-badges">
            <span><i data-lucide="gauge" aria-hidden="true"></i> Prática guiada</span>
            <span>${escapeHtml(activity.level)}</span>
          </div>
          <h1>${escapeHtml(activity.title)}</h1>
          <p>${escapeHtml(activity.objective)}</p>
          <div class="guided-practice-meta">
            <span><i data-lucide="route" aria-hidden="true"></i>${escapeHtml(activity.trackTitle)}</span>
            <span><i data-lucide="clock-3" aria-hidden="true"></i>${activity.estimatedMinutes} min</span>
          </div>
        </div>
        <aside class="guided-practice-hero-marker" aria-label="Etapa atual">
          <div class="guided-hero-current-step">
            <span>01</span>
            <strong>Observe</strong>
            <small>Entenda o cenário antes de concluir</small>
          </div>
          <ol class="guided-hero-track" aria-label="Etapas da prática">
            <li class="is-active"><span>01</span><strong>Observe</strong></li>
            <li><span>02</span><strong>Analise</strong></li>
            <li><span>03</span><strong>Conclua</strong></li>
          </ol>
        </aside>
      </section>

      <div class="guided-practice-grid">
        ${renderPracticeRail()}

        <div class="guided-practice-main">
          <section class="guided-section-card guided-scenario-card guided-order-scenario">
            <div class="guided-section-heading">
              <span class="guided-section-icon"><i data-lucide="briefcase-business" aria-hidden="true"></i></span>
              <div>
                <span class="section-kicker">Cenário de negócio</span>
                <h2>${escapeHtml(activity.scenario.title)}</h2>
              </div>
            </div>
            <p>${escapeHtml(activity.scenario.context)}</p>
          </section>

          <section class="guided-section-card guided-order-metrics" aria-labelledby="guidedIndicatorTitle">
            <div class="guided-section-heading">
              <span class="guided-section-icon guided-section-icon-green"><i data-lucide="chart-no-axes-combined" aria-hidden="true"></i></span>
              <div>
                <span class="section-kicker">Dados do indicador</span>
                <h2 id="guidedIndicatorTitle">Leia o resultado no contexto da meta</h2>
              </div>
            </div>
            <div class="guided-metrics-grid">${renderIndicatorCards(activity)}</div>
          </section>

          <section class="guided-section-card guided-question-card guided-order-question" aria-labelledby="guidedQuestionTitle">
            <div class="guided-question-heading">
              <span class="guided-step-number">02</span>
              <div>
                <span class="section-kicker">Sua análise</span>
                <h2 id="guidedQuestionTitle">${escapeHtml(activity.question)}</h2>
                <p>Escolha a alternativa que melhor conecta resultado, meta e próxima decisão.</p>
              </div>
            </div>
            <form data-guided-practice-form>
              <fieldset class="guided-options" ${state.isSaving ? "disabled" : ""}>
                <legend class="sr-only">Alternativas da prática</legend>
                ${renderOptions(activity)}
              </fieldset>
              <div class="guided-question-actions">
                <button class="submit-button" type="submit" ${!state.selectedOption || state.isSaving ? "disabled" : ""}>
                  ${state.isSaving ? "Salvando..." : state.validation?.isCorrect ? "Conferir novamente" : "Conferir minha leitura"}
                </button>
                <span>O feedback explica o raciocínio, não apenas o gabarito.</span>
              </div>
            </form>
          </section>

          <section class="guided-section-card guided-feedback-card guided-order-feedback ${!state.validation ? "is-empty" : ""}" aria-label="Feedback explicativo">
            ${renderFeedback(activity)}
          </section>

          ${renderCompletion(activity)}
        </div>

        <aside class="guided-practice-aside">
          <section class="guided-aside-card guided-thinking-card guided-order-thinking">
            <span class="section-kicker">Como pensar</span>
            <h2>Três perguntas antes da conclusão</h2>
            <ol class="guided-thinking-list">
              <li><span>1</span><p><strong>O que foi medido?</strong> Taxa de satisfação.</p></li>
              <li><span>2</span><p><strong>Qual era a referência?</strong> Meta de 85%.</p></li>
              <li><span>3</span><p><strong>O que fazer com o desvio?</strong> Investigar causas.</p></li>
            </ol>
          </section>

          <section class="guided-aside-card guided-note-card guided-order-note">
            <div class="guided-aside-title">
              <i data-lucide="sticky-note" aria-hidden="true"></i>
              <div><span class="section-kicker">Seu espaço</span><h2>Anotação pessoal</h2></div>
            </div>
            <label class="sr-only" for="guidedPracticeNote">Anotação pessoal</label>
            <textarea id="guidedPracticeNote" data-guided-note rows="4" placeholder="Que investigação você faria primeiro?">${escapeHtml(state.note)}</textarea>
            <button class="filter-button" type="button" data-save-guided-note>Salvar neste navegador</button>
            ${state.noteStatus ? `<small>${escapeHtml(state.noteStatus)}</small>` : `<small>O registro remoto de anotações fica para uma etapa futura.</small>`}
          </section>

          ${renderNextAction()}

          ${!state.isAuthenticated && state.validation?.isCorrect ? `
            <section class="guided-aside-card guided-login-card guided-order-login">
              <i data-lucide="cloud-upload" aria-hidden="true"></i>
              <h2>Guarde esta evolução</h2>
              <p>Entre para vincular as próximas práticas ao seu progresso.</p>
              <button class="submit-button" type="button" data-guided-login>Entrar para salvar</button>
            </section>
          ` : ""}
        </aside>
      </div>
    `;
    refreshIcons();
  }

  async function submitAnswer() {
    if (!state.selectedOption || state.isSaving) return;
    state.isSaving = true;
    state.validation = service.validateAnswer(state.activity, state.selectedOption);
    render();

    const result = await service.saveResponse(state.activity, state.selectedOption, state.startedAt);
    state.validation = result.validation;
    state.isSaving = false;
    state.isAuthenticated = Boolean(result.attempt.authenticated || result.progress.authenticated);

    if (state.validation.isCorrect) {
      if (!state.isAuthenticated) {
        state.saveStatus = "Prática concluída neste navegador. Entre para salvar seu progresso na conta.";
      } else if (result.progress.ok && result.attempt.ok) {
        state.saveStatus = "Tentativa e progresso salvos na sua conta.";
      } else if (result.progress.ok && result.attempt.migrationPending) {
        state.saveStatus = "Progresso salvo. O histórico detalhado será ativado após a migration pendente.";
      } else if (result.progress.ok) {
        state.saveStatus = "Progresso salvo na sua conta.";
      } else {
        state.saveStatus = "A prática foi concluída, mas não foi possível confirmar o progresso remoto agora.";
      }
    } else {
      state.saveStatus = "";
    }
    render();
  }

  mount.addEventListener("change", (event) => {
    if (!event.target.matches('input[name="guidedPracticeAnswer"]')) return;
    state.selectedOption = event.target.value;
    state.validation = null;
    state.saveStatus = "";
    render();
  });

  mount.addEventListener("submit", (event) => {
    if (!event.target.matches("[data-guided-practice-form]")) return;
    event.preventDefault();
    void submitAnswer();
  });

  mount.addEventListener("input", (event) => {
    if (event.target.matches("[data-guided-note]")) {
      state.note = event.target.value;
      state.noteStatus = "";
    }
  });

  mount.addEventListener("click", (event) => {
    if (event.target.closest("[data-save-guided-note]")) {
      saveLocalNote();
      return;
    }
    if (event.target.closest("[data-guided-login]")) {
      globalScope.authModal?.open?.({
        mode: "login",
        title: "Entre para salvar seu progresso",
        description: "Sua próxima prática ficará conectada ao Meu Progresso."
      });
    }
  });

  async function init() {
    const slug = new URLSearchParams(globalScope.location.search).get("atividade") || service.DEFAULT_SLUG;
    const [loadResult, user] = await Promise.all([
      service.loadActivity(slug),
      service.getAuthenticatedUser()
    ]);

    if (!loadResult.ok || !loadResult.activity) {
      mount.innerHTML = `
        <section class="guided-practice-error">
          <i data-lucide="circle-alert" aria-hidden="true"></i>
          <h1>Prática não encontrada</h1>
          <p>Esta atividade ainda não está disponível. Volte às trilhas para escolher outro passo.</p>
          <a class="submit-button" href="index.html#trilhas">Ver trilhas</a>
        </section>
      `;
      refreshIcons();
      return;
    }

    state.activity = loadResult.activity;
    state.isAuthenticated = Boolean(user);
    loadLocalNote(state.activity);
    render();
  }

  void init();
})(window);
