(function initAuthService(globalScope) {
  const RPC_NAMES = {
    isAdmin: "admin_is_authorized"
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
          detectSessionInUrl: true,
          storageKey: "data_skill_map_auth_session"
        }
      });
    }

    return authClient;
  }

  function normalizeError(error, fallbackMessage) {
    if (!error) return null;
    if (typeof error.message === "string" && error.message.trim()) {
      return error;
    }
    return { ...error, message: fallbackMessage || "Falha inesperada." };
  }

  function missingClientResult(message) {
    return {
      ok: false,
      data: null,
      error: { message: message || "Supabase nao configurado para autenticacao." }
    };
  }

  async function signIn(email, password) {
    const client = getClient();
    if (!client) {
      return missingClientResult("Supabase nao configurado para autenticacao.");
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, data: null, session: null, user: null, error };
      return {
        ok: true,
        data: data || null,
        session: data?.session || null,
        user: data?.user || null,
        error: null
      };
    } catch (error) {
      return { ok: false, data: null, session: null, user: null, error: normalizeError(error) };
    }
  }

  async function signInWithGoogle() {
    const client = getClient();
    if (!client) {
      return missingClientResult("Supabase nao configurado para autenticacao.");
    }

    const currentUrl = new URL(globalScope.location.href);
    currentUrl.hash = "";

    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: currentUrl.toString()
        }
      });

      if (error) return { ok: false, data: null, error };
      return { ok: true, data: data || null, error: null };
    } catch (error) {
      return { ok: false, data: null, error: normalizeError(error) };
    }
  }

  async function signUp(email, password, metadata = {}) {
    const client = getClient();
    if (!client) {
      return missingClientResult("Supabase nao configurado para cadastro.");
    }

    const options = metadata && Object.keys(metadata).length ? { data: metadata } : undefined;

    try {
      const { data, error } = await client.auth.signUp({ email, password, options });
      if (error) return { ok: false, data: null, session: null, user: null, error };
      return {
        ok: true,
        data: data || null,
        session: data?.session || null,
        user: data?.user || null,
        error: null
      };
    } catch (error) {
      return { ok: false, data: null, session: null, user: null, error: normalizeError(error) };
    }
  }

  async function signOut() {
    const client = getClient();
    if (!client) return { ok: true, error: null };

    try {
      const { error } = await client.auth.signOut();
      if (error) return { ok: false, error };
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: normalizeError(error) };
    }
  }

  async function getCurrentSession() {
    const client = getClient();
    if (!client) {
      return { ok: false, session: null, user: null, error: { message: "Supabase nao configurado." } };
    }

    try {
      const { data, error } = await client.auth.getSession();
      if (error) return { ok: false, session: null, user: null, error };
      const session = data?.session || null;
      return { ok: true, session, user: session?.user || null, error: null };
    } catch (error) {
      return { ok: false, session: null, user: null, error: normalizeError(error) };
    }
  }

  async function getProfile() {
    const client = getClient();
    if (!client) {
      return missingClientResult("Supabase nao configurado para perfil.");
    }

    const sessionResult = await getCurrentSession();
    if (!sessionResult.ok || !sessionResult.user) {
      return { ok: false, data: null, profile: null, error: sessionResult.error || { message: "Usuario nao autenticado." } };
    }

    try {
      const { data, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", sessionResult.user.id)
        .maybeSingle();

      if (error) return { ok: false, data: null, profile: null, error };
      return { ok: true, data: data || null, profile: data || null, error: null };
    } catch (error) {
      return { ok: false, data: null, profile: null, error: normalizeError(error) };
    }
  }

  async function checkAdminAuthorization() {
    const client = getClient();
    if (!client) {
      return { ok: false, data: [], error: { message: "Supabase nao configurado para autenticacao." } };
    }

    try {
      const { data, error } = await client.rpc(RPC_NAMES.isAdmin, {});
      if (error) return { ok: false, data: [], error };
      return { ok: true, data: Array.isArray(data) ? data : [], error: null };
    } catch (error) {
      return { ok: false, data: [], error: normalizeError(error) };
    }
  }

  globalScope.authService = {
    isConfigured,
    getClient,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    getCurrentSession,
    getProfile,
    checkAdminAuthorization
  };
})(window);
