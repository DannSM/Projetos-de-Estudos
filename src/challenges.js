
const challengeMount = document.querySelector("#challengeMount");
const challengeScore = document.querySelector("#challengeScore");

function getAnonymousUserId() {
  if (state.anonymousUserId) return state.anonymousUserId;
  if (window.supabaseDataService && typeof window.supabaseDataService.getAnonymousUserId === "function") {
    state.anonymousUserId = window.supabaseDataService.getAnonymousUserId();
    return state.anonymousUserId;
  }
  return "anonymous";
}

function persistChallengeAttemptRecord(payload) {
  if (!window.supabaseDataService || typeof window.supabaseDataService.saveChallengeAttempt !== "function") {
    return;
  }
  void window.supabaseDataService.saveChallengeAttempt(payload);
}

function bindFilters() {
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderChallenges(button.dataset.filter);
    });
  });
}

function renderChallenges(filter) {
  const visibleChallenges = filter === "Todos"
    ? challenges
    : challenges.filter((challenge) => challenge.category === filter);

  challengeMount.innerHTML = visibleChallenges.map((challenge) => {
    const id = challenges.indexOf(challenge);
    const answered = state.completedChallenges.has(id);
    return `
      <article class="challenge-card" data-challenge-card="${id}">
        <div class="challenge-head">
          <span class="category-tag ${challenge.category.includes("SQL") ? "badge-sql" : ""}">${challenge.category}</span>
          <span class="level-tag">${challenge.level}</span>
        </div>
        <h3>${challenge.question}</h3>
        ${challenge.code ? `<code class="code-block">${challenge.code}</code>` : ""}
        ${challenge.context ? `<p class="question-meta">${challenge.context}</p>` : ""}
        <div class="answer-list">
          ${challenge.options.map((option, optionIndex) => `
            <button class="answer-button" data-challenge="${id}" data-option="${optionIndex}" ${answered ? "disabled" : ""}>
              ${option}
            </button>
          `).join("")}
        </div>
        <div class="question-meta">Pontuação: ${challenge.points} pontos</div>
        <button class="submit-button" data-submit-challenge="${id}" ${answered ? "disabled" : ""}>Responder</button>
        <div id="challengeFeedback${id}"></div>
      </article>
    `;
  }).join("");

  if (!visibleChallenges.length) {
    challengeMount.innerHTML = `<p class="question-meta">Nenhum desafio encontrado para esta categoria.</p>`;
  }

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

  card.querySelectorAll("[data-option]").forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.option) === selectedIndex);
  });
}

function handleChallengeAnswer(challengeIndex) {
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

  const challenge = challenges[challengeIndex];
  const card = document.querySelector(`[data-challenge-card="${challengeIndex}"]`);
  const buttons = card.querySelectorAll("[data-option]");
  const isCorrect = selectedIndex === challenge.correct;
  const answeredAt = new Date().toISOString();

  buttons.forEach((button) => {
    const optionIndex = Number(button.dataset.option);
    button.disabled = true;
    button.classList.remove("selected");
    if (optionIndex === challenge.correct) button.classList.add("correct");
    if (optionIndex === selectedIndex && !isCorrect) button.classList.add("incorrect");
  });

  card.querySelector("[data-submit-challenge]").disabled = true;

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
    challenge_theme: challenge.category,
    challenge_level: challenge.level,
    question: challenge.question,
    selected_answer: challenge.options[selectedIndex],
    correct_answer: challenge.options[challenge.correct],
    is_correct: isCorrect,
    points: challenge.points
  });

  feedbackMount.innerHTML = `
    <div class="feedback-box ${isCorrect ? "success" : "error"}">
      <strong>${isCorrect ? "Excelente! Resposta correta." : "Boa tentativa. Veja a explicação."}</strong>
      <p class="explanation">${challenge.explanation}</p>
    </div>
  `;

  updateChallengeScore();
}

function updateChallengeScore() {
  challengeScore.textContent = `Pontuação dos desafios: ${state.challengeScore}`;
}
