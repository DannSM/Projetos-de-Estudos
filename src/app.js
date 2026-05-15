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

function init() {
  bindHeaderHeightSync();

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
    bindFilters();
  }
}

init();
