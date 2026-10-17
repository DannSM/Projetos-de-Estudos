const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { PGlite } = require("@electric-sql/pglite");

const root = path.resolve(__dirname, "..");
const content = require(path.join(root, "src", "project-01-content.js"));
const validation = require(path.join(root, "src", "sql-mission-validation.js"));
const engine = require(path.join(root, "src", "sql-poc-engine.js"));
const progress = require(path.join(root, "src", "learning-progress-status.js"));

function loadGuidedService(overrides = {}) {
  const source = fs.readFileSync(path.join(root, "src", "guided-practice-service.js"), "utf8");
  const window = { Project01Content: content, ...overrides };
  window.window = window;
  vm.runInNewContext(source, { window, console, Date, Map, Set }, { filename: "guided-practice-service.js" });
  return window.guidedPracticeService;
}

function createMemoryQuery(table, tables) {
  const filters = [];
  let operation = "select";
  let payload = null;
  let orderColumn = "";
  const query = {
    select() { operation = "select"; return query; },
    eq(column, value) { filters.push([column, value]); return query; },
    order(column) { orderColumn = column; return query; },
    maybeSingle() { return execute(true); },
    insert(value) { operation = "insert"; payload = value; return execute(false); },
    update(value) { operation = "update"; payload = value; return query; },
    then(resolve, reject) { return execute(false).then(resolve, reject); }
  };

  async function execute(single) {
    const rows = tables[table] || [];
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
    if (orderColumn) selected.sort((left, right) => Number(left[orderColumn]) - Number(right[orderColumn]));
    return { data: single ? selected[0] || null : selected, error: null };
  }

  return query;
}

async function runGuidedPersistenceChecks() {
  const tables = {
    learning_paths: [{ id: "path-project", slug: "projetos-praticos", title: "Projetos Práticos", status: "active" }],
    learning_path_steps: [
      { id: "project-step-1", path_id: "path-project", step_key: "projetos-01-escopo-pergunta", display_order: 1, status: "active", metadata: { activity_slug: "projeto-01-escopo-pergunta", format: "guided_practice" } },
      { id: "project-step-2", path_id: "path-project", step_key: "projetos-02-consulta-validacao", display_order: 2, status: "active", metadata: { activity_slug: "projeto-01-consulta-validacao", format: "sql_practice" } },
      { id: "project-step-3", path_id: "path-project", step_key: "projetos-03-insight-recomendacao", display_order: 3, status: "active", metadata: { activity_slug: "projeto-01-insight-recomendacao", format: "guided_practice" } }
    ],
    user_learning_progress: [],
    user_guided_practice_attempts: []
  };
  const client = {
    auth: {
      async getSession() {
        return { data: { session: { user: { id: "user-1" } } }, error: null };
      }
    },
    from(table) {
      return createMemoryQuery(table, tables);
    }
  };
  const service = loadGuidedService({
    authService: { getClient() { return client; } }
  });
  const activity = {
    ...content.GUIDED_ACTIVITIES["projeto-01-escopo-pergunta"],
    id: "guided-activity-1"
  };

  const first = await service.saveResponse(activity, "B", "2026-10-12T10:00:00.000Z");
  const repeated = await service.saveResponse(activity, "B", "2026-10-12T10:05:00.000Z");
  const invalid = await service.saveResponse(activity, "A", "2026-10-12T10:10:00.000Z");
  const progressRows = tables.user_learning_progress;

  assert.strictEqual(first.attempt.ok, true);
  assert.strictEqual(first.progress.progressPercent, 33.33);
  assert.strictEqual(first.progress.nextStep.step_key, "projetos-02-consulta-validacao");
  assert.strictEqual(repeated.progress.progressPercent, 33.33);
  assert.strictEqual(invalid.validation.isCorrect, false);
  assert.strictEqual(invalid.progress.skipped, true);
  assert.strictEqual(tables.user_guided_practice_attempts.length, 3);
  assert.strictEqual(tables.user_guided_practice_attempts[2].status, "submitted");
  assert.strictEqual(progressRows.length, 2);
  assert.strictEqual(progressRows.find((row) => row.step_id === "project-step-1").status, "completed");
  assert.strictEqual(progressRows.find((row) => row.step_id === "project-step-2").status, "in_progress");
  assert.strictEqual(progressRows.every((row) => Number(row.progress_percent) === 33.33), true);
}

function loadProgressPageApi() {
  const source = fs.readFileSync(path.join(root, "src", "progress-page.js"), "utf8");
  const mount = { innerHTML: "", querySelector() { return null; } };
  const window = {
    addEventListener() {},
    dispatchEvent() {},
    location: { href: "http://127.0.0.1:4173/meu-progresso.html" },
    learningProgressStatus: progress
  };
  const sandbox = {
    window,
    document: { getElementById() { return mount; } },
    console,
    module: { exports: {} },
    exports: {},
    URL,
    CustomEvent: class CustomEvent {}
  };
  vm.runInNewContext(source, sandbox, { filename: "progress-page.js" });
  return { api: sandbox.module.exports, mount };
}

function calculateDatasetResult() {
  const clientsById = new Map(content.CLIENTS.map((client) => [client.cliente_id, client]));
  const summary = new Map();

  content.ORDERS.filter((order) => order.status === "pago").forEach((order) => {
    const client = clientsById.get(order.cliente_id);
    assert.ok(client, `pedido ${order.pedido_id} deve referenciar um cliente existente`);
    const current = summary.get(client.segmento) || { orders: 0, clients: new Set(), revenue: 0 };
    current.orders += 1;
    current.clients.add(client.cliente_id);
    current.revenue += Number(order.valor);
    summary.set(client.segmento, current);
  });

  return [...summary.entries()]
    .map(([segment, value]) => [segment, value.orders, value.clients.size, value.revenue])
    .sort((left, right) => left[0].localeCompare(right[0], "pt-BR"));
}

async function runSqlChecks() {
  const workbench = await engine.createWorkbench(PGlite, content.DATASET_CONFIG);

  try {
    const correctQuery = `
      select
        c.segmento as grupo,
        sum(p.valor) as receita,
        count(distinct p.cliente_id) as compradores,
        count(p.pedido_id) as pedidos
      from clientes c
      join pedidos p on c.cliente_id = p.cliente_id
      where p.status = 'pago'
      group by c.segmento
      order by receita desc
    `;
    const result = await workbench.execute(correctQuery);
    assert.strictEqual(
      engine.validateConfiguredResult(
        result,
        correctQuery,
        content.SQL_PRACTICE.validationConfig,
        content.SQL_PRACTICE.expectedResult
      ),
      true
    );
    assert.strictEqual(
      validation.validateConfiguredSql(correctQuery, "project_sales_by_segment").status,
      "correct"
    );

    const equivalentQuery = `
      select
        c.segmento,
        count(p.pedido_id) as total_linhas,
        count(distinct p.cliente_id) as compradores_unicos,
        sum(p.valor) as receita_liquida
      from clientes c
      join pedidos p using (cliente_id)
      where p.status in ('pago')
      group by 1
    `;
    const equivalentResult = await workbench.execute(equivalentQuery);
    const equivalentValidation = validation.validateConfiguredSql(equivalentQuery, "project_sales_by_segment");
    const equivalentIsCorrect = engine.validateConfiguredResult(
      equivalentResult,
      equivalentQuery,
      content.SQL_PRACTICE.validationConfig,
      content.SQL_PRACTICE.expectedResult
    );
    assert.strictEqual(
      equivalentIsCorrect,
      true,
      JSON.stringify({ equivalentResult, equivalentValidation })
    );
    assert.strictEqual(
      equivalentValidation.status,
      "correct"
    );

    const wrongQuery = `
      select c.segmento, count(p.pedido_id), count(distinct p.cliente_id), sum(p.valor)
      from clientes c
      join pedidos p on c.cliente_id = p.cliente_id
      group by c.segmento
    `;
    const wrongResult = await workbench.execute(wrongQuery);
    assert.strictEqual(
      engine.validateConfiguredResult(
        wrongResult,
        wrongQuery,
        content.SQL_PRACTICE.validationConfig,
        content.SQL_PRACTICE.expectedResult
      ),
      false
    );
    assert.throws(() => engine.assertReadOnlySelect("delete from pedidos"), /apenas consultas SELECT/i);
  } finally {
    await workbench.close();
  }
}

async function runLoadProposalChecks() {
  const proposal = fs.readFileSync(
    path.join(root, "docs", "projeto-01-analise-vendas-carga-proposta.sql"),
    "utf8"
  );
  assert.doesNotMatch(proposal, /\b(create|alter|drop)\s+(table|view|policy|schema)\b/i);
  assert.doesNotMatch(proposal, /\b(grant|revoke)\b/i);

  const db = new PGlite("memory://");
  await db.waitReady;
  try {
    await db.exec(`
      create schema if not exists public;
      create table public.learning_activities (
        id uuid primary key default gen_random_uuid(),
        slug text not null unique,
        activity_type text not null,
        title text not null,
        subtitle text,
        track_slug text,
        track_title text,
        step_order integer,
        status text,
        level_label text,
        estimated_minutes integer,
        is_active boolean,
        metadata jsonb,
        updated_at timestamptz default now()
      );
      create table public.sql_datasets (
        id uuid primary key default gen_random_uuid(),
        slug text not null unique,
        title text not null,
        description text,
        engine text,
        schema_config jsonb,
        seed_data jsonb,
        sample_rows jsonb,
        is_active boolean,
        updated_at timestamptz default now()
      );
      create table public.sql_practice_exercises (
        id uuid primary key default gen_random_uuid(),
        activity_id uuid not null unique references public.learning_activities(id),
        dataset_id uuid not null references public.sql_datasets(id),
        prompt text,
        objective text,
        theoretical_support jsonb,
        validation_config jsonb,
        expected_result jsonb,
        solution_sql text,
        is_active boolean,
        updated_at timestamptz default now()
      );
      create table public.learning_paths (
        id uuid primary key default gen_random_uuid(),
        slug text not null unique
      );
      create table public.learning_path_steps (
        id uuid primary key default gen_random_uuid(),
        path_id uuid not null references public.learning_paths(id),
        step_key text not null,
        content_url text,
        metadata jsonb,
        updated_at timestamptz default now(),
        unique (path_id, step_key)
      );
      insert into public.learning_paths (slug) values ('projetos-praticos');
      insert into public.learning_path_steps (path_id, step_key, metadata)
      select path.id, step_key, '{}'::jsonb
      from public.learning_paths path
      cross join (values
        ('projetos-01-escopo-pergunta'),
        ('projetos-02-consulta-validacao'),
        ('projetos-03-insight-recomendacao')
      ) steps(step_key)
      where path.slug = 'projetos-praticos';
    `);
    await db.exec(proposal);
    await db.exec(proposal);

    const activities = await db.query(`
      select slug, metadata ->> 'format' as format
      from public.learning_activities
      order by step_order
    `);
    assert.deepStrictEqual(
      activities.rows.map((row) => [row.slug, row.format]),
      [
        ["projeto-01-escopo-pergunta", "guided_practice"],
        ["projeto-01-consulta-validacao", "sql_practice"],
        ["projeto-01-insight-recomendacao", "guided_practice"]
      ]
    );

    const dataset = await db.query(`
      select seed_data
      from public.sql_datasets
      where slug = 'projeto-01-vendas-segmentos-v1'
    `);
    const seedGroups = dataset.rows[0].seed_data;
    assert.strictEqual(seedGroups.find((entry) => entry.table === "clientes").rows.length, 10);
    assert.strictEqual(seedGroups.find((entry) => entry.table === "pedidos").rows.length, 50);

    const exercise = await db.query(`
      select validation_config ->> 'validator' as validator, expected_result
      from public.sql_practice_exercises
    `);
    assert.strictEqual(exercise.rows.length, 1);
    assert.strictEqual(exercise.rows[0].validator, "project_sales_by_segment");
    assert.deepStrictEqual(exercise.rows[0].expected_result.rows, content.EXPECTED_ROWS);

    const linkedSteps = await db.query(`
      select step_key, content_url, metadata ->> 'format' as format
      from public.learning_path_steps
      order by step_key
    `);
    assert.strictEqual(linkedSteps.rows.every((row) => Boolean(row.content_url)), true);
    assert.deepStrictEqual(
      linkedSteps.rows.map((row) => row.format),
      ["guided_practice", "sql_practice", "guided_practice"]
    );
  } finally {
    await db.close();
  }
}

function runProgressChecks() {
  const steps = [
    {
      id: "project-step-1",
      status: "active",
      display_order: 1,
      content_url: "pratica-guiada.html?atividade=projeto-01-escopo-pergunta",
      metadata: { activity_slug: "projeto-01-escopo-pergunta", format: "guided_practice" }
    },
    {
      id: "project-step-2",
      status: "active",
      display_order: 2,
      content_url: "praticas-sql.html?pratica=projeto-01-consulta-validacao",
      metadata: { activity_slug: "projeto-01-consulta-validacao", format: "sql_practice" }
    },
    {
      id: "project-step-3",
      status: "active",
      display_order: 3,
      content_url: "pratica-guiada.html?atividade=projeto-01-insight-recomendacao",
      metadata: { activity_slug: "projeto-01-insight-recomendacao", format: "guided_practice" }
    }
  ];
  const activities = [
    { id: "guided-1", slug: "projeto-01-escopo-pergunta", status: "active" },
    {
      activity_id: "sql-2",
      exercise_id: "exercise-2",
      dataset_id: "dataset-1",
      slug: "projeto-01-consulta-validacao",
      status: "active"
    },
    { id: "guided-3", slug: "projeto-01-insight-recomendacao", status: "active" }
  ];
  const guidedOne = {
    activity_id: "guided-1",
    status: "completed",
    score_percent: 100,
    result_payload: { is_correct: true }
  };
  const guidedThree = {
    activity_id: "guided-3",
    status: "completed",
    score_percent: 100,
    result_payload: { is_correct: true }
  };
  const sqlAttempt = { activity_id: "sql-2", validation_status: "correct" };

  const zero = progress.calculateTrackStatus({ steps, activities, attempts: [], guidedAttempts: [] });
  const one = progress.calculateTrackStatus({
    steps,
    activities,
    attempts: [],
    guidedAttempts: [guidedOne, guidedOne]
  });
  const two = progress.calculateTrackStatus({
    steps,
    activities,
    attempts: [sqlAttempt, sqlAttempt],
    guidedAttempts: [guidedOne],
    progressRows: [{ step_id: "project-step-2", status: "in_progress" }]
  });
  const three = progress.calculateTrackStatus({
    steps,
    activities,
    attempts: [sqlAttempt, sqlAttempt],
    guidedAttempts: [guidedOne, guidedThree, guidedThree]
  });

  assert.strictEqual(zero.progressPercent, 0);
  assert.strictEqual(zero.nextStep.id, "project-step-1");
  assert.strictEqual(one.progressPercent, 33);
  assert.strictEqual(one.completedSteps, 1);
  assert.strictEqual(one.nextStep.id, "project-step-2");
  assert.strictEqual(two.progressPercent, 67);
  assert.strictEqual(two.completedSteps, 2);
  assert.strictEqual(two.nextStep.id, "project-step-3");
  assert.strictEqual(three.progressPercent, 100);
  assert.strictEqual(three.completedSteps, 3);
  assert.strictEqual(three.isCompleted, true);
  assert.strictEqual(three.nextStep, null);

  const unavailable = progress.calculateTrackStatus({
    steps,
    activities: [],
    attempts: [],
    guidedAttempts: []
  });
  assert.strictEqual(unavailable.nextStep, null);
  assert.strictEqual(unavailable.unavailableNextStep.id, "project-step-1");

  const sqlSteps = Array.from({ length: 5 }, (_, index) => ({
    id: `sql-step-${index + 1}`,
    status: "active",
    display_order: index + 1,
    metadata: { practice_slug: `sql-practice-${index + 1}`, format: "sql_practice" }
  }));
  const sqlActivities = sqlSteps.map((step, index) => ({
    activity_id: `sql-activity-${index + 1}`,
    exercise_id: `sql-exercise-${index + 1}`,
    dataset_id: "sql-dataset",
    slug: step.metadata.practice_slug,
    status: "active"
  }));
  const completedSql = progress.calculateTrackStatus({
    steps: sqlSteps,
    activities: sqlActivities,
    attempts: sqlActivities.map((activity) => ({
      activity_id: activity.activity_id,
      validation_status: "correct"
    })),
    guidedAttempts: []
  });
  assert.strictEqual(completedSql.progressPercent, 100);
  assert.strictEqual(completedSql.isCompleted, true);

  const progressPage = loadProgressPageApi();
  const completedWithoutPublishedProject = progressPage.api.buildNextStep({
    learningProgress: { status: "completed", progress_percent: 100 },
    path: { id: "path-sql", title: "SQL Essencial" },
    latestSession: { attempt_id: "diagnostic-1" }
  });
  assert.strictEqual(completedWithoutPublishedProject.cta, "Ver trilhas");
  assert.strictEqual(completedWithoutPublishedProject.href, "index.html#trilhas");

  const completedWithPublishedProject = progressPage.api.buildNextStep({
    learningProgress: { status: "completed", progress_percent: 100 },
    path: { id: "path-sql", title: "SQL Essencial" },
    nextPath: { id: "path-project", slug: "projetos-praticos", title: "Projetos Práticos" },
    nextPathStep: steps[0],
    latestSession: { attempt_id: "diagnostic-1" }
  });
  assert.strictEqual(completedWithPublishedProject.cta, "Iniciar Projeto 01");
  assert.strictEqual(
    completedWithPublishedProject.href,
    "pratica-guiada.html?atividade=projeto-01-escopo-pergunta"
  );

  progressPage.api.renderAuthenticatedState(
    { user: { id: "user-1", email: "aluna@example.com", user_metadata: {} } },
    {
      profile: { display_name: "Aluna" },
      diagnosticSessions: [{
        attempt_id: "diagnostic-1",
        score_percent: 70,
        total_questions_answered: 10,
        total_correct: 7,
        overall_level: "intermediário",
        finished_at: "2026-10-12T12:00:00.000Z"
      }],
      diagnosticCount: 1,
      areaSummary: { areas: [], preferredArea: "" },
      priorityArea: null,
      learningRecommendation: null,
      diagnosticRecommendation: null,
      learningProgress: { status: "in_progress", progress_percent: 67 },
      path: { id: "path-project", title: "Projetos Práticos", description: "Projetos aplicados" },
      step: steps[2],
      nextPath: null,
      nextPathStep: null,
      unavailableNextStep: null,
      completedPaths: [{ id: "path-sql", title: "SQL Essencial" }]
    }
  );
  assert.match(progressPage.mount.innerHTML, /Trilhas concluídas/);
  assert.match(progressPage.mount.innerHTML, /SQL Essencial/);
  assert.match(progressPage.mount.innerHTML, /Projetos Práticos/);
  assert.match(progressPage.mount.innerHTML, /67%/);
}

async function run() {
  assert.strictEqual(content.CLIENTS.length, 10);
  assert.strictEqual(content.ORDERS.length, 50);
  assert.strictEqual(new Set(content.ORDERS.map((order) => order.pedido_id)).size, 50);
  assert.deepStrictEqual(calculateDatasetResult(), content.EXPECTED_ROWS);
  assert.deepStrictEqual(
    [...new Set(content.ORDERS.map((order) => order.status))].sort(),
    ["cancelado", "pago", "pendente"]
  );

  const guidedService = loadGuidedService();
  const scope = content.GUIDED_ACTIVITIES["projeto-01-escopo-pergunta"];
  const insight = content.GUIDED_ACTIVITIES["projeto-01-insight-recomendacao"];
  assert.strictEqual(guidedService.validateAnswer(scope, "B").isCorrect, true);
  assert.strictEqual(guidedService.validateAnswer(scope, "A").isCorrect, false);
  assert.strictEqual(guidedService.validateAnswer(insight, "B").isCorrect, true);
  assert.strictEqual(guidedService.LOCAL_ACTIVITY.slug, "indicadores-meta-resultado");
  assert.strictEqual(guidedService.validateAnswer(guidedService.LOCAL_ACTIVITY, "B").isCorrect, true);

  runProgressChecks();
  await runGuidedPersistenceChecks();
  await runSqlChecks();
  await runLoadProposalChecks();

  const guidedPage = fs.readFileSync(path.join(root, "src", "guided-practice-page.js"), "utf8");
  const sqlPage = fs.readFileSync(path.join(root, "src", "sql-practice-page.js"), "utf8");
  assert.match(guidedPage, /Continuar para a consulta SQL|nextAction/);
  assert.match(sqlPage, /pratica-guiada\.html|nextAction/);
  assert.strictEqual(scope.nextAction.href, "praticas-sql.html?pratica=projeto-01-consulta-validacao");
  assert.strictEqual(
    content.SQL_PRACTICE.nextAction.href,
    "pratica-guiada.html?atividade=projeto-01-insight-recomendacao"
  );

  console.log("Project 01 sales analysis tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
