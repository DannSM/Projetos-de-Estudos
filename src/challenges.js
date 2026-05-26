const challengeMount = document.querySelector("#challengeMount");
const challengeScore = document.querySelector("#challengeScore");
const challengeToolbar = document.querySelector(".challenge-toolbar");
const challengeMobileActions = document.querySelector("#challengeMobileActions");
const CHALLENGE_SURVEY_MIN_ATTEMPTS = 3;
const MOBILE_CHALLENGE_LIMIT = 3;

let showAllMobileChallenges = false;

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function cleanOptionList(options) {
  if (!Array.isArray(options)) return [];
  return options.map((option) => cleanText(option));
}

function getAnonymousUserId() {
  if (state.anonymousUserId) return state.anonymousUserId;
  if (window.supabaseDataService && typeof window.supabaseDataService.getAnonymousUserId === "function") {
    state.anonymousUserId = window.supabaseDataService.getAnonymousUserId();
    return state.anonymousUserId;
  }
  return "anonymous";
}

function getChallengeSessionId() {
  if (state.currentChallengeSessionId) {
    return state.currentChallengeSessionId;
  }

  state.currentChallengeSessionId = window.supabaseDataService && typeof window.supabaseDataService.createAttemptId === "function"
    ? window.supabaseDataService.createAttemptId("challenge_session")
    : `challenge_session_${Date.now()}`;

  return state.currentChallengeSessionId;
}

function getChallengePool() {
  if (Array.isArray(state.challengesRuntime) && state.challengesRuntime.length > 0) {
    return state.challengesRuntime;
  }
  return challenges;
}

function normalizeChallengeCategory(category) {
  if (typeof category !== "string" || !category.trim()) {
    return "Geral";
  }
  const normalized = category.trim();
  if (normalized === "Indicadores") return "Indicadores e KPIs";
  return normalized;
}

function getChallengeCategories(questionPool) {
  const categories = new Set();
  questionPool.forEach((challenge) => {
    categories.add(normalizeChallengeCategory(challenge.category));
  });

  return Array.from(categories).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function getChallengeFeedbackStorageKey(challengeId) {
  return `dataSkillMap_feedback_challenge_${challengeId}_${getAnonymousUserId()}`;
}

function hasChallengeFeedbackFlag(challengeId) {
  try {
    return Boolean(window.localStorage.getItem(getChallengeFeedbackStorageKey(challengeId)));
  } catch (error) {
    return false;
  }
}

function setChallengeFeedbackFlag(challengeId, status) {
  try {
    window.localStorage.setItem(getChallengeFeedbackStorageKey(challengeId), status);
  } catch (error) {
    // localStorage indisponivel: segue o fluxo sem persistencia do flag
  }
}

function persistChallengeAttemptRecord(payload) {
  if (!window.supabaseDataService || typeof window.supabaseDataService.saveChallengeAttempt !== "function") {
    return;
  }
  void window.supabaseDataService.saveChallengeAttempt(payload);
}

function persistSatisfactionFeedbackRecord(payload) {
  if (!window.supabaseDataService || typeof window.supabaseDataService.saveSatisfactionFeedback !== "function") {
    return Promise.resolve({ ok: false, skipped: true });
  }
  return window.supabaseDataService.saveSatisfactionFeedback(payload);
}

function bindFilters() {
  if (!challengeToolbar) return;

  challengeToolbar.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      challengeToolbar.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      showAllMobileChallenges = false;
      renderChallenges(button.dataset.filter);
    });
  });
}

function isMobileChallengeView() {
  return window.matchMedia("(max-width: 620px)").matches;
}

function renderChallengeMobileActions(totalVisible, activeFilter) {
  if (!challengeMobileActions) return;

  if (totalVisible <= MOBILE_CHALLENGE_LIMIT) {
    challengeMobileActions.innerHTML = "";
    return;
  }

  const isLimited = isMobileChallengeView() && !showAllMobileChallenges;
  const label = showAllMobileChallenges ? "Mostrar menos desafios" : "Ver todos os desafios";
  const filterText = activeFilter !== "Todos" ? ` em ${activeFilter}` : "";
  const helperText = isLimited
    ? `Mostrando ${MOBILE_CHALLENGE_LIMIT} de ${totalVisible} desafios${filterText}.`
    : `Mostrando ${totalVisible} desafios${filterText}.`;

  challengeMobileActions.innerHTML = `
    <p>${helperText}</p>
    <button class="filter-button challenge-toggle-button" type="button">${label}</button>
  `;

  const toggleButton = challengeMobileActions.querySelector(".challenge-toggle-button");
  toggleButton?.addEventListener("click", () => {
    showAllMobileChallenges = !showAllMobileChallenges;
    renderChallenges(activeFilter);
  });
}

function renderChallengeToolbar(activeFilter, categories) {
  if (!challengeToolbar) return;

  const filters = ["Todos", ...categories];
  challengeToolbar.innerHTML = filters.map((label) => `
    <button class="filter-button ${label === activeFilter ? "active" : ""}" data-filter="${label}">${label}</button>
  `).join("");

  bindFilters();
}

function renderChallenges(filter = "Todos") {
  const questionPool = getChallengePool();
  const categories = getChallengeCategories(questionPool);
  const validFilters = new Set(["Todos", ...categories]);
  const activeFilter = validFilters.has(filter) ? filter : "Todos";

  renderChallengeToolbar(activeFilter, categories);

  const visibleChallenges = questionPool
    .map((challenge, index) => ({ challenge, index }))
    .filter((entry) => {
      if (activeFilter === "Todos") return true;
      return normalizeChallengeCategory(entry.challenge.category) === activeFilter;
    });

  const renderedChallenges = isMobileChallengeView() && !showAllMobileChallenges
    ? visibleChallenges.slice(0, MOBILE_CHALLENGE_LIMIT)
    : visibleChallenges;

  challengeMount.innerHTML = renderedChallenges.map(({ challenge, index }) => {
    const answered = state.completedChallenges.has(index);
    const challengeCategory = normalizeChallengeCategory(challenge.category);
    const cleanedQuestion = cleanText(challenge.question);
    const cleanedCode = cleanText(challenge.code);
    const cleanedContext = cleanText(challenge.context);
    const cleanedOptions = cleanOptionList(challenge.options);
    return `
      <article class="challenge-card" data-challenge-card="${index}">
        <div class="challenge-head">
          <span class="category-tag ${challengeCategory.includes("SQL") ? "badge-sql" : ""}">${challengeCategory}</span>
          <span class="level-tag">${cleanText(challenge.level)}</span>
        </div>
        <h3>${cleanedQuestion}</h3>
        ${cleanedCode ? `<code class="code-block">${cleanedCode}</code>` : ""}
        ${cleanedContext ? `<p class="question-meta">${cleanedContext}</p>` : ""}
        <div class="answer-list">
          ${cleanedOptions.map((option, optionIndex) => `
            <button class="answer-button" data-challenge="${index}" data-option="${optionIndex}" ${answered ? "disabled" : ""}>
              ${option}
            </button>
          `).join("")}
        </div>
        <div class="question-meta">Pontuação: ${challenge.points} pontos</div>
        <button class="submit-button" data-submit-challenge="${index}" ${answered ? "disabled" : ""}>Responder</button>
        <div id="challengeFeedback${index}"></div>
      </article>
    `;
  }).join("");

  if (!visibleChallenges.length) {
    challengeMount.innerHTML = `<p class="question-meta">Nenhum desafio encontrado para esta categoria.</p>`;
  }

  renderChallengeMobileActions(visibleChallenges.length, activeFilter);

  challengeMount.querySelectorAll("[data-challenge]").forEach((button) => {
    button.addEventListener("click", () => selectChallengeAnswer(Number(button.dataset.challenge), Number(button.dataset.option)));
  });

  challengeMount.querySelectorAll("[data-submit-challenge]").forEach((button) => {
    button.addEventListener("click", () => handleChallengeAnswer(Number(button.dataset.submitChallenge)));
  });

  updateChallengeScore();
}

function selectChallengeAnswer(challengeIndex, selectedIndex) {
  state.selectedChallengeOptions[challengeIndex] = selectedIndex;
  const card = document.querySelector(`[data-challenge-card="${challengeIndex}"]`);
  if (!card) return;

  card.querySelectorAll("[data-option]").forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.option) === selectedIndex);
  });
}

function maybeOpenChallengeSatisfactionModal(challengeIndex) {
  if (state.challengeSurveySubmitted || hasChallengeFeedbackFlag(challengeIndex)) {
    return;
  }

  if (state.challengeAnsweredCount < CHALLENGE_SURVEY_MIN_ATTEMPTS) {
    return;
  }

  if (!window.feedbackModal || typeof window.feedbackModal.open !== "function") {
    return;
  }

  const scorePercent = state.challengeAnsweredCount
    ? Math.round((state.challengeCorrectCount / state.challengeAnsweredCount) * 100)
    : 0;

  window.feedbackModal.open({
    title: "Pesquisa de satisfação",
    question: "Como foi sua experiência com este desafio?",
    scaleAriaLabel: "Nota de satisfação dos desafios",
    commentLabel: "Detalhe sua nota (opcional)",
    commentPlaceholder: "Compartilhe sua percepção da experiência.",
    submitLabel: "Enviar avaliação",
    skipLabel: "Agora não",
    successTitle: "Avaliação enviada.",
    successText: "Obrigado por ajudar a melhorar os desafios.",
    onSubmit: async ({ rating, comment }) => {
      const payload = {
        attempt_id: getChallengeSessionId(),
        anonymous_user_id: getAnonymousUserId(),
        context: "desafios_sessao",
        rating,
        comment,
        score_percent: scorePercent,
        blocked_at_level: false
      };

      const result = await persistSatisfactionFeedbackRecord(payload);
      if (result && result.ok) {
        state.challengeSurveySubmitted = true;
        setChallengeFeedbackFlag(challengeIndex, "submitted");
      }
      return result;
    },
    onSkip: () => {
      setChallengeFeedbackFlag(challengeIndex, "dismissed");
    }
  });
}

function handleChallengeAnswer(challengeIndex) {
  const questionPool = getChallengePool();
  const challenge = questionPool[challengeIndex];
  if (!challenge) return;

  const selectedIndex = state.selectedChallengeOptions[challengeIndex];
  const feedbackMount = document.querySelector(`#challengeFeedback${challengeIndex}`);

  if (selectedIndex === undefined) {
    feedbackMount.innerHTML = `
      <div class="feedback-box error">
        <strong>Escolha uma alternativa antes de responder.</strong>
      </div>
    `;
    return;
  }

  const card = document.querySelector(`[data-challenge-card="${challengeIndex}"]`);
  if (!card) return;
  const buttons = card.querySelectorAll("[data-option]");
  const isCorrect = selectedIndex === challenge.correct;
  const answeredAt = new Date().toISOString();
  const challengeCategory = normalizeChallengeCategory(challenge.category);

  buttons.forEach((button) => {
    const optionIndex = Number(button.dataset.option);
    button.disabled = true;
    button.classList.remove("selected");
    if (optionIndex === challenge.correct) button.classList.add("correct");
    if (optionIndex === selectedIndex && !isCorrect) button.classList.add("incorrect");
  });

  card.querySelector("[data-submit-challenge]").disabled = true;

  state.challengeAnsweredCount += 1;
  if (isCorrect) {
    state.challengeCorrectCount += 1;
  }

  if (isCorrect && !state.completedChallenges.has(challengeIndex)) {
    state.challengeScore += challenge.points;
    state.completedChallenges.add(challengeIndex);
  }

  persistChallengeAttemptRecord({
    attempt_id: window.supabaseDataService && typeof window.supabaseDataService.createAttemptId === "function"
      ? window.supabaseDataService.createAttemptId("challenge")
      : `challenge_${Date.now()}`,
    anonymous_user_id: getAnonymousUserId(),
    answered_at: answeredAt,
    challenge_index: challengeIndex,
    challenge_theme: challengeCategory,
    challenge_level: challenge.level,
    question: challenge.question,
    selected_answer: cleanText(challenge.options[selectedIndex]),
    correct_answer: cleanText(challenge.options[challenge.correct]),
    is_correct: isCorrect,
    points: challenge.points
  });

  feedbackMount.innerHTML = `
    <div class="feedback-box ${isCorrect ? "success" : "error"}">
      <strong>${isCorrect ? "Excelente! Resposta correta." : "Boa tentativa. Veja a explicação."}</strong>
      <p class="explanation">${cleanText(challenge.explanation)}</p>
    </div>
  `;

  updateChallengeScore();
  maybeOpenChallengeSatisfactionModal(challengeIndex);
}

function updateChallengeScore() {
  challengeScore.textContent = `Pontuação dos desafios: ${state.challengeScore}`;
}
