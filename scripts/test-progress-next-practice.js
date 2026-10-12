const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const learningProgressStatus = require("../src/learning-progress-status.js");

function loadProgressPageApi() {
  const mount = {
    innerHTML: "",
    querySelector() {
      return null;
    },
  };
  const browserWindow = {
    addEventListener() {},
    dispatchEvent() {},
    learningProgressStatus,
    location: { href: "" },
  };
  const sandbox = {
    console,
    document: {
      getElementById() {
        return mount;
      },
    },
    module: { exports: {} },
    exports: {},
    URL,
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    window: browserWindow,
  };

  const source = fs.readFileSync(path.join(__dirname, "../src/progress-page.js"), "utf8");
  vm.runInNewContext(source, sandbox, { filename: "progress-page.js" });

  return {
    api: sandbox.module.exports,
    browserWindow,
    mount,
  };
}

function createQuery(table, tables, executions) {
  const filters = [];
  const orders = [];
  let countRequested = false;
  let headOnly = false;
  let limitValue = null;

  function execute(single = false) {
    let rows = [...(tables[table] || [])];

    filters.forEach((filter) => {
      if (filter.type === "eq") {
        rows = rows.filter((row) => row[filter.column] === filter.value);
      } else if (filter.type === "in") {
        rows = rows.filter((row) => filter.values.includes(row[filter.column]));
      }
    });

    orders.slice().reverse().forEach(({ column, ascending }) => {
      rows.sort((left, right) => {
        const a = left[column];
        const b = right[column];
        if (a === b) return 0;
        return (a < b ? -1 : 1) * (ascending ? 1 : -1);
      });
    });

    const count = rows.length;
    if (limitValue !== null) rows = rows.slice(0, limitValue);

    executions.push({
      table,
      filters: filters.map((filter) => ({ ...filter })),
      single,
    });

    return {
      data: single ? rows[0] || null : headOnly ? null : rows,
      error: null,
      count: countRequested ? count : null,
    };
  }

  const query = {
    select(_columns, options = {}) {
      countRequested = options.count === "exact";
      headOnly = options.head === true;
      return query;
    },
    eq(column, value) {
      filters.push({ type: "eq", column, value });
      return query;
    },
    in(column, values) {
      filters.push({ type: "in", column, values });
      return query;
    },
    order(column, options = {}) {
      orders.push({ column, ascending: options.ascending !== false });
      return query;
    },
    limit(value) {
      limitValue = value;
      return query;
    },
    maybeSingle() {
      return Promise.resolve(execute(true));
    },
    then(resolve, reject) {
      return Promise.resolve(execute(false)).then(resolve, reject);
    },
  };

  return query;
}

function createTrackFixture() {
  return [
    {
      id: "step-1",
      path_id: "path-sql",
      display_order: 1,
      title: "Filtros com WHERE",
      metadata: { practice_slug: "filtros-com-where" },
      activity_id: "activity-1",
      exercise_id: "exercise-1",
      dataset_id: "dataset-1",
      status: "active",
    },
    {
      id: "step-2",
      path_id: "path-sql",
      display_order: 2,
      title: "Contagens e nulos",
      metadata: { practice_slug: "contagens-e-nulos" },
      activity_id: "activity-2",
      exercise_id: "exercise-2",
      dataset_id: "dataset-2",
      status: "active",
    },
    {
      id: "step-3",
      path_id: "path-sql",
      display_order: 3,
      title: "Agregações",
      metadata: { practice_slug: "agregacoes" },
      activity_id: "activity-3",
      exercise_id: "exercise-3",
      dataset_id: "dataset-3",
      status: "active",
    },
    {
      id: "step-4",
      path_id: "path-sql",
      display_order: 4,
      title: "Agrupamentos",
      metadata: { practice_slug: "agrupamentos" },
      activity_id: "activity-4",
      exercise_id: "exercise-4",
      dataset_id: "dataset-4",
      status: "active",
    },
    {
      id: "step-5",
      path_id: "path-sql",
      display_order: 5,
      title: "Projeto SQL",
      metadata: { practice_slug: "projeto-sql" },
      activity_id: "activity-5",
      exercise_id: "exercise-5",
      dataset_id: "dataset-5",
      status: "active",
    },
  ];
}

function createScenario({ completed = false, unavailable = false } = {}) {
  const user = { id: "user-1", email: "pessoa@example.com" };
  const steps = createTrackFixture();
  if (unavailable) {
    steps[1].exercise_id = null;
    steps[1].dataset_id = null;
  }

  const progress = completed
    ? steps.map((step, index) => ({
      id: `progress-${index + 1}`,
      user_id: user.id,
      path_id: "path-sql",
      step_id: step.id,
      status: "completed",
      progress_percent: (index + 1) * 20,
      updated_at: `2026-10-0${index + 1}T10:00:00.000Z`,
    }))
    : [
      {
        id: "progress-2",
        user_id: user.id,
        path_id: "path-sql",
        step_id: "step-2",
        status: "in_progress",
        progress_percent: 20,
        updated_at: "2026-10-02T10:00:00.000Z",
      },
      {
        id: "progress-1",
        user_id: user.id,
        path_id: "path-sql",
        step_id: "step-1",
        status: "completed",
        progress_percent: 20,
        updated_at: "2026-10-01T10:00:00.000Z",
      },
    ];

  const attempts = completed
    ? steps.map((step, index) => ({
      id: `attempt-${index + 1}`,
      user_id: user.id,
      learning_path_step_id: step.id,
      status: "correct",
      score_percent: 100,
      created_at: `2026-10-0${index + 1}T10:30:00.000Z`,
    }))
    : [{
      id: "attempt-1",
      user_id: user.id,
      learning_path_step_id: "step-1",
      status: "correct",
      score_percent: 100,
      created_at: "2026-10-01T10:30:00.000Z",
    }];

  return {
    user,
    tables: {
      profiles: [{ id: user.id, email: user.email, display_name: "Pessoa Teste" }],
      diagnostic_sessions: [{
        id: "session-1",
        user_id: user.id,
        attempt_id: "diagnostic-attempt-1",
        finished_at: "2026-10-01T09:00:00.000Z",
        created_at: "2026-10-01T08:00:00.000Z",
        total_questions_answered: 10,
        total_correct: 2,
        total_wrong: 8,
        score_percent: 20,
        overall_level: "iniciante",
        study_recommendation: "Priorize SQL",
        area_score_snapshot: {},
      }],
      user_skill_progress: [],
      learning_recommendations: [],
      user_learning_progress: progress,
      diagnostic_answers: [],
      learning_paths: [{
        id: "path-sql",
        title: "SQL Essencial",
        area_name: "SQL",
        description: "Trilha prática de SQL",
        level: "iniciante",
        duration_hours: 4,
        status: "active",
      }],
      learning_path_steps: steps,
      vw_sql_practice_exercises_public: steps.map((step) => ({
        step_id: step.id,
        slug: step.metadata.practice_slug,
        activity_id: step.activity_id,
        exercise_id: step.exercise_id,
        dataset_id: step.dataset_id,
      })),
      user_practice_attempts: attempts.map((attempt) => ({
        activity_id: steps.find((step) => step.id === attempt.learning_path_step_id)?.activity_id,
        user_id: attempt.user_id,
        validation_status: attempt.status,
      })),
    },
  };
}

async function renderScenario(options) {
  const { api, browserWindow, mount } = loadProgressPageApi();
  const scenario = createScenario(options);
  const executions = [];
  const client = {
    from(table) {
      return createQuery(table, scenario.tables, executions);
    },
  };

  browserWindow.authService = {
    getClient() {
      return client;
    },
  };

  const data = await api.fetchProgressData(scenario.user);
  api.renderAuthenticatedState({ user: scenario.user }, data);

  return {
    data,
    executions,
    html: mount.innerHTML,
  };
}

function countLearningPathStepQueries(executions) {
  return executions.filter(({ table }) => table === "learning_path_steps").length;
}

async function run() {
  const partial = await renderScenario();
  assert.equal(partial.data.learningProgress.progress_percent, 20);
  assert.equal(partial.data.step?.id, "step-2");
  assert.equal(partial.data.unavailableNextStep, null);
  assert.equal(countLearningPathStepQueries(partial.executions), 1);
  assert.match(partial.html, />Contagens e nulos</);
  assert.match(partial.html, /praticas-sql\.html\?pratica=contagens-e-nulos/);
  assert.doesNotMatch(partial.html, />Filtros com WHERE</);

  const unavailable = await renderScenario({ unavailable: true });
  assert.equal(unavailable.data.step, null);
  assert.equal(unavailable.data.unavailableNextStep?.id, "step-2");
  assert.equal(countLearningPathStepQueries(unavailable.executions), 1);
  assert.match(unavailable.html, />Próxima prática em preparação</);
  assert.match(unavailable.html, /href="index\.html#trilhas"/);
  assert.doesNotMatch(unavailable.html, /praticas-sql\.html\?pratica=filtros-com-where/);

  const completed = await renderScenario({ completed: true });
  assert.equal(completed.data.learningProgress.status, "completed");
  assert.equal(completed.data.learningProgress.progress_percent, 100);
  assert.equal(completed.data.step, null);
  assert.equal(completed.data.unavailableNextStep, null);
  assert.equal(countLearningPathStepQueries(completed.executions), 1);
  assert.match(completed.html, /SQL Essencial concluída/);
  assert.match(completed.html, />Continue sua evolução</);

  console.log("Progress next practice fetch-to-card tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
