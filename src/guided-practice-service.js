(function initGuidedPracticeService(globalScope) {
  const TABLES = {
    publicActivities: "vw_guided_practice_activities_public",
    attempts: "user_guided_practice_attempts",
    paths: "learning_paths",
    steps: "learning_path_steps",
    progress: "user_learning_progress"
  };

  const DEFAULT_SLUG = "indicadores-meta-resultado";
  const LOCAL_ACTIVITY = Object.freeze({
    id: null,
    slug: DEFAULT_SLUG,
    activityType: "practice",
    title: "Meta e resultado",
    subtitle: "Prática guiada de leitura de KPI",
    trackSlug: "indicadores-e-kpis",
    trackTitle: "Indicadores e KPIs",
    stepKey: "indicadores-01-meta-resultado",
    level: "Básico",
    estimatedMinutes: 10,
    objective: "Treinar a diferença entre resultado observado, meta esperada e interpretação do desvio.",
    contentVersion: 1,
    scenario: {
      title: "Satisfação abaixo da meta",
      context: "Uma equipe acompanha a taxa de satisfação dos atendimentos. A meta do mês é 85%, mas o resultado atual ficou em 78%."
    },
    indicatorData: [
      { label: "Meta", value: "85%" },
      { label: "Resultado atual", value: "78%" },
      { label: "Desvio", value: "-7 p.p." },
      { label: "Volume analisado", value: "420 atendimentos" }
    ],
    question: "Qual é a melhor leitura desse indicador?",
    options: [
      { id: "A", text: "O resultado está bom, porque 78% representa a maioria dos atendimentos." },
      { id: "B", text: "O resultado está abaixo da meta em 7 pontos percentuais e precisa de investigação sobre causas do desvio." },
      { id: "C", text: "O indicador não pode ser analisado porque não temos o nome dos clientes." },
      { id: "D", text: "A meta deve ser ignorada, pois o resultado isolado já mostra desempenho suficiente." }
    ],
    correctOption: "B",
    feedback: "A melhor leitura compara resultado com meta e transforma a diferença em uma interpretação acionável. Como 78% está 7 p.p. abaixo da meta de 85%, a análise deve investigar causas do desvio, como prazo, qualidade da solução, comunicação ou perfil dos atendimentos.",
    attention: "Não avalie um KPI apenas pelo número isolado. Um indicador precisa de contexto, meta e leitura de impacto.",
    conclusion: "Você praticou como transformar um percentual em diagnóstico de negócio: resultado, meta, desvio e próxima investigação."
  });

  function getClient() {
    return globalScope.authService?.getClient?.() || null;
  }

  async function getAuthenticatedUser() {
    const client = getClient();
    if (!client) return null;

    try {
      const { data, error } = await client.auth.getSession();
      return error ? null : data?.session?.user || null;
    } catch (error) {
      return null;
    }
  }

  function normalizeActivity(row) {
    const metadata = row?.metadata || {};
    return {
      ...LOCAL_ACTIVITY,
      id: row?.id || null,
      slug: row?.slug || LOCAL_ACTIVITY.slug,
      activityType: row?.activity_type || LOCAL_ACTIVITY.activityType,
      title: row?.title || LOCAL_ACTIVITY.title,
      subtitle: row?.subtitle || LOCAL_ACTIVITY.subtitle,
      trackSlug: row?.track_slug || LOCAL_ACTIVITY.trackSlug,
      trackTitle: row?.track_title || LOCAL_ACTIVITY.trackTitle,
      level: row?.level_label || LOCAL_ACTIVITY.level,
      estimatedMinutes: row?.estimated_minutes || LOCAL_ACTIVITY.estimatedMinutes,
      stepKey: metadata.step_key || LOCAL_ACTIVITY.stepKey,
      objective: metadata.objective || LOCAL_ACTIVITY.objective,
      contentVersion: metadata.content_version || LOCAL_ACTIVITY.contentVersion,
      scenario: metadata.scenario || LOCAL_ACTIVITY.scenario,
      indicatorData: Array.isArray(metadata.indicator_data) ? metadata.indicator_data : LOCAL_ACTIVITY.indicatorData,
      question: metadata.question || LOCAL_ACTIVITY.question,
      options: Array.isArray(metadata.options) ? metadata.options : LOCAL_ACTIVITY.options,
      correctOption: metadata.correct_option || LOCAL_ACTIVITY.correctOption,
      feedback: metadata.feedback || LOCAL_ACTIVITY.feedback,
      attention: metadata.attention || LOCAL_ACTIVITY.attention,
      conclusion: metadata.conclusion || LOCAL_ACTIVITY.conclusion
    };
  }

  function isMissingGuidedPracticeStructure(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "").toLowerCase();
    return ["42P01", "PGRST200", "PGRST205"].includes(code)
      || message.includes("vw_guided_practice_activities_public")
      || message.includes("user_guided_practice_attempts");
  }

  async function loadActivity(slug = DEFAULT_SLUG) {
    const localActivity = slug === DEFAULT_SLUG ? LOCAL_ACTIVITY : null;
    const client = getClient();
    if (!client) {
      return localActivity
        ? { ok: true, activity: localActivity, source: "local" }
        : { ok: false, notFound: true };
    }

    try {
      const { data, error } = await client
        .from(TABLES.publicActivities)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        if (localActivity && isMissingGuidedPracticeStructure(error)) {
          console.info("[Prática guiada] Catálogo remoto ainda não aplicado; usando conteúdo local validado.");
          return { ok: true, activity: localActivity, source: "local", migrationPending: true };
        }
        return { ok: false, error };
      }

      if (!data) {
        return localActivity
          ? { ok: true, activity: localActivity, source: "local", catalogPending: true }
          : { ok: false, notFound: true };
      }

      return { ok: true, activity: normalizeActivity(data), source: "supabase" };
    } catch (error) {
      if (localActivity) {
        console.info("[Prática guiada] Catálogo remoto indisponível; usando conteúdo local validado.");
        return { ok: true, activity: localActivity, source: "local", error };
      }
      return { ok: false, error };
    }
  }

  function validateAnswer(activity, selectedOption) {
    const selected = String(selectedOption || "").toUpperCase();
    const correct = String(activity?.correctOption || "").toUpperCase();
    return {
      isCorrect: Boolean(selected && correct && selected === correct),
      selectedOption: selected,
      correctOption: correct,
      scorePercent: selected === correct ? 100 : 0
    };
  }

  async function saveAttempt(activity, validation, startedAt) {
    const client = getClient();
    const user = await getAuthenticatedUser();
    if (!client || !user) {
      return { ok: false, skipped: true, authenticated: false };
    }
    if (!activity?.id) {
      return { ok: false, skipped: true, authenticated: true, migrationPending: true };
    }

    const completedAt = new Date().toISOString();
    const payload = {
      user_id: user.id,
      activity_id: activity.id,
      attempt_payload: {
        activity_slug: activity.slug,
        content_version: activity.contentVersion,
        response_schema: "single_choice"
      },
      answer_payload: {
        selected_option: validation.selectedOption
      },
      result_payload: {
        correct_option: validation.correctOption,
        is_correct: validation.isCorrect
      },
      score_percent: validation.scorePercent,
      status: validation.isCorrect ? "completed" : "submitted",
      started_at: startedAt,
      completed_at: completedAt
    };

    try {
      const { error } = await client.from(TABLES.attempts).insert(payload);
      if (!error) return { ok: true, authenticated: true };
      if (isMissingGuidedPracticeStructure(error)) {
        console.info("[Prática guiada] Migration de tentativas ainda não aplicada; progresso seguirá pelo consolidado existente.");
        return { ok: false, authenticated: true, migrationPending: true, error };
      }
      return { ok: false, authenticated: true, error };
    } catch (error) {
      return { ok: false, authenticated: true, error };
    }
  }

  async function saveLearningProgress(activity) {
    const client = getClient();
    const user = await getAuthenticatedUser();
    if (!client || !user) {
      return { ok: false, skipped: true, authenticated: false };
    }

    try {
      const { data: path, error: pathError } = await client
        .from(TABLES.paths)
        .select("id,slug,title")
        .eq("slug", activity.trackSlug)
        .eq("status", "active")
        .maybeSingle();
      if (pathError || !path?.id) return { ok: false, authenticated: true, error: pathError, reason: "path_not_found" };

      const { data: steps, error: stepsError } = await client
        .from(TABLES.steps)
        .select("id,path_id,step_key,display_order,status,metadata")
        .eq("path_id", path.id)
        .eq("status", "active")
        .order("display_order", { ascending: true });
      if (stepsError) return { ok: false, authenticated: true, error: stepsError };

      const activeSteps = Array.isArray(steps) ? steps : [];
      const completedStep = activeSteps.find((step) => step.step_key === activity.stepKey);
      if (!completedStep) return { ok: false, authenticated: true, reason: "step_not_found" };

      const { data: progressRows, error: progressError } = await client
        .from(TABLES.progress)
        .select("id,step_id,status,progress_percent,started_at,completed_at,metadata")
        .eq("user_id", user.id)
        .eq("path_id", path.id);
      if (progressError) return { ok: false, authenticated: true, error: progressError };

      const rows = Array.isArray(progressRows) ? progressRows : [];
      const byStepId = new Map(rows.map((row) => [row.step_id, row]));
      const activeStepIds = new Set(activeSteps.map((step) => step.id));
      const completedIds = new Set(rows
        .filter((row) => row.status === "completed" && activeStepIds.has(row.step_id))
        .map((row) => row.step_id));
      completedIds.add(completedStep.id);

      const now = new Date().toISOString();
      const progressPercent = activeSteps.length
        ? Math.round((completedIds.size / activeSteps.length) * 10000) / 100
        : 100;
      const current = byStepId.get(completedStep.id);
      const currentPayload = {
        user_id: user.id,
        path_id: path.id,
        step_id: completedStep.id,
        status: "completed",
        progress_percent: progressPercent,
        started_at: current?.started_at || now,
        completed_at: current?.completed_at || now,
        last_activity_at: now,
        metadata: {
          ...(current?.metadata || {}),
          source: "guided_practice_completion",
          activity_slug: activity.slug,
          content_version: activity.contentVersion,
          completed_step_key: completedStep.step_key
        },
        updated_at: now
      };

      if (current?.id) {
        const { error } = await client.from(TABLES.progress).update(currentPayload).eq("id", current.id);
        if (error) return { ok: false, authenticated: true, error };
      } else {
        const { error } = await client.from(TABLES.progress).insert(currentPayload);
        if (error) return { ok: false, authenticated: true, error };
      }

      const nextStep = activeSteps.find((step) => !completedIds.has(step.id)) || null;
      if (nextStep) {
        const nextCurrent = byStepId.get(nextStep.id);
        const nextPayload = {
          user_id: user.id,
          path_id: path.id,
          step_id: nextStep.id,
          status: nextCurrent?.status === "completed" ? "completed" : "in_progress",
          progress_percent: progressPercent,
          started_at: nextCurrent?.started_at || now,
          last_activity_at: now,
          metadata: {
            ...(nextCurrent?.metadata || {}),
            source: "guided_practice_completion",
            previous_activity_slug: activity.slug
          },
          updated_at: now
        };
        if (nextCurrent?.id) {
          const { error } = await client.from(TABLES.progress).update(nextPayload).eq("id", nextCurrent.id);
          if (error) return { ok: false, authenticated: true, error };
        } else {
          const { error } = await client.from(TABLES.progress).insert(nextPayload);
          if (error) return { ok: false, authenticated: true, error };
        }
      }

      return { ok: true, authenticated: true, progressPercent, completedStep, nextStep };
    } catch (error) {
      return { ok: false, authenticated: true, error };
    }
  }

  async function saveResponse(activity, selectedOption, startedAt) {
    const validation = validateAnswer(activity, selectedOption);
    const attempt = await saveAttempt(activity, validation, startedAt);
    const progress = validation.isCorrect
      ? await saveLearningProgress(activity)
      : { ok: false, skipped: true, authenticated: attempt.authenticated };
    return { validation, attempt, progress };
  }

  globalScope.guidedPracticeService = Object.freeze({
    DEFAULT_SLUG,
    LOCAL_ACTIVITY,
    loadActivity,
    validateAnswer,
    getAuthenticatedUser,
    saveResponse
  });
})(window);
