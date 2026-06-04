const state = {
  currentQuestion: 0,
  currentLevelIndex: 0,
  diagnosticStarted: false,
  diagnosticCompleted: false,
  diagnosticQuestionSets: [],
  selectedDiagnosticAnswer: null,
  diagnosticAnswers: [],
  levelResults: [],
  diagnosticStoppedAtLevel: null,
  resultRenderTimer: null,
  areaScore: {},
  challengeScore: 0,
  challengeAnsweredCount: 0,
  challengeCorrectCount: 0,
  completedChallenges: new Set(),
  selectedChallengeOptions: {},
  currentChallengeSessionId: null,
  challengeSurveySubmitted: false,
  anonymousUserId: null,
  currentDiagnosticAttemptId: null,
  diagnosticQuestionsRuntime: [],
  challengesRuntime: [],
  questionBankSource: {
    diagnostico: "fallback_local",
    desafio: "fallback_local"
  },
  diagnosticSelectionMeta: null,
  diagnosticRecentWindowDays: 7,
  heroPreviewIndex: 0,
  heroPreviewTimer: null,
  heroPreviewTransitioning: false
};

window.state = state;
