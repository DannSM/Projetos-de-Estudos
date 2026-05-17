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

function setupResponsiveSidebarNavigation() {
  const header = document.querySelector(".app-header");
  const sidebar = document.querySelector(".app-sidebar");
  if (!header || !sidebar) {
    return;
  }

  const mobileBreakpoint = 900;
  let toggle = header.querySelector(".sidebar-toggle");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "sidebar-toggle";
    toggle.setAttribute("aria-controls", "mobileSidebar");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
    toggle.innerHTML = '<i data-lucide="menu" aria-hidden="true"></i>';
    header.append(toggle);
  }

  if (!sidebar.id) {
    sidebar.id = "mobileSidebar";
  }

  let backdrop = document.querySelector(".sidebar-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "sidebar-backdrop";
    backdrop.setAttribute("aria-label", "Fechar menu");
    backdrop.setAttribute("hidden", "");
    document.body.append(backdrop);
  }

  const addMobileCta = () => {
    const navSection = sidebar.querySelector(".sidebar-section");
    const headerCta = header.querySelector(".header-cta");
    if (!navSection || !headerCta || sidebar.querySelector(".mobile-menu-cta")) {
      return;
    }

    const mobileCta = document.createElement("a");
    mobileCta.className = "mobile-menu-cta";
    mobileCta.href = headerCta.getAttribute("href") || "index.html";
    mobileCta.innerHTML = `${headerCta.innerHTML}`;
    navSection.append(mobileCta);
  };

  const setMenuOpen = (isOpen) => {
    const isMobileViewport = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`).matches;
    const shouldOpen = isMobileViewport && isOpen;

    document.body.classList.toggle("nav-open", shouldOpen);
    toggle.setAttribute("aria-expanded", String(shouldOpen));
    toggle.setAttribute("aria-label", shouldOpen ? "Fechar menu" : "Abrir menu");

    if (shouldOpen) {
      backdrop.removeAttribute("hidden");
    } else {
      backdrop.setAttribute("hidden", "");
    }
  };

  addMobileCta();
  setMenuOpen(false);

  toggle.addEventListener("click", () => {
    const isOpen = document.body.classList.contains("nav-open");
    setMenuOpen(!isOpen);
  });

  backdrop.addEventListener("click", () => {
    setMenuOpen(false);
  });

  sidebar.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      setMenuOpen(false);
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > mobileBreakpoint) {
      setMenuOpen(false);
    }
  });
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
  setupResponsiveSidebarNavigation();
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
