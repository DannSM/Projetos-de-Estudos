(function initProgressPage(globalScope) {
  const mount = document.getElementById("progressPageMount");

  if (!mount) {
    return;
  }

  const placeholderCards = [
    {
      icon: "clipboard-list",
      label: "Diagnósticos realizados",
      value: "Ainda sem dados",
      note: "O histórico será conectado em uma próxima etapa."
    },
    {
      icon: "badge-check",
      label: "Nível atual",
      value: "Em breve",
      note: "Seu nível aparecerá aqui após integrarmos os resultados."
    },
    {
      icon: "trending-up",
      label: "Áreas para evoluir",
      value: "Em breve",
      note: "Vamos destacar os temas prioritários para estudo."
    },
    {
      icon: "clock-3",
      label: "Última atividade",
      value: "Ainda sem dados",
      note: "As próximas interações alimentarão este resumo."
    }
  ];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function refreshIcons() {
    if (globalScope.lucide && typeof globalScope.lucide.createIcons === "function") {
      globalScope.lucide.createIcons();
    }
  }

  function renderLoading() {
    mount.innerHTML = `
      <div class="progress-loading-card">
        <span class="progress-loading-icon" aria-hidden="true"></span>
        <strong>Carregando seu progresso...</strong>
      </div>
    `;
  }

  function renderLockedState() {
    mount.innerHTML = `
      <article class="progress-gate-card">
        <div class="progress-gate-visual" aria-hidden="true">
          <span class="progress-gate-icon">
            <i data-lucide="lock-keyhole"></i>
          </span>
          <div class="progress-gate-lines">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div class="progress-gate-copy">
          <span class="section-kicker">Área autenticada</span>
          <h1>Entre para ver seu progresso.</h1>
          <p>Crie uma conta ou acesse sua conta atual para acompanhar sua evolução no Data Skill Map.</p>
          <button class="button button-primary progress-auth-button" type="button" data-progress-auth-open>
            <i data-lucide="user-circle" aria-hidden="true"></i>
            <span>Entrar / Criar conta</span>
          </button>
        </div>
      </article>
    `;

    const authButton = mount.querySelector("[data-progress-auth-open]");
    authButton?.addEventListener("click", openAuthFromProgress);
    refreshIcons();
  }

  function renderAuthenticatedState(session) {
    const email = escapeHtml(session?.user?.email || "Usuário autenticado");
    const cards = placeholderCards.map((card) => `
      <article class="progress-metric-card">
        <span class="progress-metric-icon" aria-hidden="true">
          <i data-lucide="${card.icon}"></i>
        </span>
        <div>
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <p>${escapeHtml(card.note)}</p>
        </div>
      </article>
    `).join("");

    mount.innerHTML = `
      <div class="progress-dashboard">
        <section class="progress-hero-card">
          <div class="progress-hero-copy">
            <span class="section-kicker">Meu Progresso</span>
            <h1>Meu Progresso</h1>
            <p class="progress-user-email">
              <i data-lucide="mail" aria-hidden="true"></i>
              <span>${email}</span>
            </p>
            <p class="progress-hero-text">Seu histórico de diagnóstico será conectado em uma próxima etapa. Por enquanto, este painel deixa o espaço pronto para acompanhar sua evolução.</p>
          </div>
          <div class="progress-status-card">
            <span>Próxima etapa</span>
            <strong>Histórico de diagnóstico</strong>
            <p>Sem conexão com dados reais nesta versão.</p>
          </div>
        </section>

        <section class="progress-metric-grid" aria-label="Resumo do progresso">
          ${cards}
        </section>
      </div>
    `;

    refreshIcons();
  }

  async function refreshProgressPage() {
    if (!globalScope.authService || typeof globalScope.authService.getCurrentSession !== "function") {
      renderLockedState();
      return;
    }

    const sessionResult = await globalScope.authService.getCurrentSession();
    if (sessionResult && sessionResult.ok && sessionResult.session) {
      renderAuthenticatedState(sessionResult.session);
      return;
    }

    renderLockedState();
  }

  function openAuthFromProgress() {
    if (!globalScope.authModal || typeof globalScope.authModal.openAuthModal !== "function") {
      return;
    }

    globalScope.authModal.openAuthModal({
      onSuccess: async ({ session, user } = {}) => {
        await refreshProgressPage();
        globalScope.dispatchEvent(new CustomEvent("data-skill-map-auth-changed", {
          detail: { session: session || null, user: user || null }
        }));
      }
    });
  }

  globalScope.addEventListener("data-skill-map-auth-changed", () => {
    void refreshProgressPage();
  });

  renderLoading();
  void refreshProgressPage();
})(window);
