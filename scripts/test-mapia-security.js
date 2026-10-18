const assert = require("assert");
const fs = require("fs");
const path = require("path");

async function loadEndpoint() {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "functions", "api", "sql-tutor.js"),
    "utf8"
  );
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}#${Date.now()}`);
}

function validPayload(overrides = {}) {
  return {
    practiceSlug: "sql-essencial-filtros-where",
    practiceTitle: "Filtrando pedidos pagos",
    practicePrompt: "Liste os pedidos pagos.",
    practiceObjective: "Aplicar WHERE.",
    practiceConcept: "Filtros",
    practiceHint: "Observe a coluna status.",
    prompt: "Qual é o próximo passo?",
    quickAction: "free_question",
    studentQuery: "SELECT * FROM pedidos",
    lastResultPreview: [],
    lastError: "",
    validationStatus: "idle",
    attemptCount: 0,
    recentMessages: [],
    schema: { table: "pedidos", columns: [], tables: [] },
    ...overrides
  };
}

class QuotaMock {
  constructor(options = {}) {
    this.profileLimits = {
      visitor: options.visitorLimit ?? 2,
      free: options.freeLimit ?? 2,
      premium: options.premiumLimit ?? 4
    };
    this.globalLimit = options.globalLimit ?? 100;
    this.concurrencyLimit = options.concurrencyLimit ?? 10;
    this.unavailable = Boolean(options.unavailable);
    this.actorUsage = new Map();
    this.active = new Map();
    this.globalUsage = 0;
    this.profilesSeen = [];
    this.inspectCalls = 0;
  }

  idFromName(name) {
    return name;
  }

  get() {
    return this;
  }

  async fetch(url, init) {
    if (this.unavailable) throw new Error("quota offline");
    const payload = JSON.parse(init.body);

    if (payload.operation === "inspect" || payload.operation === "reserve") {
      const isInspection = payload.operation === "inspect";
      if (isInspection) this.inspectCalls += 1;
      else this.profilesSeen.push(payload.profile);
      const activeForActor = [...this.active.values()]
        .filter((item) => item.actorKey === payload.actorKey).length;
      if (activeForActor >= this.concurrencyLimit) {
        return Response.json({
          ok: true,
          allowed: false,
          reason: "actor_concurrency",
          retryAfterSeconds: 2
        });
      }
      if (this.globalUsage >= this.globalLimit) {
        return Response.json({
          ok: true,
          allowed: false,
          reason: "global_limit",
          retryAfterSeconds: 60
        });
      }
      const actorUsage = this.actorUsage.get(payload.actorKey) || 0;
      if (actorUsage >= this.profileLimits[payload.profile]) {
        return Response.json({
          ok: true,
          allowed: false,
          reason: "profile_quota",
          retryAfterSeconds: 60
        });
      }

      if (isInspection) {
        return Response.json({
          ok: true,
          allowed: true,
          inspected: true
        });
      }

      this.globalUsage += 1;
      this.actorUsage.set(payload.actorKey, actorUsage + 1);
      this.active.set(payload.requestId, {
        actorKey: payload.actorKey,
        charged: true
      });
      return Response.json({
        ok: true,
        allowed: true,
        reservationId: payload.requestId
      });
    }

    if (payload.operation === "settle") {
      this.active.delete(payload.reservationId);
      return Response.json({ ok: true, settled: true, charged: true });
    }

    if (payload.operation === "release") {
      const reservation = this.active.get(payload.reservationId);
      if (reservation) {
        this.globalUsage -= 1;
        this.actorUsage.set(
          reservation.actorKey,
          Math.max(0, (this.actorUsage.get(reservation.actorKey) || 0) - 1)
        );
        this.active.delete(payload.reservationId);
      }
      return Response.json({ ok: true, released: Boolean(reservation) });
    }

    return Response.json({ ok: false }, { status: 400 });
  }
}

function authFetch(usersByToken = {}) {
  return async (url, init) => {
    const token = String(init?.headers?.Authorization || "").replace(/^Bearer\s+/i, "");
    const userId = usersByToken[token];
    return userId
      ? Response.json({ id: userId, email: "never-forwarded@example.com" })
      : Response.json({ message: "invalid token" }, { status: 401 });
  };
}

function entitlementBinding(activeUserIds = []) {
  return {
    async fetch(url, init) {
      const { userId } = JSON.parse(init.body);
      return Response.json({
        active: activeUserIds.includes(userId),
        plan: activeUserIds.includes(userId) ? "premium" : "free"
      });
    }
  };
}

function makeEnv(quota, aiRun, overrides = {}) {
  return {
    MAPIA_SECURITY_MODE: "enforce",
    MAPIA_ID_HASH_SECRET: "test-secret-with-sufficient-entropy-not-for-production",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    MAPIA_QUOTA: quota,
    AI: { run: aiRun || (async () => ({ response: "Revise a coluna status e tente novamente." })) },
    ...overrides
  };
}

function makeRequest(url, payload, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "CF-Connecting-IP": options.ip || "203.0.113.10"
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.cookie) headers.Cookie = options.cookie;
  if (options.origin) headers.Origin = options.origin;
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });
}

function cookieFrom(response) {
  return String(response.headers.get("set-cookie") || "").split(";", 1)[0];
}

async function invoke(endpoint, env, request, dependencies = {}) {
  return endpoint.handleSqlTutorRequest({ request, env }, dependencies);
}

async function testVisitorQuota(endpoint) {
  const quota = new QuotaMock({ visitorLimit: 1 });
  const env = makeEnv(quota);
  const first = await invoke(
    endpoint,
    env,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload())
  );
  assert.strictEqual(first.status, 200);
  const cookie = cookieFrom(first);
  assert.match(cookie, /^mapia_anon=/);

  const blocked = await invoke(
    endpoint,
    env,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { cookie })
  );
  assert.strictEqual(blocked.status, 429);
  assert.strictEqual((await blocked.json()).code, "profile_quota");
}

async function testFreeQuota(endpoint) {
  const quota = new QuotaMock({ freeLimit: 1 });
  const env = makeEnv(quota);
  const dependencies = { fetchImpl: authFetch({ freeToken: "user-free" }) };
  const first = await invoke(
    endpoint,
    env,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { token: "freeToken" }),
    dependencies
  );
  assert.strictEqual(first.status, 200);
  assert.strictEqual((await first.json()).profile, "free");

  const blocked = await invoke(
    endpoint,
    env,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { token: "freeToken" }),
    dependencies
  );
  assert.strictEqual(blocked.status, 429);
}

async function testPremiumPermission(endpoint) {
  const quota = new QuotaMock({ freeLimit: 1, premiumLimit: 2 });
  const env = makeEnv(quota, undefined, {
    MAPIA_ENTITLEMENTS: entitlementBinding(["user-premium"])
  });
  const dependencies = { fetchImpl: authFetch({ premiumToken: "user-premium" }) };
  for (let index = 0; index < 2; index += 1) {
    const response = await invoke(
      endpoint,
      env,
      makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { token: "premiumToken" }),
      dependencies
    );
    assert.strictEqual(response.status, 200);
    assert.strictEqual((await response.json()).profile, "premium");
  }
  assert.deepStrictEqual(quota.profilesSeen, ["premium", "premium"]);
}

async function testPremiumSpoofAndOtherUser(endpoint) {
  const quota = new QuotaMock();
  const env = makeEnv(quota);
  const dependencies = { fetchImpl: authFetch({ userBToken: "user-b" }) };
  const response = await invoke(
    endpoint,
    env,
    makeRequest(
      "https://trilhadedados.com.br/api/sql-tutor",
      validPayload({ plan: "premium", userId: "user-a" }),
      { token: "userBToken" }
    ),
    dependencies
  );
  assert.strictEqual(response.status, 400);
  assert.strictEqual((await response.json()).code, "invalid_payload");
  assert.strictEqual(quota.globalUsage, 0);
}

async function testInvalidToken(endpoint) {
  const quota = new QuotaMock();
  const response = await invoke(
    endpoint,
    makeEnv(quota),
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { token: "expired" }),
    { fetchImpl: authFetch({}) }
  );
  assert.strictEqual(response.status, 401);
  assert.strictEqual((await response.json()).code, "invalid_access_token");
}

async function testUsersSharingIp(endpoint) {
  const quota = new QuotaMock({ freeLimit: 1 });
  const env = makeEnv(quota);
  const dependencies = { fetchImpl: authFetch({ tokenA: "user-a", tokenB: "user-b" }) };
  for (const token of ["tokenA", "tokenB"]) {
    const response = await invoke(
      endpoint,
      env,
      makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), {
        token,
        ip: "198.51.100.20"
      }),
      dependencies
    );
    assert.strictEqual(response.status, 200);
  }
  assert.strictEqual(quota.actorUsage.size, 2);
}

async function testConcurrentQuota(endpoint) {
  const quota = new QuotaMock({ concurrencyLimit: 1, freeLimit: 5 });
  let startFirst;
  const firstStarted = new Promise((resolve) => { startFirst = resolve; });
  let finishFirst;
  const firstCompletion = new Promise((resolve) => { finishFirst = resolve; });
  let calls = 0;
  const env = makeEnv(quota, async () => {
    calls += 1;
    if (calls === 1) {
      startFirst();
      await firstCompletion;
    }
    return { response: "Resposta controlada para concorrência." };
  });
  const dependencies = { fetchImpl: authFetch({ token: "concurrent-user" }) };
  const firstPromise = invoke(
    endpoint,
    env,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { token: "token" }),
    dependencies
  );
  await firstStarted;
  const second = await invoke(
    endpoint,
    env,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { token: "token" }),
    dependencies
  );
  assert.strictEqual(second.status, 429);
  assert.strictEqual((await second.json()).code, "actor_concurrency");
  finishFirst();
  assert.strictEqual((await firstPromise).status, 200);
}

async function testDomainsShareQuota(endpoint) {
  const quota = new QuotaMock({ freeLimit: 1 });
  const env = makeEnv(quota);
  const dependencies = { fetchImpl: authFetch({ token: "same-user" }) };
  const primary = await invoke(
    endpoint,
    env,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { token: "token" }),
    dependencies
  );
  assert.strictEqual(primary.status, 200);
  const alternate = await invoke(
    endpoint,
    env,
    makeRequest("https://trilha-de-dados.pages.dev/api/sql-tutor", validPayload(), { token: "token" }),
    dependencies
  );
  assert.strictEqual(alternate.status, 429);
}

async function testQuotaUnavailable(endpoint) {
  const quota = new QuotaMock({ unavailable: true });
  const response = await invoke(
    endpoint,
    makeEnv(quota),
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload())
  );
  assert.strictEqual(response.status, 503);
  assert.strictEqual((await response.json()).code, "quota_unavailable");
}

async function testSecurityConfigurationFailsClosed(endpoint) {
  let inferenceCalls = 0;
  const aiRun = async () => {
    inferenceCalls += 1;
    return { response: "Esta inferência não deveria ser executada." };
  };
  const quota = new QuotaMock();
  const protectedBindings = {
    MAPIA_ID_HASH_SECRET: "test-secret-with-sufficient-entropy-not-for-production",
    MAPIA_QUOTA: quota,
    AI: { run: aiRun }
  };

  for (const env of [
    protectedBindings,
    { ...protectedBindings, MAPIA_SECURITY_MODE: "unexpected" },
    { ...protectedBindings, MAPIA_SECURITY_MODE: "   " }
  ]) {
    const response = await invoke(
      endpoint,
      env,
      makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload())
    );
    assert.strictEqual(response.status, 503);
    const body = await response.json();
    assert.strictEqual(body.code, "security_configuration_invalid");
    assert.doesNotMatch(JSON.stringify(body), /MAPIA_|test-secret|unexpected/i);
  }

  for (const securityMode of ["audit", "enforce"]) {
    for (const overrides of [
      { MAPIA_ID_HASH_SECRET: undefined },
      { MAPIA_QUOTA: undefined }
    ]) {
      const response = await invoke(
        endpoint,
        makeEnv(quota, aiRun, { ...overrides, MAPIA_SECURITY_MODE: securityMode }),
        makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload())
      );
      assert.strictEqual(response.status, 503);
      const body = await response.json();
      assert.strictEqual(body.code, "security_configuration_invalid");
      assert.doesNotMatch(JSON.stringify(body), /MAPIA_|test-secret/i);
    }
  }

  for (const overrides of [
    { SUPABASE_URL: undefined },
    { SUPABASE_PUBLISHABLE_KEY: undefined }
  ]) {
    const response = await invoke(
      endpoint,
      makeEnv(quota, aiRun, overrides),
      makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), {
        token: "authenticated-user-token"
      })
    );
    assert.strictEqual(response.status, 503);
    assert.strictEqual((await response.json()).code, "auth_unavailable");
  }

  assert.strictEqual(inferenceCalls, 0);
  assert.strictEqual(quota.globalUsage, 0);
}

async function testAuditDoesNotConsumeOrReject(endpoint) {
  const quota = new QuotaMock({ visitorLimit: 1 });
  const auditEnv = makeEnv(quota, undefined, { MAPIA_SECURITY_MODE: "audit" });
  let cookie = "";
  for (let index = 0; index < 3; index += 1) {
    const response = await invoke(
      endpoint,
      auditEnv,
      makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { cookie })
    );
    assert.strictEqual(response.status, 200);
    cookie ||= cookieFrom(response);
  }
  assert.strictEqual(quota.inspectCalls, 3);
  assert.strictEqual(quota.globalUsage, 0);
  assert.strictEqual(quota.actorUsage.size, 0);
  assert.strictEqual(quota.active.size, 0);

  const enforceEnv = { ...auditEnv, MAPIA_SECURITY_MODE: "enforce" };
  const allowed = await invoke(
    endpoint,
    enforceEnv,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { cookie })
  );
  assert.strictEqual(allowed.status, 200);
  const blocked = await invoke(
    endpoint,
    enforceEnv,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { cookie })
  );
  assert.strictEqual(blocked.status, 429);

  const auditLogs = [];
  const originalLog = console.log;
  console.log = (...args) => auditLogs.push(args.join(" "));
  try {
    const observedOnly = await invoke(
      endpoint,
      auditEnv,
      makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { cookie })
    );
    assert.strictEqual(observedOnly.status, 200);
  } finally {
    console.log = originalLog;
  }
  assert.strictEqual(quota.globalUsage, 1);
  assert.ok(auditLogs.some((line) => line.includes("request_would_be_blocked")));
}

async function testGlobalLimit(endpoint) {
  const quota = new QuotaMock({ globalLimit: 1 });
  const env = makeEnv(quota);
  const first = await invoke(
    endpoint,
    env,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { ip: "203.0.113.1" })
  );
  assert.strictEqual(first.status, 200);
  const second = await invoke(
    endpoint,
    env,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { ip: "203.0.113.2" })
  );
  assert.strictEqual(second.status, 429);
  assert.strictEqual((await second.json()).code, "global_limit");
}

async function testInferenceFailureAndTimeoutAreCharged(endpoint) {
  const failureQuota = new QuotaMock({ visitorLimit: 1 });
  const failureEnv = makeEnv(failureQuota, async () => { throw new Error("upstream failed"); });
  const failed = await invoke(
    endpoint,
    failureEnv,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload())
  );
  assert.strictEqual(failed.status, 502);
  const failedCookie = cookieFrom(failed);
  const afterFailure = await invoke(
    endpoint,
    failureEnv,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { cookie: failedCookie })
  );
  assert.strictEqual(afterFailure.status, 429);

  const timeoutQuota = new QuotaMock({ visitorLimit: 1 });
  const timeoutEnv = makeEnv(timeoutQuota, () => new Promise(() => {}));
  const timedOut = await invoke(
    endpoint,
    timeoutEnv,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload()),
    { inferenceTimeoutMs: 5 }
  );
  assert.strictEqual(timedOut.status, 504);
  const timeoutCookie = cookieFrom(timedOut);
  const afterTimeout = await invoke(
    endpoint,
    timeoutEnv,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), { cookie: timeoutCookie }),
    { inferenceTimeoutMs: 5 }
  );
  assert.strictEqual(afterTimeout.status, 429);
}

async function testCompatibilityAndInputLimits(endpoint) {
  let modelInput;
  const offEnv = {
    MAPIA_SECURITY_MODE: "off",
    AI: {
      async run(model, input) {
        modelInput = { model, input };
        return { response: "Confira o objetivo e preserve o filtro solicitado." };
      }
    }
  };
  const compatible = await invoke(
    endpoint,
    offEnv,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload())
  );
  assert.strictEqual(compatible.status, 200);
  assert.strictEqual(modelInput.model, "@cf/meta/llama-3.1-8b-instruct-fp8");
  assert.match(JSON.stringify(modelInput.input.messages), /Você é a Tutora IA de SQL/);

  const unknownParameter = await invoke(
    endpoint,
    offEnv,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload({ unexpected: true }))
  );
  assert.strictEqual(unknownParameter.status, 400);

  const oversized = new Request("https://trilhadedados.com.br/api/sql-tutor", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(endpoint.__test.MAX_BODY_BYTES + 1)
    },
    body: "{}"
  });
  const oversizedResponse = await invoke(endpoint, offEnv, oversized);
  assert.strictEqual(oversizedResponse.status, 413);

  let streamCancelled = false;
  let pulls = 0;
  const oversizedStream = new ReadableStream({
    pull(controller) {
      pulls += 1;
      controller.enqueue(new Uint8Array(20 * 1024));
    },
    cancel() {
      streamCancelled = true;
    }
  });
  const streamedOversized = new Request("https://trilhadedados.com.br/api/sql-tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: oversizedStream,
    duplex: "half"
  });
  const streamedOversizedResponse = await invoke(endpoint, offEnv, streamedOversized);
  assert.strictEqual(streamedOversizedResponse.status, 413);
  assert.strictEqual((await streamedOversizedResponse.json()).code, "payload_too_large");
  assert.strictEqual(streamCancelled, true);
  assert.ok(pulls <= 3, "o leitor limitado não deve consumir o restante do stream");

  const crossOrigin = await invoke(
    endpoint,
    offEnv,
    makeRequest("https://trilhadedados.com.br/api/sql-tutor", validPayload(), {
      origin: "https://example.net"
    })
  );
  assert.strictEqual(crossOrigin.status, 403);
}

async function run() {
  const endpoint = await loadEndpoint();
  await testVisitorQuota(endpoint);
  await testFreeQuota(endpoint);
  await testPremiumPermission(endpoint);
  await testPremiumSpoofAndOtherUser(endpoint);
  await testInvalidToken(endpoint);
  await testUsersSharingIp(endpoint);
  await testConcurrentQuota(endpoint);
  await testDomainsShareQuota(endpoint);
  await testQuotaUnavailable(endpoint);
  await testSecurityConfigurationFailsClosed(endpoint);
  await testAuditDoesNotConsumeOrReject(endpoint);
  await testGlobalLimit(endpoint);
  await testInferenceFailureAndTimeoutAreCharged(endpoint);
  await testCompatibilityAndInputLimits(endpoint);

  const workerSource = fs.readFileSync(
    path.join(__dirname, "..", "workers", "mapia-quota", "src", "index.mjs"),
    "utf8"
  );
  assert.match(workerSource, /SQLite|storage\.sql|ctx\.storage\.sql/);
  assert.match(workerSource, /status = 'active'/);
  assert.match(workerSource, /visitor_ip_quota/);
  assert.match(workerSource, /quota_configuration_invalid/);
  assert.match(workerSource, /transactionSync/);
  assert.match(workerSource, /operation === "inspect"/);
  assert.match(workerSource, /access_denied/);
  assert.doesNotMatch(workerSource, /MAPIA_QUOTA_COORDINATOR/);
  assert.doesNotMatch(workerSource, /MAPIA_VISITOR_DAILY_LIMIT[^\n]+\|\|\s*5/);

  const practiceHtml = fs.readFileSync(
    path.join(__dirname, "..", "praticas-sql.html"),
    "utf8"
  );
  const authScriptIndex = practiceHtml.indexOf('src="src/auth-service.js"');
  const tutorScriptIndex = practiceHtml.indexOf('src="src/sql-ai-tutor.js');
  assert.ok(authScriptIndex >= 0, "auth-service.js deve estar presente");
  assert.ok(tutorScriptIndex > authScriptIndex, "auth-service.js deve carregar antes da MapIA");
  assert.doesNotMatch(practiceHtml, /20260614-tutor-final/);

  console.log("MapIA security and quota tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
