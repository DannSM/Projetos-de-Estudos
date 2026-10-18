(function initSqlPracticePrivacy(globalScope) {
  const STORAGE_VERSION = "v2";
  const EMPTY_FEEDBACK = Object.freeze({
    difficulty: "",
    confidence: "",
    comment: ""
  });

  function createEmptyFeedback() {
    return { ...EMPTY_FEEDBACK };
  }

  function encodeStorageSegment(value) {
    return encodeURIComponent(String(value || "anonymous"));
  }

  function getScopedStorageKey(prefix, slug, identityKey) {
    return [
      prefix,
      STORAGE_VERSION,
      encodeStorageSegment(identityKey),
      encodeStorageSegment(slug)
    ].join(":");
  }

  function getLegacyStorageKey(prefix, slug) {
    return `${prefix}:${slug}`;
  }

  function readJson(storage, key, fallback) {
    try {
      const rawValue = storage?.getItem?.(key);
      return rawValue === null || rawValue === undefined ? fallback : JSON.parse(rawValue);
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(storage, key, value) {
    try {
      storage?.setItem?.(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeItem(storage, key) {
    try {
      storage?.removeItem?.(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function hasStoredValue(storage, key) {
    try {
      const value = storage?.getItem?.(key);
      return value !== null && value !== undefined;
    } catch (error) {
      return false;
    }
  }

  function loadScopedDrafts({
    storage,
    identityKey,
    slug,
    notePrefix,
    feedbackPrefix
  }) {
    const noteKey = getScopedStorageKey(notePrefix, slug, identityKey);
    const feedbackKey = getScopedStorageKey(feedbackPrefix, slug, identityKey);
    const note = readJson(storage, noteKey, "");
    const feedback = readJson(storage, feedbackKey, createEmptyFeedback());

    return {
      note: typeof note === "string" ? note : "",
      feedback: feedback && typeof feedback === "object" && !Array.isArray(feedback)
        ? { ...createEmptyFeedback(), ...feedback }
        : createEmptyFeedback(),
      legacy: {
        note: hasStoredValue(storage, getLegacyStorageKey(notePrefix, slug)),
        feedback: hasStoredValue(storage, getLegacyStorageKey(feedbackPrefix, slug))
      }
    };
  }

  function resetCentralSqlPersonalizedState(state) {
    const engine = state.sqlWorkbench?.engine || null;
    state.queryAnswer = "";
    state.attempts = {};
    state.feedback = null;
    state.sqlWorkbench = {
      status: engine ? "ready" : "idle",
      engine,
      execution: null,
      executionQuery: "",
      error: ""
    };
    state.practiceNote = "";
    state.noteStatus = "";
    state.practiceFeedback = createEmptyFeedback();
    state.feedbackStatus = "";
    state.isAuthenticated = false;
    state.studentName = "Você";
    state.lastQueryRunId = null;
    state.persistenceStatus = "";
    state.loadingPracticeSlug = "";
    state.activeUtility = "";
  }

  function clearPracticeProgress(practices) {
    return practices.map((practice) => ({
      ...practice,
      userProgressStatus: ""
    }));
  }

  const api = {
    STORAGE_VERSION,
    clearPracticeProgress,
    createEmptyFeedback,
    getLegacyStorageKey,
    getScopedStorageKey,
    loadScopedDrafts,
    readJson,
    removeItem,
    resetCentralSqlPersonalizedState,
    writeJson
  };

  globalScope.SqlPracticePrivacy = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
