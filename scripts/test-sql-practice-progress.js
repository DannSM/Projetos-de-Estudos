const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadService(window) {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "src", "sql-practice-service.js"),
    "utf8"
  );
  vm.runInNewContext(source, { window, console, Date, Map, Set });
  return window.sqlPracticeService;
}

function createAnonymousWindow() {
  return {
    authService: {
      getClient() {
        return {
          auth: {
            async getSession() {
              return { data: { session: null }, error: null };
            }
          }
        };
      }
    }
  };
}

function createQuery(table, tables) {
  const filters = [];
  let operation = "select";
  let payload = null;
  let orderColumn = null;

  const query = {
    select() {
      operation = "select";
      return query;
    },
    eq(column, value) {
      filters.push([column, value]);
      return query;
    },
    order(column) {
      orderColumn = column;
      return query;
    },
    maybeSingle() {
      return execute(true);
    },
    update(value) {
      operation = "update";
      payload = value;
      return query;
    },
    insert(value) {
      operation = "insert";
      payload = value;
      return execute(false);
    },
    then(resolve, reject) {
      return execute(false).then(resolve, reject);
    }
  };

  async function execute(single) {
    const rows = tables[table];
    const matches = (row) => filters.every(([column, value]) => row[column] === value);

    if (operation === "insert") {
      rows.push({ id: `${table}-${rows.length + 1}`, ...payload });
      return { data: null, error: null };
    }

    if (operation === "update") {
      rows.filter(matches).forEach((row) => Object.assign(row, payload));
      return { data: null, error: null };
    }

    const selected = rows.filter(matches);
    if (orderColumn) {
      selected.sort((a, b) => Number(a[orderColumn]) - Number(b[orderColumn]));
    }
    return { data: single ? selected[0] || null : selected, error: null };
  }

  return query;
}

function createAuthenticatedWindow(initialProgress) {
  const tables = {
    learning_paths: [
      { id: "path-sql", slug: "sql-essencial", title: "SQL Essencial", status: "active" }
    ],
    learning_path_steps: [
      { id: "step-1", path_id: "path-sql", step_key: "sql-essencial-01-where", display_order: 1, status: "active", metadata: { practice_slug: "sql-essencial-filtros-where" } },
      { id: "step-2", path_id: "path-sql", step_key: "sql-essencial-02-contagens", display_order: 2, status: "active", metadata: { practice_slug: "sql-essencial-count-nulos-distintos" } },
      { id: "step-3", path_id: "path-sql", step_key: "sql-essencial-03-filtro-mais-agregacao", display_order: 3, status: "active", metadata: { practice_slug: "sql-essencial-filtro-antes-agregacao" } },
      { id: "step-4", path_id: "path-sql", step_key: "sql-essencial-04-group-by", display_order: 4, status: "active", metadata: { practice_slug: "sql-essencial-group-by" } },
      { id: "step-5", path_id: "path-sql", step_key: "sql-essencial-05-join", display_order: 5, status: "active", metadata: { practice_slug: "sql-essencial-join" } }
    ],
    user_practice_notes: [],
    user_activity_feedback: [],
    user_practice_attempts: [],
    user_learning_progress: initialProgress || [
      {
        id: "progress-1",
        user_id: "user-1",
        path_id: "path-sql",
        step_id: "step-1",
        status: "in_progress",
        progress_percent: 0,
        started_at: "2026-06-01T00:00:00.000Z",
        completed_at: null,
        metadata: { source: "diagnostic_personalized_learning_bridge" }
      }
    ]
  };
  const client = {
    auth: {
      async getSession() {
        return { data: { session: { user: { id: "user-1" } } }, error: null };
      }
    },
    from(table) {
      return createQuery(table, tables);
    }
  };

  return {
    tables,
    window: {
      authService: {
        getClient() {
          return client;
        }
      }
    }
  };
}

async function run() {
  const anonymousService = loadService(createAnonymousWindow());
  assert.strictEqual(anonymousService.getProgressPercent(1, 5), 20);
  assert.strictEqual(anonymousService.getProgressPercent(5, 5), 100);

  const anonymousResult = await anonymousService.savePracticeProgress({
    slug: "sql-essencial-filtros-where"
  });
  assert.strictEqual(anonymousResult.skipped, true);
  assert.strictEqual(anonymousResult.authenticated, false);

  const authenticated = createAuthenticatedWindow();
  const authenticatedService = loadService(authenticated.window);
  const attemptResult = await authenticatedService.saveAttempt(
    { id: "activity-3", exerciseId: "exercise-3" },
    "query-run-3",
    { status: "correct", message: "Correto", details: { hasCount: true } },
    1
  );
  assert.strictEqual(attemptResult.ok, true);
  assert.strictEqual(authenticated.tables.user_practice_attempts.length, 1);
  assert.strictEqual(authenticated.tables.user_practice_attempts[0].validation_status, "correct");

  const loadedUserState = await authenticatedService.loadUserState({
    slug: "sql-essencial-filtro-antes-agregacao",
    trackSlug: "sql-essencial",
    exerciseId: "exercise-3"
  });
  assert.strictEqual(loadedUserState.ok, true);
  assert.strictEqual(loadedUserState.practiceProgress["sql-essencial-filtros-where"].status, "in_progress");

  const stepThreeScenario = createAuthenticatedWindow([
    {
      id: "progress-step-1",
      user_id: "user-1",
      path_id: "path-sql",
      step_id: "step-1",
      status: "completed",
      progress_percent: 20,
      started_at: "2026-06-01T00:00:00.000Z",
      completed_at: "2026-06-01T01:00:00.000Z",
      metadata: {}
    },
    {
      id: "progress-step-2",
      user_id: "user-1",
      path_id: "path-sql",
      step_id: "step-2",
      status: "completed",
      progress_percent: 40,
      started_at: "2026-06-02T00:00:00.000Z",
      completed_at: "2026-06-02T01:00:00.000Z",
      metadata: {}
    },
    {
      id: "progress-step-3",
      user_id: "user-1",
      path_id: "path-sql",
      step_id: "step-3",
      status: "in_progress",
      progress_percent: 40,
      started_at: "2026-06-02T01:00:00.000Z",
      completed_at: null,
      metadata: {}
    }
  ]);
  const stepThreeService = loadService(stepThreeScenario.window);
  const stepThreeAttempt = await stepThreeService.saveAttempt(
    { id: "activity-3", exerciseId: "exercise-3" },
    "query-run-step-3",
    { status: "correct", message: "Correto", details: { hasCount: true, hasSumValue: true } },
    1
  );
  const stepThreeProgress = await stepThreeService.savePracticeProgress({
    slug: "sql-essencial-filtro-antes-agregacao",
    trackSlug: "sql-essencial"
  });
  const repeatedStepThreeProgress = await stepThreeService.savePracticeProgress({
    slug: "sql-essencial-filtro-antes-agregacao",
    trackSlug: "sql-essencial"
  });
  const stepThreeRows = stepThreeScenario.tables.user_learning_progress;

  assert.strictEqual(stepThreeAttempt.ok, true);
  assert.strictEqual(stepThreeScenario.tables.user_practice_attempts.length, 1);
  assert.strictEqual(stepThreeProgress.ok, true);
  assert.strictEqual(stepThreeProgress.progressPercent, 60);
  assert.strictEqual(stepThreeProgress.completedStep.step_key, "sql-essencial-03-filtro-mais-agregacao");
  assert.strictEqual(stepThreeProgress.nextStep.step_key, "sql-essencial-04-group-by");
  assert.strictEqual(repeatedStepThreeProgress.progressPercent, 60);
  assert.strictEqual(stepThreeRows.length, 4);
  assert.strictEqual(stepThreeRows.find((row) => row.step_id === "step-3").status, "completed");
  assert.strictEqual(stepThreeRows.find((row) => row.step_id === "step-3").progress_percent, 60);
  assert.strictEqual(stepThreeRows.find((row) => row.step_id === "step-4").status, "in_progress");
  assert.strictEqual(stepThreeRows.find((row) => row.step_id === "step-4").progress_percent, 60);

  const metadataScenario = createAuthenticatedWindow();
  metadataScenario.tables.learning_path_steps[2].metadata.practice_slug = "sql-metadata-only";
  const metadataService = loadService(metadataScenario.window);
  const metadataResult = await metadataService.savePracticeProgress({
    slug: "sql-metadata-only",
    trackSlug: "sql-essencial"
  });
  assert.strictEqual(metadataResult.ok, true);
  assert.strictEqual(metadataResult.completedStep.step_key, "sql-essencial-03-filtro-mais-agregacao");

  const practice = { slug: "sql-essencial-filtros-where" };
  const firstResult = await authenticatedService.savePracticeProgress(practice);
  const secondResult = await authenticatedService.savePracticeProgress(practice);
  let rows = authenticated.tables.user_learning_progress;

  assert.strictEqual(firstResult.ok, true);
  assert.strictEqual(firstResult.progressPercent, 20);
  assert.strictEqual(secondResult.ok, true);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows.find((row) => row.step_id === "step-1").status, "completed");
  assert.strictEqual(rows.find((row) => row.step_id === "step-2").status, "in_progress");
  assert.strictEqual(rows.find((row) => row.step_id === "step-2").progress_percent, 20);

  const stepTwoPractice = { slug: "sql-essencial-count-nulos-distintos" };
  const stepTwoFirstResult = await authenticatedService.savePracticeProgress(stepTwoPractice);
  const stepTwoSecondResult = await authenticatedService.savePracticeProgress(stepTwoPractice);
  rows = authenticated.tables.user_learning_progress;

  assert.strictEqual(stepTwoFirstResult.ok, true);
  assert.strictEqual(stepTwoFirstResult.progressPercent, 40);
  assert.strictEqual(stepTwoFirstResult.completedStep.step_key, "sql-essencial-02-contagens");
  assert.strictEqual(stepTwoFirstResult.nextStep.step_key, "sql-essencial-03-filtro-mais-agregacao");
  assert.strictEqual(stepTwoSecondResult.ok, true);
  assert.strictEqual(rows.length, 3);
  assert.strictEqual(rows.find((row) => row.step_id === "step-2").status, "completed");
  assert.strictEqual(rows.find((row) => row.step_id === "step-3").status, "in_progress");
  assert.strictEqual(rows.find((row) => row.step_id === "step-3").progress_percent, 40);

  const stepThreeResult = await authenticatedService.savePracticeProgress({
    slug: "sql-essencial-filtro-antes-agregacao"
  });
  assert.strictEqual(stepThreeResult.ok, true);
  assert.strictEqual(stepThreeResult.progressPercent, 60);
  assert.strictEqual(stepThreeResult.completedStep.step_key, "sql-essencial-03-filtro-mais-agregacao");
  assert.strictEqual(stepThreeResult.nextStep.step_key, "sql-essencial-04-group-by");

  const stepFourResult = await authenticatedService.savePracticeProgress({
    slug: "sql-essencial-group-by"
  });
  assert.strictEqual(stepFourResult.ok, true);
  assert.strictEqual(stepFourResult.progressPercent, 80);
  assert.strictEqual(stepFourResult.completedStep.step_key, "sql-essencial-04-group-by");
  assert.strictEqual(stepFourResult.nextStep.step_key, "sql-essencial-05-join");

  const stepFiveResult = await authenticatedService.savePracticeProgress({
    slug: "sql-essencial-join"
  });
  const repeatedStepFiveResult = await authenticatedService.savePracticeProgress({
    slug: "sql-essencial-join"
  });
  rows = authenticated.tables.user_learning_progress;

  assert.strictEqual(stepFiveResult.ok, true);
  assert.strictEqual(stepFiveResult.progressPercent, 100);
  assert.strictEqual(stepFiveResult.completedStep.step_key, "sql-essencial-05-join");
  assert.strictEqual(stepFiveResult.nextStep, null);
  assert.strictEqual(repeatedStepFiveResult.progressPercent, 100);
  assert.strictEqual(rows.length, 5);
  assert.strictEqual(rows.every((row) => row.status === "completed"), true);
  assert.deepStrictEqual(
    rows.map((row) => Number(row.progress_percent)).sort((left, right) => left - right),
    [20, 40, 60, 80, 100]
  );

  const progressPageSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "progress-page.js"),
    "utf8"
  );
  assert.match(progressPageSource, /"sql-essencial-04-group-by"/);
  assert.match(progressPageSource, /"sql-essencial-05-join"/);
  assert.match(progressPageSource, /\["not_started", "in_progress", "paused"\]/);
  assert.match(progressPageSource, /\.eq\("progress_percent", 100\)/);
  assert.match(progressPageSource, /Todas as práticas concluídas/);
  assert.match(progressPageSource, /\[activeLearningProgress, completedLearningProgress\]/);
  assert.match(progressPageSource, /nextLearningProgress/);
  assert.match(progressPageSource, /Próxima recomendação:/);
  assert.match(progressPageSource, /100% da trilha concluída/);

  console.log("SQL practice progress tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
