(function initSupabaseDataService(globalScope) {
  const STORAGE_KEYS = {
    anonymousUserId: "data_skill_map_anonymous_user_id"
  };

  let supabaseClient = null;

  function getConfig() {
    return globalScope.DATA_SKILL_MAP_SUPABASE || {};
  }

  function isSupabaseConfigured() {
    const config = getConfig();
    return Boolean(config.url && config.anonKey);
  }

  function getSupabaseClient() {
    if (!isSupabaseConfigured()) {
      return null;
    }

    if (!globalScope.supabase || typeof globalScope.supabase.createClient !== "function") {
      return null;
    }

    if (!supabaseClient) {
      const config = getConfig();
      supabaseClient = globalScope.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
    }

    return supabaseClient;
  }

  function createAnonymousUserId() {
    if (globalScope.crypto && typeof globalScope.crypto.randomUUID === "function") {
      return globalScope.crypto.randomUUID();
    }

    return `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  function getAnonymousUserId() {
    try {
      const stored = globalScope.localStorage.getItem(STORAGE_KEYS.anonymousUserId);
      if (stored) {
        return stored;
      }

      const created = createAnonymousUserId();
      globalScope.localStorage.setItem(STORAGE_KEYS.anonymousUserId, created);
      return created;
    } catch (error) {
      console.warn("[Supabase] localStorage indisponivel para usuario anonimo.", error);
      return createAnonymousUserId();
    }
  }

  function createAttemptId(prefix) {
    if (globalScope.crypto && typeof globalScope.crypto.randomUUID === "function") {
      return `${prefix}_${globalScope.crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  async function safeInsert(tableName, payload) {
    const client = getSupabaseClient();

    if (!client || !tableName) {
      return { ok: false, skipped: true };
    }

    try {
      const { error } = await client.from(tableName).insert(payload);
      if (error) {
        console.warn(`[Supabase] Falha ao inserir em ${tableName}.`, error);
        return { ok: false, error };
      }

      return { ok: true };
    } catch (error) {
      console.warn(`[Supabase] Erro inesperado ao inserir em ${tableName}.`, error);
      return { ok: false, error };
    }
  }

  async function saveDiagnosticSession(payload) {
    const tables = getConfig().tables || {};
    return safeInsert(tables.diagnosticSessions, payload);
  }

  async function saveDiagnosticAnswer(payload) {
    const tables = getConfig().tables || {};
    return safeInsert(tables.diagnosticAnswers, payload);
  }

  async function saveChallengeAttempt(payload) {
    const tables = getConfig().tables || {};
    return safeInsert(tables.challengeAttempts, payload);
  }

  async function saveSatisfactionFeedback(payload) {
    const tables = getConfig().tables || {};
    return safeInsert(tables.satisfactionFeedback, payload);
  }

  async function fetchQuestionBankRows({ mode, activeOnly = true } = {}) {
    const tables = getConfig().tables || {};
    const tableName = tables.questionBank;
    const client = getSupabaseClient();

    if (!client || !tableName || !mode) {
      return { ok: false, skipped: true, data: [] };
    }

    try {
      let query = client
        .from(tableName)
        .select("*")
        .eq("mode", mode)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) {
        console.warn(`[Supabase] Falha ao ler ${tableName}.`, error);
        return { ok: false, error, data: [] };
      }

      return { ok: true, data: Array.isArray(data) ? data : [] };
    } catch (error) {
      console.warn(`[Supabase] Erro inesperado ao ler ${tableName}.`, error);
      return { ok: false, error, data: [] };
    }
  }

  globalScope.supabaseDataService = {
    isSupabaseConfigured,
    getAnonymousUserId,
    createAttemptId,
    saveDiagnosticSession,
    saveDiagnosticAnswer,
    saveChallengeAttempt,
    saveSatisfactionFeedback,
    fetchQuestionBankRows
  };
})(window);
