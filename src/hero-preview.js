
const heroPreviewCategory = document.querySelector("#heroPreviewCategory");
const heroPreviewLevel = document.querySelector("#heroPreviewLevel");
const heroPreviewPoints = document.querySelector("#heroPreviewPoints");
const heroPreviewQuestion = document.querySelector("#heroPreviewQuestion");
const heroPreviewCode = document.querySelector("#heroPreviewCode");
const heroPreviewOptions = document.querySelector("#heroPreviewOptions");
const heroPreviewHint = document.querySelector("#heroPreviewHint");
const heroPreviewControls = document.querySelector("#heroPreviewControls");
const heroPreviewProgress = document.querySelector("#heroPreviewProgress");
function renderHeroPreview(index = state.heroPreviewIndex) {
  if (!heroPreviewQuestion) return;

  const challenge = heroPreviewChallenges[index % heroPreviewChallenges.length];
  state.heroPreviewIndex = index % heroPreviewChallenges.length;

  heroPreviewCategory.textContent = challenge.category;
  heroPreviewCategory.className = `category-tag ${challenge.category.includes("SQL") ? "badge-sql" : ""}`;
  heroPreviewLevel.textContent = challenge.level;
  heroPreviewPoints.textContent = `${challenge.points} pontos`;
  heroPreviewQuestion.textContent = challenge.question;
  heroPreviewHint.textContent = challenge.context || challenge.explanation;
  restartHeroPreviewProgress();

  if (challenge.code) {
    heroPreviewCode.hidden = false;
    heroPreviewCode.textContent = challenge.code;
  } else {
    heroPreviewCode.hidden = true;
    heroPreviewCode.textContent = "";
  }

  heroPreviewOptions.innerHTML = challenge.options.map((option) => `
    <span>${option}</span>
  `).join("");

  heroPreviewControls.innerHTML = heroPreviewChallenges.map((_, dotIndex) => `
    <button class="preview-dot ${dotIndex === state.heroPreviewIndex ? "active" : ""}" type="button" data-preview-index="${dotIndex}" aria-label="Mostrar desafio ${dotIndex + 1}"></button>
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
