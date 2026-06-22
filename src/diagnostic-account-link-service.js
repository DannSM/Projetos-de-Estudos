(function initDiagnosticAccountLinkService(globalScope) {
  const STORAGE_KEY = "data_skill_map_pending_diagnostic_account_link";
  const MAX_AGE_MS = 24 * 60 * 60 * 1000;
  let claimInFlight = null;

  function readPendingDiagnostic() {
    try {
      const marker = JSON.parse(globalScope.localStorage.getItem(STORAGE_KEY) || "null");
      const createdAt = Date.parse(marker?.created_at || "");
      const isValid = marker?.status === "pending_account_link"
        && typeof marker.attempt_id === "string"
        && marker.attempt_id.startsWith("diag_")
        && typeof marker.anonymous_user_id === "string"
        && Number.isFinite(createdAt)
        && Date.now() - createdAt <= MAX_AGE_MS;

      if (!isValid) {
        globalScope.localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return marker;
    } catch (error) {
      console.warn("[Diagnóstico] Marcador de vinculação indisponível.", error);
      return null;
    }
  }

  function markPendingDiagnostic({ attempt_id, anonymous_user_id, result } = {}) {
    if (!attempt_id || !anonymous_user_id) return false;

    try {
      globalScope.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        attempt_id,
        anonymous_user_id,
        created_at: new Date().toISOString(),
        status: "pending_account_link",
        result: result || null
      }));
      return true;
    } catch (error) {
      console.warn("[Diagnóstico] Não foi possível guardar o diagnóstico pendente.", error);
      return false;
    }
  }

  function clearPendingDiagnostic() {
    try {
      globalScope.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("[Diagnóstico] Não foi possível limpar o marcador de vinculação.", error);
    }
  }

  async function generatePersonalizedLearning(marker) {
    const service = globalScope.personalizedLearningService;
    if (!service || typeof service.generateFromDiagnosticResult !== "function" || !marker.result) {
      return { ok: false, skipped: true, reason: "learning_service_unavailable" };
    }

    return service.generateFromDiagnosticResult({
      ...marker.result,
      attemptId: marker.attempt_id
    });
  }

  function hasCompletedLearningWrites(result) {
    const writes = result?.writes || {};
    return result?.ok === true
      && writes.userLearningProgress?.ok === true
      && writes.learningRecommendations?.ok === true
      && writes.userSkillProgress?.ok === true;
  }

  async function runClaim() {
    const marker = readPendingDiagnostic();
    const client = globalScope.authService?.getClient?.();
    const sessionResult = await globalScope.authService?.getCurrentSession?.();

    if (!marker || !client || !sessionResult?.ok || !sessionResult.user?.id) {
      return { ok: false, skipped: true, reason: "missing_marker_or_session" };
    }

    const { data, error } = await client.rpc("claim_anonymous_diagnostic", {
      p_attempt_id: marker.attempt_id,
      p_anonymous_user_id: marker.anonymous_user_id
    });

    if (error) {
      console.warn("[Diagnóstico] Falha ao vincular diagnóstico pendente.", error);
      return { ok: false, error };
    }

    const status = data?.status;
    if (status === "expired" || status === "claimed_by_other" || status === "not_found") {
      clearPendingDiagnostic();
      return { ok: false, status, data };
    }

    if (status !== "claimed" && status !== "already_claimed") {
      return { ok: false, status: status || "unexpected_response", data };
    }

    const learningResult = await generatePersonalizedLearning(marker);
    if (!hasCompletedLearningWrites(learningResult)) {
      return { ok: false, status, data, learningResult };
    }

    clearPendingDiagnostic();
    globalScope.dispatchEvent(new CustomEvent("data-skill-map-learning-updated", {
      detail: {
        source: "anonymous_diagnostic_claim",
        attemptId: marker.attempt_id,
        writes: learningResult.writes || null
      }
    }));

    return { ok: true, status, data, learningResult };
  }

  function claimPendingDiagnostic() {
    if (!claimInFlight) {
      claimInFlight = runClaim().finally(() => {
        claimInFlight = null;
      });
    }
    return claimInFlight;
  }

  globalScope.diagnosticAccountLinkService = {
    STORAGE_KEY,
    markPendingDiagnostic,
    readPendingDiagnostic,
    clearPendingDiagnostic,
    claimPendingDiagnostic
  };
})(window);
