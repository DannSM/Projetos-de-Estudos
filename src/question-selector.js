(function initQuestionSelector(globalScope) {
  const DEFAULT_WINDOW_DAYS = 7;
  const DEFAULT_STORAGE_KEY_BASE = "dataSkillMap_diag_recent_questions";

  function getNowDate() {
    return new Date();
  }

  function buildCutoffDate(windowDays) {
    const now = getNowDate();
    const safeDays = Number.isFinite(Number(windowDays)) ? Number(windowDays) : DEFAULT_WINDOW_DAYS;
    return new Date(now.getTime() - (Math.max(safeDays, 0) * 24 * 60 * 60 * 1000));
  }

  function getRandomInt(maxExclusive) {
    if (maxExclusive <= 0) return 0;

    if (globalScope.crypto && typeof globalScope.crypto.getRandomValues === "function") {
      const buffer = new Uint32Array(1);
      globalScope.crypto.getRandomValues(buffer);
      return buffer[0] % maxExclusive;
    }

    return Math.floor(Math.random() * maxExclusive);
  }

  function secureShuffle(items) {
    const array = Array.isArray(items) ? [...items] : [];
    for (let index = array.length - 1; index > 0; index -= 1) {
      const swapIndex = getRandomInt(index + 1);
      [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
    }
    return array;
  }

  function normalizeText(value) {
    if (typeof value !== "string") return "";
    return value.trim();
  }

  function normalizeQuestionText(value) {
    return normalizeText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function filterQuestions(questions, filters = {}) {
    const source = Array.isArray(questions) ? questions : [];
    return source.filter((question) => {
      const questionMode = normalizeText(question.mode);
      const questionArea = normalizeText(question.area);
      const questionCategory = normalizeText(question.category);
      const questionLevel = normalizeText(question.level);
      const questionActive = typeof question.isActive === "boolean" ? question.isActive : true;

      if (filters.mode && questionMode && questionMode !== filters.mode) return false;
      if (filters.area && questionArea !== filters.area) return false;
      if (filters.category && questionCategory !== filters.category) return false;
      if (filters.level && questionLevel !== filters.level) return false;
      if (typeof filters.isActive === "boolean" && questionActive !== filters.isActive) return false;
      return true;
    });
  }

  function getStableQuestionKey(question, modeFallback = "diagnostico") {
    const idKey = String(question && question.id ? question.id : "").trim();
    if (idKey) return `id:${idKey}`;

    const questionKey = String(question && question.questionKey ? question.questionKey : "").trim();
    if (questionKey) return `qk:${questionKey}`;

    const questionKeyRaw = String(question && question.question_key ? question.question_key : "").trim();
    if (questionKeyRaw) return `qk:${questionKeyRaw}`;

    const mode = normalizeText(question && question.mode) || modeFallback;
    const level = normalizeText(question && question.level);
    const area = normalizeText(question && question.area);
    const statement = normalizeText(question && question.question);
    return `cmp:${mode}|${level}|${area}|${statement}`;
  }

  function getQuestionSignature(question, modeFallback = "diagnostico") {
    const mode = normalizeText(question && question.mode) || modeFallback;
    const level = normalizeText(question && question.level);
    const area = normalizeText(question && question.area);
    const statement = normalizeQuestionText(question && question.question);
    return statement ? `txt:${mode}|${level}|${area}|${statement}` : "";
  }

  function readRecentHistory(storageKeyBase) {
    try {
      const raw = globalScope.localStorage.getItem(storageKeyBase);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function pruneHistory(history, cutoffDate) {
    const pruned = {};
    Object.entries(history || {}).forEach(([userId, entries]) => {
      if (!Array.isArray(entries)) return;
      const safeEntries = entries
        .map((entry) => ({
          questionKey: normalizeText(entry && entry.questionKey),
          usedAtIso: normalizeText(entry && entry.usedAtIso)
        }))
        .filter((entry) => entry.questionKey && entry.usedAtIso)
        .filter((entry) => {
          const usedAt = new Date(entry.usedAtIso);
          return !Number.isNaN(usedAt.getTime()) && usedAt >= cutoffDate;
        });

      if (safeEntries.length) {
        const dedupMap = new Map();
        safeEntries.forEach((entry) => {
          const prev = dedupMap.get(entry.questionKey);
          if (!prev || new Date(entry.usedAtIso) > new Date(prev.usedAtIso)) {
            dedupMap.set(entry.questionKey, entry);
          }
        });
        pruned[userId] = Array.from(dedupMap.values())
          .sort((a, b) => new Date(b.usedAtIso) - new Date(a.usedAtIso));
      }
    });
    return pruned;
  }

  function writeRecentHistory(storageKeyBase, history) {
    try {
      globalScope.localStorage.setItem(storageKeyBase, JSON.stringify(history));
    } catch (error) {
      // localStorage indisponivel: segue sem persistir historico
    }
  }

  function loadRecentHistory({ storageKeyBase = DEFAULT_STORAGE_KEY_BASE, anonymousUserId = "anonymous", windowDays = DEFAULT_WINDOW_DAYS } = {}) {
    const cutoffDate = buildCutoffDate(windowDays);
    const rawHistory = readRecentHistory(storageKeyBase);
    const prunedHistory = pruneHistory(rawHistory, cutoffDate);
    writeRecentHistory(storageKeyBase, prunedHistory);
    const recentEntries = Array.isArray(prunedHistory[anonymousUserId]) ? prunedHistory[anonymousUserId] : [];
    return {
      recentKeySet: new Set(recentEntries.map((entry) => entry.questionKey)),
      history: prunedHistory
    };
  }

  function persistRecentHistory({
    selectedQuestionKeys,
    storageKeyBase = DEFAULT_STORAGE_KEY_BASE,
    anonymousUserId = "anonymous",
    windowDays = DEFAULT_WINDOW_DAYS,
    recentQuestionKeys = [],
    recentQuestionSignatures = []
  } = {}) {
    if (!Array.isArray(selectedQuestionKeys) || selectedQuestionKeys.length === 0) {
      return;
    }

    const cutoffDate = buildCutoffDate(windowDays);
    const rawHistory = readRecentHistory(storageKeyBase);
    const prunedHistory = pruneHistory(rawHistory, cutoffDate);
    const currentEntries = Array.isArray(prunedHistory[anonymousUserId]) ? prunedHistory[anonymousUserId] : [];
    const nowIso = getNowDate().toISOString();

    const merged = [...currentEntries, ...selectedQuestionKeys.map((questionKey) => ({
      questionKey,
      usedAtIso: nowIso
    }))];

    const dedupMap = new Map();
    merged.forEach((entry) => {
      const prev = dedupMap.get(entry.questionKey);
      if (!prev || new Date(entry.usedAtIso) > new Date(prev.usedAtIso)) {
        dedupMap.set(entry.questionKey, entry);
      }
    });

    prunedHistory[anonymousUserId] = Array.from(dedupMap.values())
      .sort((a, b) => new Date(b.usedAtIso) - new Date(a.usedAtIso));

    writeRecentHistory(storageKeyBase, prunedHistory);
  }

  function pickBalancedByArea(levelQuestions, perLevelCount, selectedKeySet, mode) {
    const bucketsByArea = new Map();
    secureShuffle(levelQuestions).forEach((question) => {
      const area = normalizeText(question.area) || "Sem area";
      if (!bucketsByArea.has(area)) {
        bucketsByArea.set(area, []);
      }
      bucketsByArea.get(area).push(question);
    });

    const areaNames = secureShuffle(Array.from(bucketsByArea.keys()));
    const selected = [];
    let index = 0;

    while (selected.length < perLevelCount && areaNames.length > 0) {
      const areaName = areaNames[index % areaNames.length];
      const bucket = bucketsByArea.get(areaName) || [];
      const candidate = bucket.pop();

      if (!candidate) {
        const removeIndex = areaNames.indexOf(areaName);
        if (removeIndex >= 0) {
          areaNames.splice(removeIndex, 1);
          if (areaNames.length === 0) break;
          index = 0;
        }
        continue;
      }

      const stableKey = getStableQuestionKey(candidate, mode);
      if (selectedKeySet.has(stableKey)) continue;

      selected.push(candidate);
      selectedKeySet.add(stableKey);
      index += 1;
    }

    return selected;
  }

  function fillWithRemainingPool({ pool, selected, selectedKeySet, mode, targetCount }) {
    const remaining = secureShuffle(pool).filter((question) => {
      const key = getStableQuestionKey(question, mode);
      return !selectedKeySet.has(key);
    });

    while (selected.length < targetCount && remaining.length > 0) {
      const candidate = remaining.pop();
      const key = getStableQuestionKey(candidate, mode);
      if (selectedKeySet.has(key)) continue;
      selected.push(candidate);
      selectedKeySet.add(key);
    }
  }

  function buildBalancedDiagnosticSets({
    questions,
    levelBlueprint,
    perLevelCount = 5,
    mode = "diagnostico",
    storageKeyBase = DEFAULT_STORAGE_KEY_BASE,
    anonymousUserId = "anonymous",
    windowDays = DEFAULT_WINDOW_DAYS
  } = {}) {
    const questionPool = Array.isArray(questions) ? questions : [];
    const blueprint = Array.isArray(levelBlueprint) ? levelBlueprint : [];
    const { recentKeySet } = loadRecentHistory({ storageKeyBase, anonymousUserId, windowDays });
    const remoteRecentKeySet = new Set(Array.isArray(recentQuestionKeys) ? recentQuestionKeys.map(normalizeText).filter(Boolean) : []);
    const recentSignatureSet = new Set(Array.isArray(recentQuestionSignatures) ? recentQuestionSignatures.map(normalizeText).filter(Boolean) : []);
    const selectedKeySet = new Set();
    const allSelectedKeys = [];
    const diagnostics = [];

    const questionSets = blueprint.map((levelConfig) => {
      const levelName = normalizeText(levelConfig && levelConfig.name);
      const levelQuestions = filterQuestions(questionPool, { mode, level: levelName, isActive: true });
      const fresh = [];
      const recent = [];

      levelQuestions.forEach((question) => {
        const key = getStableQuestionKey(question, mode);
        const signature = getQuestionSignature(question, mode);
        if (recentKeySet.has(key) || remoteRecentKeySet.has(key) || (signature && recentSignatureSet.has(signature))) {
          recent.push(question);
        } else {
          fresh.push(question);
        }
      });

      const selected = pickBalancedByArea(fresh, perLevelCount, selectedKeySet, mode);
      fillWithRemainingPool({ pool: fresh, selected, selectedKeySet, mode, targetCount: perLevelCount });

      const usedRecentFallback = selected.length < perLevelCount;
      if (usedRecentFallback) {
        const selectedFromRecentByArea = pickBalancedByArea(recent, perLevelCount, selectedKeySet, mode);
        selectedFromRecentByArea.forEach((question) => {
          if (selected.length < perLevelCount) {
            selected.push(question);
          }
        });

        fillWithRemainingPool({ pool: recent, selected, selectedKeySet, mode, targetCount: perLevelCount });
      }

      const selectedKeys = selected.map((question) => getStableQuestionKey(question, mode));
      selectedKeys.forEach((key) => allSelectedKeys.push(key));

      diagnostics.push({
        level: levelName,
        totalPool: levelQuestions.length,
        freshPool: fresh.length,
        recentPool: recent.length,
        selectedCount: selected.length,
        usedRecentFallback
      });

      return selected;
    });

    persistRecentHistory({
      selectedQuestionKeys: allSelectedKeys,
      storageKeyBase,
      anonymousUserId,
      windowDays
    });

    return {
      questionSets,
      selectedQuestionKeys: allSelectedKeys,
      meta: {
        mode,
        perLevelCount,
        windowDays,
        storageKeyBase,
        diagnostics,
        remoteRecentCount: remoteRecentKeySet.size + recentSignatureSet.size
      }
    };
  }

  globalScope.questionSelector = {
    secureShuffle,
    filterQuestions,
    buildBalancedDiagnosticSets,
    getStableQuestionKey,
    getQuestionSignature,
    loadRecentHistory,
    persistRecentHistory
  };
})(window);
