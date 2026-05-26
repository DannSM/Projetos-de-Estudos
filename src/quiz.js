const quizMount = document.querySelector("#quizMount");
const resultSection = document.querySelector("#resultado");
const resultMount = document.querySelector("#resultMount");
const areaList = document.querySelector("#areaList");

const QUESTIONS_PER_LEVEL = 5;
const RESULT_RENDER_DELAY_MS = 1700;
const DATA_AREAS = areaGoals.slice(2);
const DIAGNOSTIC_FEEDBACK_STORAGE_PREFIX = "dataSkillMap_feedback_diagnostic";
const DIAGNOSTIC_RECENT_QUESTIONS_STORAGE_KEY = "dataSkillMap_diag_recent_questions";
const DIAGNOSTIC_RECENT_WINDOW_DAYS = 7;

const diagnosticLevelBlueprint = [
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
];

function getDiagnosticQuestionPool() {
  if (Array.isArray(state.diagnosticQuestionsRuntime) && state.diagnosticQuestionsRuntime.length > 0) {
    return state.diagnosticQuestionsRuntime;
  }
  return diagnosticQuestions;
}

function buildDiagnosticLevels() {
  const questionPool = getDiagnosticQuestionPool();
  return diagnosticLevelBlueprint.map((level) => ({
    ...level,
    questions: questionPool.filter((question) => question.level === level.name)
  }));
}

let diagnosticLevels = buildDiagnosticLevels();

function cleanText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function cleanOptionList(options) {
  if (!Array.isArray(options)) return [];
  return options.map((option) => cleanText(option));
}

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

async function getAuthenticatedUserForPersistence() {
  if (!window.authService || typeof window.authService.getCurrentSession !== "function") {
    return null;
  }

  try {
    const sessionResult = await window.authService.getCurrentSession();
    return sessionResult && sessionResult.ok && sessionResult.user ? sessionResult.user : null;
  } catch (error) {
    console.warn("[Diagnóstico] Não foi possível ler usuário autenticado para persistência.", error);
    return null;
  }
}

async function persistAuthenticatedRecord(tableKey, payload) {
  const user = await getAuthenticatedUserForPersistence();
  const client = window.authService && typeof window.authService.getClient === "function"
    ? window.authService.getClient()
    : null;
  const tableName = window.DATA_SKILL_MAP_SUPABASE?.tables?.[tableKey];

  if (!user || !client || !tableName) {
    return { ok: false, skipped: true };
  }

  try {
    const { error } = await client
      .from(tableName)
      .insert({
        ...payload,
        user_id: user.id
      });

    if (error) {
      console.warn("[Diagnóstico] Falha ao salvar registro autenticado.", error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.warn("[Diagnóstico] Erro inesperado ao salvar registro autenticado.", error);
    return { ok: false, error };
  }
}

function persistDiagnosticAnswerRecord(payload) {
  if (!window.supabaseDataService || typeof window.supabaseDataService.saveDiagnosticAnswer !== "function") {
    return;
  }
  void persistAuthenticatedRecord("diagnosticAnswers", payload).then((result) => {
    if (!result || !result.ok) {
      return window.supabaseDataService.saveDiagnosticAnswer(payload);
    }
    return result;
  });
}

function persistDiagnosticSessionRecord(payload) {
  if (!window.supabaseDataService || typeof window.supabaseDataService.saveDiagnosticSession !== "function") {
    return;
  }
  void persistAuthenticatedRecord("diagnosticSessions", payload).then((result) => {
    if (!result || !result.ok) {
      return window.supabaseDataService.saveDiagnosticSession(payload);
    }
    return result;
  });
}

function trackDiagnosticFunnelEvent(eventType, payload = {}) {
  if (!window.diagnosticFunnelService || typeof window.diagnosticFunnelService.trackEvent !== "function") {
    return;
  }

  const answered = getTotalAnswered();
  const scorePercent = answered ? Math.round((getTotalCorrect() / answered) * 100) : null;
  const metadata = {
    source: "diagnostico",
    page: "diagnostico.html",
    currentLevel: getCurrentLevel() ? getCurrentLevel().name : null,
    timestamp: new Date().toISOString(),
    ...(payload.metadata || {})
  };

  void window.diagnosticFunnelService.trackEvent({
    attempt_id: state.currentDiagnosticAttemptId,
    anonymous_user_id: getAnonymousUserId(),
    user_id: null,
    event_type: eventType,
    level: payload.level === undefined ? (getCurrentLevel() ? getCurrentLevel().name : null) : payload.level,
    question_index: payload.question_index === undefined ? state.currentQuestion : payload.question_index,
    total_questions_answered: payload.total_questions_answered === undefined ? answered : payload.total_questions_answered,
    score_percent: payload.score_percent === undefined ? scorePercent : payload.score_percent,
    metadata
  });
}

function persistSatisfactionFeedbackRecord(payload) {
  if (!window.supabaseDataService || typeof window.supabaseDataService.saveSatisfactionFeedback !== "function") {
    return Promise.resolve({ ok: false, skipped: true });
  }
  return window.supabaseDataService.saveSatisfactionFeedback(payload);
}

function getDiagnosticFeedbackStorageKey() {
  const attemptId = state.currentDiagnosticAttemptId || "no_attempt";
  return `${DIAGNOSTIC_FEEDBACK_STORAGE_PREFIX}_${getAnonymousUserId()}_${attemptId}`;
}

function hasDiagnosticFeedbackFlag() {
  try {
    return Boolean(window.localStorage.getItem(getDiagnosticFeedbackStorageKey()));
  } catch (error) {
    return false;
  }
}

function setDiagnosticFeedbackFlag(status) {
  try {
    window.localStorage.setItem(getDiagnosticFeedbackStorageKey(), status);
  } catch (error) {
    // localStorage indisponivel: segue fluxo sem persistir flag
  }
}

function openDiagnosticSatisfactionModal({ scorePercent, blocked }) {
  if (!window.feedbackModal || typeof window.feedbackModal.open !== "function") return;
  if (hasDiagnosticFeedbackFlag()) return;

  window.feedbackModal.open({
    title: "Pesquisa de satisfação",
    question: "Como foi sua experiência com este diagnóstico?",
    scaleAriaLabel: "Nota de satisfação do diagnóstico",
    commentLabel: "Detalhe sua nota (opcional)",
    commentPlaceholder: "Compartilhe sua percepção da experiência.",
    submitLabel: "Enviar avaliação",
    skipLabel: "Agora não",
    successTitle: "Avaliação enviada.",
    successText: "Obrigado por ajudar a melhorar o diagnóstico.",
    onSubmit: async ({ rating, comment }) => {
      const payload = {
        attempt_id: state.currentDiagnosticAttemptId,
        anonymous_user_id: getAnonymousUserId(),
        context: "diagnostico_resultado",
        rating,
        comment,
        score_percent: scorePercent,
        blocked_at_level: blocked
      };

      const result = await persistSatisfactionFeedbackRecord(payload);
      if (result && result.ok) {
        setDiagnosticFeedbackFlag("submitted");
      }
      return result;
    },
    onSkip: () => {
      setDiagnosticFeedbackFlag("dismissed");
    }
  });
}

function scrollToResultStart() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const header = document.querySelector(".app-header");
      const resultHero = resultMount.querySelector(".result-hero-panel") || resultSection;
      const headerHeight = header ? header.getBoundingClientRect().height : 0;
      const targetTop = resultHero.getBoundingClientRect().top + window.scrollY - headerHeight - 14;

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: "smooth"
      });
    });
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

function buildDiagnosticQuestionSets() {
  const selector = window.questionSelector;
  if (!selector || typeof selector.buildBalancedDiagnosticSets !== "function") {
    state.diagnosticSelectionMeta = {
      source: "legacy_random",
      reason: "question_selector_indisponivel"
    };
    return diagnosticLevels.map((level) => pickRandomQuestions(level.questions, QUESTIONS_PER_LEVEL));
  }

  const questionPool = getDiagnosticQuestionPool();
  const selection = selector.buildBalancedDiagnosticSets({
    questions: questionPool,
    levelBlueprint: diagnosticLevelBlueprint,
    perLevelCount: QUESTIONS_PER_LEVEL,
    mode: "diagnostico",
    storageKeyBase: DIAGNOSTIC_RECENT_QUESTIONS_STORAGE_KEY,
    anonymousUserId: getAnonymousUserId(),
    windowDays: Number(state.diagnosticRecentWindowDays) || DIAGNOSTIC_RECENT_WINDOW_DAYS
  });

  state.diagnosticSelectionMeta = {
    source: "smart_selector",
    ...selection.meta
  };
  return selection.questionSets;
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
    : getDiagnosticQuestionPool();

  return source.filter((question) => question.area === area).length;
}

function renderAreaList() {
  if (!areaList) return;

  areaList.innerHTML = `
    <div class="area-pill area-pill-summary">
      <strong>Áreas avaliadas</strong>
      <span>${areaGoals.join(", ")}</span>
    </div>
  `;
}

function renderSessionProgress() {
  if (!areaList) return;

  const level = getCurrentLevel();
  const levelQuestions = getCurrentLevelQuestions();
  const answered = getTotalAnswered();
  const totalQuestions = getSessionQuestionCount();

  areaList.innerHTML = `
    <div class="area-pill area-pill-summary">
      <strong>${level ? level.label : "Diagnóstico"}</strong>
      <span>Pergunta ${Math.min(state.currentQuestion + 1, levelQuestions.length)} de ${levelQuestions.length}</span>
    </div>
    <div class="area-pill area-pill-summary">
      <strong>Sessão</strong>
      <span>${answered} de ${totalQuestions} respondidas</span>
    </div>
  `;
}

function renderAreaProgress(showStatusColors = false) {
  if (!areaList) return;

  const useSessionQuestions = state.diagnosticQuestionSets.length > 0;

  if (!showStatusColors) {
    if (state.diagnosticStarted) {
      renderSessionProgress();
    } else {
      renderAreaList();
    }
    return;
  }

  areaList.innerHTML = areaGoals.map((area) => {
    const score = state.areaScore[area];
    const expected = countQuestionsByArea(area, useSessionQuestions);
    const percent = score.total ? Math.round((score.correct / score.total) * 100) : 0;
    const answered = score.hits.length + score.misses.length;
    const statusClass = showStatusColors && answered > 0
      ? (percent >= 75 ? "is-strong" : percent >= 45 ? "is-medium" : "is-low")
      : "";

    return `
      <div class="area-pill ${statusClass}">
        <strong>${area}</strong>
        <span>
          ${answered
            ? `${percent}% de aproveitamento - ${score.correct} acerto${score.correct === 1 ? "" : "s"} em ${answered} respondida${answered === 1 ? "" : "s"} - ${expected} previstas`
            : `Pendente - ${expected} previstas`}
        </span>
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
  state.confirmedDiagnosticAnswerKeys = new Set();
  state.levelResults = [];
  state.diagnosticStoppedAtLevel = null;
  state.areaScore = areaGoals.reduce((scores, area) => {
    scores[area] = { correct: 0, total: 0, misses: [], hits: [] };
    return scores;
  }, {});

  resultSection.classList.add("hidden");
  resultMount.innerHTML = "";
  const diagnosticHero = document.querySelector(".diagnostic-hero");
  if (diagnosticHero) {
    diagnosticHero.classList.remove("diagnostic-hero-result-hidden");
  }
  const diagnosticCard = quizMount.closest(".diagnostic-card");
  if (diagnosticCard) {
    diagnosticCard.classList.remove("diagnostic-card-result-hidden");
  }
  const diagnosticOverview = document.querySelector(".diagnostic-overview");
  if (diagnosticOverview) {
    diagnosticOverview.classList.remove("diagnostic-overview-result-hidden");
  }
  const diagnosticShell = document.querySelector(".diagnostic-shell");
  if (diagnosticShell) {
    diagnosticShell.classList.remove("diagnostic-shell-result-hidden");
  }
  diagnosticLevels = buildDiagnosticLevels();

  renderAreaProgress();
  renderDiagnosticIntro();
}

function getLevelIconMarkup(levelName) {
  const normalizedLevel = cleanText(levelName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalizedLevel === "basico") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
      </svg>
    `;
  }

  if (normalizedLevel === "intermediario") {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 17l6-6 4 4 7-7"></path>
        <path d="M14 8h6v6"></path>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 24 24" fill="none" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8"></circle>
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M12 2v2"></path>
      <path d="M12 20v2"></path>
      <path d="M2 12h2"></path>
      <path d="M20 12h2"></path>
    </svg>
  `;
}

function renderLevelRoadmap() {
  return `
    <div class="level-roadmap" aria-label="Etapas do diagnóstico">
      ${diagnosticLevels.map((level, index) => {
        const result = state.levelResults.find((item) => item.name === level.name);
        const isCurrent = index === state.currentLevelIndex && state.diagnosticStarted;
        const status = result ? (result.passed ? "is-complete" : "is-blocked") : isCurrent ? "is-current" : "";
        const score = state.diagnosticStarted
          ? (result ? (result.passed ? "concluído" : "reforçar") : isCurrent ? "em andamento" : "próximo")
          : level.minPercent ? `meta ${Math.round(level.minPercent * 100)}%` : "final";
        return `
          <div class="level-step ${status}">
            <div class="level-step-header">
              <span class="level-step-icon" aria-hidden="true">${getLevelIconMarkup(level.name)}</span>
              <strong>${level.shortLabel}</strong>
            </div>
            <span>${score}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderDiagnosticIntro() {
  const totalQuestions = getDefaultSessionQuestionCount();
  const questionPool = getDiagnosticQuestionPool();

  quizMount.innerHTML = `
    <div class="diagnostic-intro quiz-step">
      <span class="section-kicker">Diagnóstico adaptativo</span>
      <h3 class="question-title">Diagnóstico por níveis</h3>
      <p class="question-meta">
        Responda 5 perguntas por nível com ordem aleatória. Banco atual com ${questionPool.length} questões.
      </p>
      ${renderLevelRoadmap()}
      <div class="diagnostic-summary diagnostic-summary-inline">
        <span>${totalQuestions} por sessão • 3 níveis • meta de 75% por nível</span>
      </div>
      <p class="explanation">
        Você avança para o próximo nível ao atingir 75% no nível atual.
      </p>
      <div class="diagnostic-area-chips" aria-label="Áreas avaliadas">
        ${areaGoals.map((area) => `<span>${area}</span>`).join("")}
      </div>
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
  state.diagnosticQuestionSets = buildDiagnosticQuestionSets();
  state.confirmedDiagnosticAnswerKeys = new Set();

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

  trackDiagnosticFunnelEvent("started", {
    level: getCurrentLevel() ? getCurrentLevel().name : null,
    question_index: 0,
    total_questions_answered: 0,
    score_percent: null,
    metadata: {
      currentLevel: getCurrentLevel() ? getCurrentLevel().name : null,
      totalSessionQuestions: getSessionQuestionCount(),
      selectionSource: state.diagnosticSelectionMeta ? state.diagnosticSelectionMeta.source : null
    }
  });

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

  renderAreaProgress();

  const answered = getTotalAnswered();
  const totalQuestions = getSessionQuestionCount();
  const progress = totalQuestions ? (answered / totalQuestions) * 100 : 0;
  const cleanOptions = cleanOptionList(question.options);
  const cleanConcept = cleanText(question.concept);
  const cleanArea = cleanText(question.area);
  const cleanTitle = cleanText(question.question);

  quizMount.innerHTML = `
    <div class="quiz-step">
      ${renderLevelRoadmap()}
      <div class="diagnostic-session-strip" aria-label="Sessão do diagnóstico">
        <span>${level.label} — pergunta ${state.currentQuestion + 1} de ${levelQuestions.length}</span>
        <span>Sessão: ${answered} de ${totalQuestions} respondidas</span>
      </div>
      <div class="progress-line" aria-label="Progresso do diagnóstico">
        <span style="width: ${progress}%"></span>
      </div>
      <div class="quiz-top quiz-top-secondary">
        <span>Confirme uma alternativa para registrar sua resposta.</span>
      </div>
      <div class="concept-row">
        <span class="concept-tag">${cleanConcept}</span>
        <span class="level-tag">${level.shortLabel}</span>
        <span class="category-tag">${cleanArea}</span>
      </div>
      <h3 class="question-title">${cleanTitle}</h3>
      <div class="answer-list">
        ${cleanOptions.map((option, index) => `
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

function getCurrentAnswerKey() {
  return [
    state.currentDiagnosticAttemptId || "diag",
    state.currentLevelIndex,
    state.currentQuestion
  ].join(":");
}

function confirmDiagnosticAnswer() {
  const selectedIndex = state.selectedDiagnosticAnswer;
  if (selectedIndex === null || selectedIndex === undefined) return;
  if (!state.confirmedDiagnosticAnswerKeys) {
    state.confirmedDiagnosticAnswerKeys = new Set();
  }

  const answerKey = getCurrentAnswerKey();
  if (state.confirmedDiagnosticAnswerKeys.has(answerKey)) return;
  state.confirmedDiagnosticAnswerKeys.add(answerKey);

  const levelQuestions = getCurrentLevelQuestions();
  const question = levelQuestions[state.currentQuestion];
  const isCorrect = selectedIndex === question.correct;
  const buttons = quizMount.querySelectorAll("[data-answer]");
  const confirmButton = document.querySelector("#confirmDiagnosticAnswer");

  buttons.forEach((button, index) => {
    button.disabled = true;
    button.classList.toggle("selected", index === selectedIndex);
  });

  confirmButton.disabled = true;
  confirmButton.classList.add("is-hidden-after-answer");

  if (isCorrect) {
    state.areaScore[question.area].correct += 1;
    state.areaScore[question.area].hits.push(question.concept);
  } else {
    state.areaScore[question.area].misses.push(question.concept);
  }
  state.areaScore[question.area].total += 1;
  const answeredAt = new Date().toISOString();
  const cleanOptions = cleanOptionList(question.options);
  const cleanQuestion = cleanText(question.question);
  const cleanConcept = cleanText(question.concept);
  const cleanArea = cleanText(question.area);
  const answerRecord = {
    order: state.diagnosticAnswers.length + 1,
    area: cleanArea,
    level: cleanText(question.level),
    concept: cleanConcept,
    skillCode: cleanText(question.skillCode || question.skill_code),
    recommendationKey: cleanText(question.recommendationKey || question.recommendation_key),
    question: cleanQuestion,
    selected: cleanOptions[selectedIndex],
    correctAnswer: cleanOptions[question.correct],
    correct: isCorrect,
    explanation: cleanText(question.explanation),
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

  const nextAction = getNextActionMeta();

  document.querySelector("#feedbackMount").innerHTML = `
    <div class="feedback-box feedback-box-compact">
      <div class="feedback-box-compact-content">
        <strong>Resposta confirmada.</strong>
        <p class="question-meta">Conceito avaliado: ${answerRecord.concept}</p>
      </div>
      <button class="submit-button feedback-next-button ${nextAction.isTerminal ? "is-terminal-action" : ""} ${nextAction.action === "level-performance" ? "is-level-performance-action" : ""}" id="nextQuestion">
        ${nextAction.label}
      </button>
    </div>
  `;

  document.querySelector("#nextQuestion").addEventListener("click", () => handleNextQuestionClick(nextAction));
}

function getNextActionMeta() {
  const levelQuestions = getCurrentLevelQuestions();
  if (state.currentQuestion < levelQuestions.length - 1) {
    return { label: "Próxima pergunta", isTerminal: false, action: "next-question" };
  }

  const level = getCurrentLevel();
  if (level.minPercent === null) {
    return { label: "Ver resultado", isTerminal: true, action: "show-result" };
  }

  return { label: "Ver desempenho do nível", isTerminal: true, action: "level-performance" };
}

function handleNextQuestionClick(nextAction) {
  advanceDiagnostic();
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

function getCompletedLevelEventType(levelIndex) {
  if (levelIndex === 0) return "completed_basic";
  if (levelIndex === 1) return "completed_intermediate";
  if (levelIndex === 2) return "completed_advanced";
  return null;
}

function completeCurrentLevel() {
  const level = getCurrentLevel();
  const levelAnswers = state.diagnosticAnswers.filter((answer) => answer.level === level.name);
  const correct = levelAnswers.filter((answer) => answer.correct).length;
  const percent = levelAnswers.length ? correct / levelAnswers.length : 0;
  const passed = level.minPercent === null || percent >= level.minPercent;
  const levelResult = { name: level.name, label: level.shortLabel, correct, total: levelAnswers.length, percent, passed };
  state.levelResults.push(levelResult);
  const completedEventType = getCompletedLevelEventType(state.currentLevelIndex);

  if (completedEventType) {
    trackDiagnosticFunnelEvent(completedEventType, {
      level: level.name,
      question_index: state.currentQuestion,
      total_questions_answered: getTotalAnswered(),
      score_percent: Math.round(percent * 100),
      metadata: {
        completedLevel: level.name,
        levelLabel: level.label,
        levelCorrect: correct,
        levelTotal: levelAnswers.length,
        levelPassed: passed
      }
    });
  }

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
      <div class="diagnostic-session-strip" aria-label="Sessão do diagnóstico">
        <span>${levelResult.label} concluído</span>
        <span>Sessão: ${getTotalAnswered()} de ${getSessionQuestionCount()} respondidas</span>
      </div>
      <span class="section-kicker">Nível concluído</span>
      <h3 class="question-title">Você fez ${levelResult.correct}/${levelResult.total} no ${levelResult.label}.</h3>
      <p class="explanation">
        Meta atingida. Agora o diagnóstico avança para ${nextLevel.label.toLowerCase()}, com perguntas mais exigentes.
      </p>
      <button class="submit-button" id="continueDiagnostic">Continuar para ${nextLevel.shortLabel}</button>
    </div>
  `;

  document.querySelector("#continueDiagnostic").addEventListener("click", () => {
    trackDiagnosticFunnelEvent("continued_to_next_level", {
      level: levelResult.name,
      question_index: state.currentQuestion,
      total_questions_answered: getTotalAnswered(),
      score_percent: Math.round(levelResult.percent * 100),
      metadata: {
        completedLevel: levelResult.name,
        nextLevel: nextLevel.name
      }
    });

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
    <div class="quiz-step diagnostic-loading" role="status" aria-live="polite">
      <div class="loading-dots" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <strong>Gerando seu diagnóstico final...</strong>
      <p class="explanation">Estamos consolidando desempenho por nível, área e pergunta.</p>
      <div class="diagnostic-loading-steps" aria-label="Etapas da geração">
        <span>Calculando desempenho</span>
        <span>Mapeando áreas</span>
        <span>Montando plano</span>
      </div>
    </div>
  `;

  state.resultRenderTimer = setTimeout(() => {
    state.resultRenderTimer = null;
    showResult({ blocked });
  }, RESULT_RENDER_DELAY_MS);
}

function getPriorityDisplayLabel(area) {
  const labels = {
    SQL: "SQL prático",
    "Estatística": "Estatística aplicada",
    Excel: "Excel e BI operacional",
    "Lógica de dados": "Lógica aplicada aos dados",
    Indicadores: "Indicadores e KPIs"
  };

  return labels[area] || area;
}

function getAreaVisualClass(percent) {
  if (percent >= 75) return "is-strong";
  if (percent >= 45) return "is-building";
  return "is-attention";
}

function getAreaStatusText(percent) {
  if (percent >= 75) return "Ponto forte";
  if (percent >= 45) return "Em consolidação";
  return "Atenção";
}

function getAreaMarker(area) {
  const markers = {
    SQL: "SQL",
    "Estatística": "%",
    Excel: "XL",
    "Lógica de dados": "IF",
    Indicadores: "KPI"
  };

  return markers[area] || "DS";
}

function getAreaImpactText(area) {
  const messages = {
    SQL: "impacta sua autonomia para consultar, cruzar e validar dados.",
    "Estatística": "impacta a interpretação de variação, relação entre variáveis e confiança dos resultados.",
    Excel: "impacta sua agilidade para organizar, conferir e apresentar análises operacionais.",
    "Lógica de dados": "impacta a forma como você estrutura hipóteses e transforma contexto em análise.",
    Indicadores: "impacta sua leitura de métricas, metas e sinais de negócio."
  };

  return messages[area] || "impacta a consistência da sua análise.";
}

function getPriorityConceptText(area) {
  const score = state.areaScore[area];
  const concepts = score ? [...new Set(score.misses)].filter(Boolean).slice(0, 4) : [];

  if (!concepts.length) {
    return "os conceitos em que você sentiu mais dificuldade durante o diagnóstico";
  }

  return concepts.join(", ");
}

function getPriorityActionTitle({ blocked, stopped, priorityAreaLabel }) {
  if (blocked && stopped) {
    return `Consolidar ${stopped.label}`;
  }

  return `Reforçar ${priorityAreaLabel}`;
}

function getChallengeLabelForArea(area) {
  if (typeof mapAreaToChallenge === "function") {
    return mapAreaToChallenge(area);
  }

  return area || "Todos";
}

function getTrackTextForProfile(profileName, priorityArea) {
  if (typeof getTrackSuggestion === "function") {
    return getTrackSuggestion(profileName, priorityArea);
  }

  return `Siga pela trilha de ${getPriorityDisplayLabel(priorityArea)} antes de partir para um projeto completo.`;
}

function getReviewContextText(item) {
  const concept = cleanText(item.concept).toLowerCase();

  if (concept.includes("dispers")) {
    return "Você escolheu uma leitura que não comparava a variabilidade pedida pela pergunta.";
  }
  if (concept.includes("correla")) {
    return "A resposta confundiu associação entre variáveis com uma conclusão causal ou operacional.";
  }
  if (concept.includes("distribui")) {
    return "A questão pedia reconhecer o comportamento da distribuição antes de interpretar o resultado.";
  }
  if (concept.includes("intervalo") || concept.includes("confian")) {
    return "Faltou considerar a incerteza da estimativa antes de fechar a interpretação.";
  }
  if (concept.includes("join")) {
    return "A lacuna apareceu na escolha da forma correta de cruzar tabelas sem perder registros importantes.";
  }
  if (concept.includes("kpi") || concept.includes("indicador")) {
    return "A resposta não separou claramente métrica, meta e decisão de negócio.";
  }
  if (concept.includes("filtro") || concept.includes("where")) {
    return "A condição usada para filtrar os dados não respondia exatamente ao recorte pedido.";
  }

  return `A questão avaliava ${item.concept}; vale revisar o raciocínio por trás desse conceito antes de avançar.`;
}

async function generatePersonalizedLearningBridge(resultPayload) {
  if (!window.personalizedLearningService || typeof window.personalizedLearningService.generateFromDiagnosticResult !== "function") {
    return { ok: false, skipped: true, reason: "service_unavailable" };
  }

  return window.personalizedLearningService.generateFromDiagnosticResult(resultPayload);
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
  const scorePercent = Math.round(percent * 100);
  const priorityArea = weakest.area;
  const priorityAreaLabel = getPriorityDisplayLabel(priorityArea);
  const priorityLevelLabel = blocked && stopped ? stopped.label : null;
  const priorityLabel = priorityLevelLabel ? `${priorityAreaLabel} no ${priorityLevelLabel}` : priorityAreaLabel;
  const priorityConceptText = getPriorityConceptText(priorityArea);
  const priorityReason = blocked
    ? `${priorityAreaLabel} concentrou a maior lacuna e ${getAreaImpactText(priorityArea)}`
    : `${priorityAreaLabel} teve o menor desempenho relativo entre as áreas respondidas e ${getAreaImpactText(priorityArea)}`;
  const priorityNextStep = blocked
    ? `Revise ${priorityConceptText} dentro do ${stopped.label.toLowerCase()} antes de tentar liberar a próxima etapa.`
    : `Revise ${priorityConceptText} e resolva exercícios curtos antes de avançar para novos conteúdos.`;
  const nextActionTitle = getPriorityActionTitle({ blocked, stopped, priorityAreaLabel });
  const priorityRecommendationText = blocked
    ? `Prioridade recomendada: consolidar ${priorityAreaLabel.toLowerCase()} no ${stopped.label.toLowerCase()} para recuperar a base do nível.`
    : `Prioridade recomendada: reforçar ${priorityAreaLabel.toLowerCase()} porque é a área com maior ganho potencial agora.`;
  const evolutionCards = [
    {
      level: "Agora",
      title: "Primeiro foco",
      text: `Trabalhe ${priorityConceptText} com exemplos pequenos e correção imediata.`,
      next: `Filtre os desafios por ${getChallengeLabelForArea(priorityArea)}.`
    },
    {
      level: "Revisão",
      title: "Conceitos para revisar",
      text: priorityConceptText,
      next: "Refaça primeiro as perguntas erradas e anote o motivo da alternativa correta."
    },
    {
      level: profile.name,
      title: "Trilha sugerida",
      text: getTrackTextForProfile(profile.name, priorityArea),
      next: "Depois conecte a revisão a um mini-projeto com pergunta de negócio e conclusão."
    }
  ];
  const sqlLevel = mapPercentToLevel(getAreaPercentScore("SQL"));
  const statisticsLevel = mapPercentToLevel(getAreaPercentScore(areaGoals[1]));
  const dataLevel = getDataAreaLevel();

  renderAreaProgress(true);

  trackDiagnosticFunnelEvent("generated_final_result", {
    level: "Final",
    question_index: answered ? answered - 1 : 0,
    total_questions_answered: answered,
    score_percent: Math.round(percent * 100),
    metadata: {
      completedLevel: stopped ? stopped.name : "Avançado",
      currentLevel: "Final",
      blocked,
      stoppedAtLevel: stopped ? stopped.name : null,
      overallLevel: profile.name
    }
  });

  const diagnosticSessionPayload = {
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
  };
  const personalizedResultPayload = {
    attemptId: state.currentDiagnosticAttemptId,
    finishedAt,
    totalQuestionsAnswered: answered,
    totalCorrect,
    totalWrong,
    scorePercent,
    overallLevel: profile.name,
    priorityArea,
    priorityLevel: stopped ? stopped.name : null,
    priorityText: recommendations.priority.text,
    studyRecommendation: recommendations.priority.title,
    areaScoreSnapshot: diagnosticSessionPayload.area_score_snapshot,
    levelResults: state.levelResults,
    answers: state.diagnosticAnswers
  };

  void persistDiagnosticSessionRecord(diagnosticSessionPayload);
  void generatePersonalizedLearningBridge(personalizedResultPayload).then((result) => {
    if (result && result.ok) {
      window.dispatchEvent(new CustomEvent("data-skill-map-learning-updated", {
        detail: {
          path: result.path || null,
          step: result.step || null,
          fallback: Boolean(result.fallback),
          reason: result.reason || null,
          writes: result.writes || null
        }
      }));
    }
    return result;
  });

  quizMount.innerHTML = "";
  const diagnosticHero = document.querySelector(".diagnostic-hero");
  if (diagnosticHero) {
    diagnosticHero.classList.add("diagnostic-hero-result-hidden");
  }
  const diagnosticCard = quizMount.closest(".diagnostic-card");
  if (diagnosticCard) {
    diagnosticCard.classList.add("diagnostic-card-result-hidden");
  }
  const diagnosticOverview = document.querySelector(".diagnostic-overview");
  if (diagnosticOverview) {
    diagnosticOverview.classList.add("diagnostic-overview-result-hidden");
  }
  const diagnosticShell = document.querySelector(".diagnostic-shell");
  if (diagnosticShell) {
    diagnosticShell.classList.add("diagnostic-shell-result-hidden");
  }

  resultMount.innerHTML = `
    <article class="result-card result-dashboard quiz-step">
      <section class="result-hero-panel">
        <div class="result-hero-content">
          <span class="result-status-badge">Diagnóstico concluído</span>
          <h2>${profile.name}</h2>
          <p class="profile-detail">${profile.description}</p>
          <div class="result-hero-meta" aria-label="Resumo do resultado">
            <span>${totalCorrect} acertos</span>
            <span>${totalWrong} erros</span>
            <span>${stopped ? `Até ${stopped.label}` : "3 níveis concluídos"}</span>
          </div>
        </div>
        <div class="result-score-card" aria-label="Percentual geral">
          <span>Percentual geral</span>
          <strong>${scorePercent}%</strong>
          <small>${totalCorrect}/${answered} perguntas</small>
        </div>
      </section>

      <div class="result-metrics">
        <div class="metric-card">
          <span>Nível alcançado</span>
          <strong>${profile.name}</strong>
        </div>
        <div class="metric-card">
          <span>Área mais forte</span>
          <strong>${strongest.area}</strong>
        </div>
        <div class="metric-card metric-card-priority">
          <span>Prioridade recomendada</span>
          <strong>${priorityLabel}</strong>
        </div>
      </div>

      <div class="result-actions">
        <button class="restart-button result-restart-button" id="restartDiagnostic">↻ Refazer diagnóstico</button>
        <button class="filter-button result-feedback-button" id="openDiagnosticFeedback">☆ Avaliar experiência</button>
        <a class="filter-button result-learning-button" href="index.html#trilhas">Ver trilha recomendada</a>
        <a class="filter-button result-learning-button" href="meu-progresso.html">Meu Progresso</a>
      </div>

      <section class="next-action-card">
        <div>
          <span class="section-kicker">Próxima ação</span>
          <h3>${nextActionTitle}</h3>
        </div>
        <div class="next-action-grid">
          <div>
            <strong>Área prioritária</strong>
            <p>${priorityAreaLabel}</p>
          </div>
          <div>
            <strong>Por que agora</strong>
            <p>${priorityReason}</p>
          </div>
          <div>
            <strong>Próximo passo prático</strong>
            <p>${priorityNextStep}</p>
          </div>
        </div>
      </section>

      <section class="result-block">
        <h3>Desempenho por nível</h3>
        ${renderLevelSummary()}
      </section>

      <section class="result-block">
        <h3>Mapa por área</h3>
        <div class="score-bars area-score-map">
          ${insights.map((item) => `
            <div class="score-row ${getAreaVisualClass(item.percent)}">
              <span class="area-score-marker" aria-hidden="true">${getAreaMarker(item.area)}</span>
              <div class="score-row-header">
                <div>
                  <strong>${item.area}</strong>
                  <span>${item.correct}/${item.total}</span>
                </div>
                <strong class="score-percent">${item.percent}%</strong>
              </div>
              <span class="score-status">${getAreaStatusText(item.percent)}</span>
              <div class="score-track" aria-label="${item.area}: ${item.percent}%">
                <div class="score-fill" style="width: ${item.percent}%"></div>
              </div>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="result-block evolution-plan">
        <div class="result-section-heading">
          <span class="section-kicker">Plano de evolução</span>
          <h3>Uma sequência objetiva para transformar lacunas em prática</h3>
        </div>
        <div class="priority-card">
          <span class="section-kicker">Prioridade recomendada</span>
          <h3>${priorityLabel}</h3>
          <p>${priorityRecommendationText}</p>
        </div>
        <div class="recommendation-grid">
          ${evolutionCards.map((item) => `
            <article class="recommendation-card">
              <span class="concept-tag">${item.level}</span>
              <h3>${item.title}</h3>
              <p>${item.text}</p>
              <p><strong>Próximo desafio:</strong> ${item.next}</p>
            </article>
          `).join("")}
        </div>
        <ol class="evolution-steps">
          ${recommendations.plan.map((item) => `<li>${item}</li>`).join("")}
        </ol>
      </section>

      <section class="result-block error-review-block">
        <h3>Revisão dos erros</h3>
        ${missedAnswers.length ? `
          <div class="review-list">
            ${missedAnswers.map((item) => `
              <article class="review-card error-review-card">
                <span class="concept-tag">${item.area} - ${item.level}</span>
                <h4>${item.question}</h4>
                <div class="review-detail-grid">
                  <div>
                    <strong>O que aconteceu</strong>
                    <p>${getReviewContextText(item)}</p>
                  </div>
                  <div>
                    <strong>Sua resposta</strong>
                    <p>${item.selected}</p>
                  </div>
                  <div>
                    <strong>Resposta correta</strong>
                    <p>${item.correctAnswer}</p>
                  </div>
                  <div>
                    <strong>Explicação</strong>
                    <p>${item.explanation}</p>
                  </div>
                </div>
              </article>
            `).join("")}
          </div>
        ` : `<p class="explanation">Você não errou perguntas neste diagnóstico. Mantenha revisão espaçada e avance para desafios práticos.</p>`}
      </section>

      <details class="result-block question-history-block">
        <summary>Ver histórico completo</summary>
        <div class="question-review-list">
          ${state.diagnosticAnswers.map((item) => `
            <article class="review-card question-review-card ${item.correct ? "is-hit" : "is-miss"}">
              <span class="question-review-status">${item.correct ? "Acerto" : "Erro"} - Q${item.order} - ${item.area}</span>
              <h4>${item.question}</h4>
              <p><strong>Sua resposta:</strong> ${item.selected}</p>
              <p><strong>Resposta correta:</strong> ${item.correctAnswer}</p>
            </article>
          `).join("")}
        </div>
      </details>

    </article>
  `;

  document.querySelector("#restartDiagnostic").addEventListener("click", resetDiagnostic);
  document.querySelector("#openDiagnosticFeedback").addEventListener("click", () => {
    openDiagnosticSatisfactionModal({ scorePercent, blocked });
  });
  resultSection.classList.remove("hidden");
  scrollToResultStart();
}

function renderLevelSummary() {
  return `
    <div class="level-summary">
      ${diagnosticLevels.map((level) => {
        const result = state.levelResults.find((item) => item.name === level.name);
        const percent = result ? Math.round(result.percent * 100) : 0;
        const statusText = result
          ? (result.passed ? "nível liberado" : "precisa reforçar")
          : "não aplicado";
        const scoreText = result ? `${result.correct}/${result.total} - ${percent}%` : "aguardando";
        return `
          <div class="level-summary-item ${result ? (result.passed ? "is-complete" : "is-blocked") : ""}">
            <strong>${level.shortLabel}</strong>
            <span>${statusText}</span>
            <small>${scoreText}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}
