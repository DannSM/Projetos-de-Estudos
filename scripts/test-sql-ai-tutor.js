const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadTutor() {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "src", "sql-ai-tutor.js"),
    "utf8"
  );
  const window = {};
  vm.runInNewContext(source, { window, globalThis: window, JSON, Object, Set });
  return window.SqlAiTutor;
}

async function loadEndpoint() {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "functions", "api", "sql-tutor.js"),
    "utf8"
  );
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

async function run() {
  const tutor = loadTutor();
  const endpoint = await loadEndpoint();
  const payload = tutor.buildPayload({
    practiceSlug: "sql-etapa-2",
    practiceTitle: "COUNT",
    practicePrompt: "x".repeat(1400),
    practiceObjective: "Comparar formas de contagem sem depender de uma etapa fixa.",
    studentQuery: "q".repeat(5000),
    lastResultPreview: Array.from({ length: 10 }, (_, index) => ({
      total: index,
      nested: { ignored: true }
    })),
    lastError: "erro",
    validationStatus: "error",
    attemptCount: 2,
    recentMessages: [
      { role: "student", content: "Oi" },
      { role: "assistant", content: "Olá! Vamos olhar o objetivo." },
      { role: "student", content: "Qual coluna devo usar?" },
      { role: "assistant", content: "Confira as colunas ligadas à métrica." },
      { role: "student", content: "Certo, vou tentar." },
      { role: "assistant", content: "Comece pelo primeiro cálculo." },
      { role: "student", content: "Mensagem que deve permanecer no limite." }
    ],
    schema: {
      table: "pedidos",
      columns: [{ name: "pedido_id", type: "integer" }]
    },
    email: "nao-enviar@example.com",
    accessToken: "segredo"
  }, "review_query", "");

  assert.ok(payload);
  assert.strictEqual(payload.studentQuery.length, tutor.MAX_QUERY_CHARS);
  assert.strictEqual(payload.lastResultPreview.length, tutor.MAX_RESULT_ROWS);
  assert.strictEqual(payload.recentMessages.length, tutor.MAX_HISTORY_MESSAGES);
  assert.strictEqual(payload.recentMessages[0].content, "Olá! Vamos olhar o objetivo.");
  assert.strictEqual("email" in payload, false);
  assert.strictEqual("accessToken" in payload, false);
  assert.strictEqual(tutor.buildPayload({}, "free_question", ""), null);
  assert.strictEqual(tutor.buildPayload({}, "acao_invalida", "ajuda"), null);

  const freeQuestion = tutor.buildPayload({}, "free_question", "a".repeat(1000));
  assert.strictEqual(freeQuestion.prompt.length, tutor.MAX_PROMPT_CHARS);

  const fallback = await tutor.requestTutor(freeQuestion, async () => ({
    status: 404,
    ok: false,
    async json() {
      return {};
    }
  }));
  assert.strictEqual(fallback.ok, false);
  assert.strictEqual(fallback.unavailable, true);
  assert.match(fallback.message, /Cloudflare/);

  const networkFallback = await tutor.requestTutor(freeQuestion, async () => {
    throw new Error("offline");
  });
  assert.strictEqual(networkFallback.ok, false);

  const missingBindingResponse = await endpoint.onRequest({
    request: new Request("https://example.com/api/sql-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(freeQuestion)
    }),
    env: {}
  });
  assert.strictEqual(missingBindingResponse.status, 503);

  let modelCall = null;
  const endpointResponse = await endpoint.onRequest({
    request: new Request("https://example.com/api/sql-tutor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
    env: {
      AI: {
        async run(model, input) {
          modelCall = { model, input };
          return { response: Array.from({ length: 140 }, () => "orientação").join(" ") };
        }
      }
    }
  });
  const endpointBody = await endpointResponse.json();
  assert.strictEqual(endpointResponse.status, 200);
  assert.strictEqual(endpointBody.ok, true);
  assert.strictEqual(endpointBody.provider, "cloudflare-workers-ai");
  assert.ok(endpointBody.answer.split(/\s+/).length <= 90);
  assert.match(endpointBody.answer, /…$/);
  assert.strictEqual(modelCall.model, "@cf/meta/llama-3.1-8b-instruct-fp8");
  assert.ok(Array.isArray(modelCall.input.messages));
  assert.strictEqual(JSON.stringify(modelCall.input).includes("nao-enviar@example.com"), false);
  assert.strictEqual(JSON.stringify(modelCall.input).includes("segredo"), false);
  const promptMessages = JSON.stringify(modelCall.input.messages);
  assert.match(promptMessages, /Comparar formas de contagem/);
  assert.match(promptMessages, /histórico recente recebidos/);
  assert.match(promptMessages, /Mensagem que deve permanecer no limite/);
  assert.match(promptMessages, /Não recomende WHERE, GROUP BY, JOIN, DISTINCT/);
  assert.match(promptMessages, /Nunca diga o aluno/);
  assert.match(promptMessages, /Converse em português do Brasil/);
  assert.match(promptMessages, /Não comece repetidamente com Vamos começar/);
  assert.match(promptMessages, /ofereça ajuda por partes/);
  assert.match(promptMessages, /COUNT\(coluna\) conta somente valores não nulos/);
  assert.match(promptMessages, /Nunca diga que COUNT\(coluna\) conta nulos/);
  assert.match(promptMessages, /no máximo uma orientação prática por resposta/);
  assert.match(promptMessages, /COUNT\(\*\) - COUNT\(coluna\)/);
  assert.doesNotMatch(promptMessages, /pedidos pagos por categoria/);

  const pageSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "sql-practice-page.js"),
    "utf8"
  );
  const htmlSource = fs.readFileSync(
    path.join(__dirname, "..", "praticas-sql.html"),
    "utf8"
  );
  const cssSource = fs.readFileSync(
    path.join(__dirname, "..", "styles", "components.css"),
    "utf8"
  );
  assert.match(pageSource, /what_to_observe/);
  assert.match(pageSource, /learning_summary/);
  assert.match(pageSource, /detectAiStudentIntention/);
  assert.match(pageSource, /ready_query/);
  assert.match(pageSource, /assistantSuggestedAttempt/);
  assert.match(pageSource, /Me guie por partes/);
  assert.match(pageSource, /O resultado faz sentido/);
  assert.match(pageSource, /count\(\*\) as total,\\n  count\(campo\) as preenchidos/);
  assert.match(pageSource, /data-toggle-practice-schema/);
  assert.match(pageSource, /messages\.scrollTop = messages\.scrollHeight/);
  assert.match(pageSource, /Tutora IA/);
  assert.match(pageSource, /data-lucide="sparkles"/);
  assert.match(pageSource, />Pensando</);
  assert.match(pageSource, /data-ai-tutor-input/);
  assert.match(pageSource, /data-query-answer/);
  assert.match(pageSource, /data-validate-query/);
  assert.match(htmlSource, /src\/sql-ai-tutor\.js/);
  assert.match(cssSource, /@media \(max-width: 620px\)/);
  assert.match(cssSource, /\.sql-support-chat__messages/);
  assert.match(cssSource, /flex-direction: column/);
  assert.match(cssSource, /\.sql-support-chat__messages\.is-empty/);
  assert.match(cssSource, /max-height: clamp\(14rem, 34vh, 20rem\)/);
  const conversationRule = cssSource.match(/\.sql-support-chat__messages\.has-conversation\s*\{[^}]*\}/)?.[0] || "";
  assert.doesNotMatch(conversationRule, /(?:^|[;\r\n])\s*height\s*:/);
  assert.doesNotMatch(cssSource, /\.sql-support-chat__message\.is-assistant\s*\{[^}]*overflow-y:/);
  assert.match(cssSource, /white-space: pre-wrap/);
  assert.match(cssSource, /overflow-wrap: anywhere/);
  assert.match(cssSource, /word-break: normal/);
  assert.match(cssSource, /sql-ai-tutor-dot/);
  assert.match(cssSource, /font-size: 0\.78rem/);
  assert.match(cssSource, /\.sql-support-schema\.is-collapsed/);
  assert.doesNotMatch(pageSource, /Chat com IA[\s\S]{0,200}<small>Em breve<\/small>/);

  console.log("SQL AI tutor tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
