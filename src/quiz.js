const quizMount = document.querySelector("#quizMount");
const resultSection = document.querySelector("#resultado");
const resultMount = document.querySelector("#resultMount");
const areaList = document.querySelector("#areaList");

const diagnosticLevels = [
  {
    name: "Basico",
    label: "Nivel basico",
    shortLabel: "Basico",
    minPercent: 0.75,
    description: "Fundamentos essenciais para seguir com seguranca."
  },
  {
    name: "Intermediario",
    label: "Nivel intermediario",
    shortLabel: "Intermediario",
    minPercent: 0.75,
    description: "Raciocinio pratico para lidar com dados relacionais, BI e metricas."
  },
  {
    name: "Avancado",
    label: "Nivel avancado",
    shortLabel: "Avancado",
    minPercent: null,
    description: "Leitura analitica mais madura para problemas proximos do trabalho real."
  }
].map((level) => ({
  ...level,
  questions: diagnosticQuestions.filter((question) => question.level === level.name)
}));

function renderAreaList() {
  areaList.innerHTML = areaGoals.map((area) => `
    <div class="area-pill">
      <strong>${area}</strong>
      <span>0/${countQuestionsByArea(area)}</span>
    </div>
  `).join("");
}

function countQuestionsByArea(area) {
  return diagnosticQuestions.filter((question) => question.area === area).length;
}

function resetDiagnostic() {
  state.currentQuestion = 0;
  state.currentLevelIndex = 0;
  state.diagnosticStarted = false;
  state.selectedDiagnosticAnswer = null;
  state.diagnosticAnswers = [];
  state.levelResults = [];
  state.diagnosticStoppedAtLevel = null;
  state.areaScore = areaGoals.reduce((scores, area) => {
    scores[area] = { correct: 0, total: 0, misses: [], hits: [] };
    return scores;
  }, {});
  resultSection.classList.add("hidden");
  resultMount.innerHTML = "";
  renderAreaProgress();
  renderDiagnosticIntro();
}

function getCurrentLevel() {
  return diagnosticLevels[state.currentLevelIndex];
}

function getTotalAnswered() {
  return state.diagnosticAnswers.length;
}

function getTotalCorrect() {
  return state.diagnosticAnswers.filter((answer) => answer.correct).length;
}

function renderAreaProgress() {
  areaList.innerHTML = areaGoals.map((area) => {
    const score = state.areaScore[area];
    const expected = countQuestionsByArea(area);
    const percent = score.total ? Math.round((score.correct / score.total) * 100) : 0;
    const answered = score.hits.length + score.misses.length;
    const statusClass = answered === 0 ? "" : percent >= 75 ? "is-strong" : percent >= 45 ? "is-medium" : "is-low";

    return `
      <div class="area-pill ${statusClass}">
        <strong>${area}</strong>
        <span>${score.correct}/${expected} - ${answered ? `${percent}%` : "pendente"}</span>
      </div>
    `;
  }).join("");
}

function renderLevelRoadmap() {
  return `
    <div class="level-roadmap" aria-label="Etapas do diagnostico">
      ${diagnosticLevels.map((level, index) => {
        const result = state.levelResults.find((item) => item.name === level.name);
        const isCurrent = index === state.currentLevelIndex && state.diagnosticStarted;
        const status = result ? (result.passed ? "is-complete" : "is-blocked") : isCurrent ? "is-current" : "";
        const score = result ? `${Math.round(result.percent * 100)}%` : level.minPercent ? `meta ${Math.round(level.minPercent * 100)}%` : "final";
        return `
          <div class="level-step ${status}">
            <strong>${level.shortLabel}</strong>
            <span>${score}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderDiagnosticIntro() {
  quizMount.innerHTML = `
    <div class="diagnostic-intro quiz-step">
      <span class="section-kicker">Diagnostico por niveis</span>
      <h3 class="question-title">Comece pelo basico e avance conforme seu desempenho.</h3>
      <p class="question-meta">
        Sao ${diagnosticQuestions.length} perguntas no total. Voce avanca para o proximo nivel ao atingir 75% no nivel atual.
      </p>
      ${renderLevelRoadmap()}
      <div class="diagnostic-summary">
        <span>10 perguntas</span>
        <span>3 niveis</span>
        <span>Confirmacao antes de responder</span>
      </div>
      <p class="explanation">
        A avaliacao comeca no basico. Se a base ainda precisar de reforco, o diagnostico para ali e recomenda o proximo estudo.
      </p>
      <button class="submit-button" id="startDiagnostic">Iniciar diagnostico</button>
    </div>
  `;

  document.querySelector("#startDiagnostic").addEventListener("click", startDiagnostic);
}

function startDiagnostic() {
  state.diagnosticStarted = true;
  state.currentLevelIndex = 0;
  state.currentQuestion = 0;
  state.selectedDiagnosticAnswer = null;
  renderQuestion();
}

function renderQuestion() {
  const level = getCurrentLevel();
  const question = level.questions[state.currentQuestion];
  const progress = (getTotalAnswered() / diagnosticQuestions.length) * 100;
  const percentLabel = Math.round(progress);

  quizMount.innerHTML = `
    <div class="quiz-step">
      ${renderLevelRoadmap()}
      <div class="progress-line" aria-label="Progresso do diagnostico">
        <span style="width: ${progress}%"></span>
      </div>
      <div class="quiz-top">
        <span>${level.label} - pergunta ${state.currentQuestion + 1} de ${level.questions.length}</span>
        <span>${percentLabel}% do diagnostico</span>
      </div>
      <div class="concept-row">
        <span class="concept-tag">${question.concept}</span>
        <span class="level-tag">${level.shortLabel}</span>
        <span class="category-tag">${question.area}</span>
      </div>
      <h3 class="question-title">${question.question}</h3>
      <div class="answer-list">
        ${question.options.map((option, index) => `
          <button class="answer-button" data-answer="${index}">
            ${String.fromCharCode(65 + index)}) ${option}
          </button>
        `).join("")}
      </div>
      <button class="submit-button" id="confirmDiagnosticAnswer" disabled>Confirmar resposta</button>
      <div id="feedbackMount"></div>
    </div>
  `;

  quizMount.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", () => selectDiagnosticAnswer(Number(button.dataset.answer)));
  });
  document.querySelector("#confirmDiagnosticAnswer").addEventListener("click", confirmDiagnosticAnswer);
}

function selectDiagnosticAnswer(selectedIndex) {
  state.selectedDiagnosticAnswer = selectedIndex;
  quizMount.querySelectorAll("[data-answer]").forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.answer) === selectedIndex);
  });
  document.querySelector("#confirmDiagnosticAnswer").disabled = false;
}

function confirmDiagnosticAnswer() {
  const selectedIndex = state.selectedDiagnosticAnswer;
  if (selectedIndex === null || selectedIndex === undefined) return;

  const level = getCurrentLevel();
  const question = level.questions[state.currentQuestion];
  const isCorrect = selectedIndex === question.correct;
  const buttons = quizMount.querySelectorAll("[data-answer]");
  const confirmButton = document.querySelector("#confirmDiagnosticAnswer");

  buttons.forEach((button, index) => {
    button.disabled = true;
    button.classList.remove("selected");
    if (index === question.correct) button.classList.add("correct");
    if (index === selectedIndex && !isCorrect) button.classList.add("incorrect");
  });

  confirmButton.disabled = true;

  if (isCorrect) {
    state.areaScore[question.area].correct += 1;
    state.areaScore[question.area].hits.push(question.concept);
  } else {
    state.areaScore[question.area].misses.push(question.concept);
  }
  state.areaScore[question.area].total += 1;

  state.diagnosticAnswers.push({
    area: question.area,
    level: question.level,
    concept: question.concept,
    question: question.question,
    selected: question.options[selectedIndex],
    correctAnswer: question.options[question.correct],
    correct: isCorrect,
    explanation: question.explanation
  });
  renderAreaProgress();

  document.querySelector("#feedbackMount").innerHTML = `
    <div class="feedback-box ${isCorrect ? "success" : "error"}">
      <strong>${isCorrect ? "Correto. Voce dominou este ponto." : "Ainda nao. O ponto principal e este:"}</strong>
      <p class="question-meta">Resposta correta: <strong>${String.fromCharCode(65 + question.correct)}) ${question.options[question.correct]}</strong></p>
      <p class="explanation">${question.explanation}</p>
      <p class="question-meta">Conceito avaliado: ${question.concept}</p>
      <button class="submit-button" id="nextQuestion">
        ${getNextButtonLabel()}
      </button>
    </div>
  `;

  document.querySelector("#nextQuestion").addEventListener("click", advanceDiagnostic);
}

function getNextButtonLabel() {
  const level = getCurrentLevel();
  if (state.currentQuestion < level.questions.length - 1) return "Proxima pergunta";
  if (level.minPercent === null) return "Ver resultado";
  return "Ver desempenho do nivel";
}

function advanceDiagnostic() {
  const level = getCurrentLevel();

  if (state.currentQuestion < level.questions.length - 1) {
    state.currentQuestion += 1;
    state.selectedDiagnosticAnswer = null;
    renderQuestion();
    return;
  }

  completeCurrentLevel();
}

function completeCurrentLevel() {
  const level = getCurrentLevel();
  const levelAnswers = state.diagnosticAnswers.filter((answer) => answer.level === level.name);
  const correct = levelAnswers.filter((answer) => answer.correct).length;
  const percent = levelAnswers.length ? correct / levelAnswers.length : 0;
  const passed = level.minPercent === null || percent >= level.minPercent;
  const levelResult = { name: level.name, label: level.shortLabel, correct, total: levelAnswers.length, percent, passed };
  state.levelResults.push(levelResult);

  if (!passed) {
    state.diagnosticStoppedAtLevel = levelResult;
    showResult({ blocked: true });
    return;
  }

  if (state.currentLevelIndex < diagnosticLevels.length - 1) {
    showLevelTransition(levelResult);
    return;
  }

  showResult({ blocked: false });
}

function showLevelTransition(levelResult) {
  const nextLevel = diagnosticLevels[state.currentLevelIndex + 1];

  quizMount.innerHTML = `
    <div class="level-transition quiz-step">
      ${renderLevelRoadmap()}
      <span class="section-kicker">Nivel concluido</span>
      <h3 class="question-title">Voce fez ${levelResult.correct}/${levelResult.total} no ${levelResult.label}.</h3>
      <p class="explanation">
        Meta atingida. Agora o diagnostico avanca para ${nextLevel.label.toLowerCase()}, com perguntas mais exigentes.
      </p>
      <button class="submit-button" id="continueDiagnostic">Continuar para ${nextLevel.shortLabel}</button>
    </div>
  `;

  document.querySelector("#continueDiagnostic").addEventListener("click", () => {
    state.currentLevelIndex += 1;
    state.currentQuestion = 0;
    state.selectedDiagnosticAnswer = null;
    renderQuestion();
  });
}

function showResult({ blocked } = { blocked: false }) {
  const totalCorrect = getTotalCorrect();
  const answered = getTotalAnswered();
  const percent = answered ? totalCorrect / answered : 0;
  const profile = getProfile(percent, state.areaScore);
  const insights = buildAreaInsights(state.areaScore);
  const recommendations = buildRecommendations(state.areaScore, profile, insights);
  const strongest = insights[0];
  const weakest = [...insights].reverse()[0];
  const missedAnswers = state.diagnosticAnswers.filter((answer) => !answer.correct);
  const stopped = state.diagnosticStoppedAtLevel;

  quizMount.innerHTML = `
    <div class="feedback-box ${blocked ? "error" : "success"} quiz-step">
      <strong>${blocked ? "Nivel nao liberado" : "Diagnostico concluido"}</strong>
      <p class="explanation">
        ${blocked
          ? `Voce fez ${stopped.correct}/${stopped.total} no ${stopped.label}. Reforce este nivel antes de avancar.`
          : `Voce respondeu os 3 niveis e acertou ${totalCorrect} de ${answered} perguntas.`}
      </p>
      <button class="restart-button" id="restartDiagnostic">Refazer diagnostico</button>
    </div>
  `;

  document.querySelector("#restartDiagnostic").addEventListener("click", resetDiagnostic);

  resultMount.innerHTML = `
    <article class="result-card result-dashboard quiz-step">
      <div class="profile-title">
        <div>
          <span class="section-kicker">Resultado</span>
          <h2>${profile.name}</h2>
        </div>
        <span class="profile-badge">${Math.round(percent * 100)}% nas perguntas respondidas</span>
      </div>
      <p class="profile-detail">${profile.description}</p>

      <div class="priority-card result-summary">
        <span class="section-kicker">Proximo passo</span>
        <h3>${blocked ? `Reforce ${stopped.label}` : `Comece por ${weakest.area}`}</h3>
        <p>${blocked ? "O diagnostico parou no nivel atual para preservar a sequencia de aprendizagem." : "Essa e a area com maior ganho potencial agora."}</p>
      </div>

      <div class="result-metrics">
        <div class="metric-card">
          <strong>${totalCorrect}/${answered}</strong>
          <span>acertos respondidos</span>
        </div>
        <div class="metric-card">
          <strong>${strongest.area}</strong>
          <span>area mais forte agora</span>
        </div>
        <div class="metric-card">
          <strong>${blocked ? stopped.label : weakest.area}</strong>
          <span>prioridade de estudo</span>
        </div>
      </div>

      <div class="result-block">
        <h3>Desempenho por nivel</h3>
        ${renderLevelSummary()}
      </div>

      <div class="result-block">
        <h3>Mapa por area</h3>
        <div class="score-bars">
          ${insights.map((item) => `
            <div class="score-row">
              <strong>${item.area}</strong>
              <div class="score-track"><div class="score-fill" style="width: ${item.percent}%"></div></div>
              <span>${item.correct}/${item.total}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="priority-card">
        <span class="section-kicker">Prioridade recomendada</span>
        <h3>${recommendations.priority.title}</h3>
        <p>${recommendations.priority.text}</p>
      </div>

      <div class="recommendation-grid">
        ${recommendations.cards.map((item) => `
          <article class="recommendation-card">
            <span class="concept-tag">${item.level}</span>
            <h3>${item.title}</h3>
            <p>${item.text}</p>
            <p><strong>Proximo desafio:</strong> ${item.next}</p>
          </article>
        `).join("")}
      </div>

      <div class="result-block">
        <h3>Revisao dos erros</h3>
        ${missedAnswers.length ? `
          <div class="review-list">
            ${missedAnswers.map((item) => `
              <article class="review-card">
                <span class="concept-tag">${item.area} - ${item.level}</span>
                <h4>${item.question}</h4>
                <p><strong>Sua resposta:</strong> ${item.selected}</p>
                <p><strong>Resposta correta:</strong> ${item.correctAnswer}</p>
                <p class="explanation">${item.explanation}</p>
              </article>
            `).join("")}
          </div>
        ` : `<p class="explanation">Voce nao errou perguntas neste diagnostico. Mantenha revisao espacada e avance para desafios praticos.</p>`}
      </div>
    </article>
  `;

  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderLevelSummary() {
  return `
    <div class="level-summary">
      ${diagnosticLevels.map((level) => {
        const result = state.levelResults.find((item) => item.name === level.name);
        const text = result
          ? `${result.correct}/${result.total} - ${Math.round(result.percent * 100)}%`
          : "nao aplicado";
        return `
          <div class="level-summary-item ${result ? (result.passed ? "is-complete" : "is-blocked") : ""}">
            <strong>${level.shortLabel}</strong>
            <span>${text}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}
