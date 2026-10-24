const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

const root = path.resolve(__dirname, '../..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;`);
    for (const file of [
      'tests/diagnostic-v2-homologation/fixtures/v1-dependencies.sql',
      'supabase/migrations/20260622004102_claim_anonymous_diagnostic.sql',
      'supabase/migrations/20261023023120_diagnostico_v2_security_and_model.sql',
      'supabase/migrations/20261023023220_diagnostico_v2_private_engine.sql',
      'supabase/migrations/20261024164620_diagnostico_v2_fair_deepening.sql',
      'tests/diagnostic-v2-homologation/fixtures/v2-items.sql'
    ]) await db.exec(read(file));
    const result = (await db.query(`select
      (select count(*)::integer from private.diagnostic_v2_item_versions) items,
      (select is_active from private.diagnostic_v2_blueprints
        where version='v2-pilot-1') active,
      has_function_privilege('authenticated',
        'private.claim_anonymous_diagnostic(text,text)','EXECUTE') v1_claim`)).rows[0];
    assert.deepEqual(result,{items:60,active:true,v1_claim:true});
    console.log('Synthetic fixture and V2 migration chain: pass in PGlite (partial schema only)');
  } finally { await db.close(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
