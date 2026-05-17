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
