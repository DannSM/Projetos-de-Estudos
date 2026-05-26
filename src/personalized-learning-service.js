(function initPersonalizedLearningService(globalScope) {
  const TABLES = {
    diagnosticRecommendations: "diagnostic_recommendations",
    paths: "learning_paths",
    steps: "learning_path_steps",
    learningRecommendations: "learning_recommendations",
    learningProgress: "user_learning_progress",
    skillProgress: "user_skill_progress"
  };

  const FALLBACK_PATH_SLUG = "fundamentos-de-dados";
  const HIGH_SCORE_THRESHOLD = 75;

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

  function unique(values) {
    return [...new Set(normalizeList(values).map(cleanText).filter(Boolean))];
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
        result?.priorityArea,
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
    const priorityArea = cleanText(result?.priorityArea);
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

  function isBasicLevel(value) {
    return normalizeLevel(value) === "basico";
  }

  function isIntermediateLevel(value) {
    return normalizeLevel(value) === "intermediario";
  }

  function scorePath(path, signals, result) {
    const pathRecommendationKeys = getMetadataList(path, "related_recommendation_keys");
    const pathSkillCodes = getMetadataList(path, "related_skill_codes");
    const recommendationMatches = signals.recommendationKeys.filter((key) => pathRecommendationKeys.includes(key)).length;
    const skillMatches = signals.skillCodes.filter((key) => pathSkillCodes.includes(key)).length;
    const totalMatches = recommendationMatches + skillMatches;
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
      isIntegrationTrack
    };
  }

  function compareCandidates(a, b, result) {
    if (b.recommendationMatches !== a.recommendationMatches) {
      return b.recommendationMatches - a.recommendationMatches;
    }
    if (b.totalMatches !== a.totalMatches) {
      return b.totalMatches - a.totalMatches;
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
    const candidates = normalizeList(paths)
      .map((path) => scorePath(path, signals, result))
      .filter(Boolean)
      .filter((candidate) => candidate.totalMatches > 0)
      .sort((a, b) => compareCandidates(a, b, result));

    if (candidates.length) {
      return {
        path: candidates[0].path,
        fallback: false,
        reason: candidates[0].recommendationMatches ? "match_by_recommendation_key" : "match_by_skill_code"
      };
    }

    return {
      path: normalizeList(paths).find((path) => path.slug === FALLBACK_PATH_SLUG) || normalizeList(paths)[0] || null,
      fallback: true,
      reason: "fallback_fundamentos_de_dados"
    };
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
    const existingRows = await fetchOrThrow(
      client
        .from(TABLES.learningProgress)
        .select("id,status,progress_percent,started_at,metadata")
        .eq("user_id", userId)
        .eq("path_id", path.id)
        .eq("step_id", step.id)
        .limit(1),
      TABLES.learningProgress
    );
    const existing = normalizeList(existingRows)[0] || null;
    const payload = {
      user_id: userId,
      path_id: path.id,
      step_id: step.id,
      status: existing?.status === "completed" ? "completed" : "in_progress",
      progress_percent: existing?.status === "completed" ? existing.progress_percent : 0,
      started_at: existing?.started_at || now,
      last_activity_at: now,
      source_attempt_id: result?.attemptId || result?.attempt_id || null,
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
      skill_area: path.skill_area || diagnosticRecommendation?.area || result?.priorityArea || "Dados",
      recommendation_type: "path",
      priority: 1,
      title: path.title ? `Trilha recomendada: ${path.title}` : "Trilha recomendada",
      description: step?.title ? `Comece por: ${step.title}.` : path.description,
      reason: diagnosticRecommendation?.study_guidance || diagnosticRecommendation?.next_step || result?.priorityText || "Gerado a partir do diagnostico concluido.",
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
    const areas = normalizeList(result?.areaScoreSnapshot || result?.area_score_snapshot)
      .filter((area) => cleanText(area?.area));
    const sourceAttemptId = result?.attemptId || result?.attempt_id || null;
    const now = new Date().toISOString();

    if (!userId || !areas.length) {
      return { ok: false, skipped: true, reason: "missing_area_snapshot" };
    }

    const payloads = areas.map((area) => ({
      user_id: userId,
      skill_area: area.area,
      current_level: result?.overallLevel || result?.overall_level || null,
      score_percent: Number.isFinite(Number(area.percent)) ? Number(area.percent) : null,
      confidence_score: Number.isFinite(Number(area.percent)) ? Number(area.percent) : null,
      questions_answered: Number.isFinite(Number(area.total)) ? Number(area.total) : 0,
      questions_correct: Number.isFinite(Number(area.correct)) ? Number(area.correct) : 0,
      last_session_attempt_id: sourceAttemptId,
      last_activity_at: now,
      status: Number(area.percent) >= HIGH_SCORE_THRESHOLD ? "active" : "needs_review",
      metadata: {
        source: "diagnostic_personalized_learning_bridge",
        source_attempt_id: sourceAttemptId
      },
      updated_at: now
    }));

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
      const recommendationMeta = {
        reason: selected.reason,
        fallback: selected.fallback,
        recommendationKeys: signals.recommendationKeys,
        skillCodes: signals.skillCodes
      };
      const primaryDiagnosticRecommendation = diagnosticRecommendations[0] || null;
      const writes = {};

      try {
        writes.userLearningProgress = await upsertInitialLearningProgress(client, user.id, path, step, result, recommendationMeta);
      } catch (error) {
        console.warn("[Aprendizado] Falha ao gravar user_learning_progress respeitando RLS.", error);
        writes.userLearningProgress = { ok: false, error };
      }

      try {
        writes.learningRecommendations = await upsertLearningRecommendation(client, user.id, path, step, primaryDiagnosticRecommendation, result, recommendationMeta);
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
