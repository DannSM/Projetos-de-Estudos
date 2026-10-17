const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const kpiContent = require(path.join(__dirname, "..", "src", "kpi-guided-content.js"));
const projectContent = require(path.join(__dirname, "..", "src", "project-01-content.js"));

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const serviceSource = read("src/guided-practice-service.js");
const studyPlanSource = read("src/study-plan-content.js");
const progressSource = read("src/progress-page.js");
const pageSource = read("src/guided-practice-page.js");
const html = read("pratica-guiada.html");
const componentsCss = read("styles/components.css");
const responsiveCss = read("styles/responsive.css");
const migration = read("supabase/migrations/20260622085556_guided_practice_attempts.sql");

const sandbox = { window: {}, console };
sandbox.window.window = sandbox.window;
vm.runInNewContext(serviceSource, sandbox, { filename: "guided-practice-service.js" });

const service = sandbox.window.guidedPracticeService;
assert.ok(service, "serviço deve ser exposto no window");
assert.strictEqual(service.DEFAULT_SLUG, "indicadores-meta-resultado");
assert.strictEqual(service.LOCAL_ACTIVITY.correctOption, "B");
assert.strictEqual(service.LOCAL_ACTIVITY.indicatorData.length, 4);
assert.strictEqual(service.validateAnswer(service.LOCAL_ACTIVITY, "A").isCorrect, false);
assert.strictEqual(service.validateAnswer(service.LOCAL_ACTIVITY, "B").isCorrect, true);
assert.strictEqual(service.validateAnswer(service.LOCAL_ACTIVITY, "B").scorePercent, 100);

const planSandbox = { window: {} };
planSandbox.window.window = planSandbox.window;
vm.runInNewContext(studyPlanSource, planSandbox, { filename: "study-plan-content.js" });
const indicatorPlan = planSandbox.window.studyPlanContent.getStudyPlan("Indicadores");
const statisticsPlan = planSandbox.window.studyPlanContent.getStudyPlan("Estatística");
assert.strictEqual(indicatorPlan.href, "pratica-guiada.html?atividade=indicadores-meta-resultado");
assert.strictEqual(indicatorPlan.ctaLabel, "Começar prática recomendada");
assert.strictEqual(statisticsPlan.href, "index.html#trilhas");

assert.match(html, /id="guidedPracticeMount"/);
assert.match(html, /src\/guided-practice-service\.js/);
assert.match(html, /src\/guided-practice-page\.js/);
assert.match(html, /style\.css\?v=20261017-kpi-refino/);
assert.match(html, /src\/kpi-guided-content\.js\?v=20261017-kpi-refino-gabarito/);
assert.match(html, /src\/guided-practice-page\.js\?v=20261017-kpi-refino-gabarito/);
assert.match(read("style.css"), /styles\/components\.css\?v=20261017-kpi-refino/);
assert.match(read("style.css"), /styles\/responsive\.css\?v=20261017-kpi-refino/);
assert.match(pageSource, /data-guided-practice-form/);
assert.match(pageSource, /Ver Meu Progresso/);
assert.match(pageSource, /Entrar para salvar/);

assert.match(studyPlanSource, /Começar prática: Meta e resultado/);
assert.match(studyPlanSource, /pratica-guiada\.html\?atividade=indicadores-meta-resultado/);
assert.match(progressSource, /practiceFormat === "guided_practice"/);
assert.match(progressSource, /Abrir prática/);
assert.match(componentsCss, /\.guided-practice-grid/);
assert.match(componentsCss, /\.guided-practice-page \.sr-only/);
assert.match(componentsCss, /\.guided-completion-card\.guided-completion-save-error/);
assert.match(componentsCss, /\.guided-next-card-pending/);
assert.match(componentsCss, /\.guided-pending-label/);
assert.match(componentsCss, /\.guided-option\.is-incorrect[^{]*\{[^}]*box-shadow:/s);
assert.match(responsiveCss, /@media \(max-width: 390px\)/);
assert.match(responsiveCss, /\.guided-metrics-grid \{ grid-template-columns: minmax\(0, 1fr\)/);
assert.match(responsiveCss, /\.guided-section-card,[\s\S]*width: 100%; max-width: 100%; min-width: 0;/);

assert.match(migration, /create table if not exists public\.user_guided_practice_attempts/);
assert.match(migration, /alter table public\.user_guided_practice_attempts enable row level security/);
assert.match(migration, /user_guided_practice_attempts_insert_own/);
assert.match(migration, /insert into public\.learning_activities/);
assert.match(migration, /where step_key = 'indicadores-01-meta-resultado'/);
assert.match(migration, /vw_guided_practice_activities_public/);
assert.doesNotMatch(migration, /alter table public\.(sql_practice_exercises|sql_query_runs|user_practice_attempts)/i);
assert.doesNotMatch(migration, /drop table/i);
assert.doesNotMatch(migration, /drop constraint/i);
assert.doesNotMatch(migration, /delete from/i);

function waitForPage() {
  return new Promise((resolve) => setImmediate(() => setImmediate(resolve)));
}

async function createPageHarness({ activity, authenticated = true, saveHandler }) {
  const listeners = {};
  const saveCalls = [];
  const mount = {
    innerHTML: "",
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    querySelector() {
      return { scrollIntoView() {} };
    }
  };
  const pageService = {
    DEFAULT_SLUG: activity.slug,
    getCheckpoints: service.getCheckpoints,
    validateCheckpoint: service.validateCheckpoint,
    validateSubmission: service.validateSubmission,
    async loadActivity() {
      return { ok: true, activity };
    },
    async getAuthenticatedUser() {
      return authenticated ? { id: "user-1" } : null;
    },
    async saveResponse(currentActivity, answers, startedAt, options) {
      const validation = service.validateSubmission(currentActivity, answers);
      const call = { validation, answers: { ...answers }, startedAt, options: { ...options } };
      saveCalls.push(call);
      return saveHandler({ call, callIndex: saveCalls.length - 1, validation });
    }
  };
  const pageWindow = {
    guidedPracticeService: pageService,
    location: { search: `?atividade=${activity.slug}` },
    localStorage: { getItem() { return null; }, setItem() {} }
  };
  pageWindow.window = pageWindow;
  vm.runInNewContext(pageSource, {
    window: pageWindow,
    document: { getElementById() { return mount; } },
    console,
    Date,
    Set,
    URLSearchParams
  }, { filename: "guided-practice-page.js" });
  await waitForPage();

  return {
    mount,
    saveCalls,
    async answer(option) {
      listeners.change({
        target: {
          value: option,
          matches(selector) { return selector === 'input[name="guidedPracticeAnswer"]'; }
        }
      });
      listeners.submit({
        target: { matches(selector) { return selector === "[data-guided-practice-form]"; } },
        preventDefault() {}
      });
      await waitForPage();
    },
    nextCheckpoint() {
      listeners.click({ target: { closest(selector) { return selector === "[data-next-checkpoint]" ? {} : null; } } });
    },
    async retrySave() {
      listeners.click({ target: { closest(selector) { return selector === "[data-retry-guided-save]" ? {} : null; } } });
      await waitForPage();
    }
  };
}

function skippedProgress(authenticated) {
  return { ok: false, skipped: true, authenticated };
}

async function runPageSaveRecoveryChecks() {
  const singleChoiceActivity = {
    ...service.LOCAL_ACTIVITY,
    id: "single-choice-activity",
    nextAction: { title: "Próxima etapa single", description: "Continue.", label: "NEXT_SINGLE", href: "next-single.html" }
  };
  let singleFinalCall = 0;
  const single = await createPageHarness({
    activity: singleChoiceActivity,
    saveHandler({ validation }) {
      singleFinalCall += 1;
      if (singleFinalCall === 1) {
        return { validation, attempt: { ok: true, authenticated: true }, progress: { ok: false, authenticated: true, error: { message: "progress failed" } } };
      }
      return { validation, attempt: { ok: true, authenticated: true, reused: true }, progress: { ok: true, authenticated: true, progressPercent: 25 } };
    }
  });
  await single.answer("B");
  assert.match(single.mount.innerHTML, /Respostas validadas/);
  assert.match(single.mount.innerHTML, /guided-completion-save-error/);
  assert.match(single.mount.innerHTML, /Tentar salvar novamente/);
  assert.match(single.mount.innerHTML, /Próximo passo bloqueado/);
  assert.doesNotMatch(single.mount.innerHTML, /NEXT_SINGLE/);
  await single.retrySave();
  assert.strictEqual(single.saveCalls[1].options.attemptAlreadySaved, true);
  assert.match(single.mount.innerHTML, /Tentativa válida salva/);
  assert.match(single.mount.innerHTML, /NEXT_SINGLE/);
  assert.doesNotMatch(single.mount.innerHTML, /Tentar salvar novamente/);

  const sequenceActivity = {
    ...kpiContent.GUIDED_ACTIVITIES["indicadores-definicao-consistente"],
    id: "checkpoint-sequence-activity",
    nextAction: { title: "Próxima etapa sequence", description: "Continue.", label: "NEXT_SEQUENCE", href: "next-sequence.html" }
  };
  let finalSequenceCall = 0;
  const sequence = await createPageHarness({
    activity: sequenceActivity,
    saveHandler({ validation }) {
      if (!validation.isCorrect) {
        return { validation, attempt: { ok: true, authenticated: true }, progress: skippedProgress(true) };
      }
      finalSequenceCall += 1;
      if (finalSequenceCall === 1) {
        return { validation, attempt: { ok: false, authenticated: true, error: { message: "attempt failed" } }, progress: skippedProgress(true) };
      }
      return { validation, attempt: { ok: true, authenticated: true }, progress: { ok: true, authenticated: true, progressPercent: 50 } };
    }
  });
  for (let index = 0; index < sequenceActivity.checkpoints.length; index += 1) {
    await sequence.answer(sequenceActivity.checkpoints[index].correctOption);
    if (index < sequenceActivity.checkpoints.length - 1) sequence.nextCheckpoint();
  }
  assert.match(sequence.mount.innerHTML, /tentativa não pôde ser salva/i);
  assert.match(sequence.mount.innerHTML, /Tentar salvar novamente/);
  assert.doesNotMatch(sequence.mount.innerHTML, /NEXT_SEQUENCE/);
  await sequence.retrySave();
  assert.strictEqual(sequence.saveCalls.at(-1).options.attemptAlreadySaved, false);
  assert.match(sequence.mount.innerHTML, /NEXT_SEQUENCE/);

  const anonymousActivity = {
    ...service.LOCAL_ACTIVITY,
    id: "anonymous-activity",
    nextAction: { title: "Próxima etapa local", description: "Continue.", label: "NEXT_ANONYMOUS", href: "next-anonymous.html" }
  };
  const anonymous = await createPageHarness({
    activity: anonymousActivity,
    authenticated: false,
    saveHandler({ validation }) {
      return { validation, attempt: { ok: false, skipped: true, authenticated: false }, progress: skippedProgress(false) };
    }
  });
  await anonymous.answer("B");
  assert.match(anonymous.mount.innerHTML, /Concluída localmente/);
  assert.match(anonymous.mount.innerHTML, /Entrar para salvar/);
  assert.match(anonymous.mount.innerHTML, /NEXT_ANONYMOUS/);
}

async function runFeedbackAndPendingStateChecks() {
  const sequenceActivity = {
    ...kpiContent.GUIDED_ACTIVITIES["indicadores-definicao-consistente"],
    id: "feedback-sequence-activity"
  };
  const sequence = await createPageHarness({
    activity: sequenceActivity,
    saveHandler({ validation }) {
      return {
        validation,
        attempt: { ok: true, authenticated: true },
        progress: skippedProgress(true)
      };
    }
  });

  assert.match(sequence.mount.innerHTML, /guided-next-card-pending/);
  assert.match(sequence.mount.innerHTML, /Continuidade ainda bloqueada/);
  assert.match(sequence.mount.innerHTML, /Consultar Meu Progresso/);
  assert.doesNotMatch(sequence.mount.innerHTML, /Ver Meu Progresso/);
  assert.doesNotMatch(sequence.mount.innerHTML, /class="submit-button" href="meu-progresso\.html"/);
  assert.doesNotMatch(sequence.mount.innerHTML, /<label[^>]*>Anotação pessoal<\/label>/);
  assert.match(sequence.mount.innerHTML, /textarea[^>]*aria-label="Anotação pessoal"/);
  assert.match(sequence.mount.innerHTML, /Duas equipes, critérios distintos/);
  assert.match(sequence.mount.innerHTML, /Use os volumes apresentados para decidir/);
  assert.doesNotMatch(sequence.mount.innerHTML, /Ponto de atenção:/);

  await sequence.answer("D");
  assert.match(sequence.mount.innerHTML, /guided-option is-selected is-incorrect/);
  assert.doesNotMatch(sequence.mount.innerHTML, /guided-option[^\"]*is-correct/);
  assert.match(sequence.mount.innerHTML, /Volte à definição do indicador/);
  assert.doesNotMatch(sequence.mount.innerHTML, /Ponto de atenção:/);
  assert.doesNotMatch(sequence.mount.innerHTML, /A taxa de satisfação usa avaliações positivas como numerador/);
  assert.match(sequence.mount.innerHTML, /Conferir esta decisão/);

  await sequence.answer("A");
  assert.match(sequence.mount.innerHTML, /guided-option is-selected is-correct/);
  assert.match(sequence.mount.innerHTML, /A taxa de satisfação usa avaliações positivas como numerador/);
  assert.match(sequence.mount.innerHTML, /Ponto de atenção:/);
  assert.match(sequence.mount.innerHTML, /O denominador deve representar quem realmente podia contribuir/);
  assert.match(sequence.mount.innerHTML, /data-next-checkpoint/);

  const original = await createPageHarness({
    activity: { ...service.LOCAL_ACTIVITY, id: "feedback-single-choice" },
    saveHandler({ validation }) {
      return {
        validation,
        attempt: { ok: true, authenticated: true },
        progress: skippedProgress(true)
      };
    }
  });
  await original.answer("A");
  assert.match(original.mount.innerHTML, /guided-option is-selected is-incorrect/);
  assert.doesNotMatch(original.mount.innerHTML, /guided-option[^\"]*is-correct/);
  assert.match(original.mount.innerHTML, /Ponto de atenção:/);
  await original.answer("B");
  assert.match(original.mount.innerHTML, /guided-option is-selected is-correct/);

  const projectActivity = {
    ...projectContent.GUIDED_ACTIVITIES["projeto-01-insight-recomendacao"],
    id: "feedback-project-01"
  };
  const project = await createPageHarness({
    activity: projectActivity,
    saveHandler({ validation }) {
      return {
        validation,
        attempt: { ok: true, authenticated: true },
        progress: skippedProgress(true)
      };
    }
  });
  await project.answer("A");
  assert.match(project.mount.innerHTML, /guided-option is-selected is-incorrect/);
  assert.match(project.mount.innerHTML, /Ponto de atenção:/);
}

(async () => {
  await runFeedbackAndPendingStateChecks();
  await runPageSaveRecoveryChecks();
  console.log("Guided practice MVP checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
