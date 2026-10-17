(function initGuidedPracticeService(globalScope) {
  const TABLES = {
    publicActivities: "vw_guided_practice_activities_public",
    attempts: "user_guided_practice_attempts",
    paths: "learning_paths",
    steps: "learning_path_steps",
    progress: "user_learning_progress"
  };

  const DEFAULT_SLUG = "indicadores-meta-resultado";
  const KPI_ACTIVITY = Object.freeze({
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
    responseSchema: "single_choice",
    completionProgressPercent: 25,
    scenario: {
      title: "Satisfação abaixo da meta",
      context: "Uma equipe acompanha a taxa de satisfação dos atendimentos. A meta do mês é 85%, mas o resultado atual ficou em 78%."
    },
    indicatorTitle: "Leia o resultado no contexto da meta",
    indicatorDescription: "Resultado, referência e volume devem ser observados juntos antes de recomendar uma ação.",
    indicatorData: [
      { label: "Meta", value: "85%" },
      { label: "Resultado atual", value: "78%" },
      { label: "Desvio", value: "-7 p.p.", tone: "alert" },
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
    thinkingSteps: [
      ["O que foi medido?", "Taxa de satisfação."],
      ["Qual era a referência?", "Meta de 85%."],
      ["O que fazer com o desvio?", "Investigar causas."]
    ],
    conclusion: "Você praticou como transformar um percentual em diagnóstico de negócio: resultado, meta, desvio e próxima investigação.",
    nextAction: {
      href: "pratica-guiada.html?atividade=indicadores-definicao-consistente",
      label: "Continuar para definição consistente",
      title: "Etapa 2 — Definição consistente",
      description: "Agora você vai padronizar numerador, denominador e população elegível."
    }
  });

  const LOCAL_ACTIVITIES = Object.freeze({
    [DEFAULT_SLUG]: KPI_ACTIVITY,
    ...(globalScope.KpiGuidedContent?.GUIDED_ACTIVITIES || {}),
    ...(globalScope.Project01Content?.GUIDED_ACTIVITIES || {})
  });
  const LOCAL_ACTIVITY = KPI_ACTIVITY;

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

  function normalizeCheckpoint(checkpoint, index) {
    return {
      id: checkpoint?.id || `decisao-${index + 1}`,
      title: checkpoint?.title || `Decisão ${index + 1}`,
      question: checkpoint?.question || "",
      options: Array.isArray(checkpoint?.options) ? checkpoint.options : [],
      correctOption: checkpoint?.correctOption || checkpoint?.correct_option || "",
      correctTitle: checkpoint?.correctTitle || checkpoint?.correct_title || "Leitura validada",
      incorrectTitle: checkpoint?.incorrectTitle || checkpoint?.incorrect_title || "Revise sua leitura",
      correctFeedback: checkpoint?.correctFeedback || checkpoint?.correct_feedback || checkpoint?.feedback || "",
      incorrectFeedback: checkpoint?.incorrectFeedback || checkpoint?.incorrect_feedback || checkpoint?.feedback || "",
      attention: checkpoint?.attention || "",
      required: checkpoint?.required !== false
    };
  }

  function normalizeThinkingSteps(value, fallback) {
    const source = Array.isArray(value) && value.length ? value : fallback;
    return (Array.isArray(source) ? source : []).map((item) => (
      Array.isArray(item)
        ? [item[0] || "", item[1] || ""]
        : [item?.question || "", item?.answer || ""]
    ));
  }

  function normalizeActivity(row) {
    const localActivity = LOCAL_ACTIVITIES[row?.slug] || KPI_ACTIVITY;
    const metadata = row?.metadata || {};
    const metadataCheckpoints = Array.isArray(metadata.checkpoints)
      ? metadata.checkpoints.map(normalizeCheckpoint)
      : null;
    const localCheckpoints = Array.isArray(localActivity.checkpoints)
      ? localActivity.checkpoints.map(normalizeCheckpoint)
      : null;

    return {
      ...localActivity,
      id: row?.id || null,
      slug: row?.slug || localActivity.slug,
      activityType: row?.activity_type || localActivity.activityType,
      title: row?.title || localActivity.title,
      subtitle: row?.subtitle || localActivity.subtitle,
      trackSlug: row?.track_slug || localActivity.trackSlug,
      trackTitle: row?.track_title || localActivity.trackTitle,
      level: row?.level_label || localActivity.level,
      estimatedMinutes: row?.estimated_minutes || localActivity.estimatedMinutes,
      stepKey: metadata.step_key || localActivity.stepKey,
      objective: metadata.objective || localActivity.objective,
      contentVersion: metadata.content_version || localActivity.contentVersion,
      responseSchema: metadata.response_schema || localActivity.responseSchema || "single_choice",
      completionProgressPercent: Number(metadata.completion_progress_percent || localActivity.completionProgressPercent) || null,
      scenario: metadata.scenario || localActivity.scenario,
      indicatorTitle: metadata.indicator_title || localActivity.indicatorTitle,
      indicatorDescription: metadata.indicator_description || localActivity.indicatorDescription,
      indicatorData: Array.isArray(metadata.indicator_data) ? metadata.indicator_data : localActivity.indicatorData,
      checkpoints: metadataCheckpoints || localCheckpoints,
      question: metadata.question || localActivity.question,
      options: Array.isArray(metadata.options) ? metadata.options : localActivity.options,
      correctOption: metadata.correct_option || localActivity.correctOption,
      feedback: metadata.feedback || localActivity.feedback,
      attention: metadata.attention || localActivity.attention,
      thinkingSteps: normalizeThinkingSteps(metadata.thinking_steps, localActivity.thinkingSteps),
      conclusion: metadata.conclusion || localActivity.conclusion,
      completionTitle: metadata.completion_title || localActivity.completionTitle,
      competencies: Array.isArray(metadata.competencies) ? metadata.competencies : localActivity.competencies,
      nextAction: metadata.next_action || localActivity.nextAction
    };
  }

  function getCheckpoints(activity) {
    if (Array.isArray(activity?.checkpoints) && activity.checkpoints.length) {
      return activity.checkpoints.map(normalizeCheckpoint);
    }
    return [normalizeCheckpoint({
      id: "resposta",
      title: "Sua análise",
      question: activity?.question,
      options: activity?.options,
      correctOption: activity?.correctOption,
      correctTitle: "Você conectou número e decisão",
      incorrectTitle: "Revise sua leitura",
      correctFeedback: activity?.feedback,
      incorrectFeedback: activity?.feedback,
      attention: activity?.attention
    }, 0)];
  }

  function isMissingGuidedPracticeStructure(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "").toLowerCase();
    return ["42P01", "PGRST200", "PGRST205"].includes(code)
      || message.includes("vw_guided_practice_activities_public")
      || message.includes("user_guided_practice_attempts");
  }

  async function loadActivity(slug = DEFAULT_SLUG) {
    const localActivity = LOCAL_ACTIVITIES[slug] || null;
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

  function normalizeAnswers(activity, answers) {
    const checkpoints = getCheckpoints(activity);
    if (typeof answers === "string") return { [checkpoints[0].id]: answers };
    if (Array.isArray(answers)) {
      return Object.fromEntries(answers.map((answer) => [
        answer?.checkpointId || answer?.checkpoint_id,
        answer?.selectedOption || answer?.selected_option
      ]).filter(([id]) => id));
    }
    return answers && typeof answers === "object" ? answers : {};
  }

  function validateCheckpoint(activity, checkpointIndex, selectedOption) {
    const checkpoint = getCheckpoints(activity)[checkpointIndex];
    if (!checkpoint) return null;
    const selected = String(selectedOption || "").toUpperCase();
    const correct = String(checkpoint.correctOption || "").toUpperCase();
    return {
      checkpointId: checkpoint.id,
      checkpointIndex,
      isCorrect: Boolean(selected && correct && selected === correct),
      selectedOption: selected,
      correctOption: correct
    };
  }

  function validateSubmission(activity, answers) {
    const checkpoints = getCheckpoints(activity);
    const responseMap = normalizeAnswers(activity, answers);
    const checkpointResults = checkpoints.map((checkpoint, index) => {
      const result = validateCheckpoint(activity, index, responseMap[checkpoint.id]);
      return { ...result, required: checkpoint.required };
    });
    const requiredResults = checkpointResults.filter((result) => result.required);
    const correctRequired = requiredResults.filter((result) => result.isCorrect).length;
    const allRequiredAnswered = requiredResults.every((result) => Boolean(result.selectedOption));
    const isCorrect = Boolean(requiredResults.length)
      && allRequiredAnswered
      && correctRequired === requiredResults.length;

    return {
      isCorrect,
      allRequiredAnswered,
      selectedOption: checkpointResults[0]?.selectedOption || "",
      correctOption: checkpointResults[0]?.correctOption || "",
      scorePercent: requiredResults.length ? Math.round((correctRequired / requiredResults.length) * 10000) / 100 : 0,
      checkpointResults,
      completedCheckpointIds: checkpointResults.filter((result) => result.isCorrect).map((result) => result.checkpointId),
      responseSchema: checkpoints.length > 1 ? "checkpoint_sequence" : (activity?.responseSchema || "single_choice")
    };
  }

  function validateAnswer(activity, selectedOption) {
    if (selectedOption && typeof selectedOption === "object") return validateSubmission(activity, selectedOption);
    const result = validateCheckpoint(activity, 0, selectedOption);
    return {
      isCorrect: Boolean(result?.isCorrect),
      selectedOption: result?.selectedOption || "",
      correctOption: result?.correctOption || "",
      scorePercent: result?.isCorrect ? 100 : 0
    };
  }

  async function saveAttempt(activity, validation, startedAt) {
    const client = getClient();
    const user = await getAuthenticatedUser();
    if (!client || !user) return { ok: false, skipped: true, authenticated: false };
    if (!activity?.id) return { ok: false, skipped: true, authenticated: true, migrationPending: true };

    const checkpoints = getCheckpoints(activity);
    const submittedAt = new Date().toISOString();
    const responses = validation.checkpointResults
      .filter((result) => result.selectedOption)
      .map((result) => ({ checkpoint_id: result.checkpointId, selected_option: result.selectedOption }));
    const isSingleChoice = checkpoints.length === 1;
    const resultPayload = {
      is_correct: validation.isCorrect,
      all_required_answered: validation.allRequiredAnswered,
      completed_checkpoint_ids: validation.completedCheckpointIds,
      checkpoint_results: validation.checkpointResults.map((result) => ({
        checkpoint_id: result.checkpointId,
        selected_option: result.selectedOption,
        correct_option: result.correctOption,
        is_correct: result.isCorrect
      }))
    };
    if (isSingleChoice) resultPayload.correct_option = validation.correctOption;

    const payload = {
      user_id: user.id,
      activity_id: activity.id,
      attempt_payload: {
        activity_slug: activity.slug,
        content_version: activity.contentVersion,
        response_schema: validation.responseSchema,
        required_checkpoint_ids: checkpoints.filter((checkpoint) => checkpoint.required).map((checkpoint) => checkpoint.id)
      },
      answer_payload: isSingleChoice ? { selected_option: validation.selectedOption } : { responses },
      result_payload: resultPayload,
      score_percent: validation.scorePercent,
      status: validation.isCorrect ? "completed" : "submitted",
      started_at: startedAt,
      completed_at: validation.isCorrect ? submittedAt : null
    };

    try {
      const { error } = await client.from(TABLES.attempts).insert(payload);
      if (!error) return { ok: true, authenticated: true };
      if (isMissingGuidedPracticeStructure(error)) {
        console.info("[Prática guiada] Migration de tentativas ainda não aplicada; progresso oficial não será atualizado.");
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
    if (!client || !user) return { ok: false, skipped: true, authenticated: false };

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
          completed_step_key: completedStep.step_key,
          completed_checkpoint_ids: getCheckpoints(activity).map((checkpoint) => checkpoint.id),
          ...(progressPercent === 100 && Array.isArray(activity.competencies) ? { competencies: activity.competencies } : {})
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

  async function saveResponse(activity, answers, startedAt, options = {}) {
    const validation = validateSubmission(activity, answers);
    const attempt = options.attemptAlreadySaved
      ? { ok: true, authenticated: true, reused: true }
      : await saveAttempt(activity, validation, startedAt);
    let progress = { ok: false, skipped: true, authenticated: attempt.authenticated };

    if (validation.isCorrect && attempt.authenticated && attempt.ok) {
      progress = await saveLearningProgress(activity);
    } else if (validation.isCorrect && attempt.authenticated) {
      progress = {
        ok: false,
        skipped: true,
        authenticated: true,
        reason: "attempt_not_saved",
        migrationPending: Boolean(attempt.migrationPending),
        error: attempt.error || null
      };
    }

    return { validation, attempt, progress };
  }

  globalScope.guidedPracticeService = Object.freeze({
    DEFAULT_SLUG,
    LOCAL_ACTIVITY,
    LOCAL_ACTIVITIES,
    loadActivity,
    getCheckpoints,
    validateCheckpoint,
    validateSubmission,
    validateAnswer,
    getAuthenticatedUser,
    saveResponse
  });
})(window);
