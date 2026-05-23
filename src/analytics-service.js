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

  function getConfig() {
    return globalScope.DATA_SKILL_MAP_SUPABASE || {};
  }

  function isConfigured() {
    const config = getConfig();
    return Boolean(config.url && config.anonKey);
  }

  function getClient() {
    if (!globalScope.authService || typeof globalScope.authService.getClient !== "function") {
      return null;
    }

    return globalScope.authService.getClient();
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
    if (!globalScope.authService || typeof globalScope.authService.signIn !== "function") {
      return { ok: false, error: { message: "Supabase nao configurado para autenticacao." } };
    }

    return globalScope.authService.signIn(email, password);
  }

  async function signOutAdmin() {
    if (!globalScope.authService || typeof globalScope.authService.signOut !== "function") return { ok: true };
    return globalScope.authService.signOut();
  }

  async function getCurrentSession() {
    if (!globalScope.authService || typeof globalScope.authService.getCurrentSession !== "function") {
      return { ok: false, session: null, error: { message: "Supabase nao configurado." } };
    }

    return globalScope.authService.getCurrentSession();
  }

  async function checkAdminAuthorization() {
    if (!globalScope.authService || typeof globalScope.authService.checkAdminAuthorization !== "function") {
      return rpcRead(RPC_NAMES.isAdmin, {});
    }

    return globalScope.authService.checkAdminAuthorization();
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
    getAdminSession: getCurrentSession,
    getCurrentSession,
    adminIsAuthorized: checkAdminAuthorization,
    checkAdminAuthorization,
    fetchPlatformDaily,
    fetchUserActivityDaily,
    fetchSatisfactionDaily
  };
})(window);
