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
    studentQuery: "q".repeat(5000),
    lastResultPreview: Array.from({ length: 10 }, (_, index) => ({
      total: index,
      nested: { ignored: true }
    })),
    lastError: "erro",
    validationStatus: "error",
    attemptCount: 2,
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
          return { response: "Comece identificando o que cada COUNT precisa medir." };
        }
      }
    }
  });
  const endpointBody = await endpointResponse.json();
  assert.strictEqual(endpointResponse.status, 200);
  assert.strictEqual(endpointBody.ok, true);
  assert.strictEqual(endpointBody.provider, "cloudflare-workers-ai");
  assert.match(modelCall.model, /^@cf\//);
  assert.ok(Array.isArray(modelCall.input.messages));
  assert.strictEqual(JSON.stringify(modelCall.input).includes("nao-enviar@example.com"), false);
  assert.strictEqual(JSON.stringify(modelCall.input).includes("segredo"), false);

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
  assert.match(pageSource, /data-ai-quick-action="how_to_start"/);
  assert.match(pageSource, /data-ai-quick-action="review_query"/);
  assert.match(pageSource, /data-ai-tutor-input/);
  assert.match(pageSource, /data-query-answer/);
  assert.match(pageSource, /data-validate-query/);
  assert.match(htmlSource, /src\/sql-ai-tutor\.js/);
  assert.match(cssSource, /@media \(max-width: 620px\)/);
  assert.match(cssSource, /\.sql-support-chat__messages/);
  assert.doesNotMatch(pageSource, /Chat com IA[\s\S]{0,200}<small>Em breve<\/small>/);

  console.log("SQL AI tutor tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
