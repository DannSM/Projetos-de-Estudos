(function initLearningPaths(globalScope) {
  const mount = document.getElementById("learningPathsMount");

  if (!mount) {
    return;
  }

  const TABLES = {
    paths: "learning_paths",
    steps: "learning_path_steps",
    progress: "user_learning_progress",
    recommendations: "learning_recommendations",
    sessions: "diagnostic_sessions",
    practiceCatalog: "vw_sql_practice_exercises_public",
    attempts: "user_practice_attempts"
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function refreshIcons() {
    if (globalScope.lucide && typeof globalScope.lucide.createIcons === "function") {
      globalScope.lucide.createIcons();
    }
  }

  function normalizeList(value) {
    return Array.isArray(value) ? value : [];
  }

  function clampPercent(value) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return 0;
    return Math.min(100, Math.max(0, Math.round(numberValue)));
  }

  function formatMinutes(value) {
    const minutes = Number(value);
    if (!Number.isFinite(minutes) || minutes <= 0) return "";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.round((minutes / 60) * 10) / 10;
    return `${String(hours).replace(".", ",")} h`;
  }

  function formatContentType(value) {
    const labels = {
      lesson: "Aula",
      practice: "Prática",
      project: "Projeto",
      quiz: "Quiz",
      external: "Externo"
    };
    const key = String(value || "lesson").trim().toLowerCase();
    return labels[key] || value || "Aula";
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
        storageKey: "data_skill_map_learning_paths_public"
      }
    });
  }

  async function fetchOrThrow(query, label) {
    const { data, error } = await query;
    if (error) {
      throw new Error(`${label}: ${error.message || "falha na consulta"}`);
    }
    return data;
  }

  async function fetchOptional(query, label, fallbackValue = []) {
    try {
      return await fetchOrThrow(query, label);
    } catch (error) {
      console.warn(`[Trilhas] Consulta opcional ignorada em ${label}.`, error);
      return fallbackValue;
    }
  }

  async function getCurrentUser() {
    if (!globalScope.authService || typeof globalScope.authService.getCurrentSession !== "function") {
      return null;
    }

    const sessionResult = await globalScope.authService.getCurrentSession();
    return sessionResult && sessionResult.ok && sessionResult.user ? sessionResult.user : null;
  }

  function getPriorityAreaFromSession(session) {
    const snapshot = normalizeList(session?.area_score_snapshot)
      .filter((area) => Number.isFinite(Number(area.percent)) || Number.isFinite(Number(area.score_percent)))
      .sort((a, b) => Number(a.percent ?? a.score_percent) - Number(b.percent ?? b.score_percent));

    if (snapshot[0]?.area) {
      return snapshot[0].area;
    }

    const recommendationText = [
      session?.study_recommendation,
      session?.priority_text
    ].filter(Boolean).join(" ").toLowerCase();

    return ["SQL", "Estatística", "Excel", "Lógica de dados", "Indicadores"].find((area) => {
      const normalizedArea = area.toLowerCase();
      return recommendationText.includes(normalizedArea);
    }) || "";
  }

  function indexByPathId(items) {
    return normalizeList(items).reduce((map, item) => {
      if (!item.path_id) return map;
      if (!map[item.path_id]) {
        map[item.path_id] = [];
      }
      map[item.path_id].push(item);
      return map;
    }, {});
  }

  function pickFeaturedPath({ paths, progressRows, recommendation, latestSession }) {
    const activeProgress = normalizeList(progressRows).find((item) => item.status === "in_progress" || item.status === "paused")
      || normalizeList(progressRows)[0]
      || null;

    if (activeProgress) {
      return paths.find((path) => path.id === activeProgress.path_id) || null;
    }

    const recommendedPathId = recommendation?.metadata?.recommended_path_id;
    if (recommendedPathId) {
      return paths.find((path) => path.id === recommendedPathId) || null;
    }

    const recommendedArea = recommendation?.skill_area || getPriorityAreaFromSession(latestSession);
    if (recommendedArea) {
      return paths.find((path) => path.skill_area === recommendedArea) || null;
    }

    return null;
  }

  function getPathProgress(path, progressByPath, verifiedTrackStatusByPath = {}) {
    const rows = progressByPath[path.id] || [];
    const pathRow = rows.find((row) => !row.step_id) || rows[0] || null;
    const verifiedTrack = verifiedTrackStatusByPath[path.id];
    if (verifiedTrack?.isVerifiable) {
      return {
        row: pathRow,
        percent: verifiedTrack.progressPercent,
        status: verifiedTrack.isCompleted ? "completed" : (verifiedTrack.completedSteps ? "in_progress" : "not_started")
      };
    }
    const percent = pathRow ? clampPercent(pathRow.progress_percent) : 0;

    return {
      row: pathRow,
      percent,
      status: pathRow?.status || "not_started"
    };
  }

  async function fetchVerifiedTrackStatuses(client, userId, steps) {
    const calculator = globalScope.learningProgressStatus?.calculateTrackStatus;
    const getPracticeSlug = globalScope.learningProgressStatus?.getPracticeSlug;
    if (typeof calculator !== "function" || typeof getPracticeSlug !== "function") return {};

    const practiceSlugs = normalizeList(steps).map(getPracticeSlug).filter(Boolean);
    if (!practiceSlugs.length) return {};

    const [activities, attempts] = await Promise.all([
      fetchOptional(
        client.from(TABLES.practiceCatalog).select("activity_id,slug").in("slug", practiceSlugs),
        TABLES.practiceCatalog
      ),
      fetchOptional(
        client
          .from(TABLES.attempts)
          .select("activity_id,validation_status")
          .eq("user_id", userId)
          .eq("validation_status", "correct"),
        TABLES.attempts
      )
    ]);
    const stepsByPath = indexByPathId(steps);

    return Object.fromEntries(Object.entries(stepsByPath).map(([pathId, pathSteps]) => [
      pathId,
      calculator({
        steps: pathSteps,
        activities: normalizeList(activities),
        attempts: normalizeList(attempts)
      })
    ]));
  }

  async function fetchLearningPathData() {
    const client = getClient();
    if (!client) {
      throw new Error("Cliente Supabase indisponível.");
    }

    const user = await getCurrentUser();

    const paths = normalizeList(await fetchOrThrow(
      client
        .from(TABLES.paths)
        .select("id,slug,title,description,skill_area,level,estimated_minutes,status,display_order")
        .eq("status", "active")
        .order("display_order", { ascending: true })
        .order("title", { ascending: true }),
      TABLES.paths
    ));

    const pathIds = paths.map((path) => path.id).filter(Boolean);
    const steps = pathIds.length
      ? normalizeList(await fetchOrThrow(
        client
          .from(TABLES.steps)
          .select("id,path_id,title,description,skill_area,content_type,content_url,estimated_minutes,display_order,status,metadata")
          .in("path_id", pathIds)
          .eq("status", "active")
          .order("display_order", { ascending: true })
          .order("title", { ascending: true }),
        TABLES.steps
      ))
      : [];

    if (!user?.id) {
      return {
        user: null,
        paths,
        steps,
        progressRows: [],
        verifiedTrackStatusByPath: {},
        recommendation: null,
        latestSession: null
      };
    }

    const [progressRows, recommendations, sessions] = await Promise.all([
      fetchOptional(
        client
          .from(TABLES.progress)
          .select("path_id,step_id,status,progress_percent,last_activity_at,updated_at")
          .eq("user_id", user.id)
          .in("status", ["not_started", "in_progress", "paused", "completed"])
          .order("last_activity_at", { ascending: false, nullsFirst: false })
          .order("updated_at", { ascending: false }),
        TABLES.progress
      ),
      fetchOptional(
        client
          .from(TABLES.recommendations)
          .select("skill_area,recommendation_type,priority,title,description,reason,status,source_attempt_id,metadata,updated_at")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("priority", { ascending: true })
          .order("updated_at", { ascending: false })
          .limit(1),
        TABLES.recommendations
      ),
      fetchOptional(
        client
          .from(TABLES.sessions)
          .select("attempt_id,finished_at,created_at,overall_level,study_recommendation,priority_text,area_score_snapshot")
          .eq("user_id", user.id)
          .order("finished_at", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1),
        TABLES.sessions
      )
    ]);
    const verifiedTrackStatusByPath = await fetchVerifiedTrackStatuses(client, user.id, steps);

    return {
      user,
      paths,
      steps,
      progressRows: normalizeList(progressRows),
      verifiedTrackStatusByPath,
      recommendation: normalizeList(recommendations)[0] || null,
      latestSession: normalizeList(sessions)[0] || null
    };
  }

  function renderLoading() {
    mount.innerHTML = `
      <div class="learning-paths-loading" role="status" aria-live="polite">
        <span class="progress-loading-icon" aria-hidden="true"></span>
        <strong>Carregando trilhas...</strong>
      </div>
    `;
  }

  function renderFallback() {
    const fallback = mount.querySelector("[data-learning-paths-fallback]");
    if (fallback) {
      return;
    }

    mount.innerHTML = `
      <article class="learning-paths-empty" data-learning-paths-fallback>
        <span class="learning-paths-empty-icon" aria-hidden="true">
          <i data-lucide="refresh-circle"></i>
        </span>
        <div>
          <h3>Nao foi possivel carregar as trilhas agora.</h3>
          <p>Tente atualizar a pagina.</p>
        </div>
      </article>
    `;
    refreshIcons();
  }

  function renderEmptyState() {
    mount.innerHTML = `
      <article class="learning-paths-empty">
        <span class="learning-paths-empty-icon" aria-hidden="true">
          <i data-lucide="route"></i>
        </span>
        <div>
          <h3>Trilhas em preparação</h3>
          <p>Novos caminhos de estudo estão sendo preparados. Volte em breve para explorar as trilhas disponíveis.</p>
        </div>
      </article>
    `;
    refreshIcons();
  }

  function renderPersonalizedSummary({ featuredPath, featuredProgress, recommendation, latestSession, user }) {
    if (!user) {
      return `
        <article class="learning-paths-summary">
          <div>
            <span class="section-kicker">Trilhas</span>
            <h3>Entre para ver sua trilha personalizada.</h3>
            <p>Explore os caminhos disponíveis. Ao entrar, você também acompanha seu progresso individual.</p>
          </div>
          <div class="learning-paths-summary-actions">
            <a class="button button-primary" href="diagnostico.html">
              <i data-lucide="clipboard-list" aria-hidden="true"></i>
              <span>Fazer diagnóstico</span>
            </a>
            <a class="button button-secondary" href="praticas-sql.html?pratica=sql-essencial-filtros-where">
              <i data-lucide="square-terminal" aria-hidden="true"></i>
              <span>Explorar práticas SQL</span>
            </a>
          </div>
        </article>
      `;
    }

    if (!featuredPath) {
      return "";
    }

    const title = recommendation?.title || featuredPath.title;
    const text = recommendation?.description || recommendation?.reason || latestSession?.priority_text || featuredPath.description || "Continue seus estudos pela trilha mais alinhada ao seu diagnóstico.";

    return `
      <article class="learning-paths-summary">
        <div>
          <span class="section-kicker">Trilha personalizada</span>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(text)}</p>
        </div>
        <div class="learning-paths-summary-progress" aria-label="Progresso na trilha personalizada">
          <span>${escapeHtml(featuredPath.title)}</span>
          <strong>${featuredProgress.percent}%</strong>
          <div class="learning-path-progress"><span style="width: ${featuredProgress.percent}%"></span></div>
        </div>
      </article>
    `;
  }

  function renderPathCard(path, index, stepsByPath, progressByPath, verifiedTrackStatusByPath, featuredPath) {
    const steps = stepsByPath[path.id] || [];
    const progress = getPathProgress(path, progressByPath, verifiedTrackStatusByPath);
    const minutes = formatMinutes(path.estimated_minutes);
    const isFeatured = featuredPath?.id === path.id;
    return `
      <article class="track-card learning-path-card${isFeatured ? " is-featured" : ""}">
        <div class="learning-path-card-top">
          <span class="track-number">${String(index + 1).padStart(2, "0")}</span>
          ${isFeatured ? `<span class="learning-path-badge">Recomendada</span>` : ""}
        </div>
        <h3>${escapeHtml(path.title)}</h3>
        <p>${escapeHtml(path.description || "Trilha ativa para estudo orientado.")}</p>
        <div class="learning-path-meta" aria-label="Metadados da trilha">
          <span>${escapeHtml(path.skill_area || "Área geral")}</span>
          ${path.level ? `<span>${escapeHtml(path.level)}</span>` : ""}
          ${minutes ? `<span>${escapeHtml(minutes)}</span>` : ""}
        </div>
        <div class="learning-path-progress-block">
          <div>
            <span>Progresso</span>
            <strong>${progress.percent}%</strong>
          </div>
          <div class="learning-path-progress" aria-hidden="true">
            <span style="width: ${progress.percent}%"></span>
          </div>
        </div>
        ${steps.length ? `
          <ol class="learning-path-step-list">
            ${steps.slice(0, 3).map((step) => `
              <li>
                <span>${escapeHtml(formatContentType(step.content_type))}</span>
                <strong>${escapeHtml(step.title)}</strong>
              </li>
            `).join("")}
          </ol>
        ` : `<p class="learning-path-empty-steps">Passos ainda não cadastrados para esta trilha.</p>`}
      </article>
    `;
  }

  function renderLearningPaths(data) {
    if (!data.paths.length) {
      renderEmptyState();
      return;
    }

    const stepsByPath = indexByPathId(data.steps);
    const progressByPath = indexByPathId(data.progressRows);
    const featuredPath = pickFeaturedPath(data);
    const featuredProgress = featuredPath
      ? getPathProgress(featuredPath, progressByPath, data.verifiedTrackStatusByPath)
      : { percent: 0 };

    mount.innerHTML = `
      ${renderPersonalizedSummary({
        featuredPath,
        featuredProgress,
        recommendation: data.recommendation,
        latestSession: data.latestSession,
        user: data.user
      })}
      <div class="track-grid learning-path-grid">
        ${data.paths.map((path, index) => renderPathCard(path, index, stepsByPath, progressByPath, data.verifiedTrackStatusByPath, featuredPath)).join("")}
      </div>
    `;
    refreshIcons();
  }

  async function refreshLearningPaths() {
    renderLoading();

    try {
      const data = await fetchLearningPathData();
      renderLearningPaths(data);
    } catch (error) {
      console.warn("[Trilhas] Falha ao carregar trilhas reais.", error);
      renderFallback();
    }
  }

  globalScope.addEventListener("data-skill-map-auth-changed", () => {
    void refreshLearningPaths();
  });
  globalScope.addEventListener("data-skill-map-learning-updated", () => {
    void refreshLearningPaths();
  });

  void refreshLearningPaths();
})(window);
