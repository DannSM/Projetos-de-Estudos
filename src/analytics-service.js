(function initAnalyticsService(globalScope) {
  const RPC_NAMES = {
    platform: "admin_get_platform_activity_daily",
    users: "admin_get_user_activity_daily",
    satisfaction: "admin_get_satisfaction_feedback_daily",
    isAdmin: "admin_is_authorized"
  };

  const DEFAULTS = {
    maxRowsPlatform: 180,
    maxRowsUsers: 1800,
    maxRowsSatisfaction: 500
  };

  let authClient = null;

  function getConfig() {
    return globalScope.DATA_SKILL_MAP_SUPABASE || {};
  }

  function isConfigured() {
    const config = getConfig();
    return Boolean(config.url && config.anonKey);
  }

  function getClient() {
    if (!isConfigured()) {
      return null;
    }

    if (!globalScope.supabase || typeof globalScope.supabase.createClient !== "function") {
      return null;
    }

    if (!authClient) {
      const config = getConfig();
      authClient = globalScope.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }

    return authClient;
  }

  function sanitizeDate(value) {
    if (typeof value !== "string") return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }

  function normalizeError(error, fallbackMessage) {
    if (!error) return null;
    if (typeof error.message === "string" && error.message.trim()) {
      return error;
    }
    return { ...error, message: fallbackMessage || "Falha inesperada." };
  }

  function normalizeResult(data, error) {
    if (error) {
      return { ok: false, data: [], error: normalizeError(error, "Falha ao consultar analytics.") };
    }
    return { ok: true, data: Array.isArray(data) ? data : [], error: null };
  }

  async function rpcRead(rpcName, payload) {
    const client = getClient();
    if (!client) {
      return normalizeResult([], { message: "Supabase nao configurado para analytics." });
    }

    try {
      const { data, error } = await client.rpc(rpcName, payload || {});
      return normalizeResult(data, error);
    } catch (error) {
      return normalizeResult([], error);
    }
  }

  async function signInAdmin(email, password) {
    const client = getClient();
    if (!client) {
      return { ok: false, error: { message: "Supabase nao configurado para autenticacao." } };
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error };
      return { ok: true, session: data.session || null, user: data.user || null };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async function signOutAdmin() {
    const client = getClient();
    if (!client) return { ok: true };

    try {
      const { error } = await client.auth.signOut();
      if (error) return { ok: false, error };
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async function getCurrentSession() {
    const client = getClient();
    if (!client) return { ok: false, session: null, error: { message: "Supabase nao configurado." } };

    try {
      const { data, error } = await client.auth.getSession();
      if (error) return { ok: false, session: null, error };
      return { ok: true, session: data.session || null, error: null };
    } catch (error) {
      return { ok: false, session: null, error };
    }
  }

  async function checkAdminAuthorization() {
    return rpcRead(RPC_NAMES.isAdmin, {});
  }

  async function fetchPlatformDaily(params = {}) {
    const payload = {
      p_start_date: sanitizeDate(params.startDate),
      p_end_date: sanitizeDate(params.endDate),
      p_limit: Number(params.limit) > 0 ? Math.min(Number(params.limit), DEFAULTS.maxRowsPlatform) : DEFAULTS.maxRowsPlatform
    };
    return rpcRead(RPC_NAMES.platform, payload);
  }

  async function fetchUserActivityDaily(params = {}) {
    const payload = {
      p_start_date: sanitizeDate(params.startDate),
      p_end_date: sanitizeDate(params.endDate),
      p_user_filter: typeof params.userFilter === "string" ? params.userFilter.trim() : null,
      p_limit: Number(params.limit) > 0 ? Math.min(Number(params.limit), DEFAULTS.maxRowsUsers) : DEFAULTS.maxRowsUsers
    };

    const result = await rpcRead(RPC_NAMES.users, payload);
    return {
      ...result,
      truncated: Array.isArray(result.data) ? result.data.length >= payload.p_limit : false
    };
  }

  async function fetchSatisfactionDaily(params = {}) {
    const payload = {
      p_start_date: sanitizeDate(params.startDate),
      p_end_date: sanitizeDate(params.endDate),
      p_limit: Number(params.limit) > 0 ? Math.min(Number(params.limit), DEFAULTS.maxRowsSatisfaction) : DEFAULTS.maxRowsSatisfaction
    };
    return rpcRead(RPC_NAMES.satisfaction, payload);
  }

  globalScope.analyticsService = {
    isConfigured,
    signInAdmin,
    signOutAdmin,
    getCurrentSession,
    checkAdminAuthorization,
    fetchPlatformDaily,
    fetchUserActivityDaily,
    fetchSatisfactionDaily
  };
})(window);
