// Runs against a headed, unpacked extension in a disposable X11 Chrome profile.
// Native menu rendering is observed through X11 screenshots, outside page DOM.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {chromium} from 'playwright-core';

const extension = resolve('dist/click2cloud');
const out = resolve(process.env.C2C_NATIVE_MENU_EVIDENCE ?? 'work/native-menu-browser');
const profile = await mkdtemp(join(tmpdir(), 'redown-native-menu-'));
const id = 'ajppphdiamdobknpamcheohmdbdbeoal';
const workerUrl = `chrome-extension://${id}/extension/background.mjs`;
const appUrl = `chrome-extension://${id}/extension/app.html`;
const report = {platform:process.platform, extensionId:id, scenarios:[]};
const server = createServer((req,res)=>{
 if(req.url==='/image.svg'){
  res.setHeader('Content-Type','image/svg+xml');
  res.end('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="teal"/></svg>');
  return;
 }
 res.setHeader('Content-Type','text/html');
 res.end('<title>Native menu checks</title><section style="width:700px;height:450px;padding:24px;background:#eee">Ordinary page <a href="/download">Image link</a><p><img src="/image.svg" alt="Test image"></p></section>');
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const pageUrl=`http://127.0.0.1:${server.address().port}/`;
await mkdir(out,{recursive:true});
await mkdir(join(profile,'Default'),{recursive:true});
await writeFile(join(profile,'Default','Preferences'),JSON.stringify({extensions:{pinned_extensions:[id]}}));
let context;
const input=(...args)=>execFileSync(process.env.C2C_SCREENSHOT_PYTHON??'python3',['tests/fixtures/screenshot-x11.py',...args]);
async function waitFor(predicate,label){
 for(let attempt=0;attempt<60;attempt++){
  const value=await predicate();if(value)return value;
  await sleep(150);
 }
 throw Error('Timed out waiting for '+label);
}
async function openChrome(){
 const executablePath=process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium';
 const browser=await chromium.launchPersistentContext(profile,{headless:false,executablePath,viewport:null,timeout:20000,
  ignoreDefaultArgs:['--disable-extensions'],args:['--no-sandbox','--window-position=0,0','--window-size=1300,900',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 report.browser=browser.browser().version();
 return browser;
}
async function readyWorker(){
 return waitFor(async()=>{
  const worker=context.serviceWorkers().find(item=>item.url()===workerUrl);
  const state=await worker?.evaluate(()=>globalThis.click2cloud?.registrar.inspect().lastOutcome?.state).catch(()=>null);
  return state==='completed'?worker:null;
 },'a current Chrome ACK');
}
function readScreen(file){
 execFileSync('import',['-window','root',file]);
 const data=execFileSync('tesseract',[file,'stdout','--psm','11','tsv'],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
 return data.trim().split('\n').slice(1).map(line=>line.split('\t')).filter(row=>row[11]?.trim());
}
async function nativeMenu(page, scenario, contextName, {click=false}={}){
 await page.bringToFront();input('focus');
 const element=contextName==='page'?null:page.locator(contextName==='image'?'img':'a');
 const box=element?await element.boundingBox():{x:420,y:260,width:2,height:2};
 const offset=await page.evaluate(()=>({top:screenY+outerHeight-innerHeight,left:screenX}));
 const x=Math.round(offset.left+box.x+box.width/2),y=Math.round(offset.top+box.y+box.height/2);
 input('click',String(x),String(y),'3');
 await sleep(220);
 const base=join(out,`${scenario}-${contextName}`);
 const top=readScreen(base+'.png');
 // The extension tab and the side-panel title can both read REDOWN.
 // Find the label next to the context gesture, below Chrome's tab strip.
 const group=top.find(row=>/^REDOWN$/i.test(row[11])&&Number(row[7])>=offset.top&&Math.abs(Number(row[6])-x)<280);
 assert(group,'Chrome native REDOWN group missing: '+top.map(row=>row[11]).join(' '));
 const point=row=>[String(Number(row[6])+Math.floor(Number(row[8])/2)),String(Number(row[7])+Math.floor(Number(row[9])/2))];
 // Select the actual parent row. Hover alone can leave a Chrome Views
 // submenu shut when the context menu opens under a stationary pointer.
 input('click',...point(group));
 let children,cloud;
 for(let attempt=0;attempt<8&&!cloud;attempt++){
  await sleep(175);
  children=readScreen(base+'-providers.png');
  cloud=children.find(row=>/^Cloudflare$/i.test(row[11]));
 }
 assert(cloud,'Chrome native Cloudflare action missing: '+children.map(row=>row[11]).join(' '));
 assert.equal(children.filter(row=>/^Cloudflare$/i.test(row[11])).length,1);
 if(click)input('click',...point(cloud));else{input('key','Escape');input('key','Escape');}
 report.scenarios.push({scenario,context:contextName,status:'PASS',proof:'OS-rendered native menu',selected:click?'Cloudflare':null});
}
async function normalPage(){const page=await context.newPage();await page.goto(pageUrl);return page;}

try{
 context=await openChrome();
 let worker=await readyWorker(),page=await normalPage();
 report.version=await worker.evaluate(()=>chrome.runtime.getManifest().version);
 assert.equal(report.version,'0.3.23');
 report.rows=await worker.evaluate(()=>click2cloud.registrar.inspect().desired.rows.map(({id,label,role,actionId})=>({id,label,role,actionId})));
 for(const name of ['page','image','link'])await nativeMenu(page,'first-install',name,{click:name==='page'});
 const outcome=await waitFor(()=>worker.evaluate(async()=>(await chrome.storage.local.get('lastSave')).lastSave),'actual native click outcome');
 assert.equal(outcome.state,'blocked');
 await sleep(350);
 execFileSync('import',['-window','root',join(out,'toolbar-and-side-panel.png')]);
 report.scenarios.push({scenario:'logged-out native click',status:'PASS',proof:'Chrome onClicked and production outcome',code:outcome.code});

 // Lose one actual Chrome row and stop the real service worker. A trusted
 // query wakes it without touching any native command. Warm clicks cannot
 // hide a bootstrap failure by doing the work themselves.
 const app=await context.newPage();await app.goto(appUrl);
 const cdp=await context.newCDPSession(app);
 const lifecycle=[];
 cdp.on('ServiceWorker.workerVersionUpdated',({versions})=>{
  for(const version of versions)if(version.scriptURL===workerUrl)lifecycle.push(version.runningStatus);
 });
 await cdp.send('ServiceWorker.enable');
 const cloudId=report.rows.find(row=>row.label==='Cloudflare').id;
 await worker.evaluate(itemId=>new Promise((ok,fail)=>chrome.contextMenus.remove(itemId,()=>chrome.runtime.lastError?fail(Error(chrome.runtime.lastError.message)):ok())),cloudId);
 const inspectAck=()=>app.evaluate(()=>chrome.runtime.sendMessage({
  channel:'engine',version:'3+1.1',method:'inspectNativeACK',params:{}
 }));
 async function readyFromShelf(phase){
  let last;
  try{
   return await waitFor(async()=>{
    last=await inspectAck().catch(()=>null);
    return last?.state==='completed'&&last.data?.lastOutcome?.state==='completed'?last.data:null;
   },'Chrome ACK after '+phase);
  }catch(error){
   report.lastAck=last?.data?.lastOutcome??last?.code;
   report.workerLifecycle=lifecycle;
   throw error;
  }
 }
 let stopped=false;
 worker.once('close',()=>{stopped=true;});
 lifecycle.length=0;
 await cdp.send('ServiceWorker.stopAllWorkers');
 await waitFor(()=>stopped||lifecycle.includes('stopped'),'Chrome to stop the extension service worker');
 const wake=await app.evaluate(()=>chrome.runtime.sendMessage({channel:'engine',version:'3+1.1',method:'getEngineHealth',params:{}}));
 assert.equal(wake.state,'completed');
 const ack=await readyFromShelf('worker wake');
 report.scenarios.push({scenario:'worker wake ACK',status:'PASS',proof:'Chrome service-worker stop and current registrar ACK',generation:ack.acknowledgedGeneration});
 await nativeMenu(page,'worker-wake-after-lost-row','page');
 await app.evaluate(()=>chrome.runtime.reload()).catch(error=>{
  if(!/closed|destroyed/i.test(error.message))throw error;
 });
 await waitFor(()=>app.goto(appUrl).catch(()=>null),'unpacked extension reload');
 await readyFromShelf('extension reload');
 await nativeMenu(page,'extension-reload','page');

 await context.close();
 context=await openChrome();page=await normalPage();
 await readyWorker();
 await nativeMenu(page,'browser-restart','page');
 report.result='PASS';
}catch(error){
 report.result='FAIL';report.error=error.message;process.exitCode=1;
}finally{
 await context?.close();server.close();await rm(profile,{recursive:true,force:true});
 await writeFile(join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
