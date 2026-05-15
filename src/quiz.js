const quizMount = document.querySelector("#quizMount");
const resultSection = document.querySelector("#resultado");
const resultMount = document.querySelector("#resultMount");
const areaList = document.querySelector("#areaList");

const QUESTIONS_PER_LEVEL = 5;
const RESULT_RENDER_DELAY_MS = 1700;
const DATA_AREAS = areaGoals.slice(2);

const diagnosticLevels = [
  {
    name: "Básico",
    label: "Nível básico",
    shortLabel: "Básico",
    minPercent: 0.75,
    description: "Fundamentos essenciais para seguir com segurança."
  },
  {
    name: "Intermediário",
    label: "Nível intermediário",
    shortLabel: "Intermediário",
    minPercent: 0.75,
    description: "Raciocínio prático para lidar com dados relacionais, BI e métricas."
  },
  {
    name: "Avançado",
    label: "Nível avançado",
    shortLabel: "Avançado",
    minPercent: null,
    description: "Leitura analítica mais madura para problemas próximos do trabalho real."
  }
].map((level) => ({
  ...level,
  questions: diagnosticQuestions.filter((question) => question.level === level.name)
}));

function getAnonymousUserId() {
  if (state.anonymousUserId) {
    return state.anonymousUserId;
  }

  if (window.supabaseDataService && typeof window.supabaseDataService.getAnonymousUserId === "function") {
    state.anonymousUserId = window.supabaseDataService.getAnonymousUserId();
    return state.anonymousUserId;
  }

  return "anonymous";
}

function getAreaPercentScore(area) {
  const score = state.areaScore[area];
  if (!score || !score.total) return 0;
  return score.correct / score.total;
}

function mapPercentToLevel(percent) {
  if (percent >= 0.75) return "Avancado";
  if (percent >= 0.45) return "Intermediario";
  return "Basico";
}

function getDataAreaLevel() {
  const scores = DATA_AREAS.map((area) => getAreaPercentScore(area)).filter((value) => Number.isFinite(value));
  if (!scores.length) return "Basico";
  const average = scores.reduce((total, value) => total + value, 0) / scores.length;
  return mapPercentToLevel(average);
}

function buildAreaScoreSnapshot() {
  return areaGoals.map((area) => {
    const score = state.areaScore[area];
    const percent = score.total ? Math.round((score.correct / score.total) * 100) : 0;
    return {
      area,
      correct: score.correct,
      total: score.total,
      percent,
      hits: score.hits,
      misses: score.misses
    };
  });
}

function persistDiagnosticAnswerRecord(payload) {
  if (!window.supabaseDataService || typeof window.supabaseDataService.saveDiagnosticAnswer !== "function") {
    return;
  }
  void window.supabaseDataService.saveDiagnosticAnswer(payload);
}

function persistDiagnosticSessionRecord(payload) {
  if (!window.supabaseDataService || typeof window.supabaseDataService.saveDiagnosticSession !== "function") {
    return;
  }
  void window.supabaseDataService.saveDiagnosticSession(payload);
}

function persistSatisfactionFeedbackRecord(payload) {
  if (!window.supabaseDataService || typeof window.supabaseDataService.saveSatisfactionFeedback !== "function") {
    return Promise.resolve({ ok: false, skipped: true });
  }
  return window.supabaseDataService.saveSatisfactionFeedback(payload);
}

function renderSatisfactionSurveyBlock() {
  return `
    <div class="result-block satisfaction-block">
      <h3>Pesquisa de satisfacao</h3>
      <p class="question-meta">Quao satisfeita(o) voce ficou com esta experiencia?</p>
      <div class="satisfaction-scale" role="radiogroup" aria-label="Nota de satisfacao">
        ${[1, 2, 3, 4, 5].map((rating) => `
          <button type="button" class="satisfaction-rating-button" data-satisfaction-rating="${rating}" aria-label="Nota ${rating}">
            ${rating}
          </button>
        `).join("")}
      </div>
      <label class="satisfaction-label" for="satisfactionComment">Detalhe sua nota (opcional)</label>
      <textarea
        id="satisfactionComment"
        class="satisfaction-textarea"
        maxlength="240"
        placeholder="Compartilhe sua percepcao da experiencia."
      ></textarea>
      <button class="submit-button" id="sendSatisfactionFeedback" disabled>Enviar avaliacao</button>
      <div id="satisfactionFeedbackMount"></div>
    </div>
  `;
}

function bindSatisfactionSurvey({ scorePercent, blocked }) {
  const feedbackMount = document.querySelector("#satisfactionFeedbackMount");
  const sendButton = document.querySelector("#sendSatisfactionFeedback");
  const commentField = document.querySelector("#satisfactionComment");
  const ratingButtons = document.querySelectorAll("[data-satisfaction-rating]");
  let selectedRating = null;
  let isSubmitting = false;

  ratingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (isSubmitting) return;
      selectedRating = Number(button.dataset.satisfactionRating);
      ratingButtons.forEach((item) => {
        item.classList.toggle("selected", Number(item.dataset.satisfactionRating) === selectedRating);
      });
      sendButton.disabled = false;
    });
  });

  sendButton.addEventListener("click", async () => {
    if (!selectedRating || isSubmitting) return;

    isSubmitting = true;
    sendButton.disabled = true;

    const payload = {
      attempt_id: state.currentDiagnosticAttemptId,
      anonymous_user_id: getAnonymousUserId(),
      context: "diagnostico_resultado",
      rating: selectedRating,
      comment: commentField.value.trim() || null,
      score_percent: scorePercent,
      blocked_at_level: blocked
    };

    const result = await persistSatisfactionFeedbackRecord(payload);

    if (result && result.ok) {
      feedbackMount.innerHTML = `
        <div class="feedback-box success">
          <strong>Avaliacao enviada.</strong>
          <p class="question-meta">Obrigado por contribuir com a evolucao da plataforma.</p>
        </div>
      `;
      commentField.disabled = true;
      ratingButtons.forEach((button) => {
        button.disabled = true;
      });
      return;
    }

    feedbackMount.innerHTML = `
      <div class="feedback-box error">
        <strong>Nao foi possivel enviar agora.</strong>
        <p class="question-meta">Voce pode tentar novamente em instantes.</p>
      </div>
    `;

    isSubmitting = false;
    sendButton.disabled = false;
  });
}

function shuffleArray(values) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function pickRandomQuestions(questions, quantity) {
  return shuffleArray(questions).slice(0, Math.min(quantity, questions.length));
}

function getDefaultSessionQuestionCount() {
  return diagnosticLevels.reduce((total, level) => total + Math.min(QUESTIONS_PER_LEVEL, level.questions.length), 0);
}

function getCurrentLevel() {
  return diagnosticLevels[state.currentLevelIndex];
}

function getCurrentLevelQuestions() {
  return state.diagnosticQuestionSets[state.currentLevelIndex] || [];
}

function getSessionQuestionCount() {
  if (!state.diagnosticQuestionSets.length) {
    return getDefaultSessionQuestionCount();
  }
  return state.diagnosticQuestionSets.reduce((total, questions) => total + questions.length, 0);
}

function getTotalAnswered() {
  return state.diagnosticAnswers.length;
}

function getTotalCorrect() {
  return state.diagnosticAnswers.filter((answer) => answer.correct).length;
}

function countQuestionsByArea(area, sessionOnly = false) {
  const source = sessionOnly && state.diagnosticQuestionSets.length
    ? state.diagnosticQuestionSets.flat()
    : diagnosticQuestions;

  return source.filter((question) => question.area === area).length;
}

function renderAreaList() {
  areaList.innerHTML = areaGoals.map((area) => `
    <div class="area-pill">
      <strong>${area}</strong>
      <span>0/${countQuestionsByArea(area)}</span>
    </div>
  `).join("");
}

function renderAreaProgress() {
  const useSessionQuestions = state.diagnosticQuestionSets.length > 0;

  areaList.innerHTML = areaGoals.map((area) => {
    const score = state.areaScore[area];
    const expected = countQuestionsByArea(area, useSessionQuestions);
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

function resetDiagnostic() {
  if (state.resultRenderTimer) {
    clearTimeout(state.resultRenderTimer);
    state.resultRenderTimer = null;
  }

  state.currentQuestion = 0;
  state.currentLevelIndex = 0;
  state.diagnosticStarted = false;
  state.currentDiagnosticAttemptId = null;
  state.diagnosticQuestionSets = [];
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

function renderLevelRoadmap() {
  return `
    <div class="level-roadmap" aria-label="Etapas do diagnóstico">
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
  const totalQuestions = getDefaultSessionQuestionCount();

  quizMount.innerHTML = `
    <div class="diagnostic-intro quiz-step">
      <span class="section-kicker">Diagnóstico por níveis</span>
      <h3 class="question-title">Responda 5 perguntas por nível com ordem aleatória.</h3>
      <p class="question-meta">
        Banco atual com ${diagnosticQuestions.length} questões. A cada tentativa, a plataforma sorteia ${QUESTIONS_PER_LEVEL} perguntas por nível.
      </p>
      ${renderLevelRoadmap()}
      <div class="diagnostic-summary">
        <span>${QUESTIONS_PER_LEVEL} por nível</span>
        <span>${totalQuestions} por sessão</span>
        <span>Confirmação antes de responder</span>
      </div>
      <p class="explanation">
        Você avança para o próximo nível ao atingir 75% no nível atual.
      </p>
      <button class="submit-button" id="startDiagnostic">Iniciar diagnóstico</button>
    </div>
  `;

  document.querySelector("#startDiagnostic").addEventListener("click", startDiagnostic);
}

function startDiagnostic() {
  state.diagnosticStarted = true;
  state.currentLevelIndex = 0;
  state.currentQuestion = 0;
  state.currentDiagnosticAttemptId = window.supabaseDataService && typeof window.supabaseDataService.createAttemptId === "function"
    ? window.supabaseDataService.createAttemptId("diag")
    : `diag_${Date.now()}`;
  state.selectedDiagnosticAnswer = null;
  state.diagnosticQuestionSets = diagnosticLevels.map((level) => pickRandomQuestions(level.questions, QUESTIONS_PER_LEVEL));

  const emptyLevels = diagnosticLevels.filter((_, index) => state.diagnosticQuestionSets[index].length === 0);
  if (emptyLevels.length > 0) {
    quizMount.innerHTML = `
      <div class="feedback-box error quiz-step">
        <strong>Não foi possível iniciar o diagnóstico.</strong>
        <p class="explanation">Algum nível está sem perguntas cadastradas. Complete o banco para continuar.</p>
        <button class="restart-button" id="restartDiagnostic">Tentar novamente</button>
      </div>
    `;
    document.querySelector("#restartDiagnostic").addEventListener("click", resetDiagnostic);
    return;
  }

  renderAreaProgress();
  renderQuestion();
}

function renderQuestion() {
  const level = getCurrentLevel();
  const levelQuestions = getCurrentLevelQuestions();
  const question = levelQuestions[state.currentQuestion];

  if (!question) {
    completeCurrentLevel();
    return;
  }

  const answered = getTotalAnswered();
  const totalQuestions = getSessionQuestionCount();
  const correct = getTotalCorrect();
  const wrong = answered - correct;
  const progress = totalQuestions ? (answered / totalQuestions) * 100 : 0;
  const percentLabel = Math.round(progress);

  quizMount.innerHTML = `
    <div class="quiz-step">
      ${renderLevelRoadmap()}
      <div class="progress-line" aria-label="Progresso do diagnóstico">
        <span style="width: ${progress}%"></span>
      </div>
      <div class="quiz-top">
        <span>${level.label} - pergunta ${state.currentQuestion + 1} de ${levelQuestions.length}</span>
        <span>${percentLabel}% concluído</span>
      </div>
      <div class="quiz-top quiz-top-secondary">
        <span>Acertos até agora: ${correct}</span>
        <span>Erros até agora: ${wrong}</span>
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

  const levelQuestions = getCurrentLevelQuestions();
  const question = levelQuestions[state.currentQuestion];
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
  const answeredAt = new Date().toISOString();
  const answerRecord = {
    order: state.diagnosticAnswers.length + 1,
    area: question.area,
    level: question.level,
    concept: question.concept,
    question: question.question,
    selected: question.options[selectedIndex],
    correctAnswer: question.options[question.correct],
    correct: isCorrect,
    explanation: question.explanation,
    answeredAt
  };

  state.diagnosticAnswers.push(answerRecord);

  persistDiagnosticAnswerRecord({
    attempt_id: state.currentDiagnosticAttemptId,
    anonymous_user_id: getAnonymousUserId(),
    answered_at: answeredAt,
    order_index: answerRecord.order,
    area: answerRecord.area,
    level: answerRecord.level,
    concept: answerRecord.concept,
    question: answerRecord.question,
    selected_answer: answerRecord.selected,
    correct_answer: answerRecord.correctAnswer,
    is_correct: answerRecord.correct
  });

  renderAreaProgress();

  document.querySelector("#feedbackMount").innerHTML = `
    <div class="feedback-box ${isCorrect ? "success" : "error"}">
      <strong>${isCorrect ? "Correto. Você dominou este ponto." : "Ainda não. O ponto principal é este:"}</strong>
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
  const levelQuestions = getCurrentLevelQuestions();
  if (state.currentQuestion < levelQuestions.length - 1) return "Próxima pergunta";
  const level = getCurrentLevel();
  if (level.minPercent === null) return "Ver resultado";
  return "Ver desempenho do nível";
}

function advanceDiagnostic() {
  const levelQuestions = getCurrentLevelQuestions();

  if (state.currentQuestion < levelQuestions.length - 1) {
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
    showResultLoading({ blocked: true });
    return;
  }

  if (state.currentLevelIndex < diagnosticLevels.length - 1) {
    showLevelTransition(levelResult);
    return;
  }

  showResultLoading({ blocked: false });
}

function showLevelTransition(levelResult) {
  const nextLevel = diagnosticLevels[state.currentLevelIndex + 1];

  quizMount.innerHTML = `
    <div class="level-transition quiz-step">
      ${renderLevelRoadmap()}
      <span class="section-kicker">Nível concluído</span>
      <h3 class="question-title">Você fez ${levelResult.correct}/${levelResult.total} no ${levelResult.label}.</h3>
      <p class="explanation">
        Meta atingida. Agora o diagnóstico avança para ${nextLevel.label.toLowerCase()}, com perguntas mais exigentes.
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

function showResultLoading({ blocked }) {
  if (state.resultRenderTimer) {
    clearTimeout(state.resultRenderTimer);
  }

  quizMount.innerHTML = `
    <div class="feedback-box quiz-step diagnostic-loading" role="status" aria-live="polite">
      <div class="loading-dots" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <strong>Gerando seu diagnóstico final...</strong>
      <p class="explanation">Estamos consolidando o desempenho por nível, área e pergunta.</p>
    </div>
  `;

  state.resultRenderTimer = setTimeout(() => {
    state.resultRenderTimer = null;
    showResult({ blocked });
  }, RESULT_RENDER_DELAY_MS);
}

function showResult({ blocked } = { blocked: false }) {
  const finishedAt = new Date().toISOString();
  const totalCorrect = getTotalCorrect();
  const answered = getTotalAnswered();
  const totalWrong = answered - totalCorrect;
  const percent = answered ? totalCorrect / answered : 0;
  const profile = getProfile(percent, state.areaScore);
  const insights = buildAreaInsights(state.areaScore);
  const recommendations = buildRecommendations(state.areaScore, profile, insights);
  const strongest = insights[0];
  const weakest = [...insights].reverse()[0];
  const missedAnswers = state.diagnosticAnswers.filter((answer) => !answer.correct);
  const stopped = state.diagnosticStoppedAtLevel;
  const sqlLevel = mapPercentToLevel(getAreaPercentScore("SQL"));
  const statisticsLevel = mapPercentToLevel(getAreaPercentScore(areaGoals[1]));
  const dataLevel = getDataAreaLevel();

  persistDiagnosticSessionRecord({
    attempt_id: state.currentDiagnosticAttemptId,
    anonymous_user_id: getAnonymousUserId(),
    finished_at: finishedAt,
    total_questions_answered: answered,
    total_correct: totalCorrect,
    total_wrong: totalWrong,
    score_percent: Math.round(percent * 100),
    sql_level: sqlLevel,
    statistics_level: statisticsLevel,
    data_level: dataLevel,
    overall_level: profile.name,
    identified_profile: profile.name,
    study_recommendation: recommendations.priority.title,
    priority_text: recommendations.priority.text,
    stopped_at_level: stopped ? stopped.name : null,
    level_results: state.levelResults,
    area_score_snapshot: buildAreaScoreSnapshot()
  });

  quizMount.innerHTML = `
    <div class="feedback-box ${blocked ? "error" : "success"} quiz-step">
      <strong>${blocked ? "Nível não liberado" : "Diagnóstico concluído"}</strong>
      <p class="explanation">
        ${blocked
          ? `Você fez ${stopped.correct}/${stopped.total} no ${stopped.label}. Reforce este nível antes de avançar.`
          : `Você respondeu os 3 níveis e acertou ${totalCorrect} de ${answered} perguntas.`}
      </p>
      <button class="restart-button" id="restartDiagnostic">Refazer diagnóstico</button>
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
        <span class="section-kicker">Próximo passo</span>
        <h3>${blocked ? `Reforce ${stopped.label}` : `Comece por ${weakest.area}`}</h3>
        <p>${blocked ? "O diagnóstico parou no nível atual para preservar a sequência de aprendizagem." : "Essa é a área com maior ganho potencial agora."}</p>
      </div>

      <div class="result-metrics">
        <div class="metric-card">
          <strong>${totalCorrect}</strong>
          <span>acertos</span>
        </div>
        <div class="metric-card">
          <strong>${totalWrong}</strong>
          <span>erros</span>
        </div>
        <div class="metric-card">
          <strong>${strongest.area}</strong>
          <span>área mais forte</span>
        </div>
      </div>

      <div class="result-block">
        <h3>Desempenho por nível</h3>
        ${renderLevelSummary()}
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
        <h3>Histórico por pergunta</h3>
        <div class="question-review-list">
          ${state.diagnosticAnswers.map((item) => `
            <article class="review-card question-review-card ${item.correct ? "is-hit" : "is-miss"}">
              <span class="question-review-status">${item.correct ? "Acerto" : "Erro"} - Q${item.order}</span>
              <h4>${item.question}</h4>
              <p><strong>Sua resposta:</strong> ${item.selected}</p>
              <p><strong>Resposta correta:</strong> ${item.correctAnswer}</p>
            </article>
          `).join("")}
        </div>
      </div>

      <div class="result-block">
        <h3>Revisão dos erros</h3>
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
        ` : `<p class="explanation">Você não errou perguntas neste diagnóstico. Mantenha revisão espaçada e avance para desafios práticos.</p>`}
      </div>

      ${renderSatisfactionSurveyBlock()}
    </article>
  `;

  bindSatisfactionSurvey({ scorePercent: Math.round(percent * 100), blocked });
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
          : "não aplicado";
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
