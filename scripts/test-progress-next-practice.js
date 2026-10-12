const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const { calculateTrackStatus } = require(path.join(
  __dirname,
  "..",
  "src",
  "learning-progress-status.js"
));

function loadProgressPageApi() {
  const mount = {
    innerHTML: "",
    querySelector() {
      return null;
    }
  };
  const sandbox = {
    console,
    document: {
      getElementById() {
        return mount;
      }
    },
    module: { exports: {} },
    URL,
    CustomEvent: class CustomEvent {},
    window: {
      addEventListener() {},
      dispatchEvent() {},
      location: { href: "http://127.0.0.1:4173/meu-progresso.html" }
    }
  };
  sandbox.globalThis = sandbox;

  const source = fs.readFileSync(path.join(__dirname, "..", "src", "progress-page.js"), "utf8");
  vm.runInNewContext(source, sandbox);
  return sandbox.module.exports;
}

function createTrackFixture() {
  const steps = [
    ["step-1", "sql-essencial-01-where", "Filtros com WHERE", "sql-essencial-filtros-where"],
    ["step-2", "sql-essencial-02-contagens", "Contagens e nulos", "sql-essencial-count-nulos-distintos"],
    ["step-3", "sql-essencial-03-filtro-mais-agregacao", "Filtro antes do resumo", "sql-essencial-filtro-antes-agregacao"]
  ].map(([id, stepKey, title, practiceSlug], index) => ({
    id,
    path_id: "path-sql",
    step_key: stepKey,
    title,
    status: "active",
    display_order: index + 1,
    metadata: { practice_slug: practiceSlug }
  }));
  const activities = steps.map((step, index) => ({
    activity_id: `activity-${index + 1}`,
    exercise_id: `exercise-${index + 1}`,
    dataset_id: `dataset-${index + 1}`,
    slug: step.metadata.practice_slug,
    status: "active"
  }));
  return { steps, activities };
}

function run() {
  const api = loadProgressPageApi();
  const { steps, activities } = createTrackFixture();
  const persistedRows = [
    { step_id: "step-1", status: "completed", progress_percent: 20 },
    { step_id: "step-2", status: "in_progress", progress_percent: 20 }
  ];
  const verifiedTrack = calculateTrackStatus({
    steps,
    activities,
    attempts: [{ activity_id: "activity-1", validation_status: "correct" }],
    progressRows: persistedRows
  });
  const nextStep = api.buildNextStep({
    learningProgress: persistedRows[1],
    path: { id: "path-sql", title: "SQL Essencial" },
    step: verifiedTrack.nextStep,
    latestSession: { attempt_id: "diagnostic-1" }
  });
  const card = api.renderNextStepCard(nextStep, "Plano de evolução ativo");

  assert.strictEqual(verifiedTrack.nextStep.id, "step-2");
  assert.strictEqual(nextStep.title, "Contagens e nulos");
  assert.strictEqual(
    nextStep.href,
    "praticas-sql.html?pratica=sql-essencial-count-nulos-distintos"
  );
  assert.match(card, />Contagens e nulos</);
  assert.match(card, /href="praticas-sql\.html\?pratica=sql-essencial-count-nulos-distintos"/);
  assert.doesNotMatch(card, />Filtros com WHERE</);

  const unavailableTrack = calculateTrackStatus({
    steps,
    activities: activities.map((activity) => (
      activity.slug === "sql-essencial-count-nulos-distintos"
        ? { ...activity, exercise_id: null, dataset_id: null }
        : activity
    )),
    attempts: [{ activity_id: "activity-1", validation_status: "correct" }],
    progressRows: persistedRows
  });
  const unavailableStep = api.buildNextStep({
    learningProgress: persistedRows[1],
    path: { id: "path-sql", title: "SQL Essencial" },
    unavailableNextStep: unavailableTrack.unavailableNextStep,
    latestSession: { attempt_id: "diagnostic-1" }
  });

  assert.strictEqual(unavailableTrack.nextStep, null);
  assert.strictEqual(unavailableStep.title, "Próxima prática em preparação");
  assert.strictEqual(unavailableStep.href, "index.html#trilhas");

  const completedStep = api.buildNextStep({
    learningProgress: { status: "completed", progress_percent: 100 },
    path: { id: "path-sql", title: "SQL Essencial" },
    latestSession: { attempt_id: "diagnostic-1" }
  });
  assert.strictEqual(completedStep.title, "Continue sua evolução");
  assert.strictEqual(completedStep.href, "index.html#trilhas");

  console.log("Progress next practice tests passed");
}

run();
