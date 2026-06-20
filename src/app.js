function syncHeaderHeight() {
  const header = document.querySelector(".app-header");
  if (!header) {
    return;
  }

  const currentHeight = Math.ceil(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty("--header-height", `${currentHeight}px`);
}

function bindHeaderHeightSync() {
  const header = document.querySelector(".app-header");
  if (!header) {
    return;
  }

  syncHeaderHeight();
  window.addEventListener("resize", syncHeaderHeight);
  window.addEventListener("load", syncHeaderHeight);

  if ("ResizeObserver" in window) {
    const headerResizeObserver = new ResizeObserver(syncHeaderHeight);
    headerResizeObserver.observe(header);
  }
}

function renderIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    const fallbackIconName = "external-link";
    const toPascalCase = (value) => String(value || "")
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    const isIconAvailable = (name) => {
      if (!name) return false;
      const pascalName = toPascalCase(name);
      return Boolean(
        window.lucide[name]
        || window.lucide[pascalName]
        || window.lucide.icons?.[name]
        || window.lucide.icons?.[pascalName]
      );
    };

    document.querySelectorAll("[data-lucide]").forEach((icon) => {
      const iconName = icon.getAttribute("data-lucide");
      if (!isIconAvailable(iconName) && isIconAvailable(fallbackIconName)) {
        icon.setAttribute("data-lucide", fallbackIconName);
      }
    });

    window.lucide.createIcons();
  }
}

const GLOBAL_NAV_ITEMS = [
  { key: "home", label: "Início", icon: "house", href: "index.html", states: ["anonymous", "student", "admin"] },
  { key: "como-funciona", label: "Como funciona", icon: "list-checks", href: "index.html#como-funciona", states: ["anonymous"] },
  { key: "diagnostico", label: "Diagnóstico", icon: "clipboard-list", href: "diagnostico.html", states: ["anonymous", "student", "admin"] },
  { key: "trilhas", label: "Trilhas", icon: "route", href: "index.html#trilhas", states: ["anonymous", "student", "admin"] },
  { key: "progresso", label: "Meu Progresso", icon: "line-chart", href: "meu-progresso.html", states: ["anonymous", "student", "admin"] },
  { key: "praticas-sql", label: "Práticas SQL", icon: "square-terminal", href: "praticas-sql.html?pratica=sql-essencial-filtros-where", states: ["anonymous", "student", "admin"] },
  { key: "analytics", label: "Analytics", href: "analytics.html", states: ["admin"] }
];

function escapeAttribute(value) {
  return String(value || "").replace(/"/g, "&quot;");
}

function getNavigationState(session, isAdmin) {
  if (!session) return "anonymous";
  return isAdmin ? "admin" : "student";
}

function getPrimaryCta(session) {
  const route = (((window.location.pathname || "").split("/").pop() || "index").toLowerCase()).replace(/\.html$/, "");
  const isAuthenticated = Boolean(session);

  if (!isAuthenticated) {
    return {
      href: "diagnostico.html",
      label: "Fazer diagnóstico grátis",
      icon: "clipboard-list"
    };
  }

  return {
    href: "diagnostico.html",
    label: route === "meu-progresso" ? "Iniciar diagnóstico" : "Refazer diagnóstico",
    icon: route === "meu-progresso" ? "play" : "clipboard-list"
  };
}

function renderNavLink(item) {
  const icon = item.icon ? `<i data-lucide="${escapeAttribute(item.icon)}" aria-hidden="true"></i>` : "";
  return `<a data-nav-key="${escapeAttribute(item.key)}" href="${escapeAttribute(item.href)}">${icon}<span>${item.label}</span></a>`;
}

function renderAuthButton(session, variant) {
  const isAuthenticated = Boolean(session);
  const isMobile = variant === "mobile";
  const label = isAuthenticated ? "Sair" : "Entrar / Criar conta";
  const icon = isAuthenticated ? "log-out" : "user-circle";
  const className = `auth-entry-button${isMobile ? " mobile-auth-entry" : ""}${isAuthenticated ? " is-authenticated" : ""}`;
  const ariaLabel = isAuthenticated ? "Sair da conta" : "Entrar ou criar conta";

  return `
    <button class="${className}" type="button" data-auth-entry aria-label="${ariaLabel}" title="${ariaLabel}">
      <i data-lucide="${icon}" aria-hidden="true"></i>
      <span data-auth-entry-label>${label}</span>
    </button>
  `;
}

function renderPrimaryCta(session, variant) {
  const cta = getPrimaryCta(session);
  const className = variant === "mobile" ? "mobile-cta-link" : "header-cta";
  return `
    <a class="${className}" href="${escapeAttribute(cta.href)}" aria-label="${escapeAttribute(cta.label)}" title="${escapeAttribute(cta.label)}">
      <i data-lucide="${escapeAttribute(cta.icon)}" aria-hidden="true"></i>
      <span class="header-cta-text">${cta.label}</span>
    </a>
  `;
}

function renderGlobalNavigation(session = null, isAdmin = false) {
  const state = getNavigationState(session, isAdmin);
  const visibleItems = GLOBAL_NAV_ITEMS.filter((item) => item.states.includes(state));
  const navHtml = visibleItems.map(renderNavLink).join("");

  document.querySelectorAll("[data-global-nav='desktop']").forEach((nav) => {
    nav.innerHTML = navHtml;
  });

  document.querySelectorAll("[data-global-actions='desktop']").forEach((container) => {
    container.innerHTML = `${renderAuthButton(session, "desktop")}${renderPrimaryCta(session, "desktop")}`;
  });

  document.querySelectorAll("[data-global-nav='mobile']").forEach((nav) => {
    nav.innerHTML = `${navHtml}${renderAuthButton(session, "mobile")}${renderPrimaryCta(session, "mobile")}`;
  });

  updateGlobalNavActiveState();
  renderIcons();
}

function getCurrentNavKey() {
  const path = (window.location.pathname || "").toLowerCase();
  const route = (path.replace(/\/+$/, "").split("/").pop() || "index").replace(/\.html$/, "");
  const hash = (window.location.hash || "").toLowerCase();

  if (route === "diagnostico") {
    return "diagnostico";
  }

  if (route === "analytics") {
    return "analytics";
  }

  if (route === "meu-progresso") {
    return "progresso";
  }

  if (route === "praticas-sql") {
    return "praticas-sql";
  }

  if (route === "index") {
    if (hash === "#trilhas") {
      return "trilhas";
    }

    if (hash === "#como-funciona") {
      return "como-funciona";
    }

    if (hash === "#para-quem") {
      return "para-quem";
    }

    return "home";
  }

  return null;
}

function updateGlobalNavActiveState() {
  const activeKey = getCurrentNavKey();
  const navLinks = document.querySelectorAll("[data-nav-key]");
  navLinks.forEach((link) => {
    const isActive = link.dataset.navKey === activeKey;
    link.classList.toggle("is-active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function setAdminNavVisible(isVisible) {
  document.querySelectorAll("[data-admin-nav]").forEach((link) => {
    link.hidden = !isVisible;
  });
  updateGlobalNavActiveState();
}

function setAuthenticatedNavVisible(isAuthenticated) {
  document.querySelectorAll("[data-authenticated-nav]").forEach((element) => {
    element.hidden = !isAuthenticated;
  });

  document.querySelectorAll("[data-anonymous-nav]").forEach((element) => {
    element.hidden = isAuthenticated;
  });

  document.querySelectorAll("[data-auth-cta-label]").forEach((element) => {
    const loggedLabel = element.dataset.authenticatedLabel || element.textContent;
    const anonymousLabel = element.dataset.anonymousLabel || element.textContent;
    element.textContent = isAuthenticated ? loggedLabel : anonymousLabel;
  });

  updateGlobalNavActiveState();
}

async function refreshAdminNavigation() {
  setAdminNavVisible(false);

  try {
    if (!window.authService || typeof window.authService.getCurrentSession !== "function" || typeof window.authService.checkAdminAuthorization !== "function") {
      return false;
    }

    const sessionResult = await window.authService.getCurrentSession();
    if (!sessionResult || !sessionResult.ok || !sessionResult.session) {
      setAuthenticatedNavVisible(false);
      return false;
    }

    const authCheck = await window.authService.checkAdminAuthorization();
    const isAuthorized = Boolean(authCheck?.ok && Array.isArray(authCheck.data) && authCheck.data.some((row) => row?.is_authorized === true));
    setAdminNavVisible(isAuthorized);
    return isAuthorized;
  } catch (error) {
    setAdminNavVisible(false);
    return false;
  }
}

function setupGlobalNavigation() {
  const toggle = document.querySelector(".mobile-nav-toggle");
  const panel = document.querySelector("#mobileGlobalNav");
  const backdrop = document.querySelector(".mobile-nav-backdrop");
  if (!toggle || !panel || !backdrop) {
    updateGlobalNavActiveState();
    return;
  }

  const headerMobileBreakpoint = 1120;
  const mobileQuery = window.matchMedia(`(max-width: ${headerMobileBreakpoint}px)`);
  const header = document.querySelector(".app-header");

  const scrollToAnchor = (hashValue) => {
    if (!hashValue || hashValue === "#") {
      return;
    }

    let anchorId = "";
    try {
      anchorId = decodeURIComponent(hashValue.slice(1));
    } catch (error) {
      return;
    }

    if (!anchorId || anchorId.includes("=") || anchorId.includes("&")) {
      return;
    }

    const target = document.getElementById(anchorId);
    if (!target) {
      return;
    }

    const headerHeight = Math.ceil(header?.getBoundingClientRect().height || 0);
    const offset = headerHeight + 56;
    const targetTop = target.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth"
    });
  };

  const setMenuOpen = (isOpen) => {
    const shouldOpen = mobileQuery.matches && isOpen;

    document.body.classList.toggle("menu-open", shouldOpen);
    toggle.setAttribute("aria-expanded", String(shouldOpen));
    toggle.setAttribute("aria-label", shouldOpen ? "Fechar menu de navegação" : "Abrir menu de navegação");

    if (shouldOpen) {
      backdrop.removeAttribute("hidden");
    } else {
      backdrop.setAttribute("hidden", "");
    }
  };

  setMenuOpen(false);
  updateGlobalNavActiveState();

  toggle.addEventListener("click", () => {
    const isOpen = document.body.classList.contains("menu-open");
    setMenuOpen(!isOpen);
  });

  backdrop.addEventListener("click", () => setMenuOpen(false));

  document.addEventListener("click", (event) => {
    const link = event.target.closest(".header-nav a, .mobile-nav-panel a, a[href^=\"#\"]");
    if (!link) {
      return;
    }

    const href = link.getAttribute("href") || "";
    const [rawPath, rawHash] = href.split("#");
    const hash = rawHash ? `#${rawHash}` : "";

    if (hash) {
      const currentPath = (window.location.pathname || "").toLowerCase();
      const linkPath = (rawPath || window.location.pathname || "").toLowerCase();
      const isSamePage = !rawPath
        || rawPath === "."
        || linkPath === currentPath
        || (currentPath.endsWith("/index.html") && (linkPath === "/" || linkPath.endsWith("/index.html")));

      if (isSamePage) {
        event.preventDefault();
        setMenuOpen(false);

        if (window.location.hash !== hash) {
          window.history.pushState(null, "", hash);
        }

        window.setTimeout(() => {
          scrollToAnchor(hash);
          updateGlobalNavActiveState();
        }, 70);
        return;
      }
    }

    if (panel.contains(link)) {
      setMenuOpen(false);
    }
    window.setTimeout(updateGlobalNavActiveState, 0);
  });

  document.addEventListener("click", (event) => {
    if (!document.body.classList.contains("menu-open")) {
      return;
    }

    const clickedInsideMenu = panel.contains(event.target);
    const clickedToggle = toggle.contains(event.target);
    if (!clickedInsideMenu && !clickedToggle) {
      setMenuOpen(false);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
    }
  });

  window.addEventListener("hashchange", () => {
    updateGlobalNavActiveState();
    scrollToAnchor(window.location.hash);
  });
  window.addEventListener("popstate", updateGlobalNavActiveState);
  window.addEventListener("resize", () => {
    if (window.innerWidth > headerMobileBreakpoint) {
      setMenuOpen(false);
    }
  });
  mobileQuery.addEventListener("change", (event) => {
    if (!event.matches) {
      setMenuOpen(false);
    }
  });

  if (window.location.hash) {
    window.setTimeout(() => {
      scrollToAnchor(window.location.hash);
      updateGlobalNavActiveState();
    }, 70);
  }
}

async function setupAuthEntryPoints() {
  const authCallback = (() => {
    const hash = window.location.hash || "";
    if (!hash || hash === "#") return null;

    const params = new URLSearchParams(hash.slice(1));
    const type = params.get("type");
    const errorCode = params.get("error_code");
    const hasAuthError = params.has("error") || Boolean(errorCode);

    if (type === "recovery") return { type: "recovery" };
    if (hasAuthError) return { type: "error", errorCode };
    return null;
  })();

  renderGlobalNavigation(null, false);

  if (!window.authService) {
    setAuthenticatedNavVisible(false);
    setAdminNavVisible(false);
    return;
  }

  let currentSession = null;
  let currentIsAdmin = false;
  let recoveryModalOpened = false;

  const clearAuthHash = () => {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  };

  const closeMobileMenu = () => {
    const toggle = document.querySelector(".mobile-nav-toggle");
    const backdrop = document.querySelector(".mobile-nav-backdrop");
    document.body.classList.remove("menu-open");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir menu de navegação");
    }
    if (backdrop) {
      backdrop.setAttribute("hidden", "");
    }
  };

  const setAuthState = (session, isAdmin = false) => {
    currentSession = session || null;
    currentIsAdmin = Boolean(currentSession && isAdmin);
    const isAuthenticated = Boolean(currentSession);

    setAuthenticatedNavVisible(isAuthenticated);
    renderGlobalNavigation(currentSession, currentIsAdmin);
    setAdminNavVisible(currentIsAdmin);
  };

  const refreshAuthState = async () => {
    const sessionResult = await window.authService.getCurrentSession();
    const session = sessionResult && sessionResult.ok ? sessionResult.session : null;
    let isAdmin = false;

    if (session && typeof window.authService.checkAdminAuthorization === "function") {
      const authCheck = await window.authService.checkAdminAuthorization();
      isAdmin = Boolean(authCheck?.ok && Array.isArray(authCheck.data) && authCheck.data.some((row) => row?.is_authorized === true));
    }

    setAuthState(session, isAdmin);
  };

  const openPasswordRecovery = async (eventSession = null) => {
    if (recoveryModalOpened || !window.authModal || typeof window.authModal.openPasswordRecoveryModal !== "function") {
      return false;
    }

    let recoverySession = eventSession || currentSession;
    if (!recoverySession) {
      const sessionResult = await window.authService.getCurrentSession();
      recoverySession = sessionResult?.ok ? sessionResult.session : null;
    }

    if (!recoverySession) {
      return false;
    }

    recoveryModalOpened = true;
    clearAuthHash();
    window.authModal.openPasswordRecoveryModal({
      onSuccess: async ({ signedOut } = {}) => {
        if (signedOut) {
          setAuthState(null, false);
          window.dispatchEvent(new CustomEvent("data-skill-map-auth-changed", {
            detail: { session: null, user: null }
          }));
          return;
        }

        await refreshAuthState();
      }
    });
    return true;
  };

  if (typeof window.authService.onAuthStateChange === "function") {
    window.authService.onAuthStateChange((event, session) => {
      if (event !== "PASSWORD_RECOVERY") {
        return;
      }

      window.setTimeout(() => {
        void openPasswordRecovery(session);
      }, 0);
    });
  }

  window.addEventListener("data-skill-map-auth-changed", () => {
    void refreshAuthState();
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-auth-entry]");
    if (!button) {
      return;
    }

    closeMobileMenu();

    if (currentSession) {
      await window.authService.signOut();
      setAuthState(null, false);
      window.dispatchEvent(new CustomEvent("data-skill-map-auth-changed", {
        detail: { session: null, user: null }
      }));
      return;
    }

    if (window.authModal && typeof window.authModal.openAuthModal === "function") {
      window.authModal.openAuthModal({
        onSuccess: async ({ session, user } = {}) => {
          await refreshAuthState();
          window.dispatchEvent(new CustomEvent("data-skill-map-auth-changed", {
            detail: { session: session || null, user: user || null }
          }));
        }
      });
    }
  });

  await refreshAuthState();

  await new Promise((resolve) => window.setTimeout(resolve, 0));

  if (recoveryModalOpened) {
    return;
  }

  if (!authCallback || !window.authModal) {
    return;
  }

  if (authCallback.type === "error") {
    clearAuthHash();
    window.authModal.openAuthModal({
      mode: "login",
      initialStatus: "Não foi possível concluir a autenticação. O link pode estar inválido ou expirado. Tente novamente."
    });
    return;
  }

  if (authCallback.type === "recovery" && await openPasswordRecovery(currentSession)) {
    return;
  }

  if (authCallback.type === "recovery") {
    clearAuthHash();
    window.authModal.openAuthModal({
      mode: "login",
      initialStatus: "Nao foi possivel validar o link. Solicite uma nova redefinicao de senha."
    });
  }
}

function updateHomeChallengeCount() {
  const challengeCountMount = document.querySelector("#homeChallengeCount");
  if (!challengeCountMount) return;

  const runtimeCount = Array.isArray(state.challengesRuntime) ? state.challengesRuntime.length : 0;
  const fallbackCount = Array.isArray(window.challenges) ? window.challenges.length : 0;
  const totalChallenges = runtimeCount || fallbackCount || 0;

  challengeCountMount.textContent = totalChallenges > 0 ? String(totalChallenges) : "--";
}

async function init() {
  bindHeaderHeightSync();
  setupGlobalNavigation();
  await setupAuthEntryPoints();
  await refreshAdminNavigation();
  renderIcons();
  if (window.supabaseDataService && typeof window.supabaseDataService.getAnonymousUserId === "function") {
    state.anonymousUserId = window.supabaseDataService.getAnonymousUserId();
  }

  if (window.questionBankService && typeof window.questionBankService.loadQuestionContent === "function") {
    await window.questionBankService.loadQuestionContent();
  }

  updateHomeChallengeCount();

  if (document.querySelector("#heroPreviewQuestion")) {
    renderHeroPreview();
    startHeroPreviewRotation();
  }

  if (document.querySelector("#quizMount")) {
    renderAreaList();
    resetDiagnostic();
  }

  if (document.querySelector("#challengeMount")) {
    renderChallenges("Todos");
  }
}

void init();
