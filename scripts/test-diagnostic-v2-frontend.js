const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/diagnostic-v2-service.js'), 'utf8');
const catalogSource = fs.readFileSync(path.join(root, 'src/diagnostic-v2-catalog.js'), 'utf8');

function createEnvironment(pageHost, apiUrl) {
  const storage = new Map();
  const calls = [];
  const token = 'a'.repeat(64);
  const client = { rpc: async (name, payload) => {
    calls.push({name, payload});
    if (name === 'diagnostic_v2_start') return {data:{status:'started',attempt_id:'11111111-1111-4111-8111-111111111111',attempt_token:token,claim_token:'b'.repeat(64)}};
    if (name === 'diagnostic_v2_claim') return {data:{status:'claimed'}};
    return {data:{status:'active'}};
  }};
  const scope = {
    URL, URLSearchParams,
    location:{hostname:pageHost,search:'?preview=v2'},
    DATA_SKILL_MAP_SUPABASE:{url:apiUrl},
    authService:{getClient:()=>client,getCurrentSession:async()=>({ok:true,user:null})},
    matchMedia:()=>({matches:false}),
    crypto:{randomUUID:()=> '22222222-2222-4222-8222-222222222222'},
    sessionStorage:{getItem:(key)=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:(key)=>storage.delete(key)}
  };
  scope.window=scope;
  vm.runInNewContext(source,scope);
  vm.runInNewContext(catalogSource,scope);
  return {scope,calls,storage};
}

async function main() {
  const production = createEnvironment('trilhadedados.com.br','https://njjyrahznnrfcnstiwlb.supabase.co');
  assert.equal(production.scope.diagnosticV2Service.isLocalPreview(),false);
  await assert.rejects(production.scope.diagnosticV2Service.start(),/somente com Supabase local/);
  assert.equal(production.calls.length,0);

  const local = createEnvironment('127.0.0.1','http://127.0.0.1:54321');
  const api = local.scope.diagnosticV2Service;
  assert.equal(api.isLocalPreview(),true);
  const attempt = await api.start();
  assert.equal(api.readAttempt().attempt_token, 'a'.repeat(64));
  assert.equal(local.calls[0].name,'diagnostic_v2_start');
  await api.submit(attempt,'33333333-3333-4333-8333-333333333333','a');
  const key = local.calls[1].payload.p_idempotency_key;
  await api.submit(attempt,'33333333-3333-4333-8333-333333333333','a');
  assert.equal(local.calls[2].payload.p_idempotency_key,key);
  await api.claim(attempt,'44444444-4444-4444-8444-444444444444');
  await api.myResults();
  assert.equal(local.calls.at(-1).name,'diagnostic_v2_my_results');
  assert.equal(api.readAttempt().claim_token,null);
  assert.equal(api.readAttempt().owner_id,'44444444-4444-4444-8444-444444444444');
  assert.equal(local.scope.diagnosticV2Catalog.resolve({skills:[{skill_code:'synthetic.sql',correct:0,total:1}]}),null);
  assert.equal(local.scope.diagnosticV2Catalog.resolve({recommendation_code:'review_fundamentals',skills:[{skill_code:'sql.filtering.where_logic',correct:0,total:1}]}).type,'Prática');
  assert.equal(local.scope.diagnosticV2Catalog.resolve({recommendation_code:'collect_more_evidence',skills:[{skill_code:'sql.filtering.where_logic',correct:0,total:1}]}),null);
  assert.equal(local.scope.diagnosticV2Catalog.skillName('sql.aggregation.counting','SQL'),'Contagem com valores nulos');
  assert.equal(local.scope.diagnosticV2Catalog.skillName('synthetic.sql.basico.1','SQL'),'Competência em SQL ainda sem nome editorial');
  assert.match(local.scope.diagnosticV2Catalog.advancedEvidenceText('insufficient_evidence'),/não foi suficientemente avaliado/);
  assert.match(local.scope.diagnosticV2Catalog.advancedEvidenceText('not_demonstrated'),/ainda não foi demonstrado/);
  assert.match(local.scope.diagnosticV2Catalog.advancedEvidenceText('provisional_demonstrated'),/provisoriamente/);
  assert.equal(local.scope.diagnosticV2Catalog.resolve({recommendation_code:'review_fundamentals',skills:[{skill_code:'sql.aggregation.counting',correct:0,total:1}]}).href,'praticas-sql.html?pratica=sql-essencial-count-nulos-distintos');
  assert.equal(local.scope.diagnosticV2Catalog.resolve({recommendation_code:'review_fundamentals',skills:[{skill_code:'sql.aggregation.distinct_entities',correct:0,total:1}]}).href,'praticas-sql.html?pratica=sql-essencial-count-nulos-distintos');
  api.clearAttempt();
  assert.equal(api.readAttempt(),null);
  const html = fs.readFileSync(path.join(root,'diagnostico.html'),'utf8');
  const pageSource = fs.readFileSync(path.join(root,'src/diagnostic-v2-page.js'),'utf8');
  const progressHtml = fs.readFileSync(path.join(root,'meu-progresso.html'),'utf8');
  assert.match(html,/src\/diagnostic-v2-page\.js/);
  assert.match(progressHtml,/src\/diagnostic-v2-progress\.js/);
  assert.match(pageSource,/type="radio" name="v2Answer"/);
  assert.match(pageSource,/role="status" aria-live="polite"/);
  assert.doesNotMatch(pageSource,/\.correct_option_id|\.is_correct|\.explanation/);
  console.log('Diagnostic V2 frontend: local-only gate, RPC adapter, session token lifecycle and verified catalog pass');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
