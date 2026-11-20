import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createServer as https} from 'node:https';
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright-core';
import {digest} from '../src/cloudflare/wire.mjs';
import {BUILD_INFO} from '../dist/click2cloud/src/build-info.mjs';
import {CLOUDFLARE_SCOPES} from '../src/auth/cloudflare-oauth.mjs';
import {fixtureTarget,fixtureSession,fixtureSecret,localScreenshotWorker} from '../tests/fixtures/screenshot-worker.mjs';
// Headed Chrome for Testing on an isolated X11 display, with python-xlib
// available to python3. The Cloudflare APIs and R2 binding are local fixtures.
const out=resolve(process.env.C2C_SCREENSHOT_EVIDENCE??'work/screenshot-browser'),profile=await mkdtemp(join(tmpdir(),'c2c-screenshot-chrome-'));
await mkdir(out,{recursive:true});
const executablePath=process.env.C2C_CHROME_EXECUTABLE;
const workerHost='screenshot-local.qa.workers.dev',extension=resolve('dist/click2cloud');
const baseAccount='/client/v4/accounts/'+fixtureTarget.accountId+'/r2/buckets';
const bucketPath=baseAccount+'/'+fixtureTarget.bucketName;
const uploads=[],requests=[],checks=[];
const pause=(ms=100)=>new Promise(ok=>setTimeout(ok,ms));
async function wait(fn,label){
 for(let attempt=0;attempt<100;attempt++){
  let value;try{value=await fn();}catch(error){if(attempt===99)throw error;}
  if(value)return value;await pause();
 }
 throw Error('Timed out: '+label);
}
const input=(...args)=>execFileSync('python3',['tests/fixtures/screenshot-x11.py',...args]);
const local=await localScreenshotWorker({codeDigest:BUILD_INFO.workerCodeDigest});
const keys=join(profile,'fixture.pem'),cert=join(profile,'fixture.crt');
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-subj','/CN='+workerHost,'-days','1','-keyout',keys,'-out',cert],{stdio:'ignore'});
const resource=https({key:await readFile(keys),cert:await readFile(cert)},async (request,response)=>{
 try{
  const url=new URL('https://'+request.headers.host+request.url);
  requests.push({host:url.host,path:url.pathname});
  if(url.hostname===workerHost){
   const received=[];
   for await(const chunk of request)received.push(chunk);
   const body=Buffer.concat(received);
   if(url.pathname==='/screenshot'){
    const length=body.readUInt32BE(0),plan=JSON.parse(body.subarray(4,4+length)),png=body.subarray(4+length);
    uploads.push({plan,png});
   }
   const result=await local.dispatchFetch('https://local.invalid'+url.pathname,{method:'POST',headers:request.headers,body});
   response.writeHead(result.status,{'content-type':'application/json'});response.end(await result.text());return;
  }
  let result=null;
  if(url.pathname===baseAccount)result={buckets:[{name:fixtureTarget.bucketName}]};
  if(url.pathname===bucketPath)result={name:fixtureTarget.bucketName};
  if(url.pathname===bucketPath+'/objects')result={objects:[{key:'local-only/seed.txt',size:4,etag:'fixture'}],delimited:['local-only/']};
  response.writeHead(result===null?404:200,{'content-type':'application/json'});
  response.end(JSON.stringify({success:result!==null,result}));
 }catch(error){console.error('Local fixture',error.message);response.writeHead(500).end();}
});
const site=createServer((_req,res)=>res.writeHead(200,{'content-type':'text/html'}).end('<!doctype html><title>Screenshot viewport fixture</title><style>body{margin:0;background:#4369bb}section{height:125vh}footer{height:100vh;background:#ec6c52}</style><section></section><footer>Below fold</footer>'));
await Promise.all([new Promise((ok,no)=>{resource.once('error',no);resource.listen(443,'127.0.0.1',ok);}),new Promise(ok=>site.listen(0,'127.0.0.1',ok))]);
let browser;
try{
 browser=await chromium.launchPersistentContext(profile,{headless:false,executablePath,timeout:25000,viewport:null,
  args:['--no-sandbox','--no-proxy-server','--ignore-certificate-errors','--enable-unsafe-extension-debugging','--window-position=0,0','--window-size=1280,900',
   `--disable-extensions-except=${extension}`,`--load-extension=${extension}`,
   `--host-resolver-rules=MAP ${workerHost} 127.0.0.1, MAP api.cloudflare.com 127.0.0.1`],ignoreDefaultArgs:['--disable-extensions']});
 let service=browser.serviceWorkers()[0];
 if(!service){
  const cdp=await browser.browser().newBrowserCDPSession();
  console.log('CDP extension load',await cdp.send('Extensions.loadUnpacked',{path:extension}));
  service=browser.serviceWorkers()[0]??await browser.waitForEvent('serviceworker',{timeout:10000});
 }
 const installed=await service.evaluate(()=>chrome.commands.getAll());
 console.log('Assignments',JSON.stringify(installed));
 assert.equal(installed.find(entry=>entry.name==='screenshot.capture.alt-q').shortcut,'Alt+Q');
 assert.equal(installed.find(entry=>entry.name==='screenshot.capture.ctrl-shift-y').shortcut,'Ctrl+Shift+Y');
 assert.equal(installed.find(entry=>entry.name==='shelf.history.toggle').shortcut,'Alt+Shift+H');
 const c2c=service.url().split('/extension/')[0]+'/extension/app.html';
 const planKey=await digest([fixtureTarget.accountId,fixtureTarget.bucketName]);
 await service.evaluate(async ({target,key,codeDigest,scopes,secret,session,workerHost})=>{
  await click2cloud.ready;
  await chrome.storage.local.set({
   click2cloudOAuth:{sessionId:session,accessToken:'disposable-local-token',expiresAt:Date.now()+3600000,scopes,
    scopeEvidence:'provider-returned',accounts:[{id:target.accountId,name:'Screenshot test account'}]},
   ['remoteTransport:'+key]:{state:'ready',url:'https://'+workerHost+'/',accountId:target.accountId,bucketName:target.bucketName,
    protocol:'click2cloud-remote-2',secret,codeDigest,verifiedTargets:{'':{codeDigest}}}
  });
 },{target:fixtureTarget,key:planKey,codeDigest:BUILD_INFO.workerCodeDigest,scopes:CLOUDFLARE_SCOPES,secret:fixtureSecret,session:fixtureSession,workerHost});
 const app=await browser.newPage();await app.goto(c2c);
 app.on('pageerror',error=>console.error('App error',error.message));
 await app.getByRole('button',{name:'Sign out'}).waitFor();
 await app.locator('#header-more').click();
 assert.deepEqual(await app.locator('#header-menu > button:visible').allTextContents(),['Screenshot','Settings']);
 await app.getByRole('menuitem',{name:'Screenshot',exact:true}).click();
 await app.locator('#screenshot-form').getByRole('combobox').selectOption('domain');
 await app.getByRole('textbox',{name:'Website',exact:true}).fill('127.0.0.1');
 await app.getByRole('button',{name:'Choose directory'}).click();
 await app.getByRole('button',{name:'Screenshot test account'}).click();
 await app.getByRole('button',{name:'qa-screenshots',exact:true}).click();
 await app.getByRole('button',{name:'Use this directory'}).click();
 await app.getByRole('button',{name:'Save',exact:true}).click();
 await app.locator('.screenshot-card').waitFor();
 assert.equal(uploads.length,0);
 checks.push('R01/R02 screenshot card is visible on save, before any upload');
 const page=browser.pages()[0]??await browser.newPage();
 await page.goto('http://127.0.0.1:'+site.address().port+'/');
 await page.bringToFront();
 input('focus');
 input('click','420','400');
 const receipts=async()=>(await browser.serviceWorkers().at(-1)?.evaluate(()=>click2cloud.current.readScreenshotReceipts()).catch(()=>[]))??[];
 const contexts=()=>app.evaluate(()=>chrome.runtime.getContexts({contextTypes:['SIDE_PANEL']}));
 assert.equal((await contexts()).length,0);
 input('key','Alt_L','q');
 await wait(async()=>((await receipts()).some(job=>job.state==='confirmed')), 'Alt+Q receipt');
 input('key','Control_L','Shift_L','y');
 await wait(async()=>((await receipts()).filter(job=>job.state==='confirmed').length===2),'Ctrl+Shift+Y receipt');
 const jobs=(await receipts()).filter(job=>job.state==='confirmed');
 assert.equal(new Set(jobs.map(job=>job.plan.captureId)).size,2);
 assert.equal(uploads.length,2);
 assert.equal((await contexts()).length,0);
 const size=await page.evaluate(()=>[innerWidth,innerHeight]);
 assert.deepEqual(uploads.map(item=>[item.png.readUInt32BE(16),item.png.readUInt32BE(20)]),[size,size]);
 const r2=await local.getR2Bucket('STORAGE');
 for(const {plan,png} of uploads){
  const saved=await r2.get(plan.outputs[0].key);assert.deepEqual(Buffer.from(await saved.arrayBuffer()),png);
 }
 await writeFile(join(out,'installed-screenshot-receipt.json'),JSON.stringify(jobs[0],null,2));
 checks.push('S01-S04 actual Chromium key assignments, Shelf closed, independent captures, viewport size, local Worker/R2 checksum proof');
 input('key','Alt_L','Shift_L','h');
 const ui=await wait(async()=>{
  const panel=(await contexts())[0];
  if(!panel)return null;
  const values=await app.evaluate(()=>chrome.storage.session.get(null));
  return {panel,values:Object.fromEntries(Object.entries(values).filter(([key])=>key.startsWith('shelf-view:')))};
 },'open History shortcut');
 assert(ui.panel);
 await wait(async()=>{
  const state=await app.evaluate(()=>chrome.storage.session.get(null));
  return Object.values(state).some(value=>value?.open===true&&value.view==='history'&&value.intent===null);
 },'History view acknowledged');
 input('key','Alt_L','Shift_L','h');
 await wait(async()=> (await contexts()).length===0,'close History');
 checks.push('Real Chrome History command opens its Side Panel, routes to History, then closes the same panel');
 if(process.env.C2C_SCREENSHOT_NATIVE_MENU==='1'){
 await pause(1200);
 input('click','420','400','3');
 await pause(200);
 input('click','519','744');
 await pause(250);
 input('key','End');
 input('key','Right');
 await pause(200);
 execFileSync('import',['-window','root',join(out,'screenshot-menu.png')]);
 input('key','End');
 input('key','Return');
 await pause(350);
 const cdp=await browser.browser().newBrowserCDPSession();
 const appSession=await browser.newCDPSession(app);
 const appTarget=(await appSession.send('Target.getTargetInfo')).targetInfo.targetId;
 const target=await wait(async()=> (await cdp.send('Target.getTargets')).targetInfos.find(t=>t.url===c2c&&t.targetId!==appTarget),'native picker panel');
 const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false});
 let serial=0;
 async function evaluate(expression){
  const id=++serial;
  const result=new Promise((ok,fail)=>{
   const listener=event=>{
    const message=JSON.parse(event.message);
    if(event.sessionId!==sessionId||message.id!==id)return;
    cdp.off('Target.receivedMessageFromTarget',listener);clearTimeout(timer);
    if(message.result?.exceptionDetails)fail(Error('Side Panel evaluation failed'));
    else ok(message.result.result.value);
   };
   const timer=setTimeout(()=>{cdp.off('Target.receivedMessageFromTarget',listener);fail(Error('Side Panel evaluation timed out'));},5000);
   cdp.on('Target.receivedMessageFromTarget',listener);
  });
  await cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}})});
  return result;
 }
 await wait(()=>evaluate("document.querySelector('#screenshot-one-off')!==null"),'native one-off form') ;
 const click=label=>wait(()=>evaluate(`(()=>{const b=[...document.querySelectorAll('#screenshot-one-off button')].find(b=>b.textContent===${JSON.stringify(label)}&&!b.disabled);b?.click();return !!b;})()`),label);
 await click('Choose directory');await click('Screenshot test account');await click('qa-screenshots');
 await click('local-only');await click('Use this directory');await click('Capture and save');
 const native=await wait(async()=> (await receipts()).find(job=>job.plan.commandId==='screenshot.one-off'&&job.state==='confirmed'),'native one-off receipt');
 assert.equal(native.outputs.length,1);
 assert.equal(native.plan.outputs[0].target.prefix,'local-only/');
 assert.equal(uploads.length,3);
 assert.deepEqual(native.plan.matchedRuleIds,[]);
 checks.push('R12 real browser right-click Screenshot picker writes only the selected exact folder');
 await cdp.send('Target.detachFromTarget',{sessionId});
 }
 console.log(JSON.stringify({browser:browser.browser().version(),checks,uploads:uploads.map(item=>({captureId:item.plan.captureId,bytes:item.png.length}))},null,2));
}catch(error){
 console.error(error,JSON.stringify({checks,requests,uploads:uploads.length}));

 process.exitCode=1;
}finally{await browser?.close();await local.dispose();await Promise.all([new Promise(ok=>site.close(ok)),new Promise(ok=>resource.close(ok))]);await rm(profile,{recursive:true,force:true});}
