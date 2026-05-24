(function initDiagnosticFunnelService(globalScope) {
  const TABLE_NAME = "diagnostic_funnel_events";
  const PAGE_NAME = "diagnostico.html";
  const WARN_LIMIT = 3;

  let publicClient = null;
  let warnCount = 0;

  function getConfig() {
    return globalScope.DATA_SKILL_MAP_SUPABASE || {};
  }

  function isConfigured() {
    const config = getConfig();
    return Boolean(config.url && config.anonKey);
  }

  function getPublicClient() {
    if (!isConfigured()) {
      return null;
    }

    if (!globalScope.supabase || typeof globalScope.supabase.createClient !== "function") {
      return null;
    }

    if (!publicClient) {
      const config = getConfig();
      publicClient = globalScope.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: "data_skill_map_funnel_public_client"
        }
      });
    }

    return publicClient;
  }

  function warnControlled(message, error) {
    warnCount += 1;
    if (warnCount <= WARN_LIMIT) {
      console.warn(message, error);
    }
  }

  function getAnonymousUserId(fallbackValue) {
    if (fallbackValue) {
      return fallbackValue;
    }

    try {
      if (
        globalScope.supabaseDataService &&
        typeof globalScope.supabaseDataService.getAnonymousUserId === "function"
      ) {
        return globalScope.supabaseDataService.getAnonymousUserId();
      }
    } catch (error) {
      warnControlled("[Diagnostic Funnel] Falha ao obter anonymous_user_id.", error);
    }

    return null;
  }

  async function getClientContext() {
    const anonymousUserId = getAnonymousUserId();

    try {
      const authService = globalScope.authService;
      if (
        authService &&
        typeof authService.getCurrentSession === "function" &&
        typeof authService.getClient === "function"
      ) {
        const sessionResult = await authService.getCurrentSession();
        const session = sessionResult && sessionResult.session;
        const userId = session && session.user && session.user.id;
        const authClient = userId ? authService.getClient() : null;

        if (userId && authClient) {
          return {
            client: authClient,
            anonymousUserId,
            userId,
            isAuthenticated: true
          };
        }
      }
    } catch (error) {
      warnControlled("[Diagnostic Funnel] Sessao indisponivel; usando modo anonimo.", error);
    }

    return {
      client: getPublicClient(),
      anonymousUserId,
      userId: null,
      isAuthenticated: false
    };
  }

  function normalizeNumber(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  function buildMetadata(payload, context) {
    const metadata = payload && payload.metadata && typeof payload.metadata === "object"
      ? { ...payload.metadata }
      : {};

    return {
      source: "diagnostico",
      page: PAGE_NAME,
      isAuthenticated: context.isAuthenticated,
      timestamp: new Date().toISOString(),
      ...metadata
    };
  }

  async function trackEvent(payload = {}) {
    try {
      if (!payload.attempt_id || !payload.event_type) {
        return { ok: false, skipped: true };
      }

      const context = await getClientContext();
      if (!context.client) {
        return { ok: false, skipped: true };
      }

      const row = {
        attempt_id: payload.attempt_id,
        anonymous_user_id: getAnonymousUserId(payload.anonymous_user_id || context.anonymousUserId),
        user_id: context.userId,
        event_type: payload.event_type,
        level: payload.level || null,
        question_index: normalizeNumber(payload.question_index),
        total_questions_answered: normalizeNumber(payload.total_questions_answered),
        score_percent: normalizeNumber(payload.score_percent),
        metadata: buildMetadata(payload, context)
      };

      const { error } = await context.client.from(TABLE_NAME).insert(row);
      if (error) {
        warnControlled("[Diagnostic Funnel] Falha ao registrar evento.", error);
        return { ok: false, error };
      }

      return { ok: true };
    } catch (error) {
      warnControlled("[Diagnostic Funnel] Erro inesperado ao registrar evento.", error);
      return { ok: false, error };
    }
  }

  globalScope.diagnosticFunnelService = {
    trackEvent
  };
})(window);
