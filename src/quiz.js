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

async function persistDiagnosticAnswerRecord(payload) {
  if (!window.supabaseDataService || typeof window.supabaseDataService.saveDiagnosticAnswer !== "function") {
    return { ok: false, skipped: true };
  }

  try {
    const result = await persistAuthenticatedRecord("diagnosticAnswers", payload);
    if (result && result.skipped) {
      return window.supabaseDataService.saveDiagnosticAnswer(payload);
    }
    return result;
  } catch (error) {
    console.warn("[Diagnóstico] Falha ao salvar resposta; tentando gravacao anonima.", error);
    return window.supabaseDataService.saveDiagnosticAnswer(payload);
  }
}

async function persistDiagnosticSessionRecord(payload) {
  if (!window.supabaseDataService || typeof window.supabaseDataService.saveDiagnosticSession !== "function") {
    return { ok: false, skipped: true };
  }

  try {
    const result = await persistAuthenticatedRecord("diagnosticSessions", payload);
    if (result && result.skipped) {
      const anonymousResult = await window.supabaseDataService.saveDiagnosticSession(payload);
      return { ...anonymousResult, authenticated: false };
    }
    return { ...result, authenticated: true };
  } catch (error) {
    console.warn("[Diagnóstico] Falha ao salvar sessao; tentando gravacao anonima.", error);
    const anonymousResult = await window.supabaseDataService.saveDiagnosticSession(payload);
    return { ...anonymousResult, authenticated: false };
  }
}

function trackDiagnosticFunnelEvent(eventType, payload = {}) {
  if (!window.diagnosticFunnelService || typeof window.diagnosticFunnelService.trackEvent !== "function") {
    return Promise.resolve({ ok: false, skipped: true });
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

  return window.diagnosticFunnelService.trackEvent({
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

  return persistAuthenticatedRecord("satisfactionFeedback", payload).then((result) => {
    if (result && result.skipped) {
      return window.supabaseDataService.saveSatisfactionFeedback(payload);
    }
    return result;
  }).catch((error) => {
    console.warn("[Diagnóstico] Falha ao salvar satisfacao autenticada; tentando gravacao anonima.", error);
    return window.supabaseDataService.saveSatisfactionFeedback(payload);
  });
}

function trackDiagnosticAbandonment() {
  if (!state.diagnosticStarted || state.diagnosticCompleted || !state.currentDiagnosticAttemptId) {
    return;
  }

  trackDiagnosticFunnelEvent("abandoned_marker", {
    level: getCurrentLevel() ? getCurrentLevel().name : null,
    question_index: state.currentQuestion,
    total_questions_answered: getTotalAnswered(),
    metadata: {
      reason: "page_hidden_before_result",
      currentLevel: getCurrentLevel() ? getCurrentLevel().name : null
    }
  });
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
  state.diagnosticCompleted = false;
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

window.addEventListener("data-skill-map-auth-changed", () => {
  if (!quizMount || !resultMount) {
    return;
  }

  resetDiagnostic();
});

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
      <p class="diagnostic-start-note">15 perguntas rápidas · sem cadastro obrigatório · resultado com próxima prioridade</p>
    </div>
  `;

  document.querySelector("#startDiagnostic").addEventListener("click", startDiagnostic);
}

async function isCurrentUserAuthenticated() {
  if (!window.authService || typeof window.authService.getCurrentSession !== "function") {
    return false;
  }

  const sessionResult = await window.authService.getCurrentSession();
  return Boolean(sessionResult?.ok && sessionResult.session);
}

function hasAcceptedAnonymousDiagnostic() {
  try {
    return window.sessionStorage.getItem("data_skill_map_anonymous_diagnostic_accepted") === "true";
  } catch (error) {
    return false;
  }
}

async function startDiagnostic() {
  if (!hasAcceptedAnonymousDiagnostic() && !(await isCurrentUserAuthenticated())) {
    openAnonymousDiagnosticModal();
    return;
  }

  beginDiagnostic();
}

function beginDiagnostic() {
  state.diagnosticStarted = true;
  state.diagnosticCompleted = false;
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

function setAnonymousDiagnosticAccepted() {
  try {
    window.sessionStorage.setItem("data_skill_map_anonymous_diagnostic_accepted", "true");
  } catch (error) {
    // Session storage can be unavailable in strict browser modes.
  }
}

function getOrCreateAnonymousDiagnosticModal() {
  let overlay = document.getElementById("anonymousDiagnosticModal");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "anonymousDiagnosticModal";
  overlay.className = "anonymous-diagnostic-modal-overlay hidden";
  overlay.innerHTML = `
    <div class="anonymous-diagnostic-modal-sheet" role="dialog" aria-modal="true" aria-labelledby="anonymousDiagnosticTitle">
      <div class="anonymous-diagnostic-modal-icon" aria-hidden="true">
        <i data-lucide="save"></i>
      </div>
      <div class="anonymous-diagnostic-modal-copy">
        <span class="auth-modal-kicker">Data Skill Map</span>
        <h2 id="anonymousDiagnosticTitle">Salve seu progresso antes de começar</h2>
        <p>Você pode fazer o diagnóstico sem login. Mas, ao entrar, seu resultado, sua trilha e suas próximas práticas ficam salvos para continuar depois.</p>
        <small>Continuar sem login mantém a experiência livre, mas o histórico pode não ficar vinculado à sua conta.</small>
      </div>
      <div class="anonymous-diagnostic-modal-actions">
        <button type="button" class="filter-button" data-anonymous-diagnostic-continue>Continuar sem login</button>
        <button type="button" class="submit-button" data-anonymous-diagnostic-auth>Entrar para salvar resultado</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function closeAnonymousDiagnosticModal() {
  const overlay = document.getElementById("anonymousDiagnosticModal");
  if (overlay) {
    overlay.classList.add("hidden");
  }
  document.body.classList.remove("anonymous-diagnostic-modal-open");
}

function openAnonymousDiagnosticModal() {
  const overlay = getOrCreateAnonymousDiagnosticModal();
  const continueButton = overlay.querySelector("[data-anonymous-diagnostic-continue]");
  const authButton = overlay.querySelector("[data-anonymous-diagnostic-auth]");

  continueButton.onclick = () => {
    setAnonymousDiagnosticAccepted();
    closeAnonymousDiagnosticModal();
    beginDiagnostic();
  };

  authButton.onclick = () => {
    closeAnonymousDiagnosticModal();
    if (window.authModal && typeof window.authModal.openAuthModal === "function") {
      window.authModal.openAuthModal({
        onSuccess: ({ session, user } = {}) => {
          window.dispatchEvent(new CustomEvent("data-skill-map-auth-changed", {
            detail: { session: session || null, user: user || null }
          }));
        }
      });
    }
  };

  overlay.classList.remove("hidden");
  document.body.classList.add("anonymous-diagnostic-modal-open");
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
  window.setTimeout(() => continueButton?.focus(), 80);
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

async function confirmDiagnosticAnswer() {
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

  const persistenceResult = await persistDiagnosticAnswerRecord({
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

  if (!persistenceResult || (!persistenceResult.ok && !persistenceResult.skipped)) {
    console.warn("[Diagnóstico] Resposta mantida em memoria, mas nao confirmada no Supabase.", persistenceResult?.error || persistenceResult);
  }

  renderAreaProgress();

  const nextAction = getNextActionMeta();

  document.querySelector("#feedbackMount").innerHTML = `
    <div class="feedback-box feedback-box-compact">
      <div class="feedback-box-compact-content">
        <strong>Resposta registrada.</strong>
        <p class="question-meta"><b>Conceito avaliado:</b> ${answerRecord.concept}</p>
        <p class="question-meta">No final, vamos usar esse resultado para indicar sua próxima prioridade de estudo.</p>
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
    void showResult({ blocked });
  }, RESULT_RENDER_DELAY_MS);
}

function getPriorityDisplayLabel(area) {
  const labels = {
    SQL: "SQL prático",
    "Estatística": "Estatística aplicada",
    Excel: "Excel e BI operacional",
    "Lógica de dados": "Lógica de dados",
    Indicadores: "Indicadores e KPIs"
  };

  return labels[area] || area;
}

function getAreaDisplayLabel(area) {
  const labels = {
    SQL: "SQL",
    "Estatística": "Estatística",
    Excel: "Excel",
    "Lógica de dados": "Lógica de dados",
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

async function showResult({ blocked } = { blocked: false }) {
  state.diagnosticCompleted = true;
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
  const studyPlan = window.studyPlanContent?.getStudyPlan(priorityArea) || {
    priority: priorityAreaLabel,
    concept: "Fundamentos da área",
    whyNow: `Esta é a área com maior ganho potencial no seu resultado atual.`,
    studySteps: ["Revise o conceito principal.", "Resolva um exemplo curto.", "Confira o raciocínio usado."],
    quickStudy: "Comece pela base conceitual e conecte cada exemplo a uma pergunta objetiva de negócio.",
    attention: "Entenda o que está sendo medido antes de calcular ou interpretar.",
    actionTitle: `Abrir trilha de ${priorityAreaLabel}`,
    actionMeta: "Roteiro guiado · comece pelo conceito recomendado",
    actionDescription: "Esta trilha reúne os conceitos que você precisa consolidar antes de avançar para novas práticas.",
    actionType: "trilha",
    ctaLabel: "Ver trilha recomendada",
    href: "index.html#trilhas"
  };
  const sqlLevel = mapPercentToLevel(getAreaPercentScore("SQL"));
  const statisticsLevel = mapPercentToLevel(getAreaPercentScore(areaGoals[1]));
  const dataLevel = getDataAreaLevel();

  renderAreaProgress(true);

  await trackDiagnosticFunnelEvent("generated_final_result", {
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

  const sessionPersistenceResult = await persistDiagnosticSessionRecord(diagnosticSessionPayload);
  if (!sessionPersistenceResult || (!sessionPersistenceResult.ok && !sessionPersistenceResult.skipped)) {
    console.warn("[Diagnóstico] Resultado calculado, mas sessao nao confirmada no Supabase.", sessionPersistenceResult?.error || sessionPersistenceResult);
  }
  if (sessionPersistenceResult?.ok && sessionPersistenceResult.authenticated === false) {
    window.diagnosticAccountLinkService?.markPendingDiagnostic({
      attempt_id: state.currentDiagnosticAttemptId,
      anonymous_user_id: getAnonymousUserId(),
      result: personalizedResultPayload
    });
  }
  const isAuthenticated = sessionPersistenceResult?.authenticated === true;
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
          <strong>${getAreaDisplayLabel(strongest.area)}</strong>
        </div>
        <div class="metric-card metric-card-priority">
          <span>Prioridade recomendada</span>
          <strong>${priorityLabel}</strong>
        </div>
      </div>

      <section class="study-plan-section" aria-labelledby="studyPlanTitle">
        <div class="result-section-heading result-section-heading-centered">
          <span class="section-kicker">Seu plano agora</span>
          <h3 id="studyPlanTitle">Seu plano de estudo começa por aqui</h3>
          <p>Com base nas suas respostas, esta é a prioridade que mais pode acelerar sua evolução agora.</p>
        </div>
        <div class="study-plan-grid">
          <article class="study-plan-card study-plan-card-focus">
            <span class="study-plan-card-index">01</span>
            <h4>O que estudar agora</h4>
            <strong>${studyPlan.priority}</strong>
            <p>Comece por: ${studyPlan.concept}</p>
          </article>
          <article class="study-plan-card">
            <span class="study-plan-card-index">02</span>
            <h4>Por que estudar isso</h4>
            <p>${studyPlan.whyNow}</p>
          </article>
          <article class="study-plan-card">
            <span class="study-plan-card-index">03</span>
            <h4>Como estudar</h4>
            <ol>
              ${studyPlan.studySteps.map((step) => `<li>${step}</li>`).join("")}
            </ol>
          </article>
        </div>
      </section>

      <section class="quick-study-card" aria-labelledby="quickStudyTitle">
        <div class="quick-study-heading">
          <span class="quick-study-icon" aria-hidden="true">→</span>
          <div>
            <span class="section-kicker">Conceito: ${studyPlan.concept}</span>
            <h3 id="quickStudyTitle">Estudo rápido antes da prática</h3>
            <p>Leia este resumo antes de avançar para a próxima ação.</p>
          </div>
        </div>
        <p class="quick-study-copy">${studyPlan.quickStudy}</p>
        <p class="quick-study-attention"><strong>Ponto de atenção:</strong> ${studyPlan.attention}</p>
      </section>

      <section class="recommended-action-card" aria-labelledby="recommendedActionTitle">
        <div class="recommended-action-copy">
          <span class="section-kicker">Primeira ação recomendada</span>
          <h3 id="recommendedActionTitle">${studyPlan.actionTitle}</h3>
          <p class="recommended-action-meta">${studyPlan.actionMeta}</p>
          <p>${studyPlan.actionDescription}</p>
        </div>
        <a class="submit-button recommended-action-button" href="${studyPlan.href}">${studyPlan.ctaLabel}</a>
      </section>

      <section class="progress-connection-card" aria-labelledby="progressConnectionTitle">
        <div class="progress-connection-heading">
          <span class="section-kicker">Próximos passos</span>
          <h3 id="progressConnectionTitle">Como acompanhar sua evolução</h3>
        </div>
        <ol class="progress-connection-steps">
          <li><span>1</span><strong>Seu diagnóstico fica salvo</strong></li>
          <li><span>2</span><strong>Sua prioridade aparece no Meu Progresso</strong></li>
          <li><span>3</span><strong>Cada prática concluída atualiza sua evolução por área</strong></li>
        </ol>
        ${isAuthenticated
          ? `<a class="filter-button progress-connection-button" href="meu-progresso.html">Ver Meu Progresso</a>`
          : `<button class="filter-button progress-connection-button" type="button" id="saveStudyPlan">Entrar para salvar meu plano</button>`}
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
                  <strong>${getAreaDisplayLabel(item.area)}</strong>
                  <span>${item.correct}/${item.total}</span>
                </div>
                <strong class="score-percent">${item.percent}%</strong>
              </div>
              <span class="score-status">${getAreaStatusText(item.percent)}</span>
              <div class="score-track" aria-label="${getAreaDisplayLabel(item.area)}: ${item.percent}%">
                <div class="score-fill" style="width: ${item.percent}%"></div>
              </div>
            </div>
          `).join("")}
        </div>
      </section>

      <details class="result-block error-review-block error-review-details">
        <summary>
          <span class="error-review-summary-copy">
            <strong>Revisão dos erros</strong>
            <span>${missedAnswers.length ? `Você errou ${missedAnswers.length} ${missedAnswers.length === 1 ? "questão" : "questões"}. Veja onde revisar.` : "Você não errou perguntas neste diagnóstico."}</span>
          </span>
          <span class="error-review-summary-action" data-open-label="Ver erros do diagnóstico" data-close-label="Recolher revisão">
            ${missedAnswers.length ? "Ver erros do diagnóstico" : "Ver resumo"}
          </span>
        </summary>
        ${missedAnswers.length ? `
          <div class="review-list">
            ${missedAnswers.map((item) => `
              <article class="review-card error-review-card">
                <span class="concept-tag">${getAreaDisplayLabel(item.area)} - ${item.level}</span>
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
      </details>

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

      <div class="result-actions result-utility-actions">
        <button class="restart-button result-restart-button" id="restartDiagnostic">↻ Refazer diagnóstico</button>
        <button class="filter-button result-feedback-button" id="openDiagnosticFeedback">☆ Avaliar experiência</button>
      </div>

    </article>
  `;

  document.querySelector("#restartDiagnostic").addEventListener("click", resetDiagnostic);
  document.querySelector("#openDiagnosticFeedback").addEventListener("click", () => {
    openDiagnosticSatisfactionModal({ scorePercent, blocked });
  });
  document.querySelector("#saveStudyPlan")?.addEventListener("click", () => {
    window.authModal?.openAuthModal({
      mode: "login",
      title: "Entre para salvar seu plano",
      description: "Continue com sua conta para acompanhar a prioridade e a evolução deste diagnóstico."
    });
  });
  resultSection.classList.remove("hidden");
  scrollToResultStart();
}

window.addEventListener("pagehide", trackDiagnosticAbandonment);

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
