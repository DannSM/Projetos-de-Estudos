const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const serviceSource = fs.readFileSync(path.join(root, "src", "diagnostic-account-link-service.js"), "utf8");
const migrationSource = fs.readFileSync(
  path.join(root, "supabase", "migrations", "20260622004102_claim_anonymous_diagnostic.sql"),
  "utf8"
);

function createHarness({ rpcStatus = "claimed", learningOk = true } = {}) {
  const storage = new Map();
  const rpcCalls = [];
  const events = [];
  const successfulWrites = {
    userLearningProgress: { ok: learningOk },
    learningRecommendations: { ok: learningOk },
    userSkillProgress: { ok: learningOk }
  };
  const window = {
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key)
    },
    authService: {
      getClient: () => ({
        rpc: async (name, params) => {
          rpcCalls.push({ name, params });
          return { data: { status: rpcStatus }, error: null };
        }
      }),
      getCurrentSession: async () => ({ ok: true, user: { id: "user-1" } })
    },
    personalizedLearningService: {
      generateFromDiagnosticResult: async () => ({ ok: true, writes: successfulWrites })
    },
    dispatchEvent: (event) => events.push(event)
  };

  class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  }

  vm.runInNewContext(serviceSource, { window, CustomEvent, console, Date, JSON, Promise });
  return { window, storage, rpcCalls, events };
}

async function main() {
  const claimed = createHarness();
  claimed.window.diagnosticAccountLinkService.markPendingDiagnostic({
    attempt_id: "diag_current",
    anonymous_user_id: "anon_current",
    result: { scorePercent: 80 }
  });
  const claimedResult = await claimed.window.diagnosticAccountLinkService.claimPendingDiagnostic();

  assert.equal(claimedResult.ok, true);
  assert.equal(claimed.rpcCalls.length, 1);
  assert.equal(claimed.rpcCalls[0].name, "claim_anonymous_diagnostic");
  assert.equal(claimed.rpcCalls[0].params.p_attempt_id, "diag_current");
  assert.equal(claimed.rpcCalls[0].params.p_anonymous_user_id, "anon_current");
  assert.equal(claimed.window.diagnosticAccountLinkService.readPendingDiagnostic(), null);
  assert.equal(claimed.events[0]?.detail?.attemptId, "diag_current");

  const incompleteLearning = createHarness({ learningOk: false });
  incompleteLearning.window.diagnosticAccountLinkService.markPendingDiagnostic({
    attempt_id: "diag_retry",
    anonymous_user_id: "anon_retry",
    result: { scorePercent: 50 }
  });
  const retryResult = await incompleteLearning.window.diagnosticAccountLinkService.claimPendingDiagnostic();
  assert.equal(retryResult.ok, false);
  assert.equal(incompleteLearning.window.diagnosticAccountLinkService.readPendingDiagnostic()?.attempt_id, "diag_retry");

  const claimedByOther = createHarness({ rpcStatus: "claimed_by_other" });
  claimedByOther.window.diagnosticAccountLinkService.markPendingDiagnostic({
    attempt_id: "diag_foreign",
    anonymous_user_id: "anon_shared",
    result: {}
  });
  const foreignResult = await claimedByOther.window.diagnosticAccountLinkService.claimPendingDiagnostic();
  assert.equal(foreignResult.status, "claimed_by_other");
  assert.equal(claimedByOther.window.diagnosticAccountLinkService.readPendingDiagnostic(), null);

  assert.match(migrationSource, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(migrationSource, /attempt_id = p_attempt_id[\s\S]*anonymous_user_id = p_anonymous_user_id[\s\S]*user_id is null/g);
  assert.equal((migrationSource.match(/update public\.(diagnostic_sessions|diagnostic_answers|diagnostic_funnel_events|satisfaction_feedback)/g) || []).length, 4);
  assert.match(migrationSource, /v_session_user_id <> v_user_id/);
  assert.match(migrationSource, /interval '24 hours'/);
  assert.match(migrationSource, /security invoker/);

  console.log("diagnostic account link: ok");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
