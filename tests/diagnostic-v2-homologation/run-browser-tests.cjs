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
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/src/supabase-config.js',route=>route.fulfill({
      contentType:'application/javascript',body:`window.DATA_SKILL_MAP_SUPABASE=${JSON.stringify({url:apiUrl,anonKey})};`
    }));
    await page.goto('http://127.0.0.1:4173/diagnostico.html?preview=v2',{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'Começar diagnóstico'}).waitFor();
    await page.getByRole('button',{name:'Começar diagnóstico'}).click();
    await page.getByRole('button',{name:'Continuar sem login'}).click();
    await page.locator('#v2Question').waitFor();
    assert.match(await page.locator('.diagnostic-session-strip').innerText(),/Pergunta 1/);
    await page.screenshot({path:path.join(process.env.RUNNER_TEMP||project,'diagnostic-v2-desktop.png')});
    await page.locator('input[name="v2Answer"]').first().check();
    await page.getByRole('button',{name:'Registrar resposta'}).click();
    await page.waitForFunction(()=>document.querySelector('.diagnostic-session-strip')?.textContent.includes('Pergunta 2'));
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('.diagnostic-session-strip')?.textContent.includes('Pergunta 2'));
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(process.env.RUNNER_TEMP||project,'diagnostic-v2-mobile.png')});
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
    await page.screenshot({path:path.join(process.env.RUNNER_TEMP||project,'diagnostic-v2-result.png')});
    assert.equal(errors.length,0,`browser page errors: ${errors.length}`);
    console.log('V2 browser flow: desktop 1366px, mobile 390px, resume, 5 areas and server result pass; screenshots kept only in runner temp.');
  } finally {
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(`V2 browser flow failed: ${error.message}`);process.exitCode=1;});
