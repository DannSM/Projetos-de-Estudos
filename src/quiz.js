
const quizMount = document.querySelector("#quizMount");
const resultSection = document.querySelector("#resultado");
const resultMount = document.querySelector("#resultMount");
const areaList = document.querySelector("#areaList");
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
  state.diagnosticAnswers = [];
  state.areaScore = areaGoals.reduce((scores, area) => {
    scores[area] = { correct: 0, total: countQuestionsByArea(area), misses: [], hits: [] };
    return scores;
  }, {});
  resultSection.classList.add("hidden");
  renderQuestion();
  renderAreaProgress();
}

function renderAreaProgress() {
  areaList.innerHTML = areaGoals.map((area) => {
    const score = state.areaScore[area];
    const percent = score.total ? Math.round((score.correct / score.total) * 100) : 0;
    return `
      <div class="area-pill">
        <strong>${area}</strong>
        <span>${score.correct}/${score.total} · ${percent}%</span>
      </div>
    `;
  }).join("");
}

function renderQuestion() {
  const question = diagnosticQuestions[state.currentQuestion];
  const progress = (state.currentQuestion / diagnosticQuestions.length) * 100;

  quizMount.innerHTML = `
    <div class="progress-line" aria-label="Progresso do diagnóstico">
      <span style="width: ${progress}%"></span>
    </div>
    <div class="quiz-top">
      <span>Pergunta ${state.currentQuestion + 1} de ${diagnosticQuestions.length}</span>
      <span>${question.area}</span>
    </div>
    <div class="concept-row">
      <span class="concept-tag">${question.concept}</span>
      <span class="level-tag">${question.level}</span>
    </div>
    <h3 class="question-title">${question.question}</h3>
    <div class="answer-list">
      ${question.options.map((option, index) => `
        <button class="answer-button" data-answer="${index}">
          ${String.fromCharCode(65 + index)}) ${option}
        </button>
      `).join("")}
    </div>
    <div id="feedbackMount"></div>
  `;

  quizMount.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", () => handleDiagnosticAnswer(Number(button.dataset.answer)));
  });
}

function handleDiagnosticAnswer(selectedIndex) {
  const question = diagnosticQuestions[state.currentQuestion];
  const isCorrect = selectedIndex === question.correct;
  const buttons = quizMount.querySelectorAll("[data-answer]");

  buttons.forEach((button, index) => {
    button.disabled = true;
    if (index === question.correct) button.classList.add("correct");
    if (index === selectedIndex && !isCorrect) button.classList.add("incorrect");
  });

  if (isCorrect) {
    state.areaScore[question.area].correct += 1;
    state.areaScore[question.area].hits.push(question.concept);
  } else {
    state.areaScore[question.area].misses.push(question.concept);
  }

  state.diagnosticAnswers.push({ area: question.area, correct: isCorrect, concept: question.concept });
  renderAreaProgress();

  document.querySelector("#feedbackMount").innerHTML = `
    <div class="feedback-box ${isCorrect ? "success" : "error"}">
      <strong>${isCorrect ? "Boa! Resposta correta." : "Boa tentativa. Vamos revisar o conceito."}</strong>
      <p class="explanation">${question.explanation}</p>
      <button class="submit-button" id="nextQuestion">
        ${state.currentQuestion === diagnosticQuestions.length - 1 ? "Ver resultado" : "Próxima pergunta"}
      </button>
    </div>
  `;

  document.querySelector("#nextQuestion").addEventListener("click", advanceDiagnostic);
}

function advanceDiagnostic() {
  if (state.currentQuestion < diagnosticQuestions.length - 1) {
    state.currentQuestion += 1;
    renderQuestion();
    return;
  }

  showResult();
}

function showResult() {
  const totalCorrect = Object.values(state.areaScore).reduce((sum, area) => sum + area.correct, 0);
  const percent = totalCorrect / diagnosticQuestions.length;
  const profile = getProfile(percent, state.areaScore);
  const insights = buildAreaInsights(state.areaScore);
  const recommendations = buildRecommendations(state.areaScore, profile, insights);
  const strongest = insights[0];
  const weakest = [...insights].reverse()[0];

  quizMount.innerHTML = `
    <div class="feedback-box success">
      <strong>Diagnóstico concluído</strong>
      <p class="explanation">Você acertou ${totalCorrect} de ${diagnosticQuestions.length} perguntas. A leitura detalhada está logo abaixo.</p>
      <button class="restart-button" id="restartDiagnostic">Refazer diagnóstico</button>
    </div>
  `;

  document.querySelector("#restartDiagnostic").addEventListener("click", resetDiagnostic);

  resultMount.innerHTML = `
    <article class="result-card result-dashboard">
      <div class="profile-title">
        <div>
          <span class="section-kicker">Resultado</span>
          <h2>${profile.name}</h2>
        </div>
        <span class="profile-badge">${Math.round(percent * 100)}% de domínio</span>
      </div>
      <p class="profile-detail">${profile.description}</p>

      <div class="result-metrics">
        <div class="metric-card">
          <strong>${totalCorrect}/${diagnosticQuestions.length}</strong>
          <span>acertos no diagnóstico</span>
        </div>
        <div class="metric-card">
          <strong>${strongest.area}</strong>
          <span>área mais forte agora</span>
        </div>
        <div class="metric-card">
          <strong>${weakest.area}</strong>
          <span>maior prioridade de estudo</span>
        </div>
      </div>

      <div class="result-block">
        <h3>Mapa por área</h3>
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

      <div class="result-block">
        <h3>Leitura do resultado</h3>
        <div class="insight-grid">
          ${insights.map((item) => `
            <article class="insight-card ${item.statusClass}">
              <strong>${item.area} · ${item.label}</strong>
              <p>${item.message}</p>
            </article>
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
            <p><strong>Próximo desafio:</strong> ${item.next}</p>
          </article>
        `).join("")}
      </div>

      <div class="result-block">
        <h3>Plano de estudo sugerido</h3>
        <ul class="action-list">
          ${recommendations.plan.map((step) => `<li>${step}</li>`).join("")}
        </ul>
      </div>
    </article>
  `;

  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}
