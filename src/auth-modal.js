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
    if (mode === "recovery") {
      return {
        title: "Redefinir senha",
        description: "Crie uma nova senha para voltar a acessar sua conta.",
        submitLabel: "Salvar nova senha"
      };
    }

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
    const code = typeof error?.code === "string" ? error.code.toLowerCase() : "";

    if (code.includes("user_already_registered_unconfirmed") || (message.includes("registered") && message.includes("not confirmed"))) {
      return "Este e-mail ja foi cadastrado, mas ainda precisa ser confirmado. Verifique sua caixa de entrada.";
    }

    if (message.includes("not confirmed") || message.includes("not_confirmed") || code.includes("not_confirmed")) {
      return "E-mail ainda nao confirmado. Verifique sua caixa de entrada para ativar a conta.";
    }

    if (message.includes("invalid") || message.includes("login")) {
      return "E-mail ou senha invalidos. Verifique os dados e tente novamente.";
    }

    if (message.includes("already") || message.includes("registered")) {
      return "Ja existe uma conta com este e-mail. Tente entrar.";
    }

    if (message.includes("password")) {
      return "A senha precisa atender aos requisitos minimos do Supabase.";
    }

    if (message.includes("email")) {
      return "Confira se o e-mail foi digitado corretamente.";
    }

    if (mode === "signup") {
      return "Nao foi possivel criar a conta agora. Tente novamente em instantes.";
    }

    if (mode === "recovery") {
      return "Nao foi possivel atualizar a senha. Solicite um novo link se o problema continuar.";
    }

    return "Nao foi possivel entrar agora. Tente novamente em instantes.";
  }

  function isPendingEmailConfirmation(result) {
    const user = result?.user || result?.data?.user || null;
    if (!user?.email) return false;
    return !result?.session && !result?.data?.session && !user.email_confirmed_at && !user.confirmed_at;
  }

  function normalizeResetPasswordError(error) {
    const code = typeof error?.code === "string" ? error.code.toLowerCase() : "";
    const status = Number(error?.status || 0);

    if (status === 429 || code.includes("rate_limit") || code.includes("rate-limit")) {
      return "Muitas solicitações de recuperação foram feitas. Aguarde alguns minutos antes de tentar novamente.";
    }

    return "Não foi possível enviar o link agora. Verifique o e-mail e tente novamente.";
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

  function setLoading(isLoading, loadingLabel = "Aguarde...") {
    state.isLoading = isLoading;

    const overlay = document.getElementById(MODAL_ID);
    if (!overlay) return;

    overlay.querySelectorAll("input, button").forEach((element) => {
      element.disabled = isLoading;
    });

    const submitButton = overlay.querySelector("#authModalSubmit");
    if (submitButton) {
      submitButton.textContent = isLoading ? loadingLabel : getCopy(state.mode).submitLabel;
    }

    const googleButton = overlay.querySelector("#authModalGoogle");
    const googleButtonLabel = googleButton?.querySelector("[data-auth-google-label]");
    if (googleButtonLabel) {
      googleButtonLabel.textContent = isLoading ? loadingLabel : "Continuar com Google";
    }
  }

  function renderAuthModal() {
    const overlay = getOrCreateModalRoot();
    const copy = getCopy(state.mode);
    const isSignUp = state.mode === "signup";
    const isRecovery = state.mode === "recovery";

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
          ${!isRecovery ? `<button type="button" class="auth-google-button" id="authModalGoogle">
            <span class="auth-google-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.24c1.9-1.75 2.97-4.32 2.97-7.44z"/>
                <path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.33l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A9.99 9.99 0 0 0 12 22z"/>
                <path fill="#FBBC05" d="M6.4 13.99A6.01 6.01 0 0 1 6.08 12c0-.69.12-1.36.32-1.99V7.42H3.06A9.99 9.99 0 0 0 2 12c0 1.61.38 3.14 1.06 4.58l3.34-2.59z"/>
                <path fill="#EA4335" d="M12 5.89c1.47 0 2.78.5 3.81 1.49l2.87-2.87C16.95 2.9 14.7 2 12 2a9.99 9.99 0 0 0-8.94 5.42l3.34 2.59c.79-2.36 3-4.12 5.6-4.12z"/>
              </svg>
            </span>
            <span data-auth-google-label>Continuar com Google</span>
          </button>

          <div class="auth-modal-divider"><span>ou</span></div>` : ""}

          ${isSignUp ? `
            <label for="authModalName">Nome (opcional)</label>
            <input id="authModalName" name="name" type="text" autocomplete="name" placeholder="Como podemos chamar voce?">
          ` : ""}

          ${!isRecovery ? `
            <label for="authModalEmail">E-mail</label>
            <input id="authModalEmail" name="email" type="email" autocomplete="username" placeholder="seu@email.com" required>
          ` : ""}

          <label for="authModalPassword">${isRecovery ? "Nova senha" : "Senha"}</label>
          <div class="auth-password-field">
            <input id="authModalPassword" name="password" type="password" autocomplete="${isSignUp || isRecovery ? "new-password" : "current-password"}" placeholder="${isRecovery ? "Digite a nova senha" : "Digite sua senha"}" required minlength="6">
            <button type="button" class="auth-password-toggle" id="authModalPasswordToggle" aria-label="Mostrar senha" aria-pressed="false">
              <i data-lucide="eye" aria-hidden="true"></i>
            </button>
          </div>
          ${!isSignUp && !isRecovery ? `
            <button type="button" class="auth-forgot-password" id="authModalForgotPassword">Esqueci minha senha</button>
          ` : ""}

          ${isRecovery ? `
            <label for="authModalPasswordConfirmation">Confirmar nova senha</label>
            <div class="auth-password-field">
              <input id="authModalPasswordConfirmation" name="passwordConfirmation" type="password" autocomplete="new-password" placeholder="Digite a nova senha novamente" required minlength="6">
            </div>
          ` : ""}

          <p id="authModalStatus" class="auth-modal-status hidden" aria-live="polite"></p>

          <div class="auth-modal-actions">
            <button type="submit" class="submit-button" id="authModalSubmit">${copy.submitLabel}</button>
            ${!isRecovery ? `<button type="button" class="auth-modal-secondary" id="authModalToggle">
              <span>${copy.toggleText}</span>
              <strong>${copy.toggleLabel}</strong>
            </button>` : ""}
          </div>
        </form>
      </div>
    `;

    bindModalEvents(overlay);
    if (state.options.initialStatus) {
      setStatus(state.options.initialStatus, state.options.initialStatusType || "error");
    }
    if (globalScope.lucide && typeof globalScope.lucide.createIcons === "function") {
      globalScope.lucide.createIcons();
    }
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
    const passwordConfirmation = String(formData.get("passwordConfirmation") || "");

    if (state.mode === "recovery") {
      if (!password) {
        setStatus("Informe a nova senha para continuar.");
        return;
      }

      if (password.length < 6) {
        setStatus("A senha deve ter pelo menos 6 caracteres.");
        return;
      }

      if (password !== passwordConfirmation) {
        setStatus("A confirmacao precisa ser igual a nova senha.");
        return;
      }

      setStatus("");
      setLoading(true, "Salvando...");
      const result = await globalScope.authService.updatePassword(password);
      setLoading(false);

      if (!result || !result.ok) {
        console.warn("[Auth] Falha segura ao atualizar senha.", {
          code: result?.error?.code || null,
          status: result?.error?.status || null
        });
        setStatus(normalizeErrorMessage(result?.error, "recovery"));
        return;
      }

      let signedOut = false;
      if (typeof globalScope.authService.signOut === "function") {
        const signOutResult = await globalScope.authService.signOut();
        signedOut = Boolean(signOutResult?.ok);

        if (!signedOut) {
          console.warn("[Auth] A senha foi atualizada, mas a sessao nao foi encerrada automaticamente.", {
            code: signOutResult?.error?.code || null,
            status: signOutResult?.error?.status || null
          });
        }
      }

      if (typeof state.options.onSuccess === "function") {
        await state.options.onSuccess({ mode: "recovery", result, signedOut });
      }

      state.mode = "login";
      state.options = {
        initialStatus: signedOut
          ? "Senha atualizada com sucesso. Entre com a nova senha."
          : "Senha atualizada com sucesso. Não foi possível encerrar sua sessão automaticamente; use Sair antes de entrar novamente.",
        initialStatusType: "success"
      };
      renderAuthModal();
      focusFirstField();
      return;
    }

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

    if (state.mode === "signup" && isPendingEmailConfirmation(result)) {
      setStatus("Conta criada com sucesso. Confirme seu e-mail antes de entrar.", "success");
      return;
    }

    const sessionResult = typeof globalScope.authService.getCurrentSession === "function"
      ? await globalScope.authService.getCurrentSession()
      : { ok: true, session: result.session || null, user: result.user || null };

    if (state.mode === "signup" && (sessionResult.session || result.session)) {
      setStatus("Conta criada com sucesso. Voce ja esta conectado.", "success");
    }

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

  async function handleForgotPassword() {
    if (state.isLoading) return;

    const emailInput = document.getElementById("authModalEmail");
    const email = String(emailInput?.value || "").trim().toLowerCase();

    if (!email) {
      setStatus("Informe seu e-mail para receber o link de recuperacao.");
      emailInput?.focus();
      return;
    }

    if (!globalScope.authService || typeof globalScope.authService.resetPassword !== "function") {
      setStatus("Servico de recuperacao de senha indisponivel nesta pagina.");
      return;
    }

    setStatus("");
    setLoading(true, "Enviando...");
    const result = await globalScope.authService.resetPassword(email);
    setLoading(false);

    if (!result || !result.ok) {
      setStatus(normalizeResetPasswordError(result?.error));
      return;
    }

    setStatus("Enviamos um link de recuperacao para o seu e-mail, se ele estiver cadastrado.", "success");
  }

  function togglePasswordVisibility() {
    const passwordInput = document.getElementById("authModalPassword");
    const toggleButton = document.getElementById("authModalPasswordToggle");
    if (!passwordInput || !toggleButton) return;

    const shouldShow = passwordInput.type === "password";
    passwordInput.type = shouldShow ? "text" : "password";
    toggleButton.setAttribute("aria-pressed", shouldShow ? "true" : "false");
    toggleButton.setAttribute("aria-label", shouldShow ? "Ocultar senha" : "Mostrar senha");
    toggleButton.innerHTML = `<i data-lucide="${shouldShow ? "eye-off" : "eye"}" aria-hidden="true"></i>`;
    if (globalScope.lucide && typeof globalScope.lucide.createIcons === "function") {
      globalScope.lucide.createIcons();
    }
  }

  async function handleGoogleSignIn() {
    if (state.isLoading) return;

    if (!globalScope.authService || typeof globalScope.authService.signInWithGoogle !== "function") {
      setStatus("Servico de autenticacao indisponivel nesta pagina.");
      return;
    }

    setStatus("");
    setLoading(true, "Redirecionando...");

    const result = await globalScope.authService.signInWithGoogle();
    if (!result || !result.ok) {
      console.error("Falha ao iniciar login com Google:", result?.error);
      setLoading(false);
      setStatus("Não foi possível iniciar o login com Google. Tente novamente.");
    }
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
    const forgotPasswordButton = overlay.querySelector("#authModalForgotPassword");
    const passwordToggleButton = overlay.querySelector("#authModalPasswordToggle");
    const googleButton = overlay.querySelector("#authModalGoogle");
    const form = overlay.querySelector("#authModalForm");

    overlay.addEventListener("click", onOverlayClick);
    closeButton?.addEventListener("click", closeAuthModal);
    googleButton?.addEventListener("click", handleGoogleSignIn);
    forgotPasswordButton?.addEventListener("click", handleForgotPassword);
    passwordToggleButton?.addEventListener("click", togglePasswordVisibility);
    toggleButton?.addEventListener("click", () => {
      showMode(state.mode === "login" ? "signup" : "login");
    });
    form?.addEventListener("submit", handleSubmit);
  }

  function openAuthModal(options = {}) {
    state.options = options || {};
    state.mode = options.mode === "signup" ? "signup" : options.mode === "recovery" ? "recovery" : "login";
    state.lastFocusedElement = document.activeElement;

    const overlay = renderAuthModal();
    overlay.classList.remove("hidden");
    document.body.classList.add(OPEN_CLASS);
    document.addEventListener("keydown", onEscapeKey);
    focusFirstField();
  }

  function openPasswordRecoveryModal(options = {}) {
    openAuthModal({ ...options, mode: "recovery" });
  }

  globalScope.authModal = {
    openAuthModal,
    closeAuthModal,
    isAuthModalOpen,
    renderAuthModal,
    showLogin,
    showSignUp,
    openPasswordRecoveryModal,
    open: openAuthModal,
    close: closeAuthModal
  };
})(window);
