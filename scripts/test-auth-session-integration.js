const assert = require("node:assert/strict");
const path = require("node:path");

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...values) {
    values.forEach((value) => this.values.add(value));
  }

  remove(...values) {
    values.forEach((value) => this.values.delete(value));
  }

  contains(value) {
    return this.values.has(value);
  }

  toggle(value, force) {
    const enabled = force === undefined ? !this.values.has(value) : Boolean(force);
    if (enabled) this.values.add(value);
    else this.values.delete(value);
    return enabled;
  }
}

class FakeElement {
  constructor() {
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.dataset = {};
    this.disabled = false;
    this.hidden = false;
    this.id = "";
    this.innerHTML = "";
    this.textContent = "";
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  focus() {}
}

class FakeCustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

function createEnvironment({ signOut, session, getCurrentSession }) {
  const documentListeners = new Map();
  const windowListeners = new Map();
  const elementsById = new Map();
  const desktopActions = new FakeElement();
  const document = {
    body: new FakeElement(),
    documentElement: { style: { setProperty() {} } },
    addEventListener(type, listener) {
      const listeners = documentListeners.get(type) || [];
      listeners.push(listener);
      documentListeners.set(type, listeners);
    },
    createElement() {
      return new FakeElement();
    },
    getElementById(id) {
      return elementsById.get(id) || null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-global-actions='desktop']") {
        return [desktopActions];
      }
      return [];
    }
  };
  document.body.appendChild = (element) => {
    if (element.id) elementsById.set(element.id, element);
  };

  let currentSession = session;
  let nativeAuthListener = null;
  const authService = {
    async checkAdminAuthorization() {
      return { ok: true, data: [] };
    },
    async getCurrentSession() {
      if (typeof getCurrentSession === "function") {
        return getCurrentSession();
      }
      return { ok: true, session: currentSession, user: currentSession?.user || null };
    },
    onAuthStateChange(listener) {
      nativeAuthListener = listener;
      return { unsubscribe() {} };
    },
    async signOut() {
      return signOut({
        emit(event, nextSession) {
          currentSession = nextSession;
          nativeAuthListener?.(event, nextSession);
        },
        setSession(nextSession) {
          currentSession = nextSession;
        }
      });
    }
  };

  const window = {
    authService,
    location: { hash: "", pathname: "/praticas-sql.html", search: "" },
    history: { replaceState() {} },
    addEventListener(type, listener) {
      const listeners = windowListeners.get(type) || [];
      listeners.push(listener);
      windowListeners.set(type, listeners);
    },
    clearTimeout() {},
    dispatchEvent(event) {
      (windowListeners.get(event.type) || []).forEach((listener) => listener(event));
      return true;
    },
    setTimeout(callback, delay = 0) {
      if (delay === 0) queueMicrotask(callback);
      return 1;
    }
  };

  return {
    authService,
    desktopActions,
    document,
    documentListeners,
    emitNative(event, nextSession) {
      currentSession = nextSession;
      nativeAuthListener?.(event, nextSession);
    },
    elementsById,
    window
  };
}

function getLogoutClickListener(environment) {
  const listeners = environment.documentListeners.get("click") || [];
  assert.equal(listeners.length, 1, "o fluxo de autenticação deve registrar um listener de clique");
  return listeners[0];
}

function createLogoutEvent(button) {
  return {
    target: {
      closest(selector) {
        return selector === "[data-account-logout]" ? button : null;
      }
    }
  };
}

async function flushAuthEvents() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function setupScenario(options) {
  const environment = createEnvironment(options);
  global.document = environment.document;
  global.window = environment.window;
  global.CustomEvent = FakeCustomEvent;
  const { setupAuthEntryPoints } = require(path.join(__dirname, "..", "src", "app.js"));
  await setupAuthEntryPoints();
  const verifiedEvents = [];
  environment.window.addEventListener("data-skill-map-auth-changed", (event) => {
    if (event.detail?.verifiedByAuthService) verifiedEvents.push(event.detail);
  });
  return { ...environment, verifiedEvents };
}

async function run() {
  const userA = { id: "user-a", email: "a@example.test" };
  const userB = { id: "user-b", email: "b@example.test" };

  let resolveInitialSession;
  const pendingInitialSession = new Promise((resolve) => {
    resolveInitialSession = resolve;
  });
  const signedOutDuringStartup = createEnvironment({
    session: { user: userA },
    getCurrentSession: () => pendingInitialSession,
    signOut: async () => ({ ok: true })
  });
  global.document = signedOutDuringStartup.document;
  global.window = signedOutDuringStartup.window;
  global.CustomEvent = FakeCustomEvent;
  const { setupAuthEntryPoints } = require(path.join(__dirname, "..", "src", "app.js"));
  const startupVerifiedEvents = [];
  signedOutDuringStartup.window.addEventListener("data-skill-map-auth-changed", (event) => {
    if (event.detail?.verifiedByAuthService) startupVerifiedEvents.push(event.detail);
  });
  const pendingSetup = setupAuthEntryPoints();
  signedOutDuringStartup.emitNative("SIGNED_OUT", null);
  await flushAuthEvents();
  assert.equal(
    startupVerifiedEvents.length,
    1,
    "primeiro SIGNED_OUT deve ser comunicado durante a resolução da sessão inicial"
  );
  assert.equal(startupVerifiedEvents[0].session, null);
  signedOutDuringStartup.emitNative("SIGNED_OUT", null);
  await flushAuthEvents();
  assert.equal(startupVerifiedEvents.length, 1, "SIGNED_OUT repetido durante a inicialização deve ser idempotente");
  resolveInitialSession({ ok: true, session: { user: userA }, user: userA });
  await pendingSetup;
  assert.equal(startupVerifiedEvents.length, 1, "sessão inicial obsoleta não pode duplicar nem reverter o logout");
  assert.match(signedOutDuringStartup.desktopActions.innerHTML, /data-auth-entry/);

  const successful = await setupScenario({
    session: { user: userA },
    signOut: async ({ emit }) => {
      emit("SIGNED_OUT", null);
      return { ok: true, error: null };
    }
  });
  const successButton = new FakeElement();
  await getLogoutClickListener(successful)(createLogoutEvent(successButton));
  await flushAuthEvents();
  assert.equal(successful.verifiedEvents.length, 1, "logout bem-sucedido deve emitir uma única transição");
  assert.equal(successful.verifiedEvents[0].session, null);
  assert.match(successful.desktopActions.innerHTML, /data-auth-entry/);

  const failed = await setupScenario({
    session: { user: userA },
    signOut: async () => ({ ok: false, error: { message: "detalhe sensível do provedor" } })
  });
  const failedButton = new FakeElement();
  await getLogoutClickListener(failed)(createLogoutEvent(failedButton));
  assert.equal(failed.verifiedEvents.length, 0, "falha no logout não pode simular SIGNED_OUT");
  assert.match(failed.desktopActions.innerHTML, /data-account-logout/);
  const errorStatus = failed.elementsById.get("dataSkillMapAuthStatus");
  assert.equal(errorStatus.textContent, "Não foi possível sair agora. Sua sessão continua ativa; tente novamente.");
  assert.doesNotMatch(errorStatus.textContent, /detalhe sensível/);
  assert.equal(failedButton.disabled, false);

  const otherTab = await setupScenario({
    session: { user: userA },
    signOut: async () => ({ ok: true })
  });
  otherTab.emitNative("SIGNED_OUT", null);
  await flushAuthEvents();
  assert.equal(otherTab.verifiedEvents.length, 1, "SIGNED_OUT nativo de outra aba deve limpar a sessão");
  assert.equal(otherTab.verifiedEvents[0].source, "supabase:SIGNED_OUT");
  assert.match(otherTab.desktopActions.innerHTML, /data-auth-entry/);

  otherTab.emitNative("SIGNED_OUT", null);
  await flushAuthEvents();
  assert.equal(otherTab.verifiedEvents.length, 1, "SIGNED_OUT duplicado deve ser idempotente");

  const tokenRefresh = await setupScenario({
    session: { user: userA, access_token: "token-antigo-de-teste" },
    signOut: async () => ({ ok: true })
  });
  tokenRefresh.emitNative("TOKEN_REFRESHED", { user: userA, access_token: "token-renovado-de-teste" });
  await flushAuthEvents();
  assert.equal(tokenRefresh.verifiedEvents.length, 0, "renovação de token não deve trocar a identidade");
  assert.match(tokenRefresh.desktopActions.innerHTML, /data-account-logout/);

  tokenRefresh.window.dispatchEvent(new FakeCustomEvent("data-skill-map-auth-changed", {
    detail: { session: { user: userB }, user: userB }
  }));
  await flushAuthEvents();
  assert.equal(
    tokenRefresh.verifiedEvents.length,
    0,
    "identidade não verificada de evento personalizado não pode substituir a sessão real"
  );

  const switched = await setupScenario({
    session: { user: userA },
    signOut: async () => ({ ok: true })
  });
  switched.emitNative("SIGNED_IN", { user: userB });
  await flushAuthEvents();
  assert.equal(switched.verifiedEvents.length, 1, "troca de usuário deve emitir transição verificada");
  assert.equal(switched.verifiedEvents[0].user.id, "user-b");

  console.log("Auth logout and native session integration tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
