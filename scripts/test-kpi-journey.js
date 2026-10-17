const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { PGlite } = require("@electric-sql/pglite");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const content = require(path.join(root, "src", "kpi-guided-content.js"));
const projectContent = require(path.join(root, "src", "project-01-content.js"));

function createMemoryQuery(table, tables, failures = {}) {
  const filters = [];
  let operation = "select";
  let payload = null;
  let single = false;
  let orderColumn = null;

  const query = {
    select() { return query; },
    eq(column, value) { filters.push([column, value]); return query; },
    order(column) { orderColumn = column; return query; },
    maybeSingle() { single = true; return query; },
    insert(value) { operation = "insert"; payload = value; return query; },
    update(value) { operation = "update"; payload = value; return query; },
    then(resolve, reject) {
      return Promise.resolve(execute()).then(resolve, reject);
    }
  };

  function execute() {
    const rows = tables[table] || [];
    const matches = (row) => filters.every(([column, value]) => row[column] === value);
    if (operation === "insert") {
      if (failures[table]) return { data: null, error: failures[table] };
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

function loadService(client = null) {
  const browserWindow = {
    KpiGuidedContent: content,
    Project01Content: projectContent
  };
  if (client) browserWindow.authService = { getClient() { return client; } };
  browserWindow.window = browserWindow;
  vm.runInNewContext(read("src/guided-practice-service.js"), { window: browserWindow, console }, {
    filename: "guided-practice-service.js"
  });
  return browserWindow.guidedPracticeService;
}

function correctAnswers(activity) {
  return Object.fromEntries(activity.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint.correctOption]));
}

function runContentAndMathChecks() {
  const service = loadService();
  const slugs = Object.keys(content.GUIDED_ACTIVITIES);
  assert.deepStrictEqual(slugs, [
    "indicadores-definicao-consistente",
    "indicadores-decomposicao-kpi",
    "indicadores-funil-conversao"
  ]);

  slugs.forEach((slug) => {
    const activity = content.GUIDED_ACTIVITIES[slug];
    assert.strictEqual(activity.checkpoints.length, 3);
    assert.strictEqual(activity.responseSchema, "checkpoint_sequence");
    assert.strictEqual(service.validateSubmission(activity, {}).isCorrect, false);

    const answers = correctAnswers(activity);
    const incomplete = { ...answers };
    delete incomplete[activity.checkpoints[2].id];
    assert.strictEqual(service.validateSubmission(activity, incomplete).isCorrect, false);
    assert.strictEqual(service.validateSubmission(activity, answers).isCorrect, true);

    const wrong = { ...answers, [activity.checkpoints[0].id]: "D" };
    assert.strictEqual(service.validateSubmission(activity, wrong).isCorrect, false);
    assert.ok(activity.thinkingSteps.every(([question, answer]) => question && answer));
    assert.doesNotMatch(activity.scenario.context, /Satisfação abaixo da meta/);
  });

  const pedagogicalCopy = slugs.map((slug) => {
    const activity = content.GUIDED_ACTIVITIES[slug];
    return {
      feedbacks: activity.checkpoints.map((checkpoint) => checkpoint.incorrectFeedback).join(" "),
      thinking: activity.thinkingSteps.flat().join(" ")
    };
  });
  assert.doesNotMatch(pedagogicalCopy[0].feedbacks, /92 ÷ 115|96 ÷ 120|os dois resultados são 80%/i);
  assert.doesNotMatch(pedagogicalCopy[1].feedbacks, /\(80 \+ 90\)|239\/300|83,5%|queda está associada ao Chat/i);
  assert.doesNotMatch(pedagogicalCopy[2].feedbacks, /volume da etapa atual pelo volume da etapa anterior|1 menos a taxa de conversão/i);
  assert.doesNotMatch(
    pedagogicalCopy.map((item) => item.thinking).join(" "),
    /Somente avaliações positivas|respostas válidas do mesmo período|Some numeradores|dois terços das respostas|volume da etapa imediatamente anterior/i
  );

  const definition = content.GUIDED_ACTIVITIES["indicadores-definicao-consistente"];
  assert.strictEqual(92 / 115, 0.8);
  assert.strictEqual(96 / 120, 0.8);
  assert.strictEqual(96 / 160, 0.6);
  assert.match(definition.checkpoints[1].correctFeedback, /92 ÷ 115 = 80%/);

  const previous = (80 + 90) / (100 + 100) * 100;
  const current = (144 + 95) / (200 + 100) * 100;
  assert.strictEqual(previous, 85);
  assert.ok(Math.abs(current - 79.6666666667) < 0.000001);
  assert.ok(Math.abs((current - previous) - (-5.3333333333)) < 0.000001);
  assert.notStrictEqual((72 + 95) / 2, current);

  assert.strictEqual(4000 / 10000, 0.4);
  assert.strictEqual(1000 / 4000, 0.25);
  assert.strictEqual(600 / 1000, 0.6);
  assert.strictEqual(300 / 600, 0.5);
  assert.strictEqual(300 / 10000, 0.03);

  assert.strictEqual(service.validateAnswer(service.LOCAL_ACTIVITY, "B").isCorrect, true);
  assert.strictEqual(service.validateAnswer(service.LOCAL_ACTIVITY, "A").isCorrect, false);
  assert.strictEqual(
    service.validateAnswer(projectContent.GUIDED_ACTIVITIES["projeto-01-insight-recomendacao"], "B").isCorrect,
    true
  );
}

async function runProgressChecks() {
  const anonymousService = loadService();
  const anonymousActivity = {
    ...content.GUIDED_ACTIVITIES["indicadores-definicao-consistente"],
    id: "activity-anonymous"
  };
  const anonymous = await anonymousService.saveResponse(
    anonymousActivity,
    correctAnswers(anonymousActivity),
    "2026-10-17T09:55:00.000Z"
  );
  assert.strictEqual(anonymous.validation.isCorrect, true);
  assert.strictEqual(anonymous.attempt.authenticated, false);
  assert.strictEqual(anonymous.progress.skipped, true);

  const tables = {
    learning_paths: [{ id: "path-kpi", slug: "indicadores-e-kpis", title: "Indicadores e KPIs", status: "active" }],
    learning_path_steps: [1, 2, 3, 4].map((order) => ({
      id: `step-${order}`,
      path_id: "path-kpi",
      step_key: [
        "indicadores-01-meta-resultado",
        "indicadores-02-definicao-consistente",
        "indicadores-03-decomposicao-kpi",
        "indicadores-04-funil-conversao"
      ][order - 1],
      display_order: order,
      status: "active",
      metadata: {}
    })),
    user_learning_progress: [{
      id: "progress-step-1",
      user_id: "user-1",
      path_id: "path-kpi",
      step_id: "step-1",
      status: "completed",
      progress_percent: 25,
      metadata: { activity_slug: "indicadores-meta-resultado" }
    }],
    user_guided_practice_attempts: []
  };
  const failures = {};
  const client = {
    auth: { async getSession() { return { data: { session: { user: { id: "user-1" } } }, error: null }; } },
    from(table) { return createMemoryQuery(table, tables, failures); }
  };
  const service = loadService(client);
  const activities = [
    content.GUIDED_ACTIVITIES["indicadores-definicao-consistente"],
    content.GUIDED_ACTIVITIES["indicadores-decomposicao-kpi"],
    content.GUIDED_ACTIVITIES["indicadores-funil-conversao"]
  ].map((activity, index) => ({ ...activity, id: `activity-${index + 2}` }));

  const wrongAnswers = correctAnswers(activities[0]);
  wrongAnswers.metodologia = "D";
  const wrong = await service.saveResponse(activities[0], wrongAnswers, "2026-10-17T10:00:00.000Z");
  assert.strictEqual(wrong.validation.isCorrect, false);
  assert.strictEqual(wrong.progress.skipped, true);
  assert.strictEqual(tables.user_learning_progress.length, 1);
  assert.strictEqual(tables.user_guided_practice_attempts[0].status, "submitted");

  const incompleteAnswers = correctAnswers(activities[0]);
  delete incompleteAnswers.interpretacao;
  const incomplete = await service.saveResponse(activities[0], incompleteAnswers, "2026-10-17T10:05:00.000Z");
  assert.strictEqual(incomplete.validation.isCorrect, false);
  assert.strictEqual(incomplete.progress.skipped, true);
  assert.strictEqual(tables.user_learning_progress.length, 1);

  failures.user_guided_practice_attempts = { message: "Falha simulada ao salvar tentativa" };
  const failedAttempt = await service.saveResponse(
    activities[0],
    correctAnswers(activities[0]),
    "2026-10-17T10:07:00.000Z"
  );
  delete failures.user_guided_practice_attempts;
  assert.strictEqual(failedAttempt.validation.isCorrect, true);
  assert.strictEqual(failedAttempt.attempt.ok, false);
  assert.strictEqual(failedAttempt.progress.skipped, true);
  assert.strictEqual(failedAttempt.progress.reason, "attempt_not_saved");
  assert.strictEqual(failedAttempt.progress.error.message, "Falha simulada ao salvar tentativa");
  assert.strictEqual(tables.user_learning_progress.length, 1);

  const attemptsBeforeProgressFailure = tables.user_guided_practice_attempts.length;
  failures.user_learning_progress = { message: "Falha simulada ao salvar progresso" };
  const failedProgress = await service.saveResponse(
    activities[0],
    correctAnswers(activities[0]),
    "2026-10-17T10:08:00.000Z"
  );
  delete failures.user_learning_progress;
  assert.strictEqual(failedProgress.attempt.ok, true);
  assert.strictEqual(failedProgress.progress.ok, false);
  assert.strictEqual(tables.user_guided_practice_attempts.length, attemptsBeforeProgressFailure + 1);
  assert.strictEqual(tables.user_learning_progress.length, 1);

  const recoveredProgress = await service.saveResponse(
    activities[0],
    correctAnswers(activities[0]),
    "2026-10-17T10:08:00.000Z",
    { attemptAlreadySaved: true }
  );
  assert.strictEqual(recoveredProgress.attempt.reused, true);
  assert.strictEqual(recoveredProgress.progress.ok, true);
  assert.strictEqual(recoveredProgress.progress.progressPercent, 50);
  assert.strictEqual(tables.user_guided_practice_attempts.length, attemptsBeforeProgressFailure + 1);

  const expectedProgress = [75, 100];
  for (let index = 1; index < activities.length; index += 1) {
    const result = await service.saveResponse(
      activities[index],
      correctAnswers(activities[index]),
      `2026-10-17T10:${10 + index}:00.000Z`
    );
    assert.strictEqual(result.validation.isCorrect, true);
    assert.strictEqual(result.attempt.ok, true);
    assert.strictEqual(result.progress.ok, true);
    assert.strictEqual(result.progress.progressPercent, expectedProgress[index - 1]);
  }

  const finalRows = tables.user_learning_progress.filter((row) => row.status === "completed");
  assert.strictEqual(finalRows.length, 4);
  assert.strictEqual(finalRows.find((row) => row.step_id === "step-4").progress_percent, 100);
  assert.strictEqual(
    finalRows.find((row) => row.step_id === "step-4").metadata.competencies.length,
    4
  );
}

async function runSqlProposalChecks() {
  const proposal = read("docs/indicadores-kpis-jornada-completa-proposta.sql");
  const refinement = read("docs/indicadores-kpis-refino-pedagogico-proposta.sql");
  assert.doesNotMatch(proposal, /\b(create|alter|drop)\s+(table|view|policy|schema)\b/i);
  assert.doesNotMatch(proposal, /\b(delete|truncate|grant|revoke)\b/i);
  assert.doesNotMatch(proposal, /\(\s*'indicadores-meta-resultado'\s*,\s*'practice'/i);
  assert.match(proposal, /where path_id = target_path_id[\s\S]*indicadores-04-funil-conversao/);
  assert.match(proposal, /linked_step_count <> 3/);
  assert.match(proposal, /original_step_count <> 1/);
  assert.match(proposal, /estimated_minutes = 55/);
  assert.match(refinement, /PROPOSTA COMPLEMENTAR — NÃO EXECUTADA/);
  assert.match(refinement, /activity\.track_slug = 'indicadores-e-kpis'/);
  assert.match(refinement, /updated_activity_count <> 3/);
  assert.doesNotMatch(refinement, /\b(create|alter|drop)\s+(table|view|policy|schema)\b/i);
  assert.doesNotMatch(refinement, /\b(delete|truncate|grant|revoke)\b/i);
  assert.doesNotMatch(refinement, /user_guided_practice_attempts|user_learning_progress/i);

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
        metadata jsonb not null default '{}'::jsonb,
        updated_at timestamptz default now()
      );
      create table public.learning_paths (
        id uuid primary key default gen_random_uuid(),
        slug text not null unique,
        status text not null,
        estimated_minutes integer,
        metadata jsonb not null default '{}'::jsonb,
        updated_at timestamptz default now()
      );
      create table public.learning_path_steps (
        id uuid primary key default gen_random_uuid(),
        path_id uuid not null references public.learning_paths(id),
        step_key text not null,
        content_type text,
        content_url text,
        estimated_minutes integer,
        metadata jsonb not null default '{}'::jsonb,
        updated_at timestamptz default now(),
        unique (path_id, step_key)
      );
      insert into public.learning_paths (slug, status, estimated_minutes) values
        ('indicadores-e-kpis', 'active', 120),
        ('trilha-controle', 'active', 20);
      insert into public.learning_activities (
        slug, activity_type, title, track_slug, step_order, status, is_active, metadata
      ) values (
        'indicadores-meta-resultado', 'practice', 'Meta e resultado',
        'indicadores-e-kpis', 1, 'active', true, '{"preserved": true}'::jsonb
      );
      insert into public.learning_path_steps (
        path_id, step_key, content_type, content_url, estimated_minutes, metadata
      )
      select path.id, steps.step_key, 'lesson', steps.content_url,
             steps.estimated_minutes, steps.metadata
      from public.learning_paths path
      cross join (values
        (
          'indicadores-01-meta-resultado',
          'pratica-guiada.html?atividade=indicadores-meta-resultado',
          25,
          '{"activity_slug": "indicadores-meta-resultado", "preserved": true}'::jsonb
        ),
        ('indicadores-02-definicao-consistente', null, 25, '{}'::jsonb),
        ('indicadores-03-decomposicao-kpi', null, 40, '{}'::jsonb),
        ('indicadores-04-funil-conversao', null, 35, '{}'::jsonb)
      ) steps(step_key, content_url, estimated_minutes, metadata)
      where path.slug = 'indicadores-e-kpis';
      insert into public.learning_path_steps (path_id, step_key, content_type)
      select id, 'indicadores-02-definicao-consistente', 'lesson'
      from public.learning_paths where slug = 'trilha-controle';
    `);

    const originalStepBefore = await db.query(`
      select step.id, step.step_key, step.content_url, step.metadata
      from public.learning_path_steps step
      join public.learning_paths path on path.id = step.path_id
      where path.slug = 'indicadores-e-kpis'
        and step.step_key = 'indicadores-01-meta-resultado'
    `);

    await db.exec(proposal);
    await db.exec(proposal);
    await db.exec(refinement);
    await db.exec(refinement);

    const activities = await db.query(`
      select slug, metadata ->> 'response_schema' as response_schema,
             jsonb_array_length(metadata -> 'checkpoints') as checkpoint_count
      from public.learning_activities
      where track_slug = 'indicadores-e-kpis'
      order by step_order
    `);
    assert.strictEqual(activities.rows.length, 4);
    assert.deepStrictEqual(
      activities.rows.slice(1).map((row) => [row.response_schema, row.checkpoint_count]),
      [["checkpoint_sequence", 3], ["checkpoint_sequence", 3], ["checkpoint_sequence", 3]]
    );
    const refinedActivities = await db.query(`
      select slug, metadata
      from public.learning_activities
      where track_slug = 'indicadores-e-kpis'
        and slug <> 'indicadores-meta-resultado'
      order by step_order
    `);
    refinedActivities.rows.forEach((row) => {
      const localActivity = content.GUIDED_ACTIVITIES[row.slug];
      assert.deepStrictEqual(
        row.metadata.checkpoints.map((checkpoint) => checkpoint.incorrect_feedback),
        localActivity.checkpoints.map((checkpoint) => checkpoint.incorrectFeedback)
      );
      assert.deepStrictEqual(
        row.metadata.thinking_steps,
        localActivity.thinkingSteps.map(([question, answer]) => ({ question, answer }))
      );
    });
    const original = await db.query(`
      select metadata from public.learning_activities where slug = 'indicadores-meta-resultado'
    `);
    assert.deepStrictEqual(original.rows[0].metadata, { preserved: true });

    const pathResult = await db.query(`
      select estimated_minutes from public.learning_paths where slug = 'indicadores-e-kpis'
    `);
    assert.strictEqual(pathResult.rows[0].estimated_minutes, 55);
    const steps = await db.query(`
      select step.id, step.step_key, step.content_type, step.content_url,
             step.estimated_minutes, step.metadata
      from public.learning_path_steps step
      join public.learning_paths path on path.id = step.path_id
      where path.slug = 'indicadores-e-kpis'
      order by step.step_key
    `);
    assert.deepStrictEqual(steps.rows.map((step) => step.estimated_minutes), [10, 15, 15, 15]);
    assert.strictEqual(
      steps.rows.reduce((total, step) => total + step.estimated_minutes, 0),
      55
    );
    assert.ok(steps.rows.every((step) => step.content_type === "practice"));
    assert.strictEqual(steps.rows[0].id, originalStepBefore.rows[0].id);
    assert.strictEqual(steps.rows[0].step_key, originalStepBefore.rows[0].step_key);
    assert.strictEqual(
      steps.rows[0].content_url,
      originalStepBefore.rows[0].content_url
    );
    assert.deepStrictEqual(steps.rows[0].metadata, originalStepBefore.rows[0].metadata);
    const linked = await db.query(`
      select count(*)::integer as total
      from public.learning_path_steps step
      join public.learning_paths path on path.id = step.path_id
      where path.slug = 'indicadores-e-kpis'
        and step.content_url is not null
    `);
    assert.strictEqual(linked.rows[0].total, 4);
    const control = await db.query(`
      select content_url
      from public.learning_path_steps step
      join public.learning_paths path on path.id = step.path_id
      where path.slug = 'trilha-controle'
    `);
    assert.strictEqual(control.rows[0].content_url, null);
  } finally {
    await db.close();
  }
}

function runIntegrationSourceChecks() {
  const html = read("pratica-guiada.html");
  const page = read("src/guided-practice-page.js");
  const progressPage = read("src/progress-page.js");
  assert.match(html, /src\/kpi-guided-content\.js/);
  assert.match(page, /Roteiro interno/);
  assert.match(page, /Progresso oficial da trilha/);
  assert.match(page, /data-next-checkpoint/);
  assert.doesNotMatch(page, /Compare meta e resultado/);
  assert.match(progressPage, /"indicadores-e-kpis": "indicadores-funil-conversao"/);
  assert.match(progressPage, /isDetailedCompletion/);
}

(async () => {
  runContentAndMathChecks();
  await runProgressChecks();
  await runSqlProposalChecks();
  runIntegrationSourceChecks();
  console.log("KPI journey checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
