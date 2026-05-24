(function initAuthModal(globalScope) {
  const MODAL_ID = "dataSkillMapAuthModal";
  const OPEN_CLASS = "auth-modal-open";

  const state = {
    mode: "login",
    options: {},
    isLoading: false,
    lastFocusedElement: null
  };

  function getCopy(mode) {
    if (mode === "signup") {
      return {
        title: "Criar conta",
        description: "Salve seu progresso e prepare sua trilha de estudos.",
        submitLabel: "Criar conta",
        toggleText: "Ja tem conta?",
        toggleLabel: "Entrar"
      };
    }

    return {
      title: "Entrar",
      description: "Acesse sua conta para continuar sua evolucao.",
      submitLabel: "Entrar",
      toggleText: "Ainda nao tem conta?",
      toggleLabel: "Criar conta"
    };
  }

  function normalizeErrorMessage(error, mode) {
    const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";

    if (message.includes("invalid") || message.includes("login")) {
      return "E-mail ou senha invalidos. Confira os dados e tente novamente.";
    }

    if (message.includes("already") || message.includes("registered")) {
      return "Este e-mail ja possui cadastro. Tente entrar na sua conta.";
    }

    if (message.includes("password")) {
      return "A senha precisa atender aos requisitos minimos do Supabase.";
    }

    if (message.includes("email")) {
      return "Confira se o e-mail foi digitado corretamente.";
    }

    return mode === "signup"
      ? "Nao foi possivel criar a conta agora. Tente novamente em instantes."
      : "Nao foi possivel entrar agora. Tente novamente em instantes.";
  }

  function getOrCreateModalRoot() {
    let overlay = document.getElementById(MODAL_ID);
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = MODAL_ID;
    overlay.className = "auth-modal-overlay hidden";
    document.body.appendChild(overlay);
    return overlay;
  }

  function setStatus(message, type = "error") {
    const status = document.getElementById("authModalStatus");
    if (!status) return;

    status.textContent = message || "";
    status.className = message ? `auth-modal-status ${type}` : "auth-modal-status hidden";
  }

  function setLoading(isLoading) {
    state.isLoading = isLoading;

    const overlay = document.getElementById(MODAL_ID);
    if (!overlay) return;

    overlay.querySelectorAll("input, button").forEach((element) => {
      element.disabled = isLoading;
    });

    const submitButton = overlay.querySelector("#authModalSubmit");
    if (submitButton) {
      submitButton.textContent = isLoading ? "Aguarde..." : getCopy(state.mode).submitLabel;
    }
  }

  function renderAuthModal() {
    const overlay = getOrCreateModalRoot();
    const copy = getCopy(state.mode);
    const isSignUp = state.mode === "signup";

    overlay.innerHTML = `
      <div class="auth-modal-sheet" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
        <div class="auth-modal-header">
          <div class="auth-modal-title-wrap">
            <span class="auth-modal-kicker">Data Skill Map</span>
            <h2 id="authModalTitle">${copy.title}</h2>
            <p>${copy.description}</p>
          </div>
          <button type="button" class="auth-modal-close" id="authModalClose" aria-label="Fechar autenticacao">x</button>
        </div>

        <form id="authModalForm" class="auth-modal-form" novalidate>
          ${isSignUp ? `
            <label for="authModalName">Nome (opcional)</label>
            <input id="authModalName" name="name" type="text" autocomplete="name" placeholder="Como podemos chamar voce?">
          ` : ""}

          <label for="authModalEmail">E-mail</label>
          <input id="authModalEmail" name="email" type="email" autocomplete="username" placeholder="seu@email.com" required>

          <label for="authModalPassword">Senha</label>
          <input id="authModalPassword" name="password" type="password" autocomplete="${isSignUp ? "new-password" : "current-password"}" placeholder="Digite sua senha" required minlength="6">

          <p id="authModalStatus" class="auth-modal-status hidden" aria-live="polite"></p>

          <div class="auth-modal-actions">
            <button type="submit" class="submit-button" id="authModalSubmit">${copy.submitLabel}</button>
            <button type="button" class="auth-modal-secondary" id="authModalToggle">
              <span>${copy.toggleText}</span>
              <strong>${copy.toggleLabel}</strong>
            </button>
          </div>
        </form>
      </div>
    `;

    bindModalEvents(overlay);
    return overlay;
  }

  function focusFirstField() {
    const overlay = document.getElementById(MODAL_ID);
    const firstField = overlay?.querySelector("input");
    if (firstField) firstField.focus();
  }

  function closeAuthModal() {
    const overlay = document.getElementById(MODAL_ID);
    if (!overlay) return;

    overlay.classList.add("hidden");
    overlay.innerHTML = "";
    document.body.classList.remove(OPEN_CLASS);
    document.removeEventListener("keydown", onEscapeKey);

    if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === "function") {
      state.lastFocusedElement.focus();
    }
  }

  function isAuthModalOpen() {
    const overlay = document.getElementById(MODAL_ID);
    return Boolean(overlay && !overlay.classList.contains("hidden"));
  }

  function showMode(mode) {
    if (state.isLoading) return;

    state.mode = mode === "signup" ? "signup" : "login";
    renderAuthModal();
    focusFirstField();
  }

  function showLogin() {
    showMode("login");
  }

  function showSignUp() {
    showMode("signup");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (state.isLoading) return;

    if (!globalScope.authService) {
      setStatus("Servico de autenticacao indisponivel nesta pagina.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const name = String(formData.get("name") || "").trim();

    if (!email || !password) {
      setStatus("Informe e-mail e senha para continuar.");
      return;
    }

    if (password.length < 6) {
      setStatus("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setStatus("");
    setLoading(true);

    const result = state.mode === "signup"
      ? await globalScope.authService.signUp(email, password, name ? { display_name: name, name } : {})
      : await globalScope.authService.signIn(email, password);

    setLoading(false);

    if (!result || !result.ok) {
      setStatus(normalizeErrorMessage(result?.error, state.mode));
      return;
    }

    const sessionResult = typeof globalScope.authService.getCurrentSession === "function"
      ? await globalScope.authService.getCurrentSession()
      : { ok: true, session: result.session || null, user: result.user || null };

    if (typeof state.options.onSuccess === "function") {
      await state.options.onSuccess({
        mode: state.mode,
        result,
        session: sessionResult.session || result.session || null,
        user: sessionResult.user || result.user || null
      });
    }

    closeAuthModal();
  }

  function onOverlayClick(event) {
    if (event.target === event.currentTarget && !state.isLoading) {
      closeAuthModal();
    }
  }

  function onEscapeKey(event) {
    if (event.key === "Escape" && !state.isLoading) {
      closeAuthModal();
    }
  }

  function bindModalEvents(overlay) {
    const closeButton = overlay.querySelector("#authModalClose");
    const toggleButton = overlay.querySelector("#authModalToggle");
    const form = overlay.querySelector("#authModalForm");

    overlay.addEventListener("click", onOverlayClick);
    closeButton?.addEventListener("click", closeAuthModal);
    toggleButton?.addEventListener("click", () => {
      showMode(state.mode === "login" ? "signup" : "login");
    });
    form?.addEventListener("submit", handleSubmit);
  }

  function openAuthModal(options = {}) {
    state.options = options || {};
    state.mode = options.mode === "signup" ? "signup" : "login";
    state.lastFocusedElement = document.activeElement;

    const overlay = renderAuthModal();
    overlay.classList.remove("hidden");
    document.body.classList.add(OPEN_CLASS);
    document.addEventListener("keydown", onEscapeKey);
    focusFirstField();
  }

  globalScope.authModal = {
    openAuthModal,
    closeAuthModal,
    isAuthModalOpen,
    renderAuthModal,
    showLogin,
    showSignUp,
    open: openAuthModal,
    close: closeAuthModal
  };
})(window);
