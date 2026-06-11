(function initSqlPracticeService(globalScope) {
  const TABLES = {
    publicExercises: "vw_sql_practice_exercises_public",
    queryRuns: "sql_query_runs",
    attempts: "user_practice_attempts",
    notes: "user_practice_notes",
    feedback: "user_activity_feedback"
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
    const columns = Array.isArray(schema.columns) ? schema.columns : [];

    return {
      ...normalizeCatalogActivity(row),
      exerciseId: row.exercise_id,
      datasetId: row.dataset_id,
      table: schema.table || "",
      columns: columns.map((column) => column.name).join(", "),
      schemaColumns: columns,
      sampleRows: Array.isArray(row.sample_rows) ? row.sample_rows : [],
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
    saveNote,
    saveFeedback
  };
})(window);
