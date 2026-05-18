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
    window.lucide.createIcons();
  }
}

function getCurrentNavKey() {
  const path = (window.location.pathname || "").toLowerCase();
  const fileName = path.split("/").pop() || "index.html";
  const hash = (window.location.hash || "").toLowerCase();

  if (fileName === "diagnostico.html") {
    return "diagnostico";
  }

  if (fileName === "analytics.html") {
    return "analytics";
  }

  if (fileName === "index.html" || fileName === "" || path.endsWith("/")) {
    if (hash === "#trilhas") {
      return "trilhas";
    }

    if (hash === "#desafios") {
      return "desafios";
    }

    return "home";
  }

  return "home";
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

function setupGlobalNavigation() {
  const toggle = document.querySelector(".mobile-nav-toggle");
  const panel = document.querySelector("#mobileGlobalNav");
  const backdrop = document.querySelector(".mobile-nav-backdrop");
  if (!toggle || !panel || !backdrop) {
    updateGlobalNavActiveState();
    return;
  }

  const mobileQuery = window.matchMedia("(max-width: 1024px)");
  const header = document.querySelector(".app-header");

  const scrollToAnchor = (hashValue) => {
    if (!hashValue || hashValue === "#") {
      return;
    }

    const target = document.querySelector(hashValue);
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

  panel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      setMenuOpen(false);
    });
  });

  document.querySelectorAll(".header-nav a, .mobile-nav-panel a, a[href^=\"#\"]").forEach((link) => {
    link.addEventListener("click", (event) => {
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

      window.setTimeout(updateGlobalNavActiveState, 0);
    });
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
    if (window.innerWidth > 1024) {
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
