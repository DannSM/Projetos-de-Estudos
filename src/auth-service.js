(function initAuthService(globalScope) {
  const RPC_NAMES = {
    isAdmin: "admin_is_authorized"
  };

  let authClient = null;
  const ensuredProfileUserIds = new Set();

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

  function getProfileDisplayName(user) {
    return user?.user_metadata?.display_name || user?.user_metadata?.name || null;
  }

  function isEmailConfirmationPending(user) {
    if (!user?.email) return false;
    return !user.email_confirmed_at && !user.confirmed_at;
  }

  async function ensureProfileForUser(user, options = {}) {
    const client = getClient();
    if (!client || !user?.id || ensuredProfileUserIds.has(user.id)) {
      return { ok: Boolean(user?.id), skipped: true };
    }

    const payload = {
      id: user.id,
      email: user.email || null,
      display_name: getProfileDisplayName(user),
      role: "student",
      plan: "free"
    };

    try {
      const { data, error } = await client
        .from("profiles")
        .select("id,display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        if (!options.quiet) {
          console.warn("[Auth] Nao foi possivel conferir profile.", error);
        }
        return { ok: false, error };
      }

      if (data?.id) {
        if (!data.display_name && payload.display_name) {
          const { error: updateError } = await client
            .from("profiles")
            .update({ email: payload.email, display_name: payload.display_name })
            .eq("id", user.id);

          if (updateError) {
            if (!options.quiet) {
              console.warn("[Auth] Nao foi possivel atualizar profile.", updateError);
            }
            return { ok: false, error: updateError };
          }
        }
        ensuredProfileUserIds.add(user.id);
        return { ok: true, profile: data };
      }

      const { error: insertError } = await client
        .from("profiles")
        .insert(payload);

      if (insertError) {
        if (!options.quiet) {
          console.warn("[Auth] Nao foi possivel criar profile.", insertError);
        }
        return { ok: false, error: insertError };
      }

      ensuredProfileUserIds.add(user.id);
      return { ok: true };
    } catch (error) {
      const normalized = normalizeError(error, "Falha ao garantir profile.");
      if (!options.quiet) {
        console.warn("[Auth] Erro inesperado ao garantir profile.", normalized);
      }
      return { ok: false, error: normalized };
    }
  }

  async function signIn(email, password) {
    const client = getClient();
    if (!client) {
      return missingClientResult("Supabase nao configurado para autenticacao.");
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, data: null, session: null, user: null, error };
      if (data?.user) {
        await ensureProfileForUser(data.user);
      }
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
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        const isPending = isEmailConfirmationPending(data.user);
        return {
          ok: false,
          data: data || null,
          session: null,
          user: data.user,
          error: {
            message: isPending ? "User already registered but not confirmed" : "User already registered",
            code: isPending ? "user_already_registered_unconfirmed" : "user_already_registered"
          }
        };
      }
      if (data?.user && (data?.session || !isEmailConfirmationPending(data.user))) {
        await ensureProfileForUser(data.user, { quiet: isEmailConfirmationPending(data.user) });
      }

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

  async function resetPassword(email) {
    const client = getClient();
    if (!client) {
      return missingClientResult("Supabase nao configurado para recuperacao de senha.");
    }

    const currentUrl = new URL(globalScope.location.href);
    currentUrl.hash = "";
    const redirectOptions = /^https?:$/.test(currentUrl.protocol)
      ? { redirectTo: currentUrl.toString() }
      : undefined;

    try {
      const { data, error } = await client.auth.resetPasswordForEmail(email, redirectOptions);
      if (error) return { ok: false, data: data || null, error };
      return { ok: true, data: data || null, error: null };
    } catch (error) {
      return { ok: false, data: null, error: normalizeError(error) };
    }
  }

  async function updatePassword(password) {
    const client = getClient();
    if (!client) {
      return missingClientResult("Supabase nao configurado para atualizar a senha.");
    }

    try {
      const { data, error } = await client.auth.updateUser({ password });
      if (error) return { ok: false, data: data || null, error };
      return { ok: true, data: data || null, error: null };
    } catch (error) {
      return { ok: false, data: null, error: normalizeError(error) };
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
      if (session?.user) {
        await ensureProfileForUser(session.user);
      }
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
    resetPassword,
    updatePassword,
    signOut,
    getCurrentSession,
    getProfile,
    ensureProfileForUser,
    checkAdminAuthorization
  };
})(window);
