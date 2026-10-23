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

async function main() {
  const db = new PGlite();
  try {
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
      create function private.claim_anonymous_diagnostic() returns boolean
        language sql as $$ select true $$;
      grant usage on schema private to authenticated;
      grant execute on function private.claim_anonymous_diagnostic() to authenticated;
    `);
    await db.exec(securitySql);
    await db.exec(engineSql);
    const grants = (await db.query(`select
      has_table_privilege('anon','public.question_bank','SELECT') q_select,
      has_table_privilege('anon','public.question_bank','INSERT') q_insert,
      has_table_privilege('anon','public.diagnostic_funnel_events','INSERT') event_insert,
      has_table_privilege('anon','public.diagnostic_funnel_events','TRUNCATE') event_truncate,
      has_function_privilege('authenticated','private.claim_anonymous_diagnostic()','EXECUTE') old_claim,
      has_function_privilege('anon','private.diagnostic_v2_finish(uuid)','EXECUTE') private_finish,
      has_function_privilege('anon','public.diagnostic_v2_start(text)','EXECUTE') public_start,
      has_function_privilege('anon','public.handle_new_auth_user_profile()','EXECUTE') auth_trigger`)).rows[0];
    assert.deepEqual(grants, {
      q_select: true, q_insert: false, event_insert: true, event_truncate: false,
      old_claim: true, private_finish: false, public_start: true, auth_trigger: false
    });

    await assert.rejects(db.query(`select public.diagnostic_v2_start('desktop')`),
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
    await db.exec(`update private.diagnostic_v2_blueprints set is_active=true;
      grant usage on schema auth to anon, authenticated;
      grant select on auth.users to authenticated;
      grant usage on schema public to anon, authenticated;`);
    await db.exec('set role anon');
    await assert.rejects(db.query('select correct_option_id from private.diagnostic_v2_item_versions'),
      /permission denied/);
    const start = (await db.query(`select public.diagnostic_v2_start('desktop') value`)).rows[0].value;
    assert.equal(start.attempt_token.length, 64);
    assert.equal(start.claim_token.length, 64);
    let count = 0;
    let finished;
    while (count < 25) {
      const next = (await db.query(`select public.diagnostic_v2_next($1) value`, [start.attempt_token])).rows[0].value;
      if (next.status !== 'active') { finished = next; break; }
      assert.equal(next.options.length, 4);
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
    assert.equal(finished.result.areas.length, 5);
    assert.equal(finished.result.blueprint_version, 'v2-pilot-1');
    assert.equal(finished.result.areas[0].skills.length > 0, true);
    assert.equal(finished.result.areas[0].recommendation_code, 'deepen_advanced');
    await assert.rejects(db.query('select * from private.diagnostic_v2_recommendations'),
      /permission denied/);
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
    await db.exec('reset role');
    console.log(`diagnostic v2 migrations: pass (${count} items, grants and ownership checked)`);
  } finally {
    await db.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
