(function initPersonalizedLearningService(globalScope) {
  const TABLES = {
    diagnosticRecommendations: "diagnostic_recommendations",
    diagnosticAnswers: "diagnostic_answers",
    diagnosticSessions: "diagnostic_sessions",
    paths: "learning_paths",
    steps: "learning_path_steps",
    learningRecommendations: "learning_recommendations",
    learningProgress: "user_learning_progress",
    skillProgress: "user_skill_progress"
  };

  const FALLBACK_PATH_SLUG = "fundamentos-de-dados";
  const HIGH_SCORE_THRESHOLD = 75;
  const MIN_CONFIDENT_ANSWER_COUNT = 20;
  const RECENT_SESSION_WINDOW = 3;
  const AREA_ALIASES = [
    { area: "Indicadores", terms: ["indicadores", "kpi", "kpis"] },
    { area: "SQL", terms: ["sql"] },
    { area: "Estatística", terms: ["estatistica", "estatisticas", "estatística", "estatísticas"] },
    { area: "Lógica de dados", terms: ["logica de dados", "lógica de dados", "fundamentos", "fundamentos de dados"] },
    { area: "Excel", terms: ["excel", "bi"] }
  ];

  function normalizeList(value) {
    return Array.isArray(value) ? value : [];
  }

  function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function normalizeLevel(value) {
    return cleanText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function normalizeTextForMatch(value) {
    return cleanText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function normalizeArea(value) {
    const normalized = normalizeTextForMatch(value);
    if (!normalized) return "";

    const matched = AREA_ALIASES.find((item) => item.terms.some((term) => normalized.includes(normalizeTextForMatch(term))));
    return matched?.area || cleanText(value);
  }

  function unique(values) {
    return [...new Set(normalizeList(values).map(cleanText).filter(Boolean))];
  }

  function normalizeBoolean(value) {
    return value === true || value === "true";
  }

  function getPercent(correct, total) {
    return total ? Math.round((correct / total) * 100) : 0;
  }

  function getConfidenceScore(total) {
    const answerCount = Number(total);
    if (!Number.isFinite(answerCount) || answerCount <= 0) return 0;
    return Math.min(100, Math.round((answerCount / MIN_CONFIDENT_ANSWER_COUNT) * 100));
  }

  function getLevelFromPercent(percent) {
    const score = Number(percent);
    if (!Number.isFinite(score)) return null;
    if (score >= HIGH_SCORE_THRESHOLD) return "Avancado";
    if (score >= 45) return "Intermediario";
    return "Basico";
  }

  function buildAnswerSummaryByArea(answers) {
    return normalizeList(answers).reduce((summary, answer) => {
      const area = normalizeArea(answer?.area);
      if (!area) return summary;

      if (!summary[area]) {
        summary[area] = {
          area,
          correct: 0,
          total: 0,
          lastActivityAt: null
        };
      }

      summary[area].total += 1;
      if (normalizeBoolean(answer.is_correct)) {
        summary[area].correct += 1;
      }

      const answeredAt = cleanText(answer.answered_at);
      if (answeredAt && (!summary[area].lastActivityAt || answeredAt > summary[area].lastActivityAt)) {
        summary[area].lastActivityAt = answeredAt;
      }

      return summary;
    }, {});
  }

  function getClient() {
    return globalScope.authService && typeof globalScope.authService.getClient === "function"
      ? globalScope.authService.getClient()
      : null;
  }

  async function getCurrentUser() {
    if (!globalScope.authService || typeof globalScope.authService.getCurrentSession !== "function") {
      return null;
    }

    const sessionResult = await globalScope.authService.getCurrentSession();
    return sessionResult && sessionResult.ok && sessionResult.user ? sessionResult.user : null;
  }

  async function fetchOrThrow(query, label) {
    const { data, error } = await query;
    if (error) {
      throw new Error(`${label}: ${error.message || "falha na consulta"}`);
    }
    return data;
  }

  function getWeakAnswers(result) {
    const answers = normalizeList(result?.answers);
    const misses = answers.filter((answer) => answer && answer.correct === false);
    return misses.length ? misses : answers;
  }

  function getPriorityLevel(result) {
    return cleanText(result?.stoppedAtLevel || result?.priorityLevel || result?.level);
  }

  function getPriorityArea(result) {
    const sources = [
      result?.priorityArea,
      result?.studyRecommendation,
      result?.study_recommendation,
      result?.priorityText,
      result?.priority_text
    ];

    return sources.map(normalizeArea).find(Boolean) || "";
  }

  function collectDiagnosticSignals(result, diagnosticRecommendations) {
    const weakAnswers = getWeakAnswers(result);
    const recommendationRows = normalizeList(diagnosticRecommendations);

    return {
      recommendationKeys: unique([
        ...weakAnswers.map((answer) => answer.recommendationKey || answer.recommendation_key),
        ...recommendationRows.map((row) => row.recommendation_key)
      ]),
      skillCodes: unique([
        ...weakAnswers.map((answer) => answer.skillCode || answer.skill_code),
        ...recommendationRows.map((row) => row.skill_code)
      ]),
      weakAreas: unique([
        getPriorityArea(result),
        ...weakAnswers.map((answer) => answer.area),
        ...recommendationRows.map((row) => row.area)
      ]),
      weakLevels: unique([
        getPriorityLevel(result),
        ...weakAnswers.map((answer) => answer.level),
        ...recommendationRows.map((row) => row.level)
      ])
    };
  }

  async function fetchDiagnosticRecommendations(client, result) {
    const weakAnswers = getWeakAnswers(result);
    const recommendationKeys = unique(weakAnswers.map((answer) => answer.recommendationKey || answer.recommendation_key));
    const skillCodes = unique(weakAnswers.map((answer) => answer.skillCode || answer.skill_code));
    const priorityArea = getPriorityArea(result);
    const priorityLevel = getPriorityLevel(result);
    const selectColumns = "recommendation_key,skill_code,area,level,concept,recommendation_type,severity,title,study_guidance,next_step,priority";

    if (recommendationKeys.length) {
      return fetchOrThrow(
        client
          .from(TABLES.diagnosticRecommendations)
          .select(selectColumns)
          .eq("is_active", true)
          .in("recommendation_key", recommendationKeys)
          .order("priority", { ascending: true }),
        TABLES.diagnosticRecommendations
      );
    }

    if (skillCodes.length) {
      return fetchOrThrow(
        client
          .from(TABLES.diagnosticRecommendations)
          .select(selectColumns)
          .eq("is_active", true)
          .in("skill_code", skillCodes)
          .order("priority", { ascending: true }),
        TABLES.diagnosticRecommendations
      );
    }

    if (!priorityArea) {
      return [];
    }

    let query = client
      .from(TABLES.diagnosticRecommendations)
      .select(selectColumns)
      .eq("is_active", true)
      .eq("area", priorityArea);

    if (priorityLevel) {
      query = query.eq("level", priorityLevel);
    }

    const rows = normalizeList(await fetchOrThrow(
      query.order("priority", { ascending: true }).limit(5),
      TABLES.diagnosticRecommendations
    ));

    if (rows.length || !priorityLevel) {
      return rows;
    }

    return fetchOrThrow(
      client
        .from(TABLES.diagnosticRecommendations)
        .select(selectColumns)
        .eq("is_active", true)
        .eq("area", priorityArea)
        .order("priority", { ascending: true })
        .limit(5),
      TABLES.diagnosticRecommendations
    );
  }

  function getMetadataList(path, key) {
    return unique(path?.metadata?.[key]);
  }

  function pathMatchesArea(path, area) {
    const priorityArea = normalizeArea(area);
    if (!priorityArea || !path) return false;

    const pathArea = normalizeArea(path.skill_area);
    const relatedAreas = getMetadataList(path, "related_areas").map(normalizeArea);
    return pathArea === priorityArea || relatedAreas.includes(priorityArea);
  }

  function isBasicLevel(value) {
    return normalizeLevel(value) === "basico";
  }

  function isIntermediateLevel(value) {
    return normalizeLevel(value) === "intermediario";
  }

  function isBeginnerResult(result) {
    const scorePercent = Number(result?.scorePercent ?? result?.score_percent);
    return normalizeLevel(getPriorityLevel(result)) === "basico"
      || normalizeTextForMatch(result?.overallLevel || result?.overall_level).includes("iniciante")
      || (Number.isFinite(scorePercent) && scorePercent < HIGH_SCORE_THRESHOLD);
  }

  function isLevelCompatible(path, result) {
    const priorityLevel = normalizeLevel(getPriorityLevel(result));
    const beginner = isBeginnerResult(result);

    if (beginner && isIntermediateLevel(path?.level)) {
      return false;
    }

    if (priorityLevel === "basico" && isIntermediateLevel(path?.level)) {
      return false;
    }

    return true;
  }

  function scorePath(path, signals, result) {
    const pathRecommendationKeys = getMetadataList(path, "related_recommendation_keys");
    const pathSkillCodes = getMetadataList(path, "related_skill_codes");
    const recommendationMatches = signals.recommendationKeys.filter((key) => pathRecommendationKeys.includes(key)).length;
    const skillMatches = signals.skillCodes.filter((key) => pathSkillCodes.includes(key)).length;
    const totalMatches = recommendationMatches + skillMatches;
    const priorityArea = getPriorityArea(result);
    const priorityAreaMatch = pathMatchesArea(path, priorityArea);
    const levelCompatible = isLevelCompatible(path, result);
    const isIntegrationTrack = Boolean(path?.metadata?.integration_track);
    const scorePercent = Number(result?.scorePercent ?? result?.score_percent);
    const intermediateSignals = signals.weakLevels.filter((level) => isIntermediateLevel(level)).length;
    const canUseIntegration = isIntegrationTrack
      ? scorePercent >= HIGH_SCORE_THRESHOLD || intermediateSignals >= 2 || totalMatches >= 2
      : true;

    if (isIntegrationTrack && !canUseIntegration) {
      return null;
    }

    return {
      path,
      recommendationMatches,
      skillMatches,
      totalMatches,
      priorityAreaMatch,
      levelCompatible,
      isIntegrationTrack
    };
  }

  function compareCandidates(a, b, result) {
    if (a.priorityAreaMatch !== b.priorityAreaMatch) {
      return a.priorityAreaMatch ? -1 : 1;
    }

    if (b.recommendationMatches !== a.recommendationMatches) {
      return b.recommendationMatches - a.recommendationMatches;
    }
    if (b.totalMatches !== a.totalMatches) {
      return b.totalMatches - a.totalMatches;
    }

    if (a.levelCompatible !== b.levelCompatible) {
      return a.levelCompatible ? -1 : 1;
    }

    const aOrder = Number.isFinite(Number(a.path.display_order)) ? Number(a.path.display_order) : 9999;
    const bOrder = Number.isFinite(Number(b.path.display_order)) ? Number(b.path.display_order) : 9999;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    const scorePercent = Number(result?.scorePercent ?? result?.score_percent);
    if (scorePercent < HIGH_SCORE_THRESHOLD) {
      const aBasic = isBasicLevel(a.path.level);
      const bBasic = isBasicLevel(b.path.level);
      if (aBasic !== bBasic) {
        return aBasic ? -1 : 1;
      }
    }

    return cleanText(a.path.title).localeCompare(cleanText(b.path.title), "pt-BR");
  }

  function chooseRecommendedPath(paths, signals, result) {
    const priorityArea = getPriorityArea(result);
    const candidates = normalizeList(paths)
      .map((path) => scorePath(path, signals, result))
      .filter(Boolean)
      .filter((candidate) => {
        if (priorityArea) {
          return candidate.priorityAreaMatch && candidate.levelCompatible;
        }
        return candidate.totalMatches > 0 && candidate.levelCompatible;
      })
      .sort((a, b) => compareCandidates(a, b, result));

    if (candidates.length) {
      return {
        path: candidates[0].path,
        fallback: false,
        reason: candidates[0].priorityAreaMatch
          ? "match_by_final_priority_area"
          : candidates[0].recommendationMatches
            ? "match_by_recommendation_key"
            : "match_by_skill_code"
      };
    }

    const matchedByPriorityArea = priorityArea
      ? normalizeList(paths)
        .map((path) => scorePath(path, signals, result))
        .filter(Boolean)
        .filter((candidate) => candidate.priorityAreaMatch)
        .sort((a, b) => compareCandidates(a, b, result))[0]
      : null;

    if (matchedByPriorityArea?.path) {
      return {
        path: matchedByPriorityArea.path,
        fallback: false,
        reason: "match_by_final_priority_area_level_fallback"
      };
    }

    const matchedBySignals = normalizeList(paths)
      .map((path) => scorePath(path, signals, result))
      .filter(Boolean)
      .filter((candidate) => candidate.totalMatches > 0)
      .sort((a, b) => compareCandidates(a, b, result))[0];

    if (matchedBySignals?.path) {
      return {
        path: matchedBySignals.path,
        fallback: false,
        reason: matchedBySignals.recommendationMatches ? "match_by_recommendation_key" : "match_by_skill_code"
      };
    }

    return {
      path: normalizeList(paths).find((path) => path.slug === FALLBACK_PATH_SLUG) || normalizeList(paths)[0] || null,
      fallback: true,
      reason: "fallback_fundamentos_de_dados"
    };
  }

  function findRecommendationForPath(path, diagnosticRecommendations) {
    if (!path) return null;

    const pathRecommendationKeys = getMetadataList(path, "related_recommendation_keys");
    const pathSkillCodes = getMetadataList(path, "related_skill_codes");
    const pathArea = normalizeArea(path.skill_area);
    const rows = normalizeList(diagnosticRecommendations);

    return rows.find((row) => pathRecommendationKeys.includes(row.recommendation_key))
      || rows.find((row) => pathSkillCodes.includes(row.skill_code))
      || rows.find((row) => normalizeArea(row.area) === pathArea)
      || null;
  }

  async function fetchActivePaths(client) {
    return fetchOrThrow(
      client
        .from(TABLES.paths)
        .select("id,slug,title,description,skill_area,level,estimated_minutes,status,display_order,metadata")
        .eq("status", "active")
        .order("display_order", { ascending: true })
        .order("title", { ascending: true }),
      TABLES.paths
    );
  }

  async function fetchFirstStep(client, pathId) {
    if (!pathId) return null;
    const rows = await fetchOrThrow(
      client
        .from(TABLES.steps)
        .select("id,path_id,title,description,skill_area,content_type,content_url,display_order,status")
        .eq("path_id", pathId)
        .eq("status", "active")
        .order("display_order", { ascending: true })
        .order("title", { ascending: true })
        .limit(1),
      TABLES.steps
    );
    return normalizeList(rows)[0] || null;
  }

  async function upsertInitialLearningProgress(client, userId, path, step, result, recommendationMeta) {
    if (!userId || !path?.id || !step?.id) {
      return { ok: false, skipped: true, reason: "missing_path_or_step" };
    }

    const now = new Date().toISOString();
    const sourceAttemptId = result?.attemptId || result?.attempt_id || null;
    const existingRows = sourceAttemptId
      ? await fetchOrThrow(
        client
          .from(TABLES.learningProgress)
          .select("id,status,progress_percent,started_at,metadata")
          .eq("user_id", userId)
          .eq("source_attempt_id", sourceAttemptId)
          .limit(1),
        TABLES.learningProgress
      )
      : [];
    const existingByPathRows = existingRows.length ? existingRows : await fetchOrThrow(
      client
        .from(TABLES.learningProgress)
        .select("id,status,progress_percent,started_at,metadata")
        .eq("user_id", userId)
        .eq("path_id", path.id)
        .eq("step_id", step.id)
        .limit(1),
      TABLES.learningProgress
    );
    const existing = normalizeList(existingByPathRows)[0] || null;
    const payload = {
      user_id: userId,
      path_id: path.id,
      step_id: step.id,
      status: existing?.status === "completed" ? "completed" : "in_progress",
      progress_percent: existing?.status === "completed" ? existing.progress_percent : 0,
      started_at: existing?.started_at || now,
      last_activity_at: now,
      source_attempt_id: sourceAttemptId,
      metadata: {
        ...(existing?.metadata || {}),
        source: "diagnostic_personalized_learning_bridge",
        recommended_path_id: path.id,
        recommended_path_slug: path.slug,
        recommended_step_id: step.id,
        mapping_reason: recommendationMeta.reason,
        mapping_fallback: recommendationMeta.fallback,
        recommendation_keys: recommendationMeta.recommendationKeys,
        skill_codes: recommendationMeta.skillCodes
      },
      updated_at: now
    };

    if (existing?.id) {
      const updated = await fetchOrThrow(
        client
          .from(TABLES.learningProgress)
          .update(payload)
          .eq("id", existing.id)
          .select("id,path_id,step_id,status,progress_percent")
          .maybeSingle(),
        TABLES.learningProgress
      );
      return { ok: true, action: "updated", data: updated || null };
    }

    const inserted = await fetchOrThrow(
      client
        .from(TABLES.learningProgress)
        .insert(payload)
        .select("id,path_id,step_id,status,progress_percent")
        .maybeSingle(),
      TABLES.learningProgress
    );
    return { ok: true, action: "inserted", data: inserted || null };
  }

  async function upsertLearningRecommendation(client, userId, path, step, diagnosticRecommendation, result, recommendationMeta) {
    if (!userId || !path?.id) {
      return { ok: false, skipped: true, reason: "missing_path" };
    }

    const now = new Date().toISOString();
    const sourceAttemptId = result?.attemptId || result?.attempt_id || null;
    const existingRows = sourceAttemptId
      ? await fetchOrThrow(
        client
          .from(TABLES.learningRecommendations)
          .select("id,metadata")
          .eq("user_id", userId)
          .eq("recommendation_type", "path")
          .eq("source_attempt_id", sourceAttemptId)
          .limit(1),
        TABLES.learningRecommendations
      )
      : [];
    const existing = normalizeList(existingRows)[0] || null;
    const payload = {
      user_id: userId,
      skill_area: path.skill_area || diagnosticRecommendation?.area || getPriorityArea(result) || "Dados",
      recommendation_type: "path",
      priority: 1,
      title: path.title ? `Trilha recomendada: ${path.title}` : "Trilha recomendada",
      description: step?.title ? `Comece por: ${step.title}.` : path.description,
      reason: diagnosticRecommendation?.study_guidance || diagnosticRecommendation?.next_step || result?.priorityText || result?.studyRecommendation || path.description || "Gerado a partir do diagnostico concluido.",
      source_attempt_id: sourceAttemptId,
      status: "active",
      metadata: {
        ...(existing?.metadata || {}),
        source: "diagnostic_personalized_learning_bridge",
        recommended_path_id: path.id,
        recommended_path_slug: path.slug,
        recommended_step_id: step?.id || null,
        mapping_reason: recommendationMeta.reason,
        mapping_fallback: recommendationMeta.fallback,
        recommendation_keys: recommendationMeta.recommendationKeys,
        skill_codes: recommendationMeta.skillCodes
      },
      updated_at: now
    };

    if (existing?.id) {
      const updated = await fetchOrThrow(
        client
          .from(TABLES.learningRecommendations)
          .update(payload)
          .eq("id", existing.id)
          .select("id,recommendation_type,status")
          .maybeSingle(),
        TABLES.learningRecommendations
      );
      return { ok: true, action: "updated", data: updated || null };
    }

    const inserted = await fetchOrThrow(
      client
        .from(TABLES.learningRecommendations)
        .insert(payload)
        .select("id,recommendation_type,status")
        .maybeSingle(),
      TABLES.learningRecommendations
    );
    return { ok: true, action: "inserted", data: inserted || null };
  }

  async function upsertSkillProgress(client, userId, result) {
    const sourceAttemptId = result?.attemptId || result?.attempt_id || null;
    const now = new Date().toISOString();

    if (!userId) {
      return { ok: false, skipped: true, reason: "missing_user" };
    }

    const sessions = normalizeList(await fetchOrThrow(
      client
        .from(TABLES.diagnosticSessions)
        .select("attempt_id,finished_at,created_at,overall_level")
        .eq("user_id", userId)
        .order("finished_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(RECENT_SESSION_WINDOW),
      TABLES.diagnosticSessions
    ));
    const recentAttemptIds = unique([
      sourceAttemptId,
      ...sessions.map((session) => session.attempt_id)
    ]);

    const historicalAnswers = normalizeList(await fetchOrThrow(
      client
        .from(TABLES.diagnosticAnswers)
        .select("attempt_id,area,is_correct,answered_at")
        .eq("user_id", userId)
        .order("answered_at", { ascending: false }),
      TABLES.diagnosticAnswers
    ));

    if (!historicalAnswers.length) {
      return { ok: false, skipped: true, reason: "missing_historical_answers" };
    }

    const historicalByArea = buildAnswerSummaryByArea(historicalAnswers);
    const recentByArea = buildAnswerSummaryByArea(
      recentAttemptIds.length
        ? historicalAnswers.filter((answer) => recentAttemptIds.includes(answer.attempt_id))
        : []
    );
    const latestSession = sessions[0] || null;

    const payloads = Object.values(historicalByArea)
      .filter((area) => area.total > 0)
      .map((area) => {
        const historicalScore = getPercent(area.correct, area.total);
        const recentArea = recentByArea[area.area] || { correct: 0, total: 0 };
        const recentScore = recentArea.total ? getPercent(recentArea.correct, recentArea.total) : null;
        const confidenceScore = getConfidenceScore(area.total);
        const status = historicalScore >= HIGH_SCORE_THRESHOLD && confidenceScore >= 50
          ? "active"
          : "needs_review";

        return {
          user_id: userId,
          skill_area: area.area,
          current_level: getLevelFromPercent(historicalScore) || latestSession?.overall_level || result?.overallLevel || result?.overall_level || null,
          score_percent: historicalScore,
          confidence_score: confidenceScore,
          questions_answered: area.total,
          questions_correct: area.correct,
          last_session_attempt_id: sourceAttemptId,
          last_activity_at: area.lastActivityAt || latestSession?.finished_at || latestSession?.created_at || now,
          status,
          metadata: {
            source: "diagnostic_answers",
            calculation: "historical_consolidated_by_area",
            recent_window_sessions: RECENT_SESSION_WINDOW,
            recent_attempt_ids: recentAttemptIds,
            recent_score_percent: recentScore,
            historical_score_percent: historicalScore,
            delta_recent_vs_historical: recentScore === null ? null : recentScore - historicalScore,
            recent_questions_answered: recentArea.total,
            historical_questions_answered: area.total,
            historical_questions_correct: area.correct,
            last_attempt_id: sourceAttemptId,
            latest_session_attempt_id: latestSession?.attempt_id || null,
            latest_overall_level: latestSession?.overall_level || result?.overallLevel || result?.overall_level || null,
            updated_from: "generateFromDiagnosticResult",
            calculated_at: now
          },
          updated_at: now
        };
      });

    if (!payloads.length) {
      return { ok: false, skipped: true, reason: "missing_area_answers" };
    }

    const rows = await fetchOrThrow(
      client
        .from(TABLES.skillProgress)
        .upsert(payloads, { onConflict: "user_id,skill_area" })
        .select("id,skill_area,status"),
      TABLES.skillProgress
    );

    return { ok: true, action: "upserted", data: normalizeList(rows) };
  }

  async function generateFromDiagnosticResult(result) {
    const client = getClient();
    const user = await getCurrentUser();

    if (!client || !user?.id) {
      return { ok: false, skipped: true, reason: "user_not_authenticated" };
    }

    try {
      const diagnosticRecommendations = normalizeList(await fetchDiagnosticRecommendations(client, result));
      const signals = collectDiagnosticSignals(result, diagnosticRecommendations);
      const paths = normalizeList(await fetchActivePaths(client));
      const selected = chooseRecommendedPath(paths, signals, result);
      const path = selected.path;
      const step = await fetchFirstStep(client, path?.id);
      const pathDiagnosticRecommendation = findRecommendationForPath(path, diagnosticRecommendations);
      const recommendationMeta = {
        reason: selected.reason,
        fallback: selected.fallback,
        recommendationKeys: signals.recommendationKeys,
        skillCodes: signals.skillCodes
      };
      const writes = {};

      try {
        writes.userLearningProgress = await upsertInitialLearningProgress(client, user.id, path, step, result, recommendationMeta);
      } catch (error) {
        console.warn("[Aprendizado] Falha ao gravar user_learning_progress respeitando RLS.", error);
        writes.userLearningProgress = { ok: false, error };
      }

      try {
        writes.learningRecommendations = await upsertLearningRecommendation(client, user.id, path, step, pathDiagnosticRecommendation, result, recommendationMeta);
      } catch (error) {
        console.warn("[Aprendizado] Falha ao gravar learning_recommendations respeitando RLS.", error);
        writes.learningRecommendations = { ok: false, error };
      }

      try {
        writes.userSkillProgress = await upsertSkillProgress(client, user.id, result);
      } catch (error) {
        console.warn("[Aprendizado] Falha ao gravar user_skill_progress respeitando RLS.", error);
        writes.userSkillProgress = { ok: false, error };
      }

      return {
        ok: true,
        user,
        path,
        step,
        diagnosticRecommendations,
        signals,
        fallback: selected.fallback,
        reason: selected.reason,
        writes
      };
    } catch (error) {
      console.warn("[Aprendizado] Nao foi possivel gerar trilha personalizada.", error);
      return { ok: false, error };
    }
  }

  globalScope.personalizedLearningService = {
    generateFromDiagnosticResult,
    chooseRecommendedPath,
    collectDiagnosticSignals
  };
})(window);
