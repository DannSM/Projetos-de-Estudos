// Local-only V2 bank homologation. Never pass the private JSON to CI or a remote database.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const catalog = require('../../src/diagnostic-v2-catalog.js');

const root = path.resolve(__dirname, '../..');
const expectedHash = '17f8bab8111faf3a34ab3e8866ac4768172b99b86ba956cdaa53aec3534d92bc';
const expectedInput = path.join(root, 'docs/planejamento-local/diagnostico_v2_80_questoes.json');
const expectedEditorialVersion = 'v2-candidata-final-tecnica-20261024';
const output = path.join(root, 'docs/planejamento-local/MARCO5_HOMOLOGACAO_PRIVADA.json');
const areas = ['SQL', 'Estatística', 'Excel', 'Lógica de dados', 'Indicadores'];
const levels = ['Básico', 'Intermediário', 'Avançado'];
const roles = ['prioritario', 'reserva', 'fora_do_pool_inicial'];
const expectedRoleCounts = { prioritario: 25, reserva: 15, fora_do_pool_inicial: 40 };
const migrations = [
  'tests/diagnostic-v2-homologation/fixtures/v1-dependencies.sql',
  'supabase/migrations/20260622004102_claim_anonymous_diagnostic.sql',
  'supabase/migrations/20261023023120_diagnostico_v2_security_and_model.sql',
  'supabase/migrations/20261023023220_diagnostico_v2_private_engine.sql'
];

function fail(message) { throw new Error(message); }
function cleanString(value) { return typeof value === 'string' ? value.trim() : ''; }
function readInput() {
  if (process.argv.slice(2).some(arg => arg !== '--isolated-pglite'))
    fail('Only --isolated-pglite is supported; remote destinations are forbidden');
  if (!process.argv.includes('--isolated-pglite'))
    fail('Explicit --isolated-pglite confirmation is required');
  const resolved = fs.realpathSync(expectedInput);
  if (resolved !== fs.realpathSync(path.dirname(expectedInput)) + path.sep + path.basename(expectedInput))
    fail('Unexpected private input path');
  const bytes = fs.readFileSync(resolved);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (hash !== expectedHash) fail('Private source hash differs from the confirmed version');
  return { data: JSON.parse(bytes.toString('utf8')), hash };
}

function validate(data) {
  assert.equal(data?.items?.length, 80, 'Expected exactly 80 candidates');
  assert.equal(data?.meta?.aprovacao_humana, 'PENDENTE');
  const keys = new Set(), ids = new Set();
  const counts = Object.fromEntries(roles.map(role => [role, 0]));
  const issues = [];
  for (const item of data.items) {
    const key = cleanString(item.item_key);
    if (!/^diagnostico_v1_\d{3}$/.test(key) || keys.has(key)) fail('Duplicate or invalid item key');
    keys.add(key);
    if (item.id !== key || item.versao_editorial !== expectedEditorialVersion)
      fail(`Item traceability/version invalid: ${key}`);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id_original))
      fail(`Original UUID invalid: ${key}`);
    if (ids.has(item.id_original)) fail(`Duplicate original ID: ${key}`);
    ids.add(item.id_original);
    if (!areas.includes(item.area) || !levels.includes(item.nivel_proposto)) fail(`Area/level invalid: ${key}`);
    if (!catalog.hasSkillName(item.competencia_proposta)) issues.push({ key, type: 'skill_catalog_missing' });
    if (!cleanString(item.enunciado_v2) || !cleanString(item.explicacao_completa))
      fail(`Stem/explanation missing: ${key}`);
    if (item.contexto_v2 != null && typeof item.contexto_v2 !== 'string') fail(`Context invalid: ${key}`);
    if (item.codigo_v2 != null && typeof item.codigo_v2 !== 'string') fail(`Code invalid: ${key}`);
    if (!item.alternativas || typeof item.alternativas !== 'object' || Array.isArray(item.alternativas))
      fail(`Options invalid: ${key}`);
    const options = ['A', 'B', 'C', 'D'].map(letter => cleanString(item.alternativas[letter]));
    if (options.some(value => !value) || new Set(options.map(value => value.toLocaleLowerCase('pt-BR'))).size !== 4)
      fail(`Four distinct options required: ${key}`);
    if (!['A', 'B', 'C', 'D'].includes(item.gabarito)) fail(`Exactly one answer required: ${key}`);
    if (!roles.includes(item.pool_candidato)) fail(`Pool role invalid: ${key}`);
    counts[item.pool_candidato]++;
    if (item.status_aprovacao !== 'PENDENTE_REVISAO_HUMANA' || item.aprovacao_humana !== 'PENDENTE')
      fail(`Unexpected approval status: ${key}`);
    if (!Number.isInteger(item.dificuldade_editorial_1a5) || item.dificuldade_editorial_1a5 < 1 || item.dificuldade_editorial_1a5 > 5)
      fail(`Editorial difficulty invalid: ${key}`);
    if (item.duracao_estimada_segundos == null)
      issues.push({ key, type: 'estimated_duration_missing' });
    else if (!Number.isInteger(item.duracao_estimada_segundos) || item.duracao_estimada_segundos <= 0)
      fail(`Estimated duration invalid: ${key}`);
    if (!cleanString(item.validacao_tecnica)) issues.push({ key, type: 'technical_review_missing' });
    if (['diagnostico_v1_002', 'diagnostico_v1_050', 'diagnostico_v1_078'].includes(key))
      issues.push({ key, type: 'double_human_review_required' });
  }
  for (const role of roles) assert.equal(counts[role], expectedRoleCounts[role]);
  for (let n = 1; n <= 80; n++) assert.ok(keys.has(`diagnostico_v1_${String(n).padStart(3,'0')}`));
  for (const area of areas) {
    const areaItems = data.items.filter(item => item.area === area);
    assert.equal(areaItems.length, 16);
    for (const [role, expected] of [['prioritario',[2,2,1]],['reserva',[1,1,1]],
      ['fora_do_pool_inicial',[2,4,2]]])
      levels.forEach((level,index) => assert.equal(areaItems.filter(item =>
        item.pool_candidato === role && item.nivel_proposto === level).length,expected[index]));
  }
  return { counts, issues };
}

function transform(item) {
  return {
    // This confirmed editorial snapshot is version 1 in the disposable bank.
    // A revised snapshot needs a new source hash and an explicit version bump.
    item_key: item.item_key, version: 1, area: item.area, level: item.nivel_proposto,
    skill_code: item.competencia_proposta, question_type: 'multiple_choice',
    stem: item.enunciado_v2, context: item.contexto_v2 || null, code: item.codigo_v2 || null,
    options: ['A', 'B', 'C', 'D'].map(id => ({ id, text: item.alternativas[id] })),
    correct_option_id: item.gabarito, explanation: item.explicacao_completa,
    editorial_difficulty: item.dificuldade_editorial_1a5,
    estimated_seconds: item.duracao_estimada_segundos
  };
}

async function makeDb() {
  // PGlite is an in-process, memory-only Postgres. No connection URL exists.
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;`);
  for (const relative of migrations) await db.exec(fs.readFileSync(path.join(root, relative), 'utf8'));
  return db;
}

async function loadPool(db, items) {
  for (const source of items) {
    const x = transform(source);
    await db.query(`insert into private.diagnostic_v2_item_versions
      (item_key,version,area,level,skill_code,question_type,stem,context,code,
       options,correct_option_id,explanation,editorial_difficulty,estimated_seconds,published_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,now())
      on conflict (item_key,version) do nothing`, [x.item_key,x.version,x.area,x.level,
        x.skill_code,x.question_type,x.stem,x.context,x.code,JSON.stringify(x.options),
        x.correct_option_id,x.explanation,x.editorial_difficulty,x.estimated_seconds]);
    const row = (await db.query(`select area,level,skill_code,question_type,stem,context,code,
      options,correct_option_id,explanation,editorial_difficulty,estimated_seconds
      from private.diagnostic_v2_item_versions where item_key=$1 and version=$2`,
      [x.item_key,x.version])).rows[0];
    for (const field of ['area','level','skill_code','question_type','stem','context','code',
      'correct_option_id','explanation','editorial_difficulty','estimated_seconds'])
      if (row[field] !== x[field]) fail(`Existing item version differs: ${x.item_key}`);
    if (JSON.stringify(row.options) !== JSON.stringify(x.options))
      fail(`Existing options differ: ${x.item_key}`);
  }
  const count = (await db.query('select count(*)::int n from private.diagnostic_v2_item_versions')).rows[0].n;
  assert.equal(count, items.length, 'Import was not idempotent');
  return count;
}

function chooseCorrect(profile, item, position) {
  switch (profile) {
    case 'A': return false;
    case 'B': return item.level === 'Básico';
    case 'C': return item.level !== 'Avançado';
    case 'D': return item.area === 'SQL';
    case 'E': return item.area === 'Excel';
    case 'F': return item.area === 'Lógica de dados';
    case 'G': return true;
    case 'H': return position % 2 === 0;
    case 'I': return false;
    case 'J': return item.level !== 'Avançado';
    default: fail('Unknown profile');
  }
}

async function play(db, profile) {
  const key = crypto.randomUUID();
  const start = (await db.query(`select public.diagnostic_v2_start('desktop',$1::uuid) result`,[key])).rows[0].result;
  assert.equal(start.status, 'started');
  const shown = [], answers = [];
  let resumed = false, finished;
  for (let i = 0; i <= 25; i++) {
    const next = (await db.query('select public.diagnostic_v2_next($1) result',[start.attempt_token])).rows[0].result;
    if (next.status !== 'active') { finished = next; break; }
    assert.ok(i < 25, 'More than 25 questions');
    assert.equal(JSON.stringify(next).includes('correct_option_id'), false);
    assert.equal(JSON.stringify(next).includes('explanation'), false);
    if (profile === 'J' && i === 3) {
      const same = (await db.query('select public.diagnostic_v2_next($1) result',[start.attempt_token])).rows[0].result;
      assert.equal(same.attempt_item_id, next.attempt_item_id);
      assert.deepEqual(same.options, next.options);
      resumed = true;
    }
    const internal = (await db.query(`select iv.item_key,iv.correct_option_id,ai.position
      from private.diagnostic_v2_attempt_items ai
      join private.diagnostic_v2_item_versions iv on iv.id=ai.item_version_id
      where ai.id=$1::uuid`,[next.attempt_item_id])).rows[0];
    const correct = chooseCorrect(profile, next, internal.position);
    const selected = correct ? internal.correct_option_id :
      ['A','B','C','D'].find(id => id !== internal.correct_option_id);
    const accepted = (await db.query(`select public.diagnostic_v2_submit($1,$2::uuid,$3,$4::uuid) result`,
      [start.attempt_token,next.attempt_item_id,selected,crypto.randomUUID()])).rows[0].result;
    assert.equal(accepted.status, 'accepted');
    shown.push({ key: internal.item_key, area: next.area, level: next.level,
      skill: next.skill_code, stage: next.stage, position: next.position });
    answers.push({ area: next.area, level: next.level, skill: next.skill_code, correct });
  }
  assert.ok(finished && ['completed','insufficient_pool'].includes(finished.status));
  assert.equal(new Set(shown.map(x => x.key)).size, shown.length, 'Question repeated in attempt');
  assert.equal(finished.result.areas.length, 5);
  for (const area of finished.result.areas) {
    const observed = answers.filter(answer => answer.area === area.area);
    assert.equal(area.total, observed.length);
    assert.equal(area.correct, observed.filter(answer => answer.correct).length);
    assert.equal(area.distinct_skills, new Set(observed.map(answer => answer.skill)).size);
    assert.equal(area.evidence_sufficient, observed.length >= 2 && area.distinct_skills >= 2);
    const basicHits = new Set(observed.filter(answer => answer.level === 'Básico' && answer.correct)
      .map(answer => answer.skill)).size;
    const basicWrong = observed.filter(answer => answer.level === 'Básico' && !answer.correct).length;
    const intermediateHits = new Set(observed.filter(answer => answer.level === 'Intermediário' && answer.correct)
      .map(answer => answer.skill)).size;
    const advancedHits = new Set(observed.filter(answer => answer.level === 'Avançado' && answer.correct)
      .map(answer => answer.skill)).size;
    const level = basicHits >= 2 && intermediateHits >= 2 && advancedHits >= 2
      ? 'Avançado provisório' : basicHits >= 2 && intermediateHits >= 2
        ? 'Intermediário demonstrado' : basicHits >= 2
          ? 'Fundamentos demonstrados' : basicWrong >= 2
            ? 'Fundamentos a revisar' : 'Indeterminado';
    assert.equal(area.demonstrated_level, level);
    const recommendation = level === 'Indeterminado' ? 'collect_more_evidence'
      : basicHits < 2 ? 'review_fundamentals'
        : intermediateHits < 2 ? 'study_intermediate' : 'deepen_advanced';
    assert.equal(area.recommendation_code, recommendation);
    assert.equal(area.priority, ({ review_fundamentals: 1, study_intermediate: 2,
      collect_more_evidence: 3, deepen_advanced: 4 })[recommendation]);
    for (const skill of area.skills) {
      const answersForSkill = observed.filter(answer => answer.skill === skill.skill_code);
      assert.equal(skill.total, answersForSkill.length);
      assert.equal(skill.correct, answersForSkill.filter(answer => answer.correct).length);
      assert.equal(skill.evidence_sufficient, answersForSkill.length >= 2);
    }
  }
  return { profile, status: finished.status, question_count: shown.length, resumed,
    items: shown, areas: finished.result.areas.map(area => ({ area: area.area, total: area.total,
      correct: area.correct, demonstrated_level: area.demonstrated_level,
      evidence_sufficient: area.evidence_sufficient, distinct_skills: area.distinct_skills,
      recommendation_code: area.recommendation_code, priority: area.priority })) };
}

async function scenario(label, items) {
  const db = await makeDb();
  try {
    const imported = await loadPool(db, items);
    await loadPool(db, items); // Same content/version must be idempotent.
    await db.exec(`update private.diagnostic_v2_blueprints set is_active=true where version='v2-pilot-1'`);
    const profiles = [];
    for (const profile of 'ABCDEFGHJ') profiles.push(await play(db, profile));
    const normalGapCount = (await db.query(`select count(*)::int n
      from private.diagnostic_v2_events where event_type='pool_gap'`)).rows[0].n;
    // Profile I is a separate fault-injection subcase: leave only one SQL basic item.
    const sqlBasics = items.filter(x => x.area === 'SQL' && x.nivel_proposto === 'Básico');
    for (const source of sqlBasics.slice(1)) await db.query(
      `update private.diagnostic_v2_item_versions set retired_at=now() where item_key=$1`,
      [source.item_key]);
    profiles.push(await play(db, 'I'));
    const gaps = (await db.query(`select metadata from private.diagnostic_v2_events
      where event_type='pool_gap'`)).rows.map(row => row.metadata);
    const frequency = (await db.query(`select iv.item_key,count(*)::int presented
      from private.diagnostic_v2_attempt_items ai
      join private.diagnostic_v2_item_versions iv on iv.id=ai.item_version_id
      group by iv.item_key order by iv.item_key`)).rows;
    return { scenario: label, imported, profiles, pool_gaps: gaps,
      pool_gaps_normal_profiles: normalGapCount,
      pool_gaps_fault_injection: gaps.length - normalGapCount, frequency,
      profile_I_fault_injection: { sql_basic_retired: sqlBasics.length - 1,
        purpose: 'insufficient mapping evidence' },
      estimated_seconds: Object.fromEntries(profiles.map(result => [result.profile,
        result.items.reduce((sum,shown) => sum +
          (items.find(x => x.item_key === shown.key).duracao_estimada_segundos || 0),0)])),
      missing_duration_by_profile: Object.fromEntries(profiles.map(result => [result.profile,
        result.items.filter(shown => items.find(x => x.item_key === shown.key).duracao_estimada_segundos == null).length])) };
  } finally { await db.close(); }
}

async function main() {
  const {data,hash} = readInput();
  const validation = validate(data);
  const priority = data.items.filter(item => item.pool_candidato === 'prioritario');
  const withReserve = data.items.filter(item => item.pool_candidato !== 'fora_do_pool_inicial');
  const allDb = await makeDb();
  let schemaImportCount;
  try {
    schemaImportCount = await loadPool(allDb, data.items);
    await loadPool(allDb, data.items);
  } finally { await allDb.close(); }
  const result = { source_sha256: hash, environment: 'isolated in-memory PGlite',
    editorial_approval: 'PENDING', validation, schema_import_all_80: schemaImportCount,
    scenarios: [await scenario('priority_25',priority), await scenario('priority_and_reserve_40',withReserve)] };
  fs.writeFileSync(output, JSON.stringify(result,null,2));
  console.log('Private bank check completed in isolated in-memory PGlite; metadata report saved locally.');
  console.log(`Candidates: ${data.items.length}; isolated imports: 80 for schema, 25 and 40 for scenarios; profiles: ${result.scenarios.map(x=>x.profiles.length).join(' and ')}.`);
}
main().catch(error => {
  try {
    fs.writeFileSync(path.join(root, 'docs/planejamento-local/MARCO5_ERRO_PRIVADO.txt'),
      String(error.stack || error));
  } catch { /* The public console must remain sanitized even if local diagnostics fail. */ }
  console.error('Private bank check failed; inspect the local ignored diagnostic file.');
  process.exitCode=1;
});
