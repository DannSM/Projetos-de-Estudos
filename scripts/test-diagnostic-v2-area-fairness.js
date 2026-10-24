// Synthetic, disposable PGlite fairness probe. No private question bank is read.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const areas = ['SQL', 'Estatística', 'Excel', 'Lógica de dados', 'Indicadores'];
const migration = name => fs.readFileSync(path.join(root, 'supabase/migrations', name), 'utf8');

async function setup(fixed) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
  for (const name of [
    'tests/diagnostic-v2-homologation/fixtures/v1-dependencies.sql',
    'supabase/migrations/20260622004102_claim_anonymous_diagnostic.sql',
    'supabase/migrations/20261023023120_diagnostico_v2_security_and_model.sql',
    'supabase/migrations/20261023023220_diagnostico_v2_private_engine.sql'
  ]) await db.exec(fs.readFileSync(path.join(root,name),'utf8'));
  if (fixed) await db.exec(migration('20261024164620_diagnostico_v2_fair_deepening.sql'));
  const options=JSON.stringify(['a','b','c','d'].map(id=>({id,text:id})));
  for (const area of areas) for (const [level,count] of [['Básico',3],['Intermediário',3],['Avançado',2]])
    for(let i=0;i<count;i++) await db.query(`insert into private.diagnostic_v2_item_versions
      (item_key,version,area,level,skill_code,question_type,stem,options,correct_option_id,published_at)
      values ($1,1,$2,$3,$4,'multiple_choice','Teste sintético',$5::jsonb,'a',now())`,
      [`${area}-${level}-${i}`,area,level,`${area}-${level}-${i}`,options]);
  await db.exec("update private.diagnostic_v2_blueprints set is_active=true where version='v2-pilot-1'");
  return db;
}
async function rpc(db,name,params) {
  const binds=params.map((_,i)=>`$${i+1}`).join(',');
  return (await db.query(`select public.${name}(${binds}) value`,params)).rows[0].value;
}
async function play(db,choose) {
  const start=await rpc(db,'diagnostic_v2_start',['desktop',crypto.randomUUID()]);
  const deep=[];let finished, shown=0;
  while(shown<25){
    const next=await rpc(db,'diagnostic_v2_next',[start.attempt_token]);
    if(next.status!=='active'){finished=next;break;}
    if(next.stage==='deepening') deep.push(next.area);
    const option=choose(next)?'a':'b';
    await rpc(db,'diagnostic_v2_submit',[start.attempt_token,next.attempt_item_id,option,crypto.randomUUID()]);
    shown++;
  }
  if(!finished)finished=await rpc(db,'diagnostic_v2_next',[start.attempt_token]);
  assert.equal(finished.status,'completed');
  assert.ok(shown<=25);
  return {deep,levels:Object.fromEntries(finished.result.areas.map(x=>[x.area,x.demonstrated_level])),
    evidence:Object.fromEntries(finished.result.areas.map(x=>[x.area,x.advanced_evidence_status]))};
}
(async()=>{
  const fixed=!process.argv.includes('--baseline');
  const countArg=process.argv.find(arg=>arg.startsWith('--attempts='));
  const attemptCount=countArg?Number(countArg.slice('--attempts='.length)):100;
  assert.ok(Number.isInteger(attemptCount)&&attemptCount>=10&&attemptCount<=200);
  const db=await setup(fixed);
  try {
    const all=[];
    for(let i=0;i<attemptCount;i++)all.push(await play(db,()=>true));
    const distribution=Object.fromEntries(areas.map(a=>[a,all.reduce((n,x)=>n+x.deep.filter(v=>v===a).length,0)]));
    const provisional=Object.fromEntries(areas.map(a=>[a,all.filter(x=>x.levels[a]==='Avançado provisório').length]));
    const weak=await play(db,()=>false);
    const oneStrong=await play(db,x=>x.area==='Indicadores');
    const advancedWrong=await play(db,x=>x.level!=='Avançado');
    assert.ok(Object.values(weak.levels).every(x=>x==='Fundamentos a revisar'));
    assert.equal(oneStrong.levels.Indicadores,'Avançado provisório');
    if(fixed){
      assert.ok(Object.values(distribution).every(n=>n>0),'All five areas must receive deepening across attempts');
      assert.ok(Object.values(provisional).every(n=>n>0),'All five areas must sometimes earn provisional advanced');
      if(attemptCount>=100)assert.ok(Object.values(distribution).every(n=>n>=attemptCount*.7&&n<=attemptCount*1.3),
        'Deepening distribution remains imbalanced across attempts');
      assert.equal(all.reduce((sum,x)=>sum+x.deep.length,0),5*attemptCount);
      assert.equal(all.every(x=>Object.values(x.evidence).filter(v=>v==='provisional_demonstrated').length===2),true);
      assert.equal(all.every(x=>Object.values(x.evidence).filter(v=>v==='insufficient_evidence').length===3),true);
      assert.equal(Object.values(advancedWrong.evidence).filter(v=>v==='not_demonstrated').length,2);
      assert.equal(Object.values(advancedWrong.evidence).filter(v=>v==='insufficient_evidence').length,3);
      assert.equal(oneStrong.evidence.Indicadores,'provisional_demonstrated');
    }
    console.log(JSON.stringify({mode:fixed?'fixed':'baseline',attempts:attemptCount,deepening:distribution,provisional,weak_questions:weak.deep.length,one_strong:oneStrong.levels.Indicadores}));
  }finally{await db.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1});
