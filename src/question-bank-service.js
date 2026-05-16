(function initQuestionBankService(globalScope) {
  const MODE_DIAGNOSTICO = "diagnostico";
  const MODE_DESAFIO = "desafio";
  const CHALLENGE_DEFAULT_CATEGORY = "Geral";

  function getState() {
    return globalScope.state || null;
  }

  function getFallbackDiagnosticQuestions() {
    return Array.isArray(globalScope.diagnosticQuestions) ? globalScope.diagnosticQuestions : [];
  }

  function getFallbackChallenges() {
    return Array.isArray(globalScope.challenges) ? globalScope.challenges : [];
  }

  function normalizeText(value) {
    if (typeof value !== "string") return "";
    return value.trim();
  }

  function isValidOptions(options) {
    return Array.isArray(options)
      && options.length >= 2
      && options.every((option) => typeof option === "string" && option.trim().length > 0);
  }

  function validateDiagnosticRow(row) {
    const mode = normalizeText(row.mode);
    const area = normalizeText(row.area);
    const level = normalizeText(row.level);
    const question = normalizeText(row.question);
    const explanation = normalizeText(row.explanation);
    const options = row.options;
    const correctIndex = Number(row.correct_index);

    if (!mode || !question || !level || !explanation) {
      return { valid: false, reason: "Campos obrigatorios ausentes." };
    }

    if (!area) {
      return { valid: false, reason: "Area obrigatoria ausente para diagnostico." };
    }

    if (!isValidOptions(options)) {
      return { valid: false, reason: "Opcoes invalidas para diagnostico." };
    }

    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      return { valid: false, reason: "correct_index invalido para diagnostico." };
    }

    return {
      valid: true,
      item: {
        area,
        level,
        concept: normalizeText(row.concept),
        question,
        options: [...options],
        correct: correctIndex,
        explanation
      }
    };
  }

  function validateChallengeRow(row) {
    const mode = normalizeText(row.mode);
    const level = normalizeText(row.level);
    const question = normalizeText(row.question);
    const explanation = normalizeText(row.explanation);
    const options = row.options;
    const correctIndex = Number(row.correct_index);
    const normalizedCategory = normalizeText(row.category) || CHALLENGE_DEFAULT_CATEGORY;
    const numericPoints = Number(row.points);
    const points = Number.isFinite(numericPoints) && numericPoints >= 0 ? numericPoints : 0;

    if (!mode || !question || !level || !explanation) {
      return { valid: false, reason: "Campos obrigatorios ausentes." };
    }

    if (!isValidOptions(options)) {
      return { valid: false, reason: "Opcoes invalidas para desafio." };
    }

    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      return { valid: false, reason: "correct_index invalido para desafio." };
    }

    return {
      valid: true,
      item: {
        category: normalizedCategory,
        area: normalizeText(row.area) || normalizedCategory,
        level,
        points,
        question,
        code: normalizeText(row.code),
        context: normalizeText(row.context),
        options: [...options],
        correct: correctIndex,
        explanation
      }
    };
  }

  function sanitizeRows(rows, mode) {
    const source = Array.isArray(rows) ? rows : [];
    const sanitized = [];

    source.forEach((row) => {
      const validator = mode === MODE_DIAGNOSTICO ? validateDiagnosticRow : validateChallengeRow;
      const result = validator(row);
      if (!result.valid) {
        console.warn("[QuestionBank] Item ignorado:", {
          mode,
          question_key: row && row.question_key,
          reason: result.reason
        });
        return;
      }
      sanitized.push(result.item);
    });

    return sanitized;
  }

  async function fetchQuestionBank({ mode, activeOnly = true }) {
    const service = globalScope.supabaseDataService;
    if (!service || typeof service.fetchQuestionBankRows !== "function") {
      return {
        ok: false,
        data: [],
        error: "Servico de leitura do Supabase indisponivel.",
        skipped: true
      };
    }

    const result = await service.fetchQuestionBankRows({ mode, activeOnly });
    if (!result || result.skipped) {
      return {
        ok: false,
        data: [],
        error: "Leitura ignorada por configuracao ausente.",
        skipped: true
      };
    }

    if (!result.ok) {
      return {
        ok: false,
        data: [],
        error: result.error?.message || "Falha ao consultar question_bank.",
        skipped: false
      };
    }

    const sanitized = sanitizeRows(result.data, mode);
    return {
      ok: true,
      data: sanitized,
      error: null,
      skipped: false
    };
  }

  async function loadQuestionContent() {
    const stateRef = getState();
    if (!stateRef) {
      console.warn("[QuestionBank] Estado global nao encontrado; fallback local mantido.");
      return {
        diagnostico: "fallback_local",
        desafio: "fallback_local"
      };
    }

    const [diagnosticResult, challengeResult] = await Promise.all([
      fetchQuestionBank({ mode: MODE_DIAGNOSTICO, activeOnly: true }),
      fetchQuestionBank({ mode: MODE_DESAFIO, activeOnly: true })
    ]);

    const fallbackDiagnostic = getFallbackDiagnosticQuestions();
    const fallbackChallenges = getFallbackChallenges();

    const diagnosticHasData = diagnosticResult.ok && diagnosticResult.data.length > 0;
    const challengeHasData = challengeResult.ok && challengeResult.data.length > 0;

    if (!diagnosticHasData) {
      console.warn("[QuestionBank] Usando fallback local para diagnostico.", diagnosticResult.error || "Sem dados ativos.");
    }
    if (!challengeHasData) {
      console.warn("[QuestionBank] Usando fallback local para desafios.", challengeResult.error || "Sem dados ativos.");
    }

    stateRef.diagnosticQuestionsRuntime = diagnosticHasData ? diagnosticResult.data : fallbackDiagnostic;
    stateRef.challengesRuntime = challengeHasData ? challengeResult.data : fallbackChallenges;
    stateRef.questionBankSource = {
      diagnostico: diagnosticHasData ? "supabase" : "fallback_local",
      desafio: challengeHasData ? "supabase" : "fallback_local"
    };

    return stateRef.questionBankSource;
  }

  globalScope.questionBankService = {
    fetchQuestionBank,
    loadQuestionContent
  };
})(window);
