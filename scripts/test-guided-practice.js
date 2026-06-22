const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

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
assert.match(pageSource, /data-guided-practice-form/);
assert.match(pageSource, /Ver Meu Progresso/);
assert.match(pageSource, /Entrar para salvar/);

assert.match(studyPlanSource, /Começar prática: Meta e resultado/);
assert.match(studyPlanSource, /pratica-guiada\.html\?atividade=indicadores-meta-resultado/);
assert.match(progressSource, /practiceFormat === "guided_practice"/);
assert.match(progressSource, /Abrir prática/);
assert.match(componentsCss, /\.guided-practice-grid/);
assert.match(responsiveCss, /@media \(max-width: 390px\)/);
assert.match(responsiveCss, /\.guided-metrics-grid \{ grid-template-columns: minmax\(0, 1fr\)/);

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

console.log("Guided practice MVP checks passed.");
