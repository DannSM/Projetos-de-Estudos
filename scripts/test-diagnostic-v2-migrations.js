const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, 'supabase/migrations', name), 'utf8');
const securitySql = read('20261023023120_diagnostico_v2_security_and_model.sql');
const engineSql = read('20261023023220_diagnostico_v2_private_engine.sql');
const userA = '11111111-1111-4111-8111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';

async function rpc(db, name, params = []) {
  const placeholders = params.map((_, index) => `$${index + 1}`).join(',');
  return (await db.query(`select public.${name}(${placeholders}) value`, params)).rows[0].value;
}

async function play(db, key, shouldAnswer, { checkResume = false } = {}) {
  const started = await rpc(db, 'diagnostic_v2_start', ['desktop', key]);
  assert.equal(started.status, 'started');
  const shown = [];
  for (let index = 0; index < 25; index++) {
    const item = await rpc(db, 'diagnostic_v2_next', [started.attempt_token]);
    if (item.status !== 'active') break;
    if (checkResume && index === 0) {
      assert.deepEqual(await rpc(db, 'diagnostic_v2_next', [started.attempt_token]), item);
      assert.equal((await rpc(db, 'diagnostic_v2_result', [started.attempt_token])).status, 'active');
    }
    shown.push(item);
    const option = shouldAnswer(item, index) ? 'a' : 'b';
    const answerKey = `44444444-4444-4444-8444-${String(index + 1).padStart(12,'0')}`;
    await rpc(db, 'diagnostic_v2_submit', [started.attempt_token,
      item.attempt_item_id, option, answerKey]);
    if (checkResume && index === 0) {
      assert.equal((await rpc(db, 'diagnostic_v2_next', [started.attempt_token])).position > item.position, true);
    }
  }
  const finished = await rpc(db, 'diagnostic_v2_next', [started.attempt_token]);
  assert.ok(['completed', 'insufficient_pool'].includes(finished.status));
  if (shown.length) {
    const last = shown.at(-1);
    const keyOfLast = `44444444-4444-4444-8444-${String(shown.length).padStart(12,'0')}`;
    const option = shouldAnswer(last, shown.length - 1) ? 'a' : 'b';
    assert.equal((await rpc(db, 'diagnostic_v2_submit', [started.attempt_token,
      last.attempt_item_id, option, keyOfLast])).idempotent, true);
    await assert.rejects(rpc(db, 'diagnostic_v2_submit', [started.attempt_token,
      last.attempt_item_id, option === 'a' ? 'b' : 'a', keyOfLast]), /item already answered/);
  }
  return { started, shown, finished, areas: Object.fromEntries(
    finished.result.areas.map((area) => [area.area, area])) };
}

async function main() {
  const db = new PGlite();
  try {
    await assert.rejects(db.query(`select (extract(epoch from interval '30 days')*1000)::integer`),
      /out of range/);
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema private;
      create table auth.users (id uuid primary key);
      insert into auth.users values ('${userA}'), ('${userB}');
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table public.question_bank (id integer);
      create table public.diagnostic_funnel_events (id integer);
      create table public.diagnostic_recommendations (id integer);
      grant all on public.question_bank, public.diagnostic_funnel_events,
        public.diagnostic_recommendations to anon, authenticated;
      create function public.handle_new_auth_user_profile() returns trigger
        language plpgsql as $$ begin return new; end $$;
      create function public.set_updated_at() returns trigger
        language plpgsql as $$ begin return new; end $$;
      create function private.claim_anonymous_diagnostic(text,text) returns boolean
        language sql as $$ select true $$;
      grant usage on schema private to authenticated;
      grant execute on function private.claim_anonymous_diagnostic(text,text) to authenticated;
    `);
    await db.exec(securitySql);
    await db.exec(engineSql);
    const grants = (await db.query(`select
      has_table_privilege('anon','public.question_bank','SELECT') q_select,
      has_table_privilege('anon','public.question_bank','INSERT') q_insert,
      has_table_privilege('anon','public.diagnostic_funnel_events','INSERT') event_insert,
      has_table_privilege('anon','public.diagnostic_funnel_events','TRUNCATE') event_truncate,
      has_function_privilege('authenticated','private.claim_anonymous_diagnostic(text,text)','EXECUTE') old_claim,
      has_function_privilege('anon','private.diagnostic_v2_finish(uuid)','EXECUTE') private_finish,
      has_function_privilege('anon','public.diagnostic_v2_start(text,uuid)','EXECUTE') public_start,
      has_function_privilege('anon','public.handle_new_auth_user_profile()','EXECUTE') auth_trigger`)).rows[0];
    assert.deepEqual(grants, {
      q_select: true, q_insert: false, event_insert: true, event_truncate: false,
      old_claim: true, private_finish: false, public_start: true, auth_trigger: false
    });

    await assert.rejects(db.query(`select public.diagnostic_v2_start('desktop',gen_random_uuid())`),
      /diagnostic v2 unavailable/);
    const areas = ['SQL', 'Estatística', 'Excel', 'Lógica de dados', 'Indicadores'];
    for (const area of areas) {
      for (const level of ['Básico', 'Intermediário', 'Avançado']) {
        for (let i = 1; i <= 4; i++) {
          await db.query(`insert into private.diagnostic_v2_item_versions
            (item_key,version,area,level,skill_code,question_type,stem,options,correct_option_id,published_at)
            values ($1,1,$2,$3,$4,'multiple_choice',$5,$6::jsonb,'a',now())`, [
            `${area}-${level}-${i}`, area, level, `${area}-${level}-${i}`,
            `Pergunta de teste ${i}`, JSON.stringify([
              {id:'a',text:'A'}, {id:'b',text:'B'}, {id:'c',text:'C'}, {id:'d',text:'D'}
            ])
          ]);
        }
      }
    }
    await assert.rejects(db.query(`update private.diagnostic_v2_item_versions
      set stem='alterada' where item_key='SQL-Básico-1'`), /published item versions are immutable/);
    await assert.rejects(db.query(`insert into private.diagnostic_v2_item_versions
      (item_key,version,area,level,skill_code,question_type,stem,options,correct_option_id)
      values ('bad-options',1,'SQL','Básico','bad','multiple_choice','Invalida',
        '[{"id":"a","text":"A"},{"id":"a","text":"B"},
          {"id":"c","text":"C"},{"id":"d","text":"D"}]'::jsonb,'a')`),
    /invalid option IDs/);
    const editorial = (await db.query(`insert into private.diagnostic_v2_item_versions
      (item_key,version,area,level,skill_code,question_type,stem,options,correct_option_id)
      values ('publication-probe',1,'SQL','Básico','publication-probe',
        'multiple_choice','Publicação de teste',
        '[{"id":"a","text":"A"},{"id":"b","text":"B"},
          {"id":"c","text":"C"},{"id":"d","text":"D"}]'::jsonb,'a')
      returning id`)).rows[0].id;
    await db.query(`update private.diagnostic_v2_item_versions set published_at=now()
      where id=$1`, [editorial]);
    await db.query(`update private.diagnostic_v2_item_versions set retired_at=now()
      where id=$1`, [editorial]);
    await assert.rejects(db.query(`delete from private.diagnostic_v2_item_versions
      where id=$1`, [editorial]), /published item versions are immutable/);
    await db.exec(`update private.diagnostic_v2_blueprints set is_active=true;
      grant usage on schema auth to anon, authenticated;
      grant select on auth.users to authenticated;
      grant usage on schema public to anon, authenticated;`);
    await db.exec('set role anon');
    await assert.rejects(db.query('select correct_option_id from private.diagnostic_v2_item_versions'),
      /permission denied/);
    const startKey = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const start = (await db.query(`select public.diagnostic_v2_start('desktop',$1) value`,
      [startKey])).rows[0].value;
    const repeatedStart = (await db.query(`select public.diagnostic_v2_start('desktop',$1) value`,
      [startKey])).rows[0].value;
    assert.deepEqual(repeatedStart, {status:'already_started',attempt_id:start.attempt_id});
    assert.equal(start.attempt_token.length, 64);
    assert.equal(start.claim_token.length, 64);
    let count = 0;
    let finished;
    const optionOrders = new Set();
    while (count < 25) {
      const next = (await db.query(`select public.diagnostic_v2_next($1) value`, [start.attempt_token])).rows[0].value;
      if (next.status !== 'active') { finished = next; break; }
      assert.equal(next.options.length, 4);
      assert.equal(new Set(next.options.map((option) => option.id)).size, 4);
      optionOrders.add(next.options.map((option) => option.id).join(''));
      assert.equal('correct_option_id' in next, false);
      assert.equal('explanation' in next, false);
      if (count === 0) {
        await assert.rejects(db.query(`select public.diagnostic_v2_submit($1,$2,$3,$4)`,
          [start.attempt_token, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a',
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']), /item not presented/);
        await assert.rejects(db.query(`select public.diagnostic_v2_submit($1,$2,$3,$4)`,
          [start.attempt_token, next.attempt_item_id, 'forged',
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']), /option not presented/);
      }
      const key = `33333333-3333-4333-8333-${String(count + 1).padStart(12,'0')}`;
      const accepted = (await db.query(`select public.diagnostic_v2_submit($1,$2,$3,$4) value`,
        [start.attempt_token, next.attempt_item_id, 'a', key])).rows[0].value;
      assert.equal(accepted.status, 'accepted');
      const duplicate = (await db.query(`select public.diagnostic_v2_submit($1,$2,$3,$4) value`,
        [start.attempt_token, next.attempt_item_id, 'a', key])).rows[0].value;
      assert.equal(duplicate.idempotent, true);
      if (count === 0) await assert.rejects(db.query(
        `select public.diagnostic_v2_submit($1,$2,$3,$4)`,
        [start.attempt_token, next.attempt_item_id, 'b', key]), /item already answered/);
      count++;
    }
    if (!finished) finished = (await db.query(`select public.diagnostic_v2_next($1) value`, [start.attempt_token])).rows[0].value;
    assert.equal(finished.status, 'completed');
    assert.ok(optionOrders.size > 1);
    assert.equal(finished.result.areas.length, 5);
    assert.equal(finished.result.blueprint_version, 'v2-pilot-1');
    assert.equal(finished.result.areas[0].skills.length > 0, true);
    assert.equal(finished.result.areas[0].recommendation_code, 'deepen_advanced');
    await assert.rejects(db.query('select * from private.diagnostic_v2_recommendations'),
      /permission denied/);
    await assert.rejects(db.query(`update private.diagnostic_v2_attempt_items
      set is_correct=true`), /permission denied/);
    assert.ok(count >= 20 && count <= 25);
    await assert.rejects(db.query(`select public.diagnostic_v2_next($1)`, ['x'.repeat(64)]),
      /attempt not found or forbidden/);
    await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${userA}'`);
    const claimed = (await db.query(`select public.diagnostic_v2_claim($1) value`, [start.claim_token])).rows[0].value;
    assert.equal(claimed.status, 'claimed');
    await db.exec(`set request.jwt.claim.sub = '${userB}'`);
    await assert.rejects(db.query(`select public.diagnostic_v2_result($1)`, [start.attempt_token]),
      /attempt not found or forbidden/);
    await assert.rejects(db.query(`select public.diagnostic_v2_claim($1)`, [start.claim_token]),
      /claim forbidden or expired/);
    await db.exec(`reset role; set request.jwt.claim.sub = ''`);

    const weak = await play(db, 'aaaaaaaa-aaaa-4aaa-8aaa-000000000001', () => false);
    assert.equal(weak.areas.SQL.demonstrated_level, 'Fundamentos a revisar');
    assert.equal(weak.areas['Estatística'].recommendation_code, 'review_fundamentals');
    const sqlStrong = await play(db, 'aaaaaaaa-aaaa-4aaa-8aaa-000000000002',
      (item) => item.area === 'SQL');
    assert.equal(sqlStrong.areas.SQL.demonstrated_level, 'Avançado provisório');
    assert.equal(sqlStrong.areas['Estatística'].demonstrated_level, 'Fundamentos a revisar');
    const indicatorsStrong = await play(db, 'aaaaaaaa-aaaa-4aaa-8aaa-000000000003',
      (item) => item.area === 'Indicadores');
    assert.equal(indicatorsStrong.areas.Excel.demonstrated_level, 'Fundamentos a revisar');
    assert.equal(indicatorsStrong.areas.Indicadores.demonstrated_level, 'Avançado provisório');
    const intermediate = await play(db, 'aaaaaaaa-aaaa-4aaa-8aaa-000000000004',
      (item) => item.level !== 'Avançado');
    assert.ok(intermediate.finished.result.areas.every(
      (area) => area.demonstrated_level === 'Intermediário demonstrado'));
    const partialAdvanced = await play(db, 'aaaaaaaa-aaaa-4aaa-8aaa-000000000005',
      (item) => item.level !== 'Avançado' || item.area === 'SQL');
    assert.equal(partialAdvanced.areas.SQL.demonstrated_level, 'Avançado provisório');
    assert.ok(partialAdvanced.finished.result.areas.filter(
      (area) => area.demonstrated_level === 'Avançado provisório').length === 1);
    const lucky = await play(db, 'aaaaaaaa-aaaa-4aaa-8aaa-000000000006',
      (item) => item.area === 'SQL' && item.position === 1);
    assert.equal(lucky.areas.SQL.demonstrated_level, 'Fundamentos a revisar');
    assert.equal(lucky.areas.SQL.confidence_band === 'alta', false);
    const resumed = await play(db, 'aaaaaaaa-aaaa-4aaa-8aaa-000000000007',
      () => false, {checkResume:true});
    assert.equal(resumed.shown.length >= 15, true);
    assert.equal(resumed.finished.result.areas[0].score_percent, 0);

    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${userA}'`);
    const firstOwned = await play(db, 'aaaaaaaa-aaaa-4aaa-8aaa-000000000101', () => false);
    assert.equal(firstOwned.started.claim_token, null);
    const secondOwned = await play(db, 'aaaaaaaa-aaaa-4aaa-8aaa-000000000102', () => false);
    const longStarted = await rpc(db, 'diagnostic_v2_start',
      ['desktop', 'aaaaaaaa-aaaa-4aaa-8aaa-000000000103']);
    const longItem = await rpc(db, 'diagnostic_v2_next', [longStarted.attempt_token]);
    await db.exec('reset role');
    await db.query(`update private.diagnostic_v2_attempt_items
      set presented_at=now()-interval '30 days' where id=$1`, [longItem.attempt_item_id]);
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${userA}'`);
    await rpc(db, 'diagnostic_v2_submit', [longStarted.attempt_token,
      longItem.attempt_item_id, 'a', '55555555-5555-4555-8555-555555555555']);
    await db.exec('reset role');
    const longResponseMs = (await db.query(`select response_ms from
      private.diagnostic_v2_attempt_items where id=$1`, [longItem.attempt_item_id])).rows[0].response_ms;
    assert.ok(Number(longResponseMs) > 2_147_483_647);
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${userA}'`);
    await rpc(db, 'diagnostic_v2_start', ['desktop', 'aaaaaaaa-aaaa-4aaa-8aaa-000000000104']);
    await assert.rejects(rpc(db, 'diagnostic_v2_start',
      ['desktop', 'aaaaaaaa-aaaa-4aaa-8aaa-000000000105']), /diagnostic rate limit/);
    await db.exec(`set request.jwt.claim.sub = '${userB}'`);
    await assert.rejects(rpc(db, 'diagnostic_v2_result', [firstOwned.started.attempt_token]),
      /attempt not found or forbidden/);
    await db.exec(`reset role; set request.jwt.claim.sub = ''`);
    const ownedFirstVersions = (await db.query(`select item_version_id from
      private.diagnostic_v2_attempt_items where id=any($1::uuid[])`,
      [[firstOwned.shown[0].attempt_item_id, secondOwned.shown[0].attempt_item_id]])).rows;
    assert.notEqual(ownedFirstVersions[0].item_version_id, ownedFirstVersions[1].item_version_id);
    await db.query(`delete from auth.users where id=$1`, [userA]);
    await assert.rejects(rpc(db, 'diagnostic_v2_result', [firstOwned.started.attempt_token]),
      /attempt not found or forbidden/);
    const expiring = await rpc(db, 'diagnostic_v2_start',
      ['desktop', 'aaaaaaaa-aaaa-4aaa-8aaa-000000000106']);
    await db.query(`update private.diagnostic_v2_attempts
      set anonymous_access_expires_at=now()-interval '1 second' where id=$1`,
      [expiring.attempt_id]);
    await assert.rejects(rpc(db, 'diagnostic_v2_next', [expiring.attempt_token]),
      /attempt not found or forbidden/);
    await assert.rejects(rpc(db, 'diagnostic_v2_claim', [expiring.claim_token]),
      /authentication and claim token required/);
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${userB}'`);
    await assert.rejects(rpc(db, 'diagnostic_v2_claim', [expiring.claim_token]),
      /claim forbidden or expired/);
    await db.exec(`reset role; set request.jwt.claim.sub = ''`);

    const oldItem = (await db.query(`select iv.id,iv.stem,iv.options,iv.correct_option_id,
      ai.option_order from private.diagnostic_v2_attempt_items ai
      join private.diagnostic_v2_item_versions iv on iv.id=ai.item_version_id
      where ai.id=$1`, [sqlStrong.shown[0].attempt_item_id])).rows[0];
    await db.query(`update private.diagnostic_v2_item_versions set retired_at=now()
      where id=$1`, [oldItem.id]);
    await assert.rejects(db.query(`update private.diagnostic_v2_item_versions
      set stem='alterada' where id=$1`, [oldItem.id]), /immutable/);
    await assert.rejects(db.query(`update private.diagnostic_v2_item_versions
      set retired_at=null where id=$1`, [oldItem.id]), /immutable/);
    const historic = (await db.query(`select iv.stem,iv.options,iv.correct_option_id,
      ai.option_order from private.diagnostic_v2_attempt_items ai
      join private.diagnostic_v2_item_versions iv on iv.id=ai.item_version_id
      where ai.id=$1`, [sqlStrong.shown[0].attempt_item_id])).rows[0];
    assert.deepEqual(historic, oldItem && {
      stem:oldItem.stem, options:oldItem.options,
      correct_option_id:oldItem.correct_option_id, option_order:oldItem.option_order
    });
    const afterRetirement = await play(db, 'aaaaaaaa-aaaa-4aaa-8aaa-000000000008', () => false);
    assert.equal(afterRetirement.shown.length >= 15, true);
    const selectedRetired = (await db.query(`select count(*)::integer count
      from private.diagnostic_v2_attempt_items
      where attempt_id=$1 and item_version_id=$2`,
      [afterRetirement.started.attempt_id, oldItem.id])).rows[0].count;
    assert.equal(selectedRetired, 0);
    await assert.rejects(db.query(`update private.diagnostic_v2_blueprints
      set max_items=20`), /blueprint definition is immutable|check constraint/);
    await assert.rejects(db.query(`update private.diagnostic_v2_blueprints
      set rules='{}'::jsonb`), /blueprint definition is immutable|check constraint/);
    await db.query(`update private.diagnostic_v2_item_versions set retired_at=now()
      where area='SQL' and level='Básico' and retired_at is null`);
    const insufficient = await play(db, 'aaaaaaaa-aaaa-4aaa-8aaa-000000000009', () => false);
    assert.equal(insufficient.finished.status, 'insufficient_pool');
    assert.equal(insufficient.areas.SQL.demonstrated_level, 'Indeterminado');
    assert.equal(insufficient.areas.SQL.evidence_sufficient, false);
    console.log(`diagnostic v2 migrations: pass (${count} baseline items; A-J scenarios, grants, ownership, retirement and token lifecycle checked in PGlite)`);
  } finally {
    await db.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
