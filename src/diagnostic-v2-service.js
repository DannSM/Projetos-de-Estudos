(function initDiagnosticV2Service(globalScope) {
  const STORAGE_KEY = "data_skill_map_v2_preview_attempt";
  const AREAS = ["SQL", "Estatística", "Excel", "Lógica de dados", "Indicadores"];

  function isLocalPreview() {
    const pageHost = globalScope.location?.hostname;
    const config = globalScope.DATA_SKILL_MAP_SUPABASE || {};
    let apiHost = "";
    try { apiHost = new URL(config.url).hostname; } catch (_) { return false; }
    return ["localhost", "127.0.0.1"].includes(pageHost)
      && ["localhost", "127.0.0.1"].includes(apiHost)
      && new URLSearchParams(globalScope.location.search).get("preview") === "v2";
  }

  function getClient() {
    if (!isLocalPreview()) return null;
    return globalScope.authService?.getClient?.() || null;
  }

  async function rpc(name, args) {
    const client = getClient();
    if (!client) throw new Error("Prévia V2 disponível somente com Supabase local.");
    const { data, error } = await client.rpc(`diagnostic_v2_${name}`, args);
    if (error) throw new Error(error.message || "Não foi possível consultar o diagnóstico.");
    return data;
  }

  function readAttempt() {
    try {
      const value = JSON.parse(globalScope.sessionStorage.getItem(STORAGE_KEY) || "null");
      if (value?.methodology_version !== "v2.0"
        || !/^[0-9a-f-]{36}$/i.test(value.attempt_id || "")
        || !/^[0-9a-f]{64}$/i.test(value.attempt_token || "")) return null;
      return value;
    } catch (_) { return null; }
  }

  function saveAttempt(value) {
    globalScope.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  function clearAttempt() {
    globalScope.sessionStorage.removeItem(STORAGE_KEY);
  }

  async function start(userId = null) {
    const data = await rpc("start", {
      p_device_class: globalScope.matchMedia?.("(max-width: 680px)").matches ? "mobile" : "desktop",
      p_idempotency_key: globalScope.crypto.randomUUID()
    });
    if (data?.status !== "started" || !data.attempt_token) {
      throw new Error("O início não devolveu os dados necessários. Tente iniciar novamente.");
    }
    const attempt = {
      methodology_version: "v2.0", attempt_id: data.attempt_id,
      attempt_token: data.attempt_token, claim_token: data.claim_token || null,
      owner_id: userId, pending_answer: null
    };
    saveAttempt(attempt);
    return attempt;
  }

  function next(attempt) { return rpc("next", { p_attempt_token: attempt.attempt_token }); }
  function result(attempt) { return rpc("result", { p_attempt_token: attempt.attempt_token }); }
  function submit(attempt, itemId, optionId) {
    let pending = attempt.pending_answer;
    if (!pending || pending.item_id !== itemId || pending.option_id !== optionId) {
      pending = { item_id: itemId, option_id: optionId, key: globalScope.crypto.randomUUID() };
      attempt.pending_answer = pending;
      saveAttempt(attempt);
    }
    return rpc("submit", {
      p_attempt_token: attempt.attempt_token,
      p_attempt_item_id: itemId,
      p_selected_option_id: optionId,
      p_idempotency_key: pending.key
    });
  }
  async function claim(attempt, userId) {
    if (!attempt.claim_token || !userId) return null;
    const data = await rpc("claim", { p_claim_token: attempt.claim_token });
    if (!["claimed", "already_claimed"].includes(data?.status)) {
      throw new Error("Não foi possível vincular esta tentativa à conta.");
    }
    attempt.owner_id = userId;
    attempt.claim_token = null;
    saveAttempt(attempt);
    return data;
  }

  async function currentUserId() {
    const state = await globalScope.authService?.getCurrentSession?.();
    return state?.ok ? state.user?.id || null : null;
  }

  const api = { STORAGE_KEY, AREAS, isLocalPreview, getClient, readAttempt,
    saveAttempt, clearAttempt, start, next, submit, result, claim, currentUserId };
  globalScope.diagnosticV2Service = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
