
const heroPreviewCategory = document.querySelector("#heroPreviewCategory");
const heroPreviewLevel = document.querySelector("#heroPreviewLevel");
const heroPreviewPoints = document.querySelector("#heroPreviewPoints");
const heroPreviewQuestion = document.querySelector("#heroPreviewQuestion");
const heroPreviewCode = document.querySelector("#heroPreviewCode");
const heroPreviewOptions = document.querySelector("#heroPreviewOptions");
const heroPreviewHint = document.querySelector("#heroPreviewHint");
const heroPreviewControls = document.querySelector("#heroPreviewControls");
const heroPreviewProgress = document.querySelector("#heroPreviewProgress");

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function renderHeroPreview(index = state.heroPreviewIndex) {
  if (!heroPreviewQuestion) return;

  const challenge = heroPreviewChallenges[index % heroPreviewChallenges.length];
  state.heroPreviewIndex = index % heroPreviewChallenges.length;

  const challengeCategory = cleanText(challenge.category);
  const challengeLevel = cleanText(challenge.level);

  heroPreviewCategory.textContent = challengeCategory;
  heroPreviewCategory.className = `category-tag ${challengeCategory.includes("SQL") ? "badge-sql" : ""}`;
  heroPreviewLevel.textContent = challengeLevel;
  heroPreviewPoints.textContent = "Diagnóstico";
  heroPreviewQuestion.textContent = cleanText(challenge.question);
  heroPreviewHint.textContent = cleanText(challenge.context) || cleanText(challenge.explanation);
  restartHeroPreviewProgress();

  if (cleanText(challenge.code)) {
    heroPreviewCode.hidden = false;
    heroPreviewCode.textContent = cleanText(challenge.code);
  } else {
    heroPreviewCode.hidden = true;
    heroPreviewCode.textContent = "";
  }

  heroPreviewOptions.innerHTML = challenge.options.map((option) => `
    <span>${cleanText(option)}</span>
  `).join("");

  heroPreviewControls.innerHTML = heroPreviewChallenges.map((_, dotIndex) => `
    <button class="preview-dot ${dotIndex === state.heroPreviewIndex ? "active" : ""}" type="button" data-preview-index="${dotIndex}" aria-label="Mostrar questão ${dotIndex + 1}"></button>
  `).join("");

  heroPreviewControls.querySelectorAll("[data-preview-index]").forEach((button) => {
    button.addEventListener("click", () => {
      transitionHeroPreview(Number(button.dataset.previewIndex));
      startHeroPreviewRotation();
    });
  });
}

function restartHeroPreviewProgress() {
  if (!heroPreviewProgress) return;

  heroPreviewProgress.style.animation = "none";
  heroPreviewProgress.offsetHeight;
  heroPreviewProgress.style.animation = "";
}

function transitionHeroPreview(nextIndex) {
  if (!heroPreviewQuestion || state.heroPreviewTransitioning) return;

  const previewBody = document.querySelector("#heroPreviewBody");
  state.heroPreviewTransitioning = true;
  previewBody.classList.add("is-leaving");

  setTimeout(() => {
    renderHeroPreview(nextIndex);
    previewBody.classList.remove("is-leaving");
    previewBody.classList.add("is-entering");

    setTimeout(() => {
      previewBody.classList.remove("is-entering");
      state.heroPreviewTransitioning = false;
    }, 420);
  }, 210);
}

function startHeroPreviewRotation() {
  if (state.heroPreviewTimer) {
    clearInterval(state.heroPreviewTimer);
  }

  state.heroPreviewTimer = setInterval(() => {
    transitionHeroPreview(state.heroPreviewIndex + 1);
  }, 5200);
}
