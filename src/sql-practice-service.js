(function initSqlPracticeService(globalScope) {
  const TABLES = {
    publicExercises: "vw_sql_practice_exercises_public",
    queryRuns: "sql_query_runs",
    attempts: "user_practice_attempts",
    notes: "user_practice_notes",
    feedback: "user_activity_feedback",
    paths: "learning_paths",
    steps: "learning_path_steps",
    learningProgress: "user_learning_progress"
  };

  const PRACTICE_PROGRESS_MAPPINGS = {
    "sql-essencial-filtros-where": {
      pathSlug: "sql-essencial",
      stepKey: "sql-essencial-01-where"
    },
    "sql-essencial-count-nulos-distintos": {
      pathSlug: "sql-essencial",
      stepKey: "sql-essencial-02-contagens"
    }
  };

  function getClient() {
    return globalScope.authService?.getClient?.() || null;
  }

  async function getAuthenticatedUser() {
    const client = getClient();
    if (!client) {
      return null;
    }

    try {
      const { data, error } = await client.auth.getSession();
      return error ? null : data?.session?.user || null;
    } catch (error) {
      return null;
    }
  }

  function normalizeCatalogActivity(row) {
    return {
      id: row.activity_id,
      slug: row.slug,
      navTitle: row.subtitle || row.title,
      shortTitle: row.title,
      status: row.status === "coming_soon" ? "soon" : row.status,
      estimatedMinutes: row.estimated_minutes || 0,
      level: row.level_label || "",
      topic: row.metadata?.topic || "",
      trackTitle: row.track_title || "",
      stepOrder: row.step_order ?? 0,
      note: row.status === "completed" ? "validada localmente" : row.status === "coming_soon" ? "em breve" : ""
    };
  }

  function normalizePractice(row) {
    const support = row.theoretical_support || {};
    const schema = row.schema_config || {};
    const datasetTables = Array.isArray(schema.tables) && schema.tables.length
      ? schema.tables.map((tableSchema) => {
          const tableName = tableSchema.table || tableSchema.name || "";
          const seedEntry = Array.isArray(row.seed_data)
            ? row.seed_data.find((entry) => entry?.table === tableName)
            : null;
          const sampleEntry = Array.isArray(row.sample_rows)
            ? row.sample_rows.find((entry) => entry?.table === tableName)
            : null;
          return {
            table: tableName,
            columns: Array.isArray(tableSchema.columns) ? tableSchema.columns : [],
            seedData: Array.isArray(seedEntry?.rows) ? seedEntry.rows : [],
            sampleRows: Array.isArray(sampleEntry?.rows) ? sampleEntry.rows : []
          };
        })
      : [{
          table: schema.table || "",
          columns: Array.isArray(schema.columns) ? schema.columns : [],
          seedData: Array.isArray(row.seed_data) ? row.seed_data : [],
          sampleRows: Array.isArray(row.sample_rows) ? row.sample_rows : []
        }];
    const tableNames = datasetTables.map((table) => table.table).filter(Boolean);
    const columns = datasetTables.flatMap((table) =>
      table.columns.map((column) =>
        datasetTables.length > 1 ? `${table.table}.${column.name}` : column.name
      )
    );

    return {
      ...normalizeCatalogActivity(row),
      exerciseId: row.exercise_id,
      datasetId: row.dataset_id,
      table: tableNames.join(", "),
      tables: tableNames,
      columns: columns.join(", "),
      schemaColumns: datasetTables[0]?.columns || [],
      sampleRows: datasetTables[0]?.sampleRows || [],
      datasetTables,
      datasetConfig: {
        schemaConfig: schema,
        seedData: Array.isArray(row.seed_data) ? row.seed_data : []
      },
      prompt: row.prompt,
      objective: row.objective || "",
      why: support.why || "",
      contentTitle: support.content_title || "",
      content: support.content || "",
      example: support.example || "",
      hintText: support.hint || "",
      placeholder: support.placeholder || "",
      dataSource: "supabase"
    };
  }

  async function loadPractice(slug) {
    const client = getClient();
    if (!client || !slug) {
      return { ok: false, skipped: true };
    }

    try {
      const { data: practiceRow, error: practiceError } = await client
        .from(TABLES.publicExercises)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (practiceError) return { ok: false, error: practiceError };
      if (!practiceRow || !practiceRow.exercise_id || !practiceRow.dataset_id) {
        return { ok: false, notFound: true };
      }

      const { data: catalog, error: catalogError } = await client
        .from(TABLES.publicExercises)
        .select("*")
        .eq("track_slug", practiceRow.track_slug)
        .order("step_order", { ascending: true });

      if (catalogError) return { ok: false, error: catalogError };

      return {
        ok: true,
        practice: normalizePractice(practiceRow),
        catalog: (catalog || []).map(normalizeCatalogActivity)
      };
    } catch (error) {
      console.warn("[Central SQL] Falha ao carregar pratica do Supabase.", error);
      return { ok: false, error };
    }
  }

  async function loadUserState(practice) {
    const client = getClient();
    const user = await getAuthenticatedUser();
    if (!client || !user || !practice?.exerciseId) {
      return { ok: true, authenticated: false };
    }

    try {
      const [noteResult, feedbackResult, attemptsResult] = await Promise.all([
        client
          .from(TABLES.notes)
          .select("note_text")
          .eq("user_id", user.id)
          .eq("exercise_id", practice.exerciseId)
          .maybeSingle(),
        client
          .from(TABLES.feedback)
          .select("difficulty,confidence,comment")
          .eq("user_id", user.id)
          .eq("exercise_id", practice.exerciseId)
          .eq("source", "sql_practice")
          .maybeSingle(),
        client
          .from(TABLES.attempts)
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("exercise_id", practice.exerciseId)
      ]);

      const error = noteResult.error || feedbackResult.error || attemptsResult.error;
      if (error) return { ok: false, authenticated: true, user, error };

      return {
        ok: true,
        authenticated: true,
        user,
        hasNote: Boolean(noteResult.data),
        note: noteResult.data?.note_text || "",
        hasFeedback: Boolean(feedbackResult.data),
        feedback: feedbackResult.data || null,
        attemptCount: attemptsResult.count || 0
      };
    } catch (error) {
      return { ok: false, authenticated: true, user, error };
    }
  }

  async function saveQueryRun(practice, query, execution, errorMessage) {
    const client = getClient();
    const user = await getAuthenticatedUser();
    if (!client || !user || !practice?.exerciseId) {
      return { ok: false, skipped: true, authenticated: false };
    }

    const payload = {
      user_id: user.id,
      activity_id: practice.id,
      exercise_id: practice.exerciseId,
      query_text: query,
      execution_status: errorMessage ? "error" : "success",
      row_count: errorMessage ? null : (execution?.totalRows ?? execution?.rows?.length ?? 0),
      error_message: errorMessage || null,
      result_preview: errorMessage ? [] : (execution?.rows || []).slice(0, 20)
    };

    try {
      const { data, error } = await client.from(TABLES.queryRuns).insert(payload).select("id").single();
      return error ? { ok: false, authenticated: true, error } : { ok: true, authenticated: true, id: data.id };
    } catch (error) {
      return { ok: false, authenticated: true, error };
    }
  }

  async function saveAttempt(practice, queryRunId, result, attemptNumber) {
    const client = getClient();
    const user = await getAuthenticatedUser();
    if (!client || !user || !practice?.exerciseId) {
      return { ok: false, skipped: true, authenticated: false };
    }

    const payload = {
      user_id: user.id,
      activity_id: practice.id,
      exercise_id: practice.exerciseId,
      query_run_id: queryRunId || null,
      validation_status: result.status,
      validation_message: result.message,
      validation_details: result.details || {},
      attempt_number: attemptNumber
    };

    try {
      const { error } = await client.from(TABLES.attempts).insert(payload);
      return error ? { ok: false, authenticated: true, error } : { ok: true, authenticated: true };
    } catch (error) {
      return { ok: false, authenticated: true, error };
    }
  }

  function getProgressPercent(completedCount, totalCount) {
    if (!totalCount) return 0;
    return Math.round((completedCount / totalCount) * 10000) / 100;
  }

  async function savePracticeProgress(practice) {
    const client = getClient();
    const user = await getAuthenticatedUser();
    const mapping = PRACTICE_PROGRESS_MAPPINGS[practice?.slug];

    if (!client || !user) {
      return { ok: false, skipped: true, authenticated: false, reason: "user_not_authenticated" };
    }

    if (!mapping) {
      return { ok: false, skipped: true, authenticated: true, reason: "practice_not_mapped" };
    }

    try {
      const { data: path, error: pathError } = await client
        .from(TABLES.paths)
        .select("id,slug,title")
        .eq("slug", mapping.pathSlug)
        .eq("status", "active")
        .maybeSingle();

      if (pathError) return { ok: false, authenticated: true, error: pathError };
      if (!path?.id) {
        return { ok: false, authenticated: true, reason: "path_not_found" };
      }

      const { data: steps, error: stepsError } = await client
        .from(TABLES.steps)
        .select("id,path_id,step_key,display_order,status")
        .eq("path_id", path.id)
        .eq("status", "active")
        .order("display_order", { ascending: true });

      if (stepsError) return { ok: false, authenticated: true, error: stepsError };

      const activeSteps = Array.isArray(steps) ? steps : [];
      const completedStep = activeSteps.find((step) => step.step_key === mapping.stepKey);
      if (!completedStep) {
        return { ok: false, authenticated: true, reason: "step_not_found" };
      }

      const { data: existingRows, error: progressError } = await client
        .from(TABLES.learningProgress)
        .select("id,step_id,status,progress_percent,started_at,completed_at,metadata")
        .eq("user_id", user.id)
        .eq("path_id", path.id);

      if (progressError) return { ok: false, authenticated: true, error: progressError };

      const progressRows = Array.isArray(existingRows) ? existingRows : [];
      const existingByStepId = new Map(progressRows.map((row) => [row.step_id, row]));
      const activeStepIds = new Set(activeSteps.map((step) => step.id));
      const completedStepIds = new Set(
        progressRows
          .filter((row) => row.status === "completed" && activeStepIds.has(row.step_id))
          .map((row) => row.step_id)
      );
      completedStepIds.add(completedStep.id);

      const now = new Date().toISOString();
      const progressPercent = getProgressPercent(completedStepIds.size, activeSteps.length);
      const completedRow = existingByStepId.get(completedStep.id);
      const completedPayload = {
        user_id: user.id,
        path_id: path.id,
        step_id: completedStep.id,
        status: "completed",
        progress_percent: progressPercent,
        started_at: completedRow?.started_at || now,
        completed_at: completedRow?.completed_at || now,
        last_activity_at: now,
        metadata: {
          ...(completedRow?.metadata || {}),
          source: "sql_practice_completion",
          practice_slug: practice.slug,
          completed_step_key: mapping.stepKey
        },
        updated_at: now
      };

      if (completedRow?.id) {
        const { error } = await client
          .from(TABLES.learningProgress)
          .update(completedPayload)
          .eq("id", completedRow.id);
        if (error) return { ok: false, authenticated: true, error };
      } else {
        const { error } = await client.from(TABLES.learningProgress).insert(completedPayload);
        if (error) return { ok: false, authenticated: true, error };
      }

      const nextStep = activeSteps.find((step) => !completedStepIds.has(step.id)) || null;
      if (nextStep) {
        const nextRow = existingByStepId.get(nextStep.id);
        const nextPayload = {
          user_id: user.id,
          path_id: path.id,
          step_id: nextStep.id,
          status: nextRow?.status === "completed" ? "completed" : "in_progress",
          progress_percent: progressPercent,
          started_at: nextRow?.started_at || now,
          last_activity_at: now,
          metadata: {
            ...(nextRow?.metadata || {}),
            source: "sql_practice_completion",
            previous_practice_slug: practice.slug
          },
          updated_at: now
        };

        if (nextRow?.id) {
          const { error } = await client
            .from(TABLES.learningProgress)
            .update(nextPayload)
            .eq("id", nextRow.id);
          if (error) return { ok: false, authenticated: true, error };
        } else {
          const { error } = await client.from(TABLES.learningProgress).insert(nextPayload);
          if (error) return { ok: false, authenticated: true, error };
        }
      }

      return {
        ok: true,
        authenticated: true,
        path,
        completedStep,
        nextStep,
        progressPercent
      };
    } catch (error) {
      console.warn("[Central SQL] Falha ao atualizar progresso da trilha.", error);
      return { ok: false, authenticated: true, error };
    }
  }

  async function saveNote(practice, noteText) {
    const client = getClient();
    const user = await getAuthenticatedUser();
    if (!client || !user || !practice?.exerciseId) {
      return { ok: false, skipped: true, authenticated: false };
    }

    const payload = {
      user_id: user.id,
      activity_id: practice.id,
      exercise_id: practice.exerciseId,
      note_text: noteText
    };

    try {
      const { error } = await client.from(TABLES.notes).upsert(payload, {
        onConflict: "user_id,exercise_id"
      });
      return error ? { ok: false, authenticated: true, error } : { ok: true, authenticated: true };
    } catch (error) {
      return { ok: false, authenticated: true, error };
    }
  }

  async function saveFeedback(practice, feedback) {
    const client = getClient();
    const user = await getAuthenticatedUser();
    if (!client || !user || !practice?.exerciseId) {
      return { ok: false, skipped: true, authenticated: false };
    }

    const payload = {
      user_id: user.id,
      activity_id: practice.id,
      exercise_id: practice.exerciseId,
      difficulty: feedback.difficulty || null,
      confidence: feedback.confidence || null,
      comment: feedback.comment || null,
      source: "sql_practice"
    };

    try {
      const { error } = await client.from(TABLES.feedback).upsert(payload, {
        onConflict: "user_id,exercise_id,source"
      });
      return error ? { ok: false, authenticated: true, error } : { ok: true, authenticated: true };
    } catch (error) {
      return { ok: false, authenticated: true, error };
    }
  }

  globalScope.sqlPracticeService = {
    loadPractice,
    loadUserState,
    saveQueryRun,
    saveAttempt,
    savePracticeProgress,
    saveNote,
    saveFeedback,
    getProgressPercent
  };
})(window);
