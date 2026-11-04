// Real installed MV3 / Chrome API proof. This does not claim native pixels or a
// real native-menu click: headless Chromium exposes no menu-tree inspection API.
import assert from 'node:assert/strict';
import {mkdtemp,cp,copyFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const root=fileURLToPath(new URL('../',import.meta.url));
const playwright=process.env.C2C_PLAYWRIGHT_MODULE??'/opt/codex/cua_node/lib/node_modules/playwright/index.mjs';
const {chromium}=await import(pathToFileURL(resolve(playwright)).href);
const work=await mkdtemp(join(tmpdir(),'click2cloud-native-'));
let browser,server;
try {
  const stage=join(work,'extension');await mkdir(stage);
  for(const directory of ['src','extension','tests','scripts'])await cp(join(root,directory),join(stage,directory),{recursive:true});
  await copyFile(join(root,'extension/manifest.json'),join(stage,'manifest.json'));
  browser=await chromium.launchPersistentContext(join(work,'profile'),{
    executablePath:process.env.C2C_CHROMIUM??'/usr/bin/chromium',headless:true,
    ignoreDefaultArgs:['--disable-extensions'],
    args:['--no-sandbox','--enable-unsafe-extension-debugging',`--disable-extensions-except=${stage}`,`--load-extension=${stage}`]
  });
  let worker=browser.serviceWorkers()[0];
  if(!worker) {
    try{worker=await browser.waitForEvent('serviceworker',{timeout:5000});}catch{}
  }
  if(!worker) {
    const cdp=await browser.browser().newBrowserCDPSession();
    let blocked;
    try{await cdp.send('Extensions.loadUnpacked',{path:stage});}
    catch(error){blocked=String(error.message).includes('disabled by the administrator')?'UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR':null;}
    if(!blocked)throw Error('MV3 service worker did not start; native capability is unresolved');
    // Static local test fixtures only, no diagnostic bridge or provider routes.
    server=createServer(async(req,res)=>{
      const path=new URL(req.url,'http://localhost').pathname;
      if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><ul id="menu"></ul>');return;}
      const relative=decodeURIComponent(path).slice(1),full=resolve(root,relative);
      if(!/^(src|tests|scripts)\//.test(relative)||!full.startsWith(root)||!full.endsWith('.mjs')){res.writeHead(404).end();return;}
      try{res.setHeader('Content-Type','text/javascript');res.end(await readFile(full));}catch{res.writeHead(404).end();}
    });
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
    const persistence=await page.evaluate(async()=>{const {runPersistenceBrowserTests}=await import('/tests/persistence-browser.mjs');return runPersistenceBrowserTests();});
    const mirror=await page.evaluate(async()=>{
      const {renderMenuMirror}=await import('/src/chrome/mirror.mjs');
      const {compileMenuSpec}=await import('/src/core/menu-spec.mjs');
      const {menuFixture}=await import('/scripts/glaciaring-fixtures.mjs');
      const spec=compileMenuSpec(menuFixture({count:30,deep:true}));
      renderMenuMirror(document,document.querySelector('#menu'),spec);
      return {state:document.querySelectorAll('[data-item-id]').length===spec.rows.length?'PASS':'FAIL',rows:spec.rows.length,evidenceClass:'browser-dom-mirror'};
    });
    assert.equal(persistence.state,'PASS');assert.equal(mirror.state,'PASS');
    console.log(JSON.stringify({state:'BLOCKED',browserVersion:browser.browser().version(),native:{state:'BLOCKED',code:blocked},persistence,mirror,
      limitations:['No native Chrome registration, rendering or click was verified. Administrator extension policy was preserved.',
        'Authenticated provider save and live MV3 write recovery remain BLOCKED: no provider session/credentials supplied.']},null,2));
    process.exitCode=2;
  } else {
  const id=new URL(worker.url()).hostname;
  const checks=[];
  for(const [index,mode]of ['simple','nested','depth'].entries()) {
    const result=await worker.evaluate(async({mode,generation})=>{
      const {compileMenuSpec}=await import(chrome.runtime.getURL('src/core/menu-spec.mjs'));
      const {menuFixture}=await import(chrome.runtime.getURL('scripts/glaciaring-fixtures.mjs'));
      const input=menuFixture({count:30,mode,generation,deep:true});
      input.defaultTarget=input.inventory.scopes[0];
      const spec=compileMenuSpec(input);
      await chrome.storage.local.set({glaciaringMenu:spec});
      // onChanged starts the serialized apply in the same worker.
      for(let retry=0;retry<100;retry++) {
        await new Promise(r=>setTimeout(r,20));
        const value=globalThis.glaciaringLab?.inspect();
        if(value?.acknowledgedGeneration===generation)return {state:value.lastOutcome.state,generation:value.acknowledgedGeneration,rows:spec.rows.length,acks:value.acknowledgements.length,observed:value.observed,peerIds:spec.rows.filter(r=>r.origin?.mode===null&&r.role==='save').map(r=>r.id)};
        if(value?.lastOutcome?.state==='partial'||value?.lastOutcome?.state==='failed')throw Error('Native apply failed: '+value.lastOutcome.code);
      }
      throw Error('Native acknowledgement timed out');
    },{mode,generation:index+1});
    assert.equal(result.state,'completed');assert.equal(result.observed,null);
    assert.equal(result.acks,result.rows+1);assert.equal(result.peerIds.length,3);
    checks.push({mode,evidenceClass:'installed-chrome-api-ack',...result});
  }
  const persistence=await worker.evaluate(async()=>{
    const {runPersistenceBrowserTests}=await import(chrome.runtime.getURL('tests/persistence-browser.mjs'));
    return runPersistenceBrowserTests();
  });
  assert.equal(persistence.state,'PASS');
  const page=await browser.newPage();await page.goto(`chrome-extension://${id}/extension/mirror.html`);
  await page.locator('#authorize').click();
  await page.waitForFunction(()=>document.querySelectorAll('#menu [data-item-id]').length>0);
  const mirror=await page.evaluate(()=>({rows:document.querySelectorAll('#menu [data-item-id]').length,labels:[...document.querySelectorAll('#menu button')].map(b=>b.textContent)}));
  assert.equal(mirror.rows,checks.at(-1).rows);
  await page.locator('#menu button:enabled').first().click();
  await page.waitForFunction(()=>document.querySelector('#selection').textContent.length>0);
  const selection=JSON.parse(await page.locator('#selection').textContent());
  assert(!JSON.stringify(selection).includes('fixture-account'));
  console.log(JSON.stringify({state:'PASS',browserVersion:browser.browser().version(),checks,persistence,
    mirror:{state:'PASS',rows:mirror.rows,selection},
    limitations:[{gate:'native-menu-pixels-and-user-click',state:'NOT_TESTED',reason:'Headless Chrome API ACK and DOM mirror are distinct from native menu observation.'},
      {gate:'authenticated-provider-save',state:'BLOCKED',reason:'No authorized provider session/Worker credentials supplied; no cloud writes attempted.'},
      {gate:'MV3-suspend-during-write',state:'NOT_TESTED',reason:'No live authenticated write; only cold durable state and native epoch recovery tested separately.'}]},null,2));
  }
} finally {
  await browser?.close();await new Promise(r=>server?server.close(r):r());await rm(work,{recursive:true,force:true});
}
