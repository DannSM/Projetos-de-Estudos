const state = {
  currentQuestion: 0,
  currentLevelIndex: 0,
  diagnosticStarted: false,
  selectedDiagnosticAnswer: null,
  diagnosticAnswers: [],
  levelResults: [],
  diagnosticStoppedAtLevel: null,
  areaScore: {},
  challengeScore: 0,
  completedChallenges: new Set(),
  selectedChallengeOptions: {},
  heroPreviewIndex: 0,
  heroPreviewTimer: null,
  heroPreviewTransitioning: false
};
