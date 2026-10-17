(function initGuidedPracticePage(globalScope) {
  const mount = document.getElementById("guidedPracticeMount");
  const service = globalScope.guidedPracticeService;
  if (!mount || !service) return;

  const REFINED_KPI_SLUGS = new Set([
    "indicadores-definicao-consistente",
    "indicadores-decomposicao-kpi",
    "indicadores-funil-conversao"
  ]);

  const state = {
    activity: null,
    currentCheckpointIndex: 0,
    answers: {},
    selectedOption: "",
    checkpointValidation: null,
    submissionValidation: null,
    officialProgressPercent: null,
    isAuthenticated: false,
    isSaving: false,
    persistenceStatus: "idle",
    completionAttemptSaved: false,
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

  function getCheckpoints() {
    return service.getCheckpoints(state.activity);
  }

  function getCurrentCheckpoint() {
    return getCheckpoints()[state.currentCheckpointIndex];
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
    return activity.indicatorData.map((item) => `
      <article class="guided-metric-card ${item.tone ? `guided-metric-card-${escapeHtml(item.tone)}` : ""}">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
      </article>
    `).join("");
  }

  function renderOptions(checkpoint) {
    return checkpoint.options.map((option) => {
      const selected = state.selectedOption === option.id;
      const optionClass = state.checkpointValidation && selected
        ? state.checkpointValidation.isCorrect
          ? "is-correct"
          : "is-incorrect"
        : "";
      return `
        <label class="guided-option ${selected ? "is-selected" : ""} ${optionClass}">
          <input type="radio" name="guidedPracticeAnswer" value="${escapeHtml(option.id)}" ${selected ? "checked" : ""} ${state.checkpointValidation?.isCorrect ? "disabled" : ""}>
          <span class="guided-option-letter">${escapeHtml(option.id)}</span>
          <span class="guided-option-text">${escapeHtml(option.text)}</span>
        </label>
      `;
    }).join("");
  }

  function getInternalProgress() {
    const validation = service.validateSubmission(state.activity, state.answers);
    const checkpoints = getCheckpoints().filter((checkpoint) => checkpoint.required);
    const completed = validation.completedCheckpointIds.length;
    return {
      completed,
      total: checkpoints.length,
      value: checkpoints.length ? Math.round((completed / checkpoints.length) * 100) : 0,
      isComplete: validation.isCorrect,
      completedIds: new Set(validation.completedCheckpointIds)
    };
  }

  function hasValidatedAnswers() {
    return Boolean(state.submissionValidation?.isCorrect);
  }

  function hasConfirmedCompletion() {
    if (!hasValidatedAnswers()) return false;
    return !state.isAuthenticated || state.persistenceStatus === "saved";
  }

  function hasPendingSave() {
    return hasValidatedAnswers() && state.isAuthenticated && state.persistenceStatus !== "saved";
  }

  function renderPracticeRail() {
    const progress = getInternalProgress();
    const completionConfirmed = hasConfirmedCompletion();
    const savePending = hasPendingSave();
    const targetProgress = state.activity.completionProgressPercent;
    const officialLabel = state.officialProgressPercent !== null
      ? `${state.officialProgressPercent}% confirmado`
      : progress.isComplete && !state.isAuthenticated
        ? "Não salvo na conta"
        : savePending
          ? "Salvamento pendente"
          : targetProgress
            ? `Até ${targetProgress}% após salvar`
            : "Atualiza após conclusão válida";

    return `
      <aside class="guided-practice-rail" aria-label="Roteiro e status da prática">
        <section class="guided-rail-card guided-rail-roadmap">
          <h2>Roteiro interno</h2>
          <ol class="guided-roadmap-list">
            ${getCheckpoints().map((checkpoint, index) => {
              const isComplete = progress.completedIds.has(checkpoint.id);
              const isCurrent = index === state.currentCheckpointIndex && !progress.isComplete;
              return `
                <li class="${isComplete ? "is-active is-complete" : isCurrent ? "is-active" : ""}">
                  <span>${String(index + 1).padStart(2, "0")}</span>
                  <div><strong>${escapeHtml(checkpoint.title)}</strong><small>${isComplete ? "Decisão validada" : isCurrent ? "Decisão atual" : "Próxima decisão"}</small></div>
                </li>
              `;
            }).join("")}
          </ol>
        </section>

        <section class="guided-rail-card guided-rail-status">
          <h2>Conclusão da atividade</h2>
          <div class="guided-status-pill ${completionConfirmed ? "is-complete" : ""}">
            <span aria-hidden="true"></span>${completionConfirmed ? (!state.isAuthenticated ? "Concluída localmente" : "Concluída") : savePending ? "Salvamento pendente" : "Pendente"}
          </div>
          <div class="guided-progress-heading"><span>Roteiro interno</span><strong>${progress.value}%</strong></div>
          <div class="guided-progress-track" aria-label="Roteiro interno da atividade: ${progress.value}%">
            <span style="width: ${progress.value}%"></span>
          </div>
          <small>${progress.completed} de ${progress.total} decisões obrigatórias validadas</small>
          <div class="guided-official-progress">
            <span>Progresso oficial da trilha</span>
            <strong>${escapeHtml(officialLabel)}</strong>
          </div>
        </section>

        <section class="guided-rail-card guided-rail-tip">
          <div class="guided-rail-tip-title"><i data-lucide="lightbulb" aria-hidden="true"></i><h2>Dica</h2></div>
          <p>Somente respostas corretas em todos os checkpoints concluem a atividade.</p>
        </section>
      </aside>
    `;
  }

  function renderNextAction(activity) {
    const complete = hasConfirmedCompletion();
    if (hasPendingSave()) {
      return `
        <section class="guided-aside-card guided-next-card">
          <div class="guided-aside-title">
            <i data-lucide="lock-keyhole" aria-hidden="true"></i>
            <div><span class="section-kicker">Próxima ação</span><h2>Salvamento pendente</h2></div>
          </div>
          <p>Suas respostas foram validadas. Confirme o salvamento na conta para liberar o próximo passo.</p>
          <button class="submit-button" type="button" disabled>Próximo passo bloqueado</button>
          <a class="guided-back-link" href="index.html#trilhas">Voltar às trilhas</a>
        </section>
      `;
    }
    if (!complete) {
      return `
        <section class="guided-aside-card guided-next-card guided-next-card-pending">
          <div class="guided-aside-title">
            <i data-lucide="circle-dashed" aria-hidden="true"></i>
            <div><span class="section-kicker">Próxima ação</span><h2>Conclua os checkpoints</h2></div>
          </div>
          <p>Valide todas as decisões obrigatórias para liberar a próxima atividade e atualizar o progresso oficial.</p>
          <span class="guided-pending-label"><i data-lucide="lock-keyhole" aria-hidden="true"></i> Continuidade ainda bloqueada</span>
          <a class="guided-back-link" href="meu-progresso.html">Consultar Meu Progresso</a>
          <a class="guided-back-link" href="index.html#trilhas">Voltar às trilhas</a>
        </section>
      `;
    }
    const nextAction = activity.nextAction;
    return `
      <section class="guided-aside-card guided-next-card">
        <div class="guided-aside-title">
          <i data-lucide="rocket" aria-hidden="true"></i>
          <div><span class="section-kicker">Próxima ação</span><h2>${escapeHtml(nextAction?.title || "Conclua os checkpoints")}</h2></div>
        </div>
        <p>${escapeHtml(nextAction?.description || "Valide todas as decisões obrigatórias para liberar a próxima atividade e atualizar o progresso oficial.")}</p>
        <a class="submit-button" href="${escapeHtml(nextAction?.href || "meu-progresso.html")}">${escapeHtml(nextAction?.label || "Ver Meu Progresso")} <i data-lucide="arrow-right" aria-hidden="true"></i></a>
        <a class="guided-back-link" href="index.html#trilhas">Voltar às trilhas</a>
      </section>
    `;
  }

  function renderFeedback(checkpoint) {
    if (!state.checkpointValidation) {
      return `
        <div class="guided-feedback-empty">
          <i data-lucide="message-circle" aria-hidden="true"></i>
          <div>
            <strong>Seu feedback aparece aqui</strong>
            <span>Escolha uma alternativa e confira o raciocínio deste checkpoint.</span>
          </div>
        </div>
      `;
    }

    const correct = state.checkpointValidation.isCorrect;
    const hasNext = state.currentCheckpointIndex < getCheckpoints().length - 1;
    const showAttention = correct || !REFINED_KPI_SLUGS.has(state.activity.slug);
    return `
      <div class="guided-feedback ${correct ? "guided-feedback-correct" : "guided-feedback-incorrect"}" role="status">
        <span class="guided-feedback-icon"><i data-lucide="${correct ? "check-circle-2" : "search"}" aria-hidden="true"></i></span>
        <div>
          <span class="section-kicker">${correct ? "Checkpoint validado" : "Nova tentativa disponível"}</span>
          <h3>${escapeHtml(correct ? checkpoint.correctTitle : checkpoint.incorrectTitle)}</h3>
          <p>${escapeHtml(correct ? checkpoint.correctFeedback : checkpoint.incorrectFeedback)}</p>
          ${showAttention ? `
            <div class="guided-attention">
              <i data-lucide="lightbulb" aria-hidden="true"></i>
              <span><strong>Ponto de atenção:</strong> ${escapeHtml(checkpoint.attention)}</span>
            </div>
          ` : ""}
          ${correct && hasNext ? `<button class="filter-button guided-checkpoint-next" type="button" data-next-checkpoint>Continuar para a próxima decisão <i data-lucide="arrow-right" aria-hidden="true"></i></button>` : ""}
          ${!correct ? `<small class="guided-retry-hint">Escolha outra alternativa e confira novamente. Esta tentativa não concluiu a atividade.</small>` : ""}
        </div>
      </div>
    `;
  }

  function renderCompletion(activity) {
    if (!hasValidatedAnswers()) return "";
    if (hasPendingSave()) {
      return `
        <section class="guided-completion-card guided-completion-save-error guided-order-completion" aria-labelledby="guidedCompletionTitle" role="alert">
          <div class="guided-completion-icon"><i data-lucide="cloud-alert" aria-hidden="true"></i></div>
          <div>
            <span class="section-kicker">Respostas validadas</span>
            <h2 id="guidedCompletionTitle">Não foi possível confirmar a conclusão na sua conta</h2>
            <p>${escapeHtml(state.saveStatus || "Suas respostas continuam preenchidas. Tente salvar novamente para concluir esta atividade oficialmente.")}</p>
          </div>
          <div class="guided-completion-actions">
            <button class="submit-button" type="button" data-retry-guided-save ${state.isSaving ? "disabled" : ""}>${state.isSaving ? "Salvando novamente..." : "Tentar salvar novamente"}</button>
            <a class="filter-button" href="index.html#trilhas">Voltar às trilhas</a>
          </div>
        </section>
      `;
    }
    return `
      <section class="guided-completion-card guided-order-completion" aria-labelledby="guidedCompletionTitle">
        <div class="guided-completion-icon"><i data-lucide="badge-check" aria-hidden="true"></i></div>
        <div>
          <span class="section-kicker">${activity.activityType === "project" ? "Etapa concluída" : "Prática concluída"}</span>
          <h2 id="guidedCompletionTitle">${escapeHtml(activity.completionTitle || "Decisões validadas")}</h2>
          <p>${escapeHtml(activity.conclusion)}</p>
          ${Array.isArray(activity.competencies) && activity.competencies.length ? `
            <ul class="guided-completion-competencies" aria-label="Competências demonstradas">
              ${activity.competencies.map((competency) => `<li>${escapeHtml(competency)}</li>`).join("")}
            </ul>
          ` : ""}
          ${state.saveStatus ? `<p class="guided-save-status">${escapeHtml(state.saveStatus)}</p>` : ""}
        </div>
        <div class="guided-completion-actions">
          <a class="submit-button" href="${escapeHtml(activity.nextAction?.href || "meu-progresso.html")}">${escapeHtml(activity.nextAction?.label || "Ver Meu Progresso")}</a>
          <a class="filter-button" href="index.html#trilhas">Voltar às trilhas</a>
        </div>
      </section>
    `;
  }

  function renderHeroRoadmap(checkpoints) {
    return checkpoints.map((checkpoint, index) => {
      const completed = service.validateSubmission(state.activity, state.answers).completedCheckpointIds.includes(checkpoint.id);
      return `<li class="${completed || index === state.currentCheckpointIndex ? "is-active" : ""}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(checkpoint.title)}</strong></li>`;
    }).join("");
  }

  function render() {
    const activity = state.activity;
    if (!activity) return;
    const checkpoints = getCheckpoints();
    const checkpoint = getCurrentCheckpoint();
    const complete = hasConfirmedCompletion();
    const savePending = hasPendingSave();

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
        <aside class="guided-practice-hero-marker" aria-label="Decisão atual">
          <div class="guided-hero-current-step">
            <span>${complete ? "✓" : savePending ? "!" : String(state.currentCheckpointIndex + 1).padStart(2, "0")}</span>
            <strong>${complete ? "Concluída" : savePending ? "Salvamento pendente" : escapeHtml(checkpoint.title)}</strong>
            <small>${complete ? "Todos os checkpoints foram validados" : savePending ? "Respostas validadas; conclusão ainda não salva" : `Decisão ${state.currentCheckpointIndex + 1} de ${checkpoints.length}`}</small>
          </div>
          <ol class="guided-hero-track" aria-label="Checkpoints da prática">${renderHeroRoadmap(checkpoints)}</ol>
        </aside>
      </section>

      <div class="guided-practice-grid">
        ${renderPracticeRail()}

        <div class="guided-practice-main">
          <section class="guided-section-card guided-scenario-card guided-order-scenario">
            <div class="guided-section-heading">
              <span class="guided-section-icon"><i data-lucide="briefcase-business" aria-hidden="true"></i></span>
              <div><span class="section-kicker">Cenário de negócio</span><h2>${escapeHtml(activity.scenario.title)}</h2></div>
            </div>
            <p>${escapeHtml(activity.scenario.context)}</p>
          </section>

          <section class="guided-section-card guided-order-metrics" aria-labelledby="guidedIndicatorTitle">
            <div class="guided-section-heading">
              <span class="guided-section-icon guided-section-icon-green"><i data-lucide="chart-no-axes-combined" aria-hidden="true"></i></span>
              <div>
                <span class="section-kicker">Dados da análise</span>
                <h2 id="guidedIndicatorTitle">${escapeHtml(activity.indicatorTitle || "Leia os dados no contexto")}</h2>
                ${activity.indicatorDescription ? `<p>${escapeHtml(activity.indicatorDescription)}</p>` : ""}
              </div>
            </div>
            <div class="guided-metrics-grid">${renderIndicatorCards(activity)}</div>
          </section>

          <section class="guided-section-card guided-question-card guided-order-question" aria-labelledby="guidedQuestionTitle">
            <div class="guided-question-heading">
              <span class="guided-step-number">${String(state.currentCheckpointIndex + 1).padStart(2, "0")}</span>
              <div>
                <span class="section-kicker">${escapeHtml(checkpoint.title)}</span>
                <h2 id="guidedQuestionTitle">${escapeHtml(checkpoint.question)}</h2>
                <p>Escolha a alternativa que melhor conecta cálculo, interpretação e decisão.</p>
              </div>
            </div>
            <form data-guided-practice-form>
              <fieldset class="guided-options" ${state.isSaving ? "disabled" : ""}>
                <legend class="sr-only">Alternativas do checkpoint</legend>
                ${renderOptions(checkpoint)}
              </fieldset>
              <div class="guided-question-actions">
                <button class="submit-button" type="submit" ${!state.selectedOption || state.isSaving || state.checkpointValidation?.isCorrect ? "disabled" : ""}>
                  ${state.isSaving ? "Salvando..." : "Conferir esta decisão"}
                </button>
                <span>O feedback é específico para esta decisão.</span>
              </div>
            </form>
          </section>

          <section class="guided-section-card guided-feedback-card guided-order-feedback ${!state.checkpointValidation ? "is-empty" : ""}" aria-label="Feedback explicativo">
            ${renderFeedback(checkpoint)}
          </section>

          ${renderCompletion(activity)}
        </div>

        <aside class="guided-practice-aside">
          <section class="guided-aside-card guided-thinking-card guided-order-thinking">
            <span class="section-kicker">Como pensar</span>
            <h2>Perguntas para este cenário</h2>
            <ol class="guided-thinking-list">
              ${(activity.thinkingSteps || []).map(([question, answer], index) => `
                <li><span>${index + 1}</span><p><strong>${escapeHtml(question)}</strong> ${escapeHtml(answer)}</p></li>
              `).join("")}
            </ol>
          </section>

          <section class="guided-aside-card guided-note-card guided-order-note">
            <div class="guided-aside-title">
              <i data-lucide="sticky-note" aria-hidden="true"></i>
              <div><span class="section-kicker">Seu espaço</span><h2>Anotação pessoal</h2></div>
            </div>
            <textarea id="guidedPracticeNote" data-guided-note rows="4" aria-label="Anotação pessoal" placeholder="Registre seu cálculo ou hipótese de investigação.">${escapeHtml(state.note)}</textarea>
            <button class="filter-button" type="button" data-save-guided-note>Salvar neste navegador</button>
            ${state.noteStatus ? `<small>${escapeHtml(state.noteStatus)}</small>` : `<small>O registro remoto de anotações fica para uma etapa futura.</small>`}
          </section>

          ${renderNextAction(activity)}

          ${!state.isAuthenticated && complete ? `
            <section class="guided-aside-card guided-login-card guided-order-login">
              <i data-lucide="cloud-upload" aria-hidden="true"></i>
              <h2>Guarde esta evolução</h2>
              <p>Entre para vincular esta conclusão ao progresso oficial da trilha.</p>
              <button class="submit-button" type="button" data-guided-login>Entrar para salvar</button>
            </section>
          ` : ""}
        </aside>
      </div>
    `;
    refreshIcons();
  }

  async function persistResponse({ retry = false } = {}) {
    state.isSaving = true;
    render();

    try {
      const result = await service.saveResponse(
        state.activity,
        state.answers,
        state.startedAt,
        { attemptAlreadySaved: retry && state.completionAttemptSaved }
      );
      state.submissionValidation = result.validation;
      state.isAuthenticated = Boolean(state.isAuthenticated || result.attempt.authenticated || result.progress.authenticated);

      if (result.validation.isCorrect) {
        state.completionAttemptSaved = Boolean(result.attempt.ok);
        if (!state.isAuthenticated) {
          state.persistenceStatus = "local";
          state.saveStatus = "Atividade concluída neste navegador. Entre para salvar o progresso oficial na conta.";
        } else if (result.progress.ok && result.attempt.ok) {
          state.persistenceStatus = "saved";
          state.officialProgressPercent = result.progress.progressPercent;
          state.saveStatus = `Tentativa válida salva. Progresso oficial da trilha: ${result.progress.progressPercent}%.`;
        } else {
          state.persistenceStatus = "failed";
          state.saveStatus = result.attempt.ok
            ? "A tentativa foi salva, mas o progresso oficial não pôde ser atualizado. Tente novamente."
            : "As respostas foram validadas, mas a tentativa não pôde ser salva. Tente novamente.";
        }
      } else {
        state.persistenceStatus = "idle";
        state.completionAttemptSaved = false;
        state.saveStatus = "";
      }
    } catch (error) {
      state.submissionValidation = service.validateSubmission(state.activity, state.answers);
      state.persistenceStatus = "failed";
      state.saveStatus = "As respostas foram validadas, mas ocorreu uma falha ao salvar. Tente novamente.";
    } finally {
      state.isSaving = false;
      render();
    }
  }

  async function submitAnswer() {
    if (!state.selectedOption || state.isSaving) return;
    const checkpoint = getCurrentCheckpoint();
    state.answers[checkpoint.id] = state.selectedOption;
    state.checkpointValidation = service.validateCheckpoint(state.activity, state.currentCheckpointIndex, state.selectedOption);
    await persistResponse();
  }

  async function retrySave() {
    if (!hasPendingSave() || state.isSaving) return;
    await persistResponse({ retry: true });
  }

  function goToNextCheckpoint() {
    if (!state.checkpointValidation?.isCorrect) return;
    if (state.currentCheckpointIndex >= getCheckpoints().length - 1) return;
    state.currentCheckpointIndex += 1;
    const nextCheckpoint = getCurrentCheckpoint();
    state.selectedOption = state.answers[nextCheckpoint.id] || "";
    state.checkpointValidation = null;
    render();
    mount.querySelector("[data-guided-practice-form]")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }

  mount.addEventListener("change", (event) => {
    if (!event.target.matches('input[name="guidedPracticeAnswer"]')) return;
    state.selectedOption = event.target.value;
    state.checkpointValidation = null;
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
    if (event.target.closest("[data-next-checkpoint]")) {
      goToNextCheckpoint();
      return;
    }
    if (event.target.closest("[data-save-guided-note]")) {
      saveLocalNote();
      return;
    }
    if (event.target.closest("[data-retry-guided-save]")) {
      void retrySave();
      return;
    }
    if (event.target.closest("[data-guided-login]")) {
      globalScope.authModal?.open?.({
        mode: "login",
        title: "Entre para salvar seu progresso",
        description: "A conclusão válida ficará conectada ao Meu Progresso."
      });
    }
  });

  async function init() {
    const slug = new URLSearchParams(globalScope.location.search).get("atividade") || service.DEFAULT_SLUG;
    const [loadResult, user] = await Promise.all([service.loadActivity(slug), service.getAuthenticatedUser()]);

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
