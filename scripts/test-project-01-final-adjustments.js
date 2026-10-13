const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const learningProgressStatus = require(path.join(root, "src", "learning-progress-status.js"));

function createQuery(table, tables) {
  const filters = [];
  const orders = [];
  let limitValue = null;
  let countRequested = false;
  let headOnly = false;

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
        const leftValue = left[column];
        const rightValue = right[column];
        if (leftValue === rightValue) return 0;
        return (leftValue < rightValue ? -1 : 1) * (ascending ? 1 : -1);
      });
    });

    const count = rows.length;
    if (limitValue !== null) rows = rows.slice(0, limitValue);

    return {
      data: single ? rows[0] || null : headOnly ? null : rows,
      error: null,
      count: countRequested ? count : null
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
    }
  };

  return query;
}

function loadProgressPage(client) {
  const source = fs.readFileSync(path.join(root, "src", "progress-page.js"), "utf8");
  const mount = { innerHTML: "", querySelector() { return null; } };
  const browserWindow = {
    addEventListener() {},
    dispatchEvent() {},
    authService: { getClient() { return client; } },
    learningProgressStatus,
    location: { href: "" }
  };
  const sandbox = {
    console,
    document: { getElementById() { return mount; } },
    module: { exports: {} },
    exports: {},
    URL,
    CustomEvent: class CustomEvent {},
    window: browserWindow
  };

  vm.runInNewContext(source, sandbox, { filename: "progress-page.js" });
  return { api: sandbox.module.exports, mount };
}

function createProgressTables({ projectPublished }) {
  const kpiSteps = Array.from({ length: 4 }, (_, index) => ({
    id: `kpi-step-${index + 1}`,
    path_id: "path-kpi",
    step_key: `kpi-${index + 1}`,
    title: `KPI ${index + 1}`,
    description: "Prática de KPI",
    display_order: index + 1,
    status: "active",
    metadata: { practice_slug: `kpi-practice-${index + 1}`, format: "sql_practice" }
  }));
  const projectSteps = [
    {
      id: "project-step-1",
      path_id: "path-project",
      step_key: "projetos-01-escopo-pergunta",
      title: "Escopo e pergunta analítica",
      display_order: 1,
      status: "active",
      metadata: { activity_slug: "projeto-01-escopo-pergunta", format: "guided_practice" }
    },
    {
      id: "project-step-2",
      path_id: "path-project",
      step_key: "projetos-02-consulta-validacao",
      title: "Consulta e validação",
      display_order: 2,
      status: "active",
      metadata: { practice_slug: "projeto-01-consulta-validacao", format: "sql_practice" }
    },
    {
      id: "project-step-3",
      path_id: "path-project",
      step_key: "projetos-03-insight-recomendacao",
      title: "Insight e recomendação",
      display_order: 3,
      status: "active",
      metadata: { activity_slug: "projeto-01-insight-recomendacao", format: "guided_practice" }
    }
  ];
  const kpiActivities = kpiSteps.map((step, index) => ({
    activity_id: `kpi-activity-${index + 1}`,
    exercise_id: `kpi-exercise-${index + 1}`,
    dataset_id: "kpi-dataset",
    slug: step.metadata.practice_slug,
    status: "active"
  }));

  return {
    profiles: [{ id: "user-1", email: "pessoa@example.com", display_name: "Pessoa Teste" }],
    diagnostic_sessions: [{
      user_id: "user-1",
      attempt_id: "diagnostic-1",
      finished_at: "2026-10-12T09:00:00.000Z",
      created_at: "2026-10-12T08:00:00.000Z",
      total_questions_answered: 10,
      total_correct: 7,
      total_wrong: 3,
      score_percent: 70,
      overall_level: "intermediário",
      area_score_snapshot: {}
    }],
    diagnostic_answers: [],
    user_skill_progress: [],
    learning_recommendations: [],
    user_learning_progress: [
      {
        user_id: "user-1",
        path_id: "path-kpi",
        step_id: "kpi-step-2",
        status: "in_progress",
        progress_percent: 25,
        last_activity_at: "2026-10-12T12:00:00.000Z",
        updated_at: "2026-10-12T12:00:00.000Z"
      },
      {
        user_id: "user-1",
        path_id: "path-sql",
        step_id: "sql-step-5",
        status: "completed",
        progress_percent: 100,
        last_activity_at: "2026-10-11T12:00:00.000Z",
        updated_at: "2026-10-11T12:00:00.000Z"
      }
    ],
    learning_paths: [
      { id: "path-kpi", slug: "kpis", title: "KPIs para Negócios", status: "active" },
      { id: "path-sql", slug: "sql-essencial", title: "SQL Essencial", status: "active" },
      { id: "path-project", slug: "projetos-praticos", title: "Projetos Práticos", status: "active" }
    ],
    learning_path_steps: [...kpiSteps, ...projectSteps],
    vw_sql_practice_exercises_public: [
      ...kpiActivities,
      ...(projectPublished ? [{
        activity_id: "project-sql-activity",
        exercise_id: "project-sql-exercise",
        dataset_id: "project-dataset",
        slug: "projeto-01-consulta-validacao",
        status: "active"
      }] : [])
    ],
    vw_guided_practice_activities_public: projectPublished ? [
      { id: "project-guided-1", slug: "projeto-01-escopo-pergunta", status: "active" },
      { id: "project-guided-3", slug: "projeto-01-insight-recomendacao", status: "active" }
    ] : [],
    user_practice_attempts: [{
      user_id: "user-1",
      activity_id: "kpi-activity-1",
      validation_status: "correct"
    }],
    user_guided_practice_attempts: []
  };
}

async function testProjectContinuity(projectPublished) {
  const tables = createProgressTables({ projectPublished });
  const client = { from(table) { return createQuery(table, tables); } };
  const { api, mount } = loadProgressPage(client);
  const user = { id: "user-1", email: "pessoa@example.com" };
  const data = await api.fetchProgressData(user);

  api.renderAuthenticatedState({ user }, data);

  assert.strictEqual(data.path.id, "path-kpi");
  assert.strictEqual(data.learningProgress.progress_percent, 25);
  assert.match(mount.innerHTML, /KPIs para Negócios/);
  assert.match(mount.innerHTML, /25% da trilha concluída/);

  if (projectPublished) {
    assert.strictEqual(data.nextPath.id, "path-project");
    assert.strictEqual(data.nextPathStep.id, "project-step-1");
    assert.match(mount.innerHTML, /Projeto 01 — Análise de Vendas/);
    assert.match(mount.innerHTML, />Iniciar Projeto 01</);
    assert.match(mount.innerHTML, /pratica-guiada\.html\?atividade=projeto-01-escopo-pergunta/);
    assert.strictEqual((mount.innerHTML.match(/>Iniciar Projeto 01</g) || []).length, 1);
  } else {
    assert.strictEqual(data.nextPath, null);
    assert.strictEqual(data.nextPathStep, null);
    assert.doesNotMatch(mount.innerHTML, />Iniciar Projeto 01</);
    assert.doesNotMatch(mount.innerHTML, /atividade=projeto-01-escopo-pergunta/);
  }
}

function loadSqlPracticeService(tables) {
  const source = fs.readFileSync(path.join(root, "src", "sql-practice-service.js"), "utf8");
  const client = { from(table) { return createQuery(table, tables); } };
  const browserWindow = { authService: { getClient() { return client; } } };
  browserWindow.window = browserWindow;
  vm.runInNewContext(source, { window: browserWindow, console }, { filename: "sql-practice-service.js" });
  return browserWindow.sqlPracticeService;
}

async function testSqlCatalogFiltering() {
  const functionalOne = {
    activity_id: "sql-activity-1",
    exercise_id: "sql-exercise-1",
    dataset_id: "sql-dataset",
    slug: "sql-funcional-1",
    title: "SQL funcional 1",
    track_slug: "sql-essencial",
    step_order: 1,
    status: "active"
  };
  const functionalTwo = {
    ...functionalOne,
    activity_id: "sql-activity-2",
    exercise_id: "sql-exercise-2",
    slug: "sql-funcional-2",
    title: "SQL funcional 2",
    step_order: 3
  };
  const guidedLeftJoin = {
    activity_id: "guided-activity",
    exercise_id: null,
    dataset_id: null,
    slug: "atividade-guiada",
    title: "Atividade guiada",
    track_slug: "sql-essencial",
    step_order: 2,
    status: "active"
  };
  const service = loadSqlPracticeService({
    vw_sql_practice_exercises_public: [functionalOne, guidedLeftJoin, functionalTwo]
  });

  const result = await service.loadPractice("sql-funcional-1");
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(
    Array.from(result.catalog, (activity) => activity.slug),
    ["sql-funcional-1", "sql-funcional-2"]
  );

  const guidedResult = await service.loadPractice("atividade-guiada");
  assert.strictEqual(guidedResult.notFound, true);
}

function testRestrictedSqlUpdate() {
  const sql = fs.readFileSync(
    path.join(root, "docs", "projeto-01-analise-vendas-carga-proposta.sql"),
    "utf8"
  );
  const updateSection = sql.match(/update public\.learning_path_steps[\s\S]*?;\s*\n\s*-- Verificações/);

  assert.ok(updateSection, "UPDATE de learning_path_steps deve existir na proposta");
  assert.match(updateSection[0], /where step_key in \([\s\S]*?\)\s*and path_id in \(/);
  assert.match(
    updateSection[0],
    /select id\s+from public\.learning_paths\s+where slug = 'projetos-praticos'/
  );
}

async function run() {
  await testProjectContinuity(true);
  await testProjectContinuity(false);
  await testSqlCatalogFiltering();
  testRestrictedSqlUpdate();
  console.log("Project 01 final adjustment tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
