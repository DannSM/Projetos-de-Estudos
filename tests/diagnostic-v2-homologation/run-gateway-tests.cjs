const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const project = path.resolve(__dirname);
const cli = process.platform === 'win32' ? 'supabase.cmd' : 'supabase';
let passed = 0;

function runCli(args) {
  const result = spawnSync(cli, [...args, '--workdir', project], {
    cwd: project, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024
  });
  if (result.status !== 0) throw new Error(`Supabase local command failed (${args[0]} ${args[1] || ''})`);
  return result.stdout.trim();
}

function sql(statement) {
  const raw = runCli(['db', 'query', '--local', '-o', 'json', statement]);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.rows)) return parsed.rows;
  if (Array.isArray(parsed.result)) return parsed.result;
  if (Array.isArray(parsed.results)) return parsed.results;
  throw new Error('Unexpected local SQL JSON shape');
}

function uuid() { return crypto.randomUUID(); }
function requireUuid(value) {
  assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  return value;
}

async function main() {
  const status = JSON.parse(runCli(['status', '-o', 'json']));
  const apiUrl = status.API_URL || status.api_url || status?.api?.url;
  const anonKey = status.ANON_KEY || status.anon_key || status?.api?.anon_key;
  const jwtSecret = status.JWT_SECRET || status.jwt_secret;
  assert.ok(apiUrl && anonKey, 'Local API URL or local anon key unavailable');

  async function request(endpoint, { method = 'GET', token = anonKey, body, headers = {} } = {}) {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : {'Content-Type':'application/json'}),
        ...headers
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    let data = null;
    const raw = await response.text();
    if (raw) { try { data = JSON.parse(raw); } catch { data = null; } }
    return { status: response.status, data };
  }
  async function rpc(name, args, token = anonKey) {
    const response = await request(`/rest/v1/rpc/${name}`, {
      method:'POST', token, body:args
    });
    assert.ok(response.status >= 200 && response.status < 300,
      `${name}: HTTP ${response.status}`);
    passed++;
    return response.data;
  }
  function denied(response, label) {
    assert.ok(response.status >= 400 && response.status < 500,
      `${label}: expected denial, got HTTP ${response.status}`);
    passed++;
  }
  async function signup(label) {
    const response = await request('/auth/v1/signup', {
      method:'POST', body: {
        email:`diagnostic-v2-${label}-${uuid()}@example.invalid`,
        password:crypto.randomBytes(20).toString('hex')
      }
    });
    assert.ok(response.status >= 200 && response.status < 300 &&
      response.data?.access_token && response.data?.user?.id,
      `synthetic signup ${label}: HTTP ${response.status}`);
    passed++;
    return { id:response.data.user.id, token:response.data.access_token };
  }

  const users = {};
  for (const label of ['a','b','c','d']) users[label] = await signup(label);
  const grants = sql(`select
    has_table_privilege('anon','public.question_bank','SELECT') q_select,
    has_table_privilege('anon','public.question_bank','TRUNCATE') q_truncate,
    has_table_privilege('anon','public.diagnostic_funnel_events','INSERT') event_insert,
    has_table_privilege('authenticated','public.diagnostic_funnel_events','TRUNCATE') event_truncate,
    has_function_privilege('anon','private.diagnostic_v2_finish(uuid)','EXECUTE') private_finish,
    has_function_privilege('authenticated','private.claim_anonymous_diagnostic(text,text)','EXECUTE') v1_claim`)[0];
  assert.equal(grants.q_select, true);
  assert.equal(grants.q_truncate, false);
  assert.equal(grants.event_insert, true);
  assert.equal(grants.event_truncate, false);
  assert.equal(grants.private_finish, false);
  assert.equal(grants.v1_claim, true);
  passed++;

  const legacy = await request('/rest/v1/question_bank?select=question_text,correct_index');
  assert.equal(legacy.status, 200);
  assert.equal(legacy.data?.[0]?.correct_index, 2);
  passed++;
  const event = await request('/rest/v1/diagnostic_funnel_events', {
    method:'POST', body:{event_type:'synthetic_gateway_test'},
    headers:{Prefer:'return=minimal'}
  });
  assert.ok(event.status === 201 || event.status === 204);
  passed++;
  denied(await request('/rest/v1/rpc/test_v2_probe_truncate_question_bank',
    {method:'POST',body:{}}), 'TRUNCATE anon');
  denied(await request('/rest/v1/diagnostic_v2_item_versions?select=correct_option_id',
    {headers:{'Accept-Profile':'private'}}), 'private schema exposure');
  denied(await request('/rest/v1/rpc/diagnostic_v2_finish',
    {method:'POST',body:{p_attempt_id:uuid()}}), 'private function exposure');

  const legacyAttempt = 'diag_fixture_v1_' + crypto.randomBytes(6).toString('hex');
  sql(`insert into public.diagnostic_sessions(attempt_id,anonymous_user_id,finished_at)
    values ('${legacyAttempt}','fixture-anon',now())`);
  sql(`insert into public.diagnostic_answers(attempt_id,anonymous_user_id)
    values ('${legacyAttempt}','fixture-anon')`);
  const linkedV1 = await rpc('claim_anonymous_diagnostic',
    {p_attempt_id:legacyAttempt,p_anonymous_user_id:'fixture-anon'}, users.a.token);
  assert.equal(linkedV1.status, 'claimed');
  assert.equal(linkedV1.diagnostic_sessions, 1);
  passed++;

  denied(await request('/rest/v1/rpc/diagnostic_v2_result', {
    method:'POST', token:'invalid.jwt.token', body:{p_attempt_token:'x'.repeat(64)}
  }), 'invalid JWT');
  assert.ok(jwtSecret, 'Local JWT secret unavailable for signed expired-token test');
  const jwtHeader = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const jwtPayload = Buffer.from(JSON.stringify({
    aud:'authenticated',role:'authenticated',sub:users.a.id,
    iat:Math.floor(Date.now()/1000)-7200,exp:Math.floor(Date.now()/1000)-3600
  })).toString('base64url');
  const jwtSignature = crypto.createHmac('sha256',jwtSecret)
    .update(`${jwtHeader}.${jwtPayload}`).digest('base64url');
  denied(await request('/rest/v1/rpc/diagnostic_v2_result', {
    method:'POST',token:`${jwtHeader}.${jwtPayload}.${jwtSignature}`,
    body:{p_attempt_token:'x'.repeat(64)}
  }), 'expired signed JWT');

  const anonStart = await rpc('diagnostic_v2_start',
    {p_device_class:'desktop',p_idempotency_key:uuid()});
  assert.equal(anonStart.status,'started');
  const first = await rpc('diagnostic_v2_next', {p_attempt_token:anonStart.attempt_token});
  const resumed = await rpc('diagnostic_v2_next', {p_attempt_token:anonStart.attempt_token});
  assert.equal(first.attempt_item_id,resumed.attempt_item_id);
  assert.equal(JSON.stringify(first.options),JSON.stringify(resumed.options));
  assert.equal(first.options.length,4);
  assert.equal('correct_option_id' in first,false);
  passed++;
  denied(await request('/rest/v1/rpc/diagnostic_v2_next', {
    method:'POST',body:{p_attempt_token:null}
  }), 'missing attempt token');
  denied(await request('/rest/v1/rpc/diagnostic_v2_next', {
    method:'POST',body:{p_attempt_token:'f'.repeat(64)}
  }), 'incorrect attempt token');
  denied(await request('/rest/v1/rpc/diagnostic_v2_submit', {
    method:'POST',body:{p_attempt_token:anonStart.attempt_token,
      p_attempt_item_id:first.attempt_item_id,p_selected_option_id:'forged',
      p_idempotency_key:uuid()}
  }), 'invalid answer');
  const answerKey = uuid();
  const answer = {p_attempt_token:anonStart.attempt_token,
    p_attempt_item_id:first.attempt_item_id,p_selected_option_id:'a',
    p_idempotency_key:answerKey};
  const sameAnswers = await Promise.all([
    rpc('diagnostic_v2_submit',answer),rpc('diagnostic_v2_submit',answer)
  ]);
  assert.equal(sameAnswers.filter(x=>x.idempotent===false).length,1);
  assert.equal(sameAnswers.filter(x=>x.idempotent===true).length,1);
  passed++;
  denied(await request('/rest/v1/rpc/diagnostic_v2_submit', {
    method:'POST',body:{...answer,p_selected_option_id:'b'}
  }), 'conflicting answer');
  denied(await request('/rest/v1/rpc/diagnostic_v2_submit', {
    method:'POST',body:{...answer,is_correct:true,score_percent:100}
  }), 'forged score parameters');
  denied(await request('/rest/v1/diagnostic_v2_attempt_items', {
    method:'PATCH',body:{is_correct:true},headers:{'Content-Profile':'private'}
  }), 'forged score table write');
  const nextPair = await Promise.all([
    rpc('diagnostic_v2_next',{p_attempt_token:anonStart.attempt_token}),
    rpc('diagnostic_v2_next',{p_attempt_token:anonStart.attempt_token})
  ]);
  assert.equal(nextPair[0].attempt_item_id,nextPair[1].attempt_item_id);
  assert.notEqual(nextPair[0].attempt_item_id,first.attempt_item_id);
  passed++;
  const conflictPair=await Promise.allSettled([
    rpc('diagnostic_v2_submit',{
      p_attempt_token:anonStart.attempt_token,p_attempt_item_id:nextPair[0].attempt_item_id,
      p_selected_option_id:'a',p_idempotency_key:uuid()}),
    rpc('diagnostic_v2_submit',{
      p_attempt_token:anonStart.attempt_token,p_attempt_item_id:nextPair[0].attempt_item_id,
      p_selected_option_id:'b',p_idempotency_key:uuid()})
  ]);
  assert.equal(conflictPair.filter(x=>x.status==='fulfilled').length,1);
  passed++;
  const savedCount = sql(`select count(*)::integer as n from private.diagnostic_v2_attempt_items
    where attempt_id='${requireUuid(anonStart.attempt_id)}'`)[0].n;
  assert.equal(savedCount,2);
  passed++;

  const claimedPair = await Promise.allSettled([
    rpc('diagnostic_v2_claim',{p_claim_token:anonStart.claim_token},users.a.token),
    rpc('diagnostic_v2_claim',{p_claim_token:anonStart.claim_token},users.b.token)
  ]);
  assert.equal(claimedPair.filter(x=>x.status==='fulfilled').length,1);
  const claimedOwner = claimedPair[0].status==='fulfilled' ? users.a : users.b;
  const other = claimedOwner.id===users.a.id ? users.b : users.a;
  denied(await request('/rest/v1/rpc/diagnostic_v2_result', {
    method:'POST',token:other.token,body:{p_attempt_token:anonStart.attempt_token}
  }), 'cross-account access');
  denied(await request('/rest/v1/rpc/diagnostic_v2_result', {
    method:'POST',body:{p_attempt_token:anonStart.attempt_token}
  }), 'anonymous access after claim');

  const expiredAnon = await rpc('diagnostic_v2_start',
    {p_device_class:'desktop',p_idempotency_key:uuid()});
  sql(`update private.diagnostic_v2_attempts
    set anonymous_access_expires_at=now()-interval '1 second'
    where id='${requireUuid(expiredAnon.attempt_id)}'`);
  denied(await request('/rest/v1/rpc/diagnostic_v2_result', {
    method:'POST',body:{p_attempt_token:expiredAnon.attempt_token}
  }), 'expired anonymous token');
  denied(await request('/rest/v1/rpc/diagnostic_v2_claim', {
    method:'POST',token:users.b.token,body:{p_claim_token:expiredAnon.claim_token}
  }), 'expired anonymous claim');

  const longAttempt = await rpc('diagnostic_v2_start',
    {p_device_class:'desktop',p_idempotency_key:uuid()},users.d.token);
  const longItem = await rpc('diagnostic_v2_next',
    {p_attempt_token:longAttempt.attempt_token},users.d.token);
  sql(`update private.diagnostic_v2_attempt_items
    set presented_at=now()-interval '30 days'
    where id='${requireUuid(longItem.attempt_item_id)}'`);
  await rpc('diagnostic_v2_submit',{
    p_attempt_token:longAttempt.attempt_token,p_attempt_item_id:longItem.attempt_item_id,
    p_selected_option_id:'a',p_idempotency_key:uuid()
  },users.d.token);
  const longMs = sql(`select response_ms from private.diagnostic_v2_attempt_items
    where id='${requireUuid(longItem.attempt_item_id)}'`)[0].response_ms;
  assert.ok(Number(longMs)>2_147_483_647);
  passed++;
  sql(`delete from auth.users where id='${requireUuid(users.d.id)}'`);
  denied(await request('/rest/v1/rpc/diagnostic_v2_result', {
    method:'POST',token:users.d.token,body:{p_attempt_token:longAttempt.attempt_token}
  }), 'deleted account token');

  async function play(shouldCorrect, token = anonKey) {
    const start = await rpc('diagnostic_v2_start',
      {p_device_class:'desktop',p_idempotency_key:uuid()},token);
    const shown = [];
    let lastAnswer;
    for (let i=0;i<25;i++) {
      const item = await rpc('diagnostic_v2_next',
        {p_attempt_token:start.attempt_token},token);
      if (item.status!=='active') break;
      shown.push(item);
      lastAnswer={p_attempt_token:start.attempt_token,p_attempt_item_id:item.attempt_item_id,
        p_selected_option_id:shouldCorrect(item,i)?'a':'b',p_idempotency_key:uuid()};
      await rpc('diagnostic_v2_submit',lastAnswer,token);
    }
    const finished = await rpc('diagnostic_v2_next',
      {p_attempt_token:start.attempt_token},token);
    assert.ok(['completed','insufficient_pool'].includes(finished.status));
    assert.ok(shown.length<=25);
    if(lastAnswer) assert.equal((await rpc('diagnostic_v2_submit',lastAnswer,token)).idempotent,true);
    passed++;
    return {start,shown,finished,areas:Object.fromEntries(
      finished.result.areas.map(area=>[area.area,area]))};
  }
  const weak=await play(()=>false);
  assert.equal(weak.areas.SQL.demonstrated_level,'Fundamentos a revisar');
  const sqlStrong=await play(item=>item.area==='SQL');
  assert.equal(sqlStrong.areas.SQL.demonstrated_level,'Avançado provisório');
  assert.equal(sqlStrong.areas['Estatística'].demonstrated_level,'Fundamentos a revisar');
  const indicators=await play(item=>item.area==='Indicadores');
  assert.equal(indicators.areas.Excel.demonstrated_level,'Fundamentos a revisar');
  assert.equal(indicators.areas.Indicadores.demonstrated_level,'Avançado provisório');
  const intermediate=await play(item=>item.level!=='Avançado');
  assert.ok(intermediate.finished.result.areas.every(
    area=>area.demonstrated_level==='Intermediário demonstrado'));
  const partial=await play(item=>item.level!=='Avançado'||item.area==='SQL');
  assert.equal(partial.areas.SQL.demonstrated_level,'Avançado provisório');
  assert.equal(partial.finished.result.areas.filter(
    area=>area.demonstrated_level==='Avançado provisório').length,1);
  const lucky=await play(item=>item.area==='SQL'&&item.position===1);
  assert.equal(lucky.areas.SQL.confidence_band,'baixa');
  const resumedPlay=await play(()=>false);
  assert.ok(resumedPlay.shown.length>=15);
  passed++;

  const owned1=await play(()=>false,users.b.token);
  const owned2=await play(()=>false,users.b.token);
  const firstVersions=sql(`select attempt_id,item_version_id from private.diagnostic_v2_attempt_items
    where id in ('${requireUuid(owned1.shown[0].attempt_item_id)}',
      '${requireUuid(owned2.shown[0].attempt_item_id)}')`);
  assert.equal(firstVersions.length,2);
  assert.notEqual(firstVersions[0].item_version_id,firstVersions[1].item_version_id);
  passed++;

  const rateKey=uuid();
  const sameStarts=await Promise.all([
    rpc('diagnostic_v2_start',{p_device_class:'desktop',p_idempotency_key:rateKey},users.c.token),
    rpc('diagnostic_v2_start',{p_device_class:'desktop',p_idempotency_key:rateKey},users.c.token)
  ]);
  assert.equal(sameStarts.filter(x=>x.status==='started').length,1);
  assert.equal(sameStarts.filter(x=>x.status==='already_started').length,1);
  for(let i=0;i<3;i++) await rpc('diagnostic_v2_start',
    {p_device_class:'desktop',p_idempotency_key:uuid()},users.c.token);
  const finalStarts=await Promise.allSettled([
    rpc('diagnostic_v2_start',{p_device_class:'desktop',p_idempotency_key:uuid()},users.c.token),
    rpc('diagnostic_v2_start',{p_device_class:'desktop',p_idempotency_key:uuid()},users.c.token)
  ]);
  assert.equal(finalStarts.filter(x=>x.status==='fulfilled').length,1);
  const cCount=sql(`select count(*)::integer n from private.diagnostic_v2_attempts
    where user_id='${requireUuid(users.c.id)}'`)[0].n;
  assert.equal(cCount,5);
  passed++;

  sql(`update private.diagnostic_v2_item_versions set retired_at=now()
    where area='SQL' and level='Básico' and retired_at is null`);
  const insufficient=await play(()=>false);
  assert.equal(insufficient.finished.status,'insufficient_pool');
  assert.equal(insufficient.areas.SQL.demonstrated_level,'Indeterminado');
  assert.equal(insufficient.areas.SQL.evidence_sufficient,false);
  passed++;

  console.log(`Gateway homologation: ${passed} checks passed; Auth/PostgREST, concurrency and A-J scenarios exercised; no tokens logged.`);
}

main().catch(error=>{
  // Never print HTTP bodies, credentials or bearer tokens.
  console.error(`Gateway homologation failed: ${error.message}`);
  process.exitCode=1;
});
