(function initProgressPage(globalScope) {
  const mount = document.getElementById("progressPageMount");

  if (!mount) {
    return;
  }

  const EMPTY_MESSAGE = "Faça seu primeiro diagnóstico para gerar seu progresso.";
  const DIAGNOSTIC_AREAS = ["SQL", "Estatística", "Excel", "Lógica de dados", "Indicadores"];
  const AREA_LABELS = {
    SQL: "SQL",
    "Estatística": "Estatística",
    Excel: "Excel",
    "Lógica de dados": "Lógica de dados",
    Indicadores: "Indicadores e KPIs"
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

  function formatPercent(value) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return null;
    return `${Math.round(numberValue)}%`;
  }

  function formatDate(value) {
    if (!value) return "Sem atividade";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sem atividade";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return "Sem atividade";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Sem atividade";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo"
    }).format(date).replace(",", " às");
  }

  function clampPercent(value) {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return 0;
    return Math.min(100, Math.max(0, Math.round(numberValue)));
  }

  function normalizeList(value) {
    return Array.isArray(value) ? value : [];
  }

  function pickDisplayName(profile, user) {
    return profile?.display_name || user?.user_metadata?.display_name || user?.user_metadata?.name || "";
  }

  function getAvatarUrl(user) {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
  }

  function getInitials(name, email) {
    const source = String(name || email || "Aluno").trim();
    const parts = source.includes("@") ? [source[0]] : source.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
  }

  function renderUserAvatar(user, displayName, email) {
    const avatarUrl = getAvatarUrl(user);
    const initials = getInitials(displayName, email);

    if (avatarUrl) {
      return `
        <span class="progress-user-avatar">
          <img src="${escapeHtml(avatarUrl)}" alt="">
        </span>
      `;
    }

    return `<span class="progress-user-avatar progress-user-avatar--fallback" aria-hidden="true">${escapeHtml(initials)}</span>`;
  }

  function getSessionDate(session) {
    return session?.finished_at || session?.created_at || null;
  }

  function getAreaName(area) {
    return area?.skill_area || area?.area || area?.name || "Área";
  }

  function normalizeAreaName(value) {
    const text = String(value || "").toLowerCase();
    return DIAGNOSTIC_AREAS.find((area) => {
      const areaText = area.toLowerCase();
      const labelText = AREA_LABELS[area].toLowerCase();
      return text === areaText || text === labelText || text.includes(areaText) || text.includes(labelText);
    }) || "";
  }

  function getAreaDisplayName(area) {
    const normalizedArea = normalizeAreaName(area) || area;
    return AREA_LABELS[normalizedArea] || normalizedArea || "Área";
  }

  function getAreaPercent(area) {
    return area?.score_percent ?? area?.percent ?? null;
  }

  function getProgressStatus(percent) {
    const numberValue = Number(percent);
    if (!Number.isFinite(numberValue)) return "Aguardando dados";
    if (numberValue >= 75) return "Ponto forte";
    if (numberValue >= 45) return "Em consolidação";
    return "Prioridade";
  }

  function getPriorityAreaFromSession(latestSession) {
    const recommendationText = [
      latestSession?.study_recommendation,
      latestSession?.priority_text
    ].filter(Boolean).join(" ");

    return normalizeAreaName(recommendationText);
  }

  function sortAreasByNeed(areas, preferredArea) {
    return normalizeList(areas).slice().sort((a, b) => {
      const aPercent = Number.isFinite(Number(a.percent)) ? Number(a.percent) : 101;
      const bPercent = Number.isFinite(Number(b.percent)) ? Number(b.percent) : 101;

      if (aPercent !== bPercent) return aPercent - bPercent;
      if (preferredArea && a.area === preferredArea) return -1;
      if (preferredArea && b.area === preferredArea) return 1;
      return DIAGNOSTIC_AREAS.indexOf(a.area) - DIAGNOSTIC_AREAS.indexOf(b.area);
    });
  }

  function buildAreasFromAnswers(answers) {
    const grouped = normalizeList(answers).reduce((summary, answer) => {
      const area = normalizeAreaName(answer.area);
      if (!area) return summary;

      if (!summary[area]) {
        summary[area] = { area, correct: 0, total: 0, misses: [] };
      }

      summary[area].total += 1;
      if (answer.is_correct) {
        summary[area].correct += 1;
      } else if (answer.concept) {
        summary[area].misses.push(answer.concept);
      }

      return summary;
    }, {});

    return DIAGNOSTIC_AREAS
      .map((area) => grouped[area])
      .filter(Boolean)
      .map((area) => ({
        ...area,
        percent: area.total ? Math.round((area.correct / area.total) * 100) : 0
      }));
  }

  function buildAreasFromSnapshot(latestSession) {
    return normalizeList(latestSession?.area_score_snapshot)
      .map((area) => ({
        area: normalizeAreaName(getAreaName(area)) || getAreaName(area),
        percent: getAreaPercent(area),
        correct: area.correct,
        total: area.total,
        misses: normalizeList(area.misses)
      }))
      .filter((area) => area.area && area.total > 0);
  }

  function buildAreasFromSkillProgress(skillProgress) {
    return normalizeList(skillProgress)
      .filter((area) => area.status !== "archived")
      .map((area) => ({
        area: normalizeAreaName(getAreaName(area)) || getAreaName(area),
        percent: getAreaPercent(area),
        level: area.current_level,
        status: area.status,
        correct: area.questions_correct,
        total: area.questions_answered
      }));
  }

  function buildAreaSummary({ skillProgress, latestSession, diagnosticAnswers }) {
    const preferredArea = getPriorityAreaFromSession(latestSession);
    const answerAreas = buildAreasFromAnswers(diagnosticAnswers);
    const snapshotAreas = buildAreasFromSnapshot(latestSession);
    const skillAreas = buildAreasFromSkillProgress(skillProgress);
    const areas = skillAreas.length ? skillAreas : (answerAreas.length ? answerAreas : snapshotAreas);

    return {
      preferredArea,
      areas: sortAreasByNeed(areas, preferredArea)
    };
  }

  function getPriorityArea(areaSummary) {
    if (areaSummary.preferredArea) {
      const matchedArea = areaSummary.areas.find((area) => area.area === areaSummary.preferredArea);
      if (matchedArea) return matchedArea;
    }

    return areaSummary.areas[0] || null;
  }

  function buildNextStep({ learningRecommendation, diagnosticRecommendation, learningProgress, path, step, latestSession, priorityArea }) {
    if (step) {
      return {
        title: step.title,
        text: step.description || (path ? `Continue a trilha ${path.title}.` : "Continue sua trilha de estudos."),
        href: step.content_url || "index.html#trilhas",
        cta: "Ver trilhas"
      };
    }

    if (learningRecommendation) {
      return {
        title: learningRecommendation.title,
        text: learningRecommendation.description || learningRecommendation.reason || "Recomendação personalizada para continuar seus estudos.",
        href: "diagnostico.html",
        cta: "Refazer diagnóstico"
      };
    }

    if (learningProgress && path) {
      const percent = formatPercent(learningProgress.progress_percent) || "0%";
      return {
        title: path.title,
        text: `Você está com ${percent} de progresso nesta trilha.`,
        href: "index.html#trilhas",
        cta: "Ver trilhas"
      };
    }

    if (diagnosticRecommendation) {
      return {
        title: diagnosticRecommendation.title,
        text: diagnosticRecommendation.next_step || diagnosticRecommendation.study_guidance || "Próximo passo recomendado pelo diagnóstico.",
        href: "diagnostico.html",
        cta: "Refazer diagnóstico"
      };
    }

    if (priorityArea?.area && latestSession) {
      return {
        title: `Reforçar ${getAreaDisplayName(priorityArea.area)}`,
        text: `Revise os conceitos de ${getAreaDisplayName(priorityArea.area)} e resolva exercícios curtos antes de avançar.`,
        href: "diagnostico.html",
        cta: "Refazer diagnóstico"
      };
    }

    if (latestSession?.study_recommendation || latestSession?.priority_text) {
      return {
        title: latestSession.study_recommendation || "Próximo estudo recomendado",
        text: latestSession.priority_text || "Use o resultado mais recente para orientar sua próxima revisão.",
        href: "diagnostico.html",
        cta: "Refazer diagnóstico"
      };
    }

    return {
      title: "Iniciar diagnóstico",
      text: EMPTY_MESSAGE,
      href: "diagnostico.html",
      cta: "Fazer diagnóstico"
    };
  }

  function getLearningAggregatePercent(steps, progressRows) {
    const activeSteps = normalizeList(steps);
    if (!activeSteps.length) {
      return formatPercent(progressRows?.[0]?.progress_percent) || "0%";
    }

    const completed = activeSteps.filter((step) => normalizeList(progressRows).some((row) => row.step_id === step.id && row.status === "completed")).length;
    return `${Math.round((completed / activeSteps.length) * 100)}%`;
  }

  async function fetchOrThrow(query, label) {
    const { data, error, count } = await query;
    if (error) {
      throw new Error(`${label}: ${error.message || "falha na consulta"}`);
    }
    return { data, count };
  }

  async function fetchProgressData(user) {
    const client = globalScope.authService?.getClient?.();
    if (!client || !user?.id) {
      throw new Error("Cliente autenticado indisponível.");
    }

    const userId = user.id;

    const profileQuery = client
      .from("profiles")
      .select("id,email,display_name")
      .eq("id", userId)
      .maybeSingle();

    const sessionsQuery = client
      .from("diagnostic_sessions")
      .select("attempt_id,finished_at,created_at,total_questions_answered,total_correct,total_wrong,score_percent,overall_level,identified_profile,study_recommendation,priority_text,stopped_at_level,area_score_snapshot", { count: "exact" })
      .eq("user_id", userId)
      .order("finished_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    const skillProgressQuery = client
      .from("user_skill_progress")
      .select("skill_area,current_level,score_percent,questions_answered,questions_correct,last_activity_at,status")
      .eq("user_id", userId)
      .order("score_percent", { ascending: true })
      .limit(5);

    const learningRecommendationsQuery = client
      .from("learning_recommendations")
      .select("skill_area,recommendation_type,priority,title,description,reason,status,metadata,updated_at,created_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("priority", { ascending: true })
      .order("updated_at", { ascending: false })
      .limit(1);

    const learningProgressQuery = client
      .from("user_learning_progress")
      .select("path_id,step_id,status,progress_percent,last_activity_at,updated_at,completed_at")
      .eq("user_id", userId)
      .in("status", ["not_started", "in_progress", "paused", "completed"])
      .order("last_activity_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });

    const [
      profileResult,
      sessionsResult,
      skillProgressResult,
      recommendationsResult,
      learningProgressResult
    ] = await Promise.all([
      fetchOrThrow(profileQuery, "profiles"),
      fetchOrThrow(sessionsQuery, "diagnostic_sessions"),
      fetchOrThrow(skillProgressQuery, "user_skill_progress"),
      fetchOrThrow(learningRecommendationsQuery, "learning_recommendations"),
      fetchOrThrow(learningProgressQuery, "user_learning_progress")
    ]);

    const learningProgressRows = normalizeList(learningProgressResult.data);
    const learningProgress = learningProgressRows.find((row) => ["in_progress", "paused", "not_started"].includes(row.status))
      || learningProgressRows[0]
      || null;
    const latestSession = normalizeList(sessionsResult.data)[0] || null;
    let diagnosticAnswers = [];
    let areaSummary = buildAreaSummary({
      skillProgress: normalizeList(skillProgressResult.data),
      latestSession,
      diagnosticAnswers
    });
    const preferredArea = areaSummary.preferredArea;
    let diagnosticRecommendation = null;
    let path = null;
    let step = null;
    let pathSteps = [];

    if (latestSession?.attempt_id) {
      const answersResult = await fetchOrThrow(
        client
          .from("diagnostic_answers")
          .select("area,concept,is_correct,order_index,answered_at")
          .eq("user_id", userId)
          .eq("attempt_id", latestSession.attempt_id)
          .order("order_index", { ascending: true }),
        "diagnostic_answers"
      );
      diagnosticAnswers = normalizeList(answersResult.data);
      areaSummary = buildAreaSummary({
        skillProgress: normalizeList(skillProgressResult.data),
        latestSession,
        diagnosticAnswers
      });
    }

    const priorityArea = getPriorityArea(areaSummary);

    if (priorityArea?.area) {
      let diagnosticRecommendationQuery = client
        .from("diagnostic_recommendations")
        .select("area,level,title,study_guidance,next_step,priority,is_active")
        .eq("is_active", true)
        .eq("area", priorityArea.area);

      if (latestSession?.stopped_at_level) {
        diagnosticRecommendationQuery = diagnosticRecommendationQuery.eq("level", latestSession.stopped_at_level);
      }

      let diagnosticRecommendationResult = await fetchOrThrow(
        diagnosticRecommendationQuery.order("priority", { ascending: true }).limit(1),
        "diagnostic_recommendations"
      );

      if (!normalizeList(diagnosticRecommendationResult.data).length && latestSession?.stopped_at_level) {
        diagnosticRecommendationResult = await fetchOrThrow(
          client
            .from("diagnostic_recommendations")
            .select("area,level,title,study_guidance,next_step,priority,is_active")
            .eq("is_active", true)
            .eq("area", priorityArea.area)
            .order("priority", { ascending: true })
            .limit(1),
          "diagnostic_recommendations"
        );
      }

      diagnosticRecommendation = normalizeList(diagnosticRecommendationResult.data)[0] || null;
    }

    if (learningProgress?.path_id) {
      const pathResult = await fetchOrThrow(
        client
          .from("learning_paths")
          .select("id,title,description,skill_area,level,estimated_minutes,status")
          .eq("id", learningProgress.path_id)
          .maybeSingle(),
        "learning_paths"
      );
      path = pathResult.data || null;
    }

    if (learningProgress?.step_id) {
      const stepResult = await fetchOrThrow(
        client
          .from("learning_path_steps")
          .select("id,path_id,title,description,skill_area,content_url,display_order,status")
          .eq("id", learningProgress.step_id)
          .maybeSingle(),
        "learning_path_steps"
      );
      step = stepResult.data || null;
    }

    if (path?.id) {
      const stepsResult = await fetchOrThrow(
        client
          .from("learning_path_steps")
          .select("id,path_id,title,description,skill_area,content_type,content_url,display_order,status")
          .eq("path_id", path.id)
          .eq("status", "active")
          .order("display_order", { ascending: true }),
        "learning_path_steps"
      );
      pathSteps = normalizeList(stepsResult.data);

      if (!step) {
        const completedStepIds = new Set(learningProgressRows.filter((row) => row.status === "completed").map((row) => row.step_id));
        step = pathSteps.find((item) => !completedStepIds.has(item.id)) || pathSteps[pathSteps.length - 1] || null;
      }
    }

    return {
      profile: profileResult.data || null,
      diagnosticSessions: normalizeList(sessionsResult.data),
      diagnosticCount: sessionsResult.count || normalizeList(sessionsResult.data).length,
      skillProgress: normalizeList(skillProgressResult.data),
      diagnosticAnswers,
      areaSummary,
      priorityArea,
      preferredArea,
      learningRecommendation: normalizeList(recommendationsResult.data)[0] || null,
      diagnosticRecommendation,
      learningProgress,
      learningProgressRows,
      path,
      pathSteps,
      step
    };
  }

  function buildCards(data) {
    const latestSession = data.diagnosticSessions[0] || null;
    const priorityAreas = data.areaSummary?.areas || [];
    const belowTargetCount = priorityAreas.filter((area) => Number(area.percent) < 70).length;
    const priorityArea = data.priorityArea || getPriorityArea(data.areaSummary || { areas: [] });
    const totalQuestions = Number(latestSession?.total_questions_answered || 0);
    const totalCorrect = Number(latestSession?.total_correct || 0);

    return [
      {
        icon: "clipboard-list",
        tone: "blue",
        label: "Diagnósticos realizados",
        value: data.diagnosticCount ? String(data.diagnosticCount) : "0",
        note: data.diagnosticCount ? `${totalQuestions || 0} perguntas no último diagnóstico.` : EMPTY_MESSAGE
      },
      {
        icon: "trending-up",
        tone: "amber",
        label: "Áreas para evoluir",
        value: priorityArea ? getAreaDisplayName(priorityArea.area) : "Sem mapa por área",
        note: priorityArea
          ? `${belowTargetCount || 1} área(s) abaixo da meta de 70%.`
          : "Faça um diagnóstico para gerar seu mapa por área."
      },
      {
        icon: "clock-3",
        tone: "cyan",
        label: "Última atividade",
        value: formatDate(getSessionDate(latestSession)),
        note: latestSession ? `${totalCorrect}/${totalQuestions || 0} acertos registrados.` : "Nenhuma sessão encontrada ainda."
      }
    ];
  }

  function renderLoading() {
    mount.innerHTML = `
      <div class="progress-loading-card">
        <span class="progress-loading-icon" aria-hidden="true"></span>
        <strong>Carregando seu progresso...</strong>
      </div>
    `;
  }

  function renderLockedState() {
    mount.innerHTML = `
      <article class="progress-gate-card">
        <div class="progress-gate-visual" aria-hidden="true">
          <span class="progress-gate-icon">
            <i data-lucide="lock-keyhole"></i>
          </span>
          <div class="progress-gate-lines">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div class="progress-gate-copy">
          <span class="section-kicker">Área autenticada</span>
          <h1>Entre para ver seu progresso.</h1>
          <p>Crie uma conta ou acesse sua conta atual para acompanhar sua evolução no Data Skill Map.</p>
          <button class="button button-primary progress-auth-button" type="button" data-progress-auth-open>
            <i data-lucide="user-circle" aria-hidden="true"></i>
            <span>Entrar / Criar conta</span>
          </button>
        </div>
      </article>
    `;

    const authButton = mount.querySelector("[data-progress-auth-open]");
    authButton?.addEventListener("click", openAuthFromProgress);
    refreshIcons();
  }

  function renderErrorState(session) {
    const email = escapeHtml(session?.user?.email || "Usuário autenticado");

    mount.innerHTML = `
      <div class="progress-dashboard">
        <section class="progress-hero-card">
          <div class="progress-hero-copy">
            <span class="section-kicker">Meu Progresso</span>
            <h1>Aluno</h1>
            <p class="progress-user-email">
              <i data-lucide="mail" aria-hidden="true"></i>
              <span>${email}</span>
            </p>
            <p class="progress-hero-text">Não foi possível carregar seus dados agora. Tente novamente em instantes.</p>
          </div>
          <div class="progress-status-card">
            <span>Estado</span>
            <strong>Erro ao carregar</strong>
            <p>Seu progresso não foi alterado.</p>
          </div>
        </section>
      </div>
    `;

    refreshIcons();
  }

  function renderHistory(sessions) {
    if (!sessions.length) {
      return `<p class="progress-empty-text">${EMPTY_MESSAGE}</p>`;
    }

    return `
      <ul class="progress-history-list">
        ${sessions.map((session) => `
          <li>
            <span class="progress-history-dot" aria-hidden="true"></span>
            <div class="progress-history-main">
              <span>${escapeHtml(formatDateTime(getSessionDate(session)))}</span>
              <strong>${escapeHtml(session.overall_level || session.identified_profile || "Resultado registrado")}</strong>
            </div>
            <p class="progress-history-score">${escapeHtml(formatPercent(session.score_percent) || "sem percentual")} geral</p>
          </li>
        `).join("")}
      </ul>
    `;
  }

  function renderAreas(areas) {
    if (!areas.length) {
      return `<p class="progress-empty-text">Faça um diagnóstico para gerar seu mapa por área.</p>`;
    }

    return `
      <div class="progress-area-list">
        ${areas.map((area) => {
          const percent = clampPercent(area.percent);
          const isZeroProgress = percent === 0;

          return `
          <article class="progress-area-row${isZeroProgress ? " progress-area-row--empty" : ""}">
            <div class="progress-area-row__top">
              <div>
                <strong>${escapeHtml(getAreaDisplayName(area.area))}</strong>
                <span>${escapeHtml(getProgressStatus(area.percent))}</span>
              </div>
              <div class="progress-area-score">
                <strong>${escapeHtml(formatPercent(area.percent) || "0%")}</strong>
                ${Number.isFinite(Number(area.correct)) && Number.isFinite(Number(area.total)) ? `<span>${escapeHtml(`${area.correct}/${area.total} acertos`)}</span>` : ""}
              </div>
            </div>
            ${isZeroProgress ? `<span class="progress-area-row__hint">Primeiro passo disponivel</span>` : ""}
            <div class="progress-area-bar" aria-hidden="true">
              <span style="width: ${percent}%"></span>
            </div>
          </article>
        `;
        }).join("")}
      </div>
    `;
  }

  function renderRecommendedPath(data) {
    if (!data.path && !data.learningRecommendation) {
      return `<p class="progress-empty-text">Finalize um diagnóstico logado para gerar uma trilha recomendada.</p>`;
    }

    const progress = getLearningAggregatePercent(data.pathSteps, data.learningProgressRows);
    const title = data.path?.title || data.learningRecommendation?.title || "Trilha recomendada";
    const stepTitle = data.step?.title || data.learningRecommendation?.description || "Primeiro passo ainda não definido.";

    return `
      <ul class="progress-detail-list">
        <li>
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(data.path?.description || data.learningRecommendation?.reason || "Recomendação gerada pelo diagnóstico.")}</span>
        </li>
        <li>
          <strong>Próximo passo</strong>
          <span>${escapeHtml(stepTitle)}</span>
        </li>
        <li>
          <strong>Progresso inicial</strong>
          <span>${escapeHtml(progress)}</span>
        </li>
      </ul>
    `;
  }

  function renderAuthenticatedState(session, data) {
    const user = session?.user || {};
    const displayName = pickDisplayName(data.profile, user);
    const email = user.email || data.profile?.email || "Usuário autenticado";
    const studentName = displayName || "Aluno";
    const latestSession = data.diagnosticSessions[0] || null;
    const priorityAreas = data.areaSummary?.areas || [];
    const priorityArea = data.priorityArea || getPriorityArea(data.areaSummary || { areas: [] });
    const score = formatPercent(latestSession?.score_percent);
    const currentLevel = latestSession?.overall_level || latestSession?.identified_profile || "Sem diagnóstico";
    const progressStatus = latestSession
      ? (Number(latestSession.score_percent) >= 75 ? "Em avanço consistente" : "Plano de evolução ativo")
      : "Aguardando primeiro diagnóstico";
    const nextStep = buildNextStep({
      learningRecommendation: data.learningRecommendation,
      diagnosticRecommendation: data.diagnosticRecommendation,
      learningProgress: data.learningProgress,
      path: data.path,
      step: data.step,
      latestSession,
      priorityArea: data.priorityArea
    });
    const cards = buildCards(data).map((card) => `
      <article class="progress-metric-card progress-metric-card--${card.tone}">
        <span class="progress-metric-icon" aria-hidden="true">
          <i data-lucide="${card.icon}"></i>
        </span>
        <div>
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <p>${escapeHtml(card.note)}</p>
        </div>
      </article>
    `).join("");

    mount.innerHTML = `
      <div class="progress-dashboard">
        <section class="progress-hero-card">
          <div class="progress-hero-copy">
            <span class="section-kicker">Meu Progresso</span>
            <div class="progress-user-heading">
              ${renderUserAvatar(user, displayName, email)}
              <div>
                <h1>${escapeHtml(studentName)}</h1>
                <p class="progress-user-email">
                  <i data-lucide="mail" aria-hidden="true"></i>
                  <span>${escapeHtml(email)}</span>
                </p>
              </div>
            </div>
            <p class="progress-hero-text">${escapeHtml(data.diagnosticCount ? "Seu painel foi atualizado com seus dados reais de diagnóstico e trilha." : EMPTY_MESSAGE)}</p>
            <div class="progress-hero-summary" aria-label="Resumo do nível atual">
              <div>
                <span>Nível atual</span>
                <strong>${escapeHtml(currentLevel)}</strong>
              </div>
              <div>
                <span>Percentual geral</span>
                <strong>${escapeHtml(score || "0%")}</strong>
              </div>
              <div>
                <span>Prioridade</span>
                <strong>${escapeHtml(priorityArea ? getAreaDisplayName(priorityArea.area) : "A definir")}</strong>
              </div>
            </div>
          </div>
          <div class="progress-status-card" aria-label="Recomendação de próxima etapa">
            <span class="progress-status-eyebrow">
              <i data-lucide="sparkles" aria-hidden="true"></i>
              Próxima etapa
            </span>
            <strong>${escapeHtml(nextStep.title)}</strong>
            <p>${escapeHtml(nextStep.text)}</p>
            <small>${escapeHtml(progressStatus)}</small>
            <a class="progress-status-link" href="${escapeHtml(nextStep.href)}">${escapeHtml(nextStep.cta)}</a>
          </div>
        </section>

        <section class="progress-metric-grid" aria-label="Resumo do progresso">
          ${cards}
        </section>

        <section class="progress-detail-grid" aria-label="Detalhes do progresso">
          <article class="progress-detail-card">
            <span class="progress-panel-label">Histórico de diagnóstico</span>
            ${renderHistory(data.diagnosticSessions.slice(0, 5))}
          </article>
          <article class="progress-detail-card">
            <span class="progress-panel-label">Progresso por área</span>
            ${renderAreas(priorityAreas)}
          </article>
          <article class="progress-detail-card">
            <span class="progress-panel-label">Trilha recomendada</span>
            ${renderRecommendedPath(data)}
          </article>
        </section>
      </div>
    `;

    refreshIcons();
  }

  async function refreshProgressPage() {
    if (!globalScope.authService || typeof globalScope.authService.getCurrentSession !== "function") {
      renderLockedState();
      return;
    }

    const sessionResult = await globalScope.authService.getCurrentSession();
    if (!sessionResult || !sessionResult.ok || !sessionResult.session || !sessionResult.user) {
      renderLockedState();
      return;
    }

    renderLoading();

    try {
      const data = await fetchProgressData(sessionResult.user);
      renderAuthenticatedState(sessionResult.session, data);
    } catch (error) {
      console.warn("[Meu Progresso] Falha ao carregar dados.", error);
      renderErrorState(sessionResult.session);
    }
  }

  function openAuthFromProgress() {
    if (!globalScope.authModal || typeof globalScope.authModal.openAuthModal !== "function") {
      return;
    }

    globalScope.authModal.openAuthModal({
      onSuccess: async ({ session, user } = {}) => {
        await refreshProgressPage();
        globalScope.dispatchEvent(new CustomEvent("data-skill-map-auth-changed", {
          detail: { session: session || null, user: user || null }
        }));
      }
    });
  }

  globalScope.addEventListener("data-skill-map-auth-changed", (event) => {
    if (!event.detail?.session) {
      renderLockedState();
      return;
    }

    void refreshProgressPage();
  });

  renderLoading();
  void refreshProgressPage();
})(window);
