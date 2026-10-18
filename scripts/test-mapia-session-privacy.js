const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  createMapiaSessionGuard,
  deriveIdentityKey
} = require("../src/mapia-session-guard.js");
const sqlPracticePrivacy = require("../src/sql-practice-privacy.js");

const NOTE_PREFIX = "dsm:sql-practice-note";
const FEEDBACK_PREFIX = "dsm:sql-practice-feedback";
const PRACTICE_SLUG = "sql-essencial-count-nulos-distintos";

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function createConversation() {
  return {
    draft: "Pergunta ainda digitada",
    status: "loading",
    messages: [
      { role: "student", content: "Minha pergunta" },
      { role: "assistant", content: "Orientação anterior" }
    ],
    error: "Erro anterior",
    metadata: { provider: "mock", model: "mock", durationMs: 10 },
    shouldScroll: true
  };
}

function clearConversation(state) {
  state.aiTutor = {
    draft: "",
    status: "idle",
    messages: [],
    error: "",
    metadata: null,
    shouldScroll: false
  };
}

function applyTransition(guard, state, authState, options) {
  const transition = guard.updateIdentity(authState, options);
  if (transition.invalidated) {
    clearConversation(state);
  }
  return transition;
}

function createCentralSqlState() {
  return {
    queryAnswer: "select segredo_da_conta_a",
    attempts: { [PRACTICE_SLUG]: { attemptCount: 3, status: "correct" } },
    feedback: { status: "correct", title: "Correto", message: "Conta A" },
    sqlWorkbench: {
      status: "ready",
      engine: { kind: "mock-pglite" },
      execution: { rows: [{ segredo: "A" }] },
      executionQuery: "select segredo_da_conta_a",
      error: "erro A"
    },
    practiceNote: "Anotação da conta A",
    noteStatus: "salva",
    practiceFeedback: { difficulty: "hard", confidence: "low", comment: "Feedback A" },
    feedbackStatus: "salvo",
    isAuthenticated: true,
    studentName: "Alice",
    lastQueryRunId: "query-a",
    persistenceStatus: "Progresso A",
    loadingPracticeSlug: PRACTICE_SLUG,
    activeUtility: "note",
    aiTutor: createConversation()
  };
}

function loadDrafts(storage, identityKey) {
  return sqlPracticePrivacy.loadScopedDrafts({
    storage,
    identityKey,
    slug: PRACTICE_SLUG,
    notePrefix: NOTE_PREFIX,
    feedbackPrefix: FEEDBACK_PREFIX
  });
}

async function run() {
  assert.equal(deriveIdentityKey({}), "anonymous");
  assert.equal(deriveIdentityKey({ user: { id: "aluno-a" } }), "user:aluno-a");

  const logoutState = { aiTutor: createConversation(), renderCount: 0 };
  const logoutGuard = createMapiaSessionGuard();
  logoutGuard.updateIdentity({ user: { id: "aluno-a" } });
  const logoutTransition = applyTransition(
    logoutGuard,
    logoutState,
    { session: null, user: null },
    { forceInvalidate: true }
  );
  logoutState.renderCount += logoutTransition.invalidated ? 1 : 0;
  assert.equal(logoutTransition.invalidated, true);
  assert.deepEqual(logoutState.aiTutor.messages, []);
  assert.equal(logoutState.aiTutor.draft, "");
  assert.equal(logoutState.aiTutor.error, "");
  assert.equal(logoutState.aiTutor.metadata, null);
  assert.equal(logoutState.aiTutor.status, "idle");
  assert.equal(logoutState.renderCount, 1, "a limpeza deve renderizar sem recarregar");

  const pendingGuard = createMapiaSessionGuard();
  pendingGuard.updateIdentity({ user: { id: "aluno-a" } });
  const pendingRequest = pendingGuard.beginRequest();
  assert.equal(pendingRequest.isCurrent(), true);
  pendingGuard.updateIdentity({}, { forceInvalidate: true });
  assert.equal(pendingRequest.signal.aborted, true, "logout deve abortar a requisição local");
  assert.equal(pendingRequest.isCurrent(), false, "resposta atrasada deve perder a geração ativa");

  const delayedState = { aiTutor: createConversation() };
  const delayedGuard = createMapiaSessionGuard();
  delayedGuard.updateIdentity({ user: { id: "aluno-a" } });
  const delayedRequest = delayedGuard.beginRequest();
  const delayedResponse = Promise.resolve({ ok: true, answer: "Resposta que chegou tarde" });
  applyTransition(delayedGuard, delayedState, {}, { forceInvalidate: true });
  const result = await delayedResponse;
  if (delayedRequest.isCurrent() && result.ok) {
    delayedState.aiTutor.messages.push({ role: "assistant", content: result.answer });
  }
  assert.deepEqual(delayedState.aiTutor.messages, []);

  const identityState = { aiTutor: createConversation() };
  const identityGuard = createMapiaSessionGuard();
  identityGuard.updateIdentity({
    session: { access_token: "token-antigo-de-teste", user: { id: "aluno-a" } },
    user: { id: "aluno-a" }
  });
  const tokenRefresh = applyTransition(identityGuard, identityState, {
    session: { access_token: "token-renovado-de-teste", user: { id: "aluno-a" } },
    user: { id: "aluno-a" }
  });
  assert.equal(tokenRefresh.invalidated, false, "renovação da mesma identidade deve preservar a conversa");
  assert.equal(identityGuard.getIdentityKey(), "user:aluno-a", "o token não pode compor a identidade local");
  assert.equal(identityState.aiTutor.messages.length, 2);

  const accountSwitch = applyTransition(identityGuard, identityState, {
    user: { id: "aluno-b" }
  });
  assert.equal(accountSwitch.invalidated, true);
  assert.deepEqual(identityState.aiTutor.messages, []);

  identityState.aiTutor.messages.push({ role: "student", content: "Conversa da conta B" });
  applyTransition(identityGuard, identityState, {}, { forceInvalidate: true });
  assert.deepEqual(identityState.aiTutor.messages, []);
  const anonymousRequest = identityGuard.beginRequest();
  assert.equal(anonymousRequest.isCurrent(), true, "o fluxo anônimo deve continuar disponível");
  anonymousRequest.finish();

  const sameAccountLogin = applyTransition(identityGuard, identityState, {
    user: { id: "aluno-a" }
  });
  assert.equal(sameAccountLogin.invalidated, true);
  assert.deepEqual(identityState.aiTutor.messages, [], "novo login não deve restaurar a conversa anterior");

  const storage = new MemoryStorage();
  const accountAKey = "user:aluno-a";
  const accountBKey = "user:aluno-b";
  const anonymousKey = "anonymous";
  const accountANoteKey = sqlPracticePrivacy.getScopedStorageKey(NOTE_PREFIX, PRACTICE_SLUG, accountAKey);
  const accountAFeedbackKey = sqlPracticePrivacy.getScopedStorageKey(FEEDBACK_PREFIX, PRACTICE_SLUG, accountAKey);
  const accountBNoteKey = sqlPracticePrivacy.getScopedStorageKey(NOTE_PREFIX, PRACTICE_SLUG, accountBKey);
  const anonymousNoteKey = sqlPracticePrivacy.getScopedStorageKey(NOTE_PREFIX, PRACTICE_SLUG, anonymousKey);
  storage.setItem(accountANoteKey, JSON.stringify("Anotação privada A"));
  storage.setItem(accountAFeedbackKey, JSON.stringify({ comment: "Feedback privado A" }));
  storage.setItem(accountBNoteKey, JSON.stringify("Anotação privada B"));
  storage.setItem(anonymousNoteKey, JSON.stringify("Rascunho do visitante"));

  assert.equal(loadDrafts(storage, accountAKey).note, "Anotação privada A");
  assert.equal(loadDrafts(storage, accountBKey).note, "Anotação privada B");
  assert.equal(loadDrafts(storage, anonymousKey).note, "Rascunho do visitante");
  assert.notEqual(accountANoteKey, accountBNoteKey);
  assert.notEqual(accountANoteKey, anonymousNoteKey);

  const centralState = createCentralSqlState();
  let practices = [{ slug: PRACTICE_SLUG, userProgressStatus: "completed" }];
  sqlPracticePrivacy.resetCentralSqlPersonalizedState(centralState);
  practices = sqlPracticePrivacy.clearPracticeProgress(practices);
  const anonymousDrafts = loadDrafts(storage, anonymousKey);
  centralState.practiceNote = anonymousDrafts.note;
  centralState.practiceFeedback = anonymousDrafts.feedback;
  clearConversation(centralState);
  assert.equal(centralState.queryAnswer, "");
  assert.deepEqual(centralState.attempts, {});
  assert.equal(centralState.feedback, null);
  assert.equal(centralState.sqlWorkbench.execution, null);
  assert.equal(centralState.sqlWorkbench.executionQuery, "");
  assert.equal(centralState.practiceNote, "Rascunho do visitante");
  assert.equal(centralState.practiceFeedback.comment, "");
  assert.equal(centralState.studentName, "Você");
  assert.equal(centralState.lastQueryRunId, null);
  assert.equal(practices[0].userProgressStatus, "");
  assert.deepEqual(centralState.aiTutor.messages, []);

  const reloadedAccountB = loadDrafts(storage, accountBKey);
  assert.equal(reloadedAccountB.note, "Anotação privada B", "reload da conta B deve usar apenas seu namespace");
  assert.notEqual(reloadedAccountB.note, "Anotação privada A");
  const returningAccountA = loadDrafts(storage, accountAKey);
  assert.equal(returningAccountA.note, "Anotação privada A", "conta A deve recuperar somente seus dados");
  assert.equal(returningAccountA.feedback.comment, "Feedback privado A");

  const legacyNoteKey = sqlPracticePrivacy.getLegacyStorageKey(NOTE_PREFIX, PRACTICE_SLUG);
  const legacyFeedbackKey = sqlPracticePrivacy.getLegacyStorageKey(FEEDBACK_PREFIX, PRACTICE_SLUG);
  const legacyNoteValue = JSON.stringify("Conteúdo legado sem proprietário comprovado");
  const legacyFeedbackValue = JSON.stringify({ comment: "Feedback legado" });
  storage.setItem(legacyNoteKey, legacyNoteValue);
  storage.setItem(legacyFeedbackKey, legacyFeedbackValue);
  const accountBAfterLegacy = loadDrafts(storage, accountBKey);
  assert.equal(accountBAfterLegacy.note, "Anotação privada B");
  assert.equal(accountBAfterLegacy.legacy.note, true);
  assert.equal(accountBAfterLegacy.legacy.feedback, true);
  assert.equal(storage.getItem(legacyNoteKey), legacyNoteValue, "nota legada deve ser preservada integralmente");
  assert.equal(storage.getItem(legacyFeedbackKey), legacyFeedbackValue, "feedback legado deve ser preservado integralmente");
  assert.notEqual(accountBAfterLegacy.note, "Conteúdo legado sem proprietário comprovado");

  const asyncGuard = createMapiaSessionGuard();
  asyncGuard.updateIdentity({ user: { id: "aluno-a" } });
  const delayedLoad = asyncGuard.createOperationToken();
  const delayedSave = asyncGuard.createOperationToken();
  const refreshOperation = asyncGuard.createOperationToken();
  const refreshTransition = asyncGuard.updateIdentity({
    session: { user: { id: "aluno-a" } },
    user: { id: "aluno-a" }
  });
  assert.equal(refreshTransition.invalidated, false);
  assert.equal(refreshOperation.isCurrent(), true, "token refresh não deve invalidar operações da mesma conta");
  asyncGuard.updateIdentity({ user: { id: "aluno-b" } });
  assert.equal(delayedLoad.isCurrent(), false, "carregamento remoto da conta A deve ser descartado");
  assert.equal(delayedSave.isCurrent(), false, "salvamento da conta A não deve atualizar a UI da conta B");
  assert.equal(asyncGuard.getUserId(), "aluno-b");

  const asyncState = { practiceNote: "", noteStatus: "" };
  const lateLoadResult = await Promise.resolve({ note: "Nota remota atrasada da conta A" });
  if (delayedLoad.isCurrent()) {
    asyncState.practiceNote = lateLoadResult.note;
  }
  const lateSaveResult = await Promise.resolve({ ok: true });
  if (delayedSave.isCurrent() && lateSaveResult.ok) {
    asyncState.noteStatus = "Anotação salva na sua conta.";
  }
  assert.equal(asyncState.practiceNote, "", "carregamento atrasado não pode restaurar a nota da conta A");
  assert.equal(asyncState.noteStatus, "", "salvamento atrasado não pode atualizar a UI da conta B");

  const serviceSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "sql-practice-service.js"),
    "utf8"
  );

  const pageSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "sql-practice-page.js"),
    "utf8"
  );
  const appSource = fs.readFileSync(path.join(__dirname, "..", "src", "app.js"), "utf8");
  const htmlSource = fs.readFileSync(path.join(__dirname, "..", "praticas-sql.html"), "utf8");
  assert.match(appSource, /data-skill-map-auth-changed/);
  assert.match(appSource, /event === "SIGNED_OUT"/);
  assert.match(appSource, /verifiedByAuthService: true/);
  assert.match(pageSource, /addEventListener\("data-skill-map-auth-changed"/);
  assert.match(pageSource, /authState\.verifiedByAuthService/);
  assert.match(pageSource, /authService\?\.getCurrentSession/);
  assert.match(pageSource, /if \(!request\.isCurrent\(\)\)/);
  assert.match(pageSource, /resetCentralSqlPersonalizedState/);
  assert.match(pageSource, /getScopedStorageKey/);
  assert.match(pageSource, /createOperationToken/);
  assert.doesNotMatch(pageSource, /return `\$\{prefix\}:\$\{slug\}`/);
  assert.match(serviceSource, /expectedUserId/);
  assert.match(serviceSource, /user\?\.id !== expectedUserId/);
  assert.match(htmlSource, /src\/mapia-session-guard\.js/);
  assert.match(htmlSource, /src\/sql-practice-privacy\.js/);

  console.log("Central SQL and MapIA privacy tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
