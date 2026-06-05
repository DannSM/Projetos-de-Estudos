(function initActiveLearningPath(globalScope) {
  const mount = document.getElementById("activeLearningPathMount");

  if (!mount) {
    return;
  }

  const TABLES = {
    paths: "learning_paths",
    steps: "learning_path_steps",
    progress: "user_learning_progress"
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeList(value) {
    return Array.isArray(value) ? value : [];
  }

  function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function refreshIcons() {
    if (globalScope.lucide && typeof globalScope.lucide.createIcons === "function") {
      globalScope.lucide.createIcons();
    }
  }

  function getClient() {
    if (globalScope.authService && typeof globalScope.authService.getClient === "function") {
      return globalScope.authService.getClient();
    }

    const config = globalScope.DATA_SKILL_MAP_SUPABASE || {};
    if (!globalScope.supabase || typeof globalScope.supabase.createClient !== "function" || !config.url || !config.anonKey) {
      return null;
    }

    return globalScope.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: "data_skill_map_learning_detail_public"
      }
    });
  }

  async function getCurrentUser() {
    if (!globalScope.authService || typeof globalScope.authService.getCurrentSession !== "function") {
      return null;
    }

    const result = await globalScope.authService.getCurrentSession();
    return result && result.ok && result.user ? result.user : null;
  }

  async function fetchOrThrow(query, label) {
    const { data, error } = await query;
    if (error) {
      throw new Error(`${label}: ${error.message || "falha na consulta"}`);
    }
    return data;
  }

  function getPathParam() {
    const params = new URLSearchParams(globalScope.location.search);
    return cleanText(params.get("path") || params.get("slug") || params.get("id"));
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function formatContentType(value) {
    const labels = {
      lesson: "Aula",
      practice: "Pratica",
      project: "Projeto",
      quiz: "Quiz",
      external: "Externo"
    };
    const key = cleanText(value).toLowerCase() || "lesson";
    return labels[key] || value || "Aula";
  }

  function getActionLabel(step) {
    const type = cleanText(step?.content_type).toLowerCase();
    if (type === "practice") return "Concluir pratica";
    if (type === "project") return "Concluir projeto";
    return "Finalizar aula";
  }

  function getStepStatus(step, index, progressByStep, steps) {
    const row = progressByStep[step.id] || null;
    if (row?.status === "completed") return "completed";
    if (row?.status === "in_progress" || row?.status === "paused") return "in_progress";
    if (index === 0) return "available";

    const previousStep = steps[index - 1];
    const previousProgress = progressByStep[previousStep.id] || null;
    return previousProgress?.status === "completed" ? "available" : "locked";
  }

  function getProgressByStep(progressRows) {
    return normalizeList(progressRows).reduce((map, row) => {
      if (row.step_id) {
        map[row.step_id] = row;
      }
      return map;
    }, {});
  }

  function getAggregatePercent(steps, progressByStep) {
    if (!steps.length) return 0;
    const completed = steps.filter((step) => progressByStep[step.id]?.status === "completed").length;
    return Math.round((completed / steps.length) * 100);
  }

  function getCurrentStep(steps, progressByStep) {
    return steps.find((step, index) => {
      const status = getStepStatus(step, index, progressByStep, steps);
      return status === "in_progress" || status === "available";
    }) || null;
  }

  async function fetchPathData() {
    const client = getClient();
    if (!client) {
      throw new Error("Cliente Supabase indisponivel.");
    }

    const pathParam = getPathParam();
    let pathQuery = client
      .from(TABLES.paths)
      .select("id,slug,title,description,skill_area,level,estimated_minutes,status,display_order,metadata")
      .eq("status", "active");

    if (pathParam) {
      pathQuery = isUuid(pathParam) ? pathQuery.eq("id", pathParam) : pathQuery.eq("slug", pathParam);
    } else {
      pathQuery = pathQuery.order("display_order", { ascending: true });
    }

    const pathRows = normalizeList(await fetchOrThrow(pathQuery.limit(1), TABLES.paths));
    const path = pathRows[0] || null;
    if (!path?.id) {
      return { path: null, steps: [], progressRows: [], user: await getCurrentUser() };
    }

    const steps = normalizeList(await fetchOrThrow(
      client
        .from(TABLES.steps)
        .select("id,path_id,step_key,title,description,skill_area,content_type,content_url,estimated_minutes,display_order,status,metadata")
        .eq("path_id", path.id)
        .eq("status", "active")
        .order("display_order", { ascending: true })
        .order("title", { ascending: true }),
      TABLES.steps
    ));

    const user = await getCurrentUser();
    const progressRows = user?.id
      ? normalizeList(await fetchOrThrow(
        client
          .from(TABLES.progress)
          .select("id,path_id,step_id,status,progress_percent,started_at,completed_at,last_activity_at,source_attempt_id,metadata,updated_at")
          .eq("user_id", user.id)
          .eq("path_id", path.id)
          .in("status", ["not_started", "in_progress", "paused", "completed"]),
        TABLES.progress
      ))
      : [];

    return { path, steps, progressRows, user };
  }

  function renderLoading() {
    mount.innerHTML = `
      <div class="learning-paths-loading" role="status" aria-live="polite">
        <span class="progress-loading-icon" aria-hidden="true"></span>
        <strong>Carregando trilha...</strong>
      </div>
    `;
  }

  function renderError(message) {
    mount.innerHTML = `
      <article class="learning-detail-empty">
        <span class="learning-paths-empty-icon" aria-hidden="true"><i data-lucide="route"></i></span>
        <div>
          <h1>Trilha indisponivel</h1>
          <p>${escapeHtml(message || "Nao foi possivel carregar esta trilha agora.")}</p>
          <a class="button button-secondary" href="index.html#trilhas">Voltar para trilhas</a>
        </div>
      </article>
    `;
    refreshIcons();
  }

  function renderAuthGate() {
    return `
      <article class="learning-detail-auth">
        <div>
          <span class="section-kicker">Progresso protegido</span>
          <h2>Entre para salvar seu avanço.</h2>
          <p>Voce pode ver os passos da trilha, mas a conclusao e liberacao do proximo passo dependem de uma conta.</p>
        </div>
        <button class="button button-primary" type="button" data-learning-auth-open>
          <i data-lucide="user-circle" aria-hidden="true"></i>
          <span>Entrar / Criar conta</span>
        </button>
      </article>
    `;
  }

  function renderStepContent(step) {
    const metadata = step?.metadata || {};
    const concept = cleanText(metadata.concept);
    const skillCode = cleanText(metadata.skill_code);
    const minutes = Number(step?.estimated_minutes);

    return `
      <div class="learning-step-content">
        <span class="section-kicker">Conteudo do passo</span>
        <h2>${escapeHtml(step?.title || "Passo da trilha")}</h2>
        <p>${escapeHtml(step?.description || "Revise o conceito indicado e avance quando concluir este estudo.")}</p>
        <dl>
          ${concept ? `<div><dt>Conceito</dt><dd>${escapeHtml(concept)}</dd></div>` : ""}
          ${skillCode ? `<div><dt>Habilidade</dt><dd>${escapeHtml(skillCode)}</dd></div>` : ""}
          ${Number.isFinite(minutes) && minutes > 0 ? `<div><dt>Duração estimada</dt><dd>${Math.round(minutes)} min</dd></div>` : ""}
        </dl>
        ${step?.content_url ? `<a class="button button-secondary" href="${escapeHtml(step.content_url)}" target="_blank" rel="noopener noreferrer">Abrir material</a>` : ""}
      </div>
    `;
  }

  function render(data) {
    if (!data.path) {
      renderError("A trilha solicitada nao foi encontrada ou nao esta ativa.");
      return;
    }

    const progressByStep = getProgressByStep(data.progressRows);
    const percent = getAggregatePercent(data.steps, progressByStep);
    const currentStep = data.user ? getCurrentStep(data.steps, progressByStep) : data.steps[0] || null;
    const isCompleted = data.steps.length > 0 && percent === 100;

    mount.innerHTML = `
      <div class="learning-detail-header">
        <div>
          <a class="learning-detail-back" href="index.html#trilhas">Voltar para Trilhas</a>
          <span class="section-kicker">Trilha ativa</span>
          <h1>${escapeHtml(data.path.title)}</h1>
          <p>${escapeHtml(data.path.description || "Trilha orientada pelo diagnostico.")}</p>
          <div class="learning-path-meta">
            <span>${escapeHtml(data.path.skill_area || "Dados")}</span>
            ${data.path.level ? `<span>${escapeHtml(data.path.level)}</span>` : ""}
          </div>
        </div>
        <div class="learning-detail-progress" aria-label="Progresso da trilha">
          <span>Progresso</span>
          <strong>${percent}%</strong>
          <div class="learning-path-progress"><span style="width: ${percent}%"></span></div>
        </div>
      </div>

      ${!data.user ? renderAuthGate() : ""}
      ${isCompleted ? `
        <article class="learning-detail-complete">
          <i data-lucide="check-circle-2" aria-hidden="true"></i>
          <div>
            <h2>Trilha concluida.</h2>
            <p>Todos os passos ativos desta trilha foram finalizados.</p>
          </div>
        </article>
      ` : ""}

      <div class="learning-detail-grid">
        <section class="learning-detail-panel">
          <span class="progress-panel-label">Passos da trilha</span>
          <ol class="learning-detail-step-list">
            ${data.steps.map((step, index) => {
              const status = getStepStatus(step, index, progressByStep, data.steps);
              const isCurrent = currentStep?.id === step.id && status !== "completed";
              const statusLabel = {
                completed: "Concluido",
                in_progress: "Em andamento",
                available: "Liberado",
                locked: "Bloqueado"
              }[status] || "Bloqueado";

              return `
                <li class="learning-detail-step learning-detail-step--${status}${isCurrent ? " is-current" : ""}">
                  <span class="learning-detail-step-index">${String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <span>${escapeHtml(formatContentType(step.content_type))} - ${escapeHtml(statusLabel)}</span>
                    <strong>${escapeHtml(step.title)}</strong>
                    <p>${escapeHtml(step.description || "")}</p>
                  </div>
                </li>
              `;
            }).join("")}
          </ol>
        </section>

        <section class="learning-detail-panel learning-detail-current">
          ${currentStep ? renderStepContent(currentStep) : `<p class="progress-empty-text">Nenhum passo ativo encontrado.</p>`}
          ${data.user && currentStep && !isCompleted ? `
            <button class="button button-primary learning-complete-button" type="button" data-complete-step="${escapeHtml(currentStep.id)}">
              <i data-lucide="check" aria-hidden="true"></i>
              <span>${escapeHtml(getActionLabel(currentStep))}</span>
            </button>
          ` : ""}
        </section>
      </div>
    `;

    const authButton = mount.querySelector("[data-learning-auth-open]");
    authButton?.addEventListener("click", () => {
      if (globalScope.authModal && typeof globalScope.authModal.openAuthModal === "function") {
        globalScope.authModal.openAuthModal({
          onSuccess: () => {
            void refresh();
          }
        });
      }
    });

    const completeButton = mount.querySelector("[data-complete-step]");
    completeButton?.addEventListener("click", () => {
      void completeCurrentStep(data, completeButton.dataset.completeStep);
    });

    refreshIcons();
  }

  async function completeCurrentStep(data, stepId) {
    const client = getClient();
    const user = await getCurrentUser();
    if (!client || !user?.id) {
      render(data);
      return;
    }

    const progressByStep = getProgressByStep(data.progressRows);
    const currentStep = getCurrentStep(data.steps, progressByStep);
    if (!currentStep || currentStep.id !== stepId) {
      console.warn("[Trilha] Tentativa de concluir passo fora de ordem bloqueada.");
      return;
    }

    const currentIndex = data.steps.findIndex((step) => step.id === currentStep.id);
    const previousIncomplete = data.steps
      .slice(0, currentIndex)
      .some((step) => progressByStep[step.id]?.status !== "completed");

    if (previousIncomplete) {
      console.warn("[Trilha] Ordem invalida para conclusao de passo.");
      return;
    }

    const now = new Date().toISOString();
    const currentExisting = progressByStep[currentStep.id] || null;
    const currentPayload = {
      user_id: user.id,
      path_id: data.path.id,
      step_id: currentStep.id,
      status: "completed",
      progress_percent: 100,
      started_at: currentExisting?.started_at || now,
      completed_at: now,
      last_activity_at: now,
      metadata: {
        ...(currentExisting?.metadata || {}),
        source: "active_learning_path_mvp",
        completed_from: "trilha_html"
      },
      updated_at: now
    };

    if (currentExisting?.id) {
      await fetchOrThrow(
        client
          .from(TABLES.progress)
          .update(currentPayload)
          .eq("id", currentExisting.id)
          .select("id")
          .maybeSingle(),
        TABLES.progress
      );
    } else {
      await fetchOrThrow(
        client
          .from(TABLES.progress)
          .insert(currentPayload)
          .select("id")
          .maybeSingle(),
        TABLES.progress
      );
    }

    const nextStep = data.steps[currentIndex + 1] || null;
    if (nextStep) {
      const nextExisting = progressByStep[nextStep.id] || null;
      const nextPayload = {
        user_id: user.id,
        path_id: data.path.id,
        step_id: nextStep.id,
        status: nextExisting?.status === "completed" ? "completed" : "in_progress",
        progress_percent: nextExisting?.status === "completed" ? 100 : 0,
        started_at: nextExisting?.started_at || now,
        last_activity_at: now,
        metadata: {
          ...(nextExisting?.metadata || {}),
          source: "active_learning_path_mvp",
          unlocked_by_step_id: currentStep.id
        },
        updated_at: now
      };

      if (nextExisting?.id) {
        await fetchOrThrow(
          client
            .from(TABLES.progress)
            .update(nextPayload)
            .eq("id", nextExisting.id)
            .select("id")
            .maybeSingle(),
          TABLES.progress
        );
      } else {
        await fetchOrThrow(
          client
            .from(TABLES.progress)
            .insert(nextPayload)
            .select("id")
            .maybeSingle(),
          TABLES.progress
        );
      }
    }

    globalScope.dispatchEvent(new CustomEvent("data-skill-map-learning-updated", {
      detail: { path: data.path, step: currentStep }
    }));
    await refresh();
  }

  async function refresh() {
    renderLoading();
    try {
      const data = await fetchPathData();
      render(data);
    } catch (error) {
      console.warn("[Trilha] Falha ao carregar detalhe da trilha.", error);
      renderError("Nao foi possivel carregar ou atualizar esta trilha agora.");
    }
  }

  globalScope.addEventListener("data-skill-map-auth-changed", () => {
    void refresh();
  });

  void refresh();
})(window);
