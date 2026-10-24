const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '../..');
const project = path.resolve(__dirname);
const statusResult = spawnSync('supabase',['status','-o','json','--workdir',project],
  {cwd:project,encoding:'utf8'});
assert.equal(statusResult.status,0,'Supabase local unavailable');
const local = JSON.parse(statusResult.stdout);
const apiUrl = local.API_URL || local.api_url;
const anonKey = local.ANON_KEY || local.anon_key;
assert.ok(apiUrl && anonKey,'Supabase local API unavailable');

const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};
const server = http.createServer((request,response)=>{
  const url = new URL(request.url,'http://127.0.0.1');
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root,relative);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end(); return;
  }
  response.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});

async function main() {
  await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({channel:'chrome',headless:true});
    const page=await browser.newPage({viewport:{width:1366,height:900}});
    const errors=[];
    const consoleErrors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error') consoleErrors.push(message.text());});
    async function capture(name, locator=null) {
      await page.evaluate(()=>document.fonts.ready);
      const target=locator || page;
      await target.screenshot({
        path:path.join(process.env.RUNNER_TEMP||project,`diagnostic-v2-${name}.png`),
        animations:'disabled',caret:'hide',...(locator?{}:{fullPage:true})
      });
    }
    async function assertViewport(width) {
      await page.setViewportSize({width,height:900});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,
        `${width}px horizontal overflow`);
    }
    async function assertHeroBalance() {
      const lineCounts=await page.locator('#diagnosticHeroTitle').evaluate(title=>{
        const lines=new Map();
        const walker=document.createTreeWalker(title,NodeFilter.SHOW_TEXT);
        let node;
        while((node=walker.nextNode())) {
          for(const match of node.textContent.matchAll(/\S+/g)) {
            const range=document.createRange();
            range.setStart(node,match.index);
            range.setEnd(node,match.index+match[0].length);
            const top=Math.round(range.getBoundingClientRect().top);
            lines.set(top,(lines.get(top)||0)+1);
          }
        }
        return [...lines.values()];
      });
      assert.ok(lineCounts.at(-1)>=2,`orphan hero word: ${lineCounts.join('/')}`);
    }
    await page.route('**/src/supabase-config.js',route=>route.fulfill({
      contentType:'application/javascript',body:`window.DATA_SKILL_MAP_SUPABASE=${JSON.stringify({url:apiUrl,anonKey})};`
    }));
    await page.goto('http://127.0.0.1:4173/diagnostico.html?preview=v2',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Começar diagnóstico'}).waitFor();
    assert.match(await page.locator('#diagnosticHeroTitle').innerText(),/seus próximos passos/);
    await assertHeroBalance();
    await capture('01-hero-inicial-desktop');
    await assertViewport(768);
    await assertHeroBalance();
    await capture('02-hero-inicial-tablet');
    await assertViewport(390);
    await assertHeroBalance();
    await capture('03-hero-inicial-mobile');
    await assertViewport(1366);
    await page.getByRole('button',{name:'Começar diagnóstico'}).click();
    await page.getByRole('button',{name:'Continuar sem login'}).click();
    await page.locator('#v2Question').waitFor();
    assert.match(await page.locator('.diagnostic-session-strip').innerText(),/Pergunta 1/);
    assert.match(await page.locator('#diagnosticHeroTitle').innerText(),/Cada resposta ajuda/);
    assert.equal(await page.getByRole('radio').count(),4);
    assert.equal(await page.locator('[role="progressbar"]').getAttribute('aria-valuenow'),'0');
    assert.equal(await page.locator('[data-v2-submit]').isDisabled(),true);
    await capture('04-questao-desktop');
    await capture('05-hero-em-andamento',page.locator('.diagnostic-hero'));
    await assertViewport(390);
    await capture('06-questao-mobile');
    await assertViewport(768);
    await capture('07-questao-tablet');
    await assertViewport(1366);
    await page.locator('input[name="v2Answer"]').first().check();
    assert.equal(await page.locator('[data-v2-submit]').isEnabled(),true);
    await capture('08-alternativa-selecionada',page.locator('.diagnostic-v2'));
    await page.getByRole('button',{name:'Registrar resposta'}).click();
    await page.waitForFunction(()=>document.querySelector('.diagnostic-session-strip')?.textContent.includes('Pergunta 2'));
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('.diagnostic-session-strip')?.textContent.includes('Pergunta 2'));
    assert.match(await page.locator('#diagnosticHeroTitle').innerText(),/Cada resposta ajuda/);
    await capture('09-hero-apos-retomada',page.locator('.diagnostic-hero'));
    await page.setViewportSize({width:390,height:844});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
    assert.equal(overflow,false,'mobile horizontal overflow');
    for (let i=0;i<24;i++) {
      if (await page.locator('#v2ResultTitle').count()) break;
      const before=await page.locator('.diagnostic-session-strip').innerText();
      await page.locator('input[name="v2Answer"]').first().check();
      await page.getByRole('button',{name:'Registrar resposta'}).click();
      await page.waitForFunction(previous=>document.querySelector('#v2ResultTitle') ||
        document.querySelector('.diagnostic-session-strip')?.innerText!==previous,before);
    }
    await page.locator('#v2ResultTitle').waitFor();
    assert.equal(await page.locator('.diagnostic-v2-area-card').count(),5);
    assert.equal((await page.locator('body').innerText()).includes('correct_option_id'),false);
    assert.match(await page.locator('#diagnosticHeroTitle').innerText(),/Seu mapa está pronto/);
    assert.equal(await page.locator('.diagnostic-shell').isVisible(),false,
      'quiz shell must be hidden after result');
    assert.equal(await page.locator('#quizMount').evaluate(node=>getComputedStyle(node,'::before').content),'none');
    assert.equal((await page.locator('.diagnostic-v2-result').innerText()).includes('synthetic.'),false);
    await capture('10-resultado-mobile');
    await capture('11-cards-cinco-areas',page.locator('.diagnostic-v2-area-grid'));
    await capture('12-prioridade-proxima-acao',page.locator('.diagnostic-v2-next'));
    await assertViewport(1366);
    await capture('13-resultado-desktop');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#v2ResultTitle').waitFor();
    assert.equal(await page.locator('.diagnostic-shell').isVisible(),false);
    assert.match(await page.locator('#diagnosticHeroTitle').innerText(),/Seu mapa está pronto/);
    await capture('14-resultado-apos-reload',page.locator('.diagnostic-hero'));
    assert.equal(consoleErrors.length,0,`diagnostic browser console errors: ${consoleErrors.length}`);
    const account=await page.evaluate(async()=>{
      const client=window.authService.getClient();
      const {data,error}=await client.auth.signUp({
        email:`v2-visual-${crypto.randomUUID()}@example.invalid`,password:crypto.randomUUID()+crypto.randomUUID()
      });
      if(error || !data.session) throw new Error('Synthetic local signup failed');
      await window.diagnosticV2Service.claim(window.diagnosticV2Service.readAttempt(),data.user.id);
      return data.user.id;
    });
    assert.ok(account);
    await page.goto('http://127.0.0.1:4173/meu-progresso.html?preview=v2',{waitUntil:'domcontentloaded'});
    await page.locator('.diagnostic-v2-history').waitFor();
    assert.equal(await page.locator('.diagnostic-v2-history .diagnostic-v2-area-card').count(),5);
    assert.equal((await page.locator('.diagnostic-v2-history').innerText()).includes('synthetic.'),false);
    await capture('15-meu-progresso-v2');
    await page.evaluate(()=>{
      const sample=document.createElement('section');
      sample.className='progress-detail-card';
      sample.setAttribute('aria-label','Amostra visual sintética do histórico V1');
      sample.innerHTML='<span class="progress-panel-label">Histórico V1 · amostra visual sintética</span><p>Diagnóstico anterior · 12 respostas · 7 acertos observados. Os percentuais V1 usam outra metodologia.</p>';
      document.querySelector('.diagnostic-v2-history').before(sample);
    });
    await capture('16-meu-progresso-v1-v2-amostra-visual');
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,
      'progress mobile horizontal overflow');
    await capture('17-meu-progresso-mobile');
    assert.equal(errors.length,0,`browser page errors: ${errors.length}`);
    console.log(`V2 browser flow: 390/768/1366px, resume, own history, 5 areas, no residual skeleton; 17 synthetic screenshots including a labeled V1 visual sample. Diagnostic console errors: 0; progress fixture errors: ${consoleErrors.length}.`);
  } finally {
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(`V2 browser flow failed: ${error.message}`);process.exitCode=1;});
