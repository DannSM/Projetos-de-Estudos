(function initSqlAiTutor(globalScope) {
  const MAX_PROMPT_CHARS = 800;
  const MAX_QUERY_CHARS = 4000;
  const MAX_RESULT_ROWS = 5;
  const MAX_HISTORY_MESSAGES = 6;
  const ENDPOINT = "/api/sql-tutor";
  const QUICK_ACTIONS = new Set([
    "hint",
    "explain_error",
    "review_query",
    "how_to_start",
    "what_to_observe",
    "how_to_fix",
    "what_is_missing",
    "validate_reasoning",
    "another_hint",
    "review_reasoning",
    "learning_summary",
    "next_concept",
    "column_to_use",
    "function_to_use",
    "build_in_parts",
    "first_snippet",
    "review_attempt",
    "can_execute",
    "result_sense",
    "what_to_validate",
    "where_is_problem",
    "compare_objective",
    "next_practice",
    "free_question"
  ]);

  function truncate(value, maxLength) {
    return String(value || "").trim().slice(0, maxLength);
  }

  function sanitizeResultPreview(rows) {
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.slice(0, MAX_RESULT_ROWS).map((row) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        return {};
      }

      return Object.fromEntries(
        Object.entries(row)
          .slice(0, 12)
          .map(([key, value]) => [
            truncate(key, 80),
            value === null || ["string", "number", "boolean"].includes(typeof value)
              ? typeof value === "string" ? truncate(value, 300) : value
              : truncate(JSON.stringify(value), 300)
          ])
      );
    });
  }

  function sanitizeSchema(schema) {
    const columns = Array.isArray(schema?.columns)
      ? schema.columns.slice(0, 30).map((column) => ({
          name: truncate(column?.name, 80),
          type: truncate(column?.type, 80)
        })).filter((column) => column.name)
      : [];

    return {
      table: truncate(schema?.table, 80),
      columns
    };
  }

  function sanitizeRecentMessages(messages) {
    if (!Array.isArray(messages)) {
      return [];
    }

    return messages.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "student",
      content: truncate(message?.content, 500)
    })).filter((message) => message.content);
  }

  function buildPayload(context, quickAction, prompt) {
    if (!QUICK_ACTIONS.has(quickAction)) {
      return null;
    }

    const sanitizedPrompt = truncate(prompt, MAX_PROMPT_CHARS);
    if (quickAction === "free_question" && !sanitizedPrompt) {
      return null;
    }

    return {
      practiceSlug: truncate(context?.practiceSlug, 120),
      practiceTitle: truncate(context?.practiceTitle, 160),
      practicePrompt: truncate(context?.practicePrompt, 1200),
      practiceObjective: truncate(context?.practiceObjective, 800),
      prompt: sanitizedPrompt,
      quickAction,
      studentQuery: truncate(context?.studentQuery, MAX_QUERY_CHARS),
      lastResultPreview: sanitizeResultPreview(context?.lastResultPreview),
      lastError: truncate(context?.lastError, 1200),
      validationStatus: truncate(context?.validationStatus || "idle", 20),
      attemptCount: Math.max(0, Math.min(Number(context?.attemptCount) || 0, 100)),
      recentMessages: sanitizeRecentMessages(context?.recentMessages),
      schema: sanitizeSchema(context?.schema)
    };
  }

  async function requestTutor(payload, fetchImpl = globalScope.fetch?.bind(globalScope)) {
    if (!payload || typeof fetchImpl !== "function") {
      return {
        ok: false,
        message: "Digite uma pergunta ou escolha uma ação rápida."
      };
    }

    try {
      const response = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.status === 404 || response.status === 405) {
        return {
          ok: false,
          unavailable: true,
          message: "IA tutora disponível apenas no ambiente Cloudflare configurado."
        };
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        return {
          ok: false,
          message: data.message || "Não consegui responder agora. Tente novamente em instantes."
        };
      }

      return data;
    } catch (error) {
      return {
        ok: false,
        unavailable: true,
        message: "IA tutora disponível apenas no ambiente Cloudflare configurado."
      };
    }
  }

  globalScope.SqlAiTutor = {
    MAX_PROMPT_CHARS,
    MAX_QUERY_CHARS,
    MAX_RESULT_ROWS,
    MAX_HISTORY_MESSAGES,
    QUICK_ACTIONS,
    buildPayload,
    requestTutor,
    sanitizeResultPreview
  };
})(typeof window !== "undefined" ? window : globalThis);
