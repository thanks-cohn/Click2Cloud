import assert from 'node:assert/strict';
import {createServer as https} from 'node:https';
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright-core';
import {createHash} from 'node:crypto';
import {fixtureTarget,fixtureSession} from '../tests/fixtures/screenshot-worker.mjs';
import {digest} from '../src/cloudflare/wire.mjs';
// Real installed, headed Chromium. OAuth identity and the R2 API use an
// isolated HTTPS fixture. No credentials or live buckets are used.
const out=resolve(process.env.C2C_SCREENSHOT_EVIDENCE??'work/screenshot-browser'),profile=await mkdtemp(join(tmpdir(),'c2c-screenshot-chrome-'));
await mkdir(out,{recursive:true});
const executablePath=process.env.C2C_CHROME_EXECUTABLE;
const siteHost='screenshot.example.test',extension=resolve('dist/click2cloud');
const bucketBase='/client/v4/accounts/'+fixtureTarget.accountId+'/r2/buckets';
const manifest=JSON.parse(await readFile(join(extension,'manifest.json'),'utf8'));
assert.equal(manifest.version,'0.3.21');
const uploads=[],requests=[],checks=[],objects=new Map();
let denied=true;
const pause=(ms=100)=>new Promise(ok=>setTimeout(ok,ms));
async function wait(fn,label){
 for(let attempt=0;attempt<100;attempt++){
  let value;try{value=await fn();}catch(error){if(attempt===99)throw error;}
  if(value)return value;await pause();
 }
 throw Error('Timed out: '+label);
}
const input=(...args)=>execFileSync(process.env.C2C_SCREENSHOT_PYTHON??'python3',['tests/fixtures/screenshot-x11.py',...args]);
const keys=join(profile,'fixture.pem'),cert=join(profile,'fixture.crt');
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-subj','/CN='+siteHost,'-days','1','-keyout',keys,'-out',cert],{stdio:'ignore'});
const resource=https({key:await readFile(keys),cert:await readFile(cert)},async (request,response)=>{
 const json=(status,result,errors=[])=>response.writeHead(status,{'content-type':'application/json'})
  .end(JSON.stringify({success:status===200,result,errors}));
 try{
  const url=new URL('https://'+request.headers.host+request.url);
  if(url.hostname===siteHost){
   response.writeHead(200,{'content-type':'text/html'}).end('<!doctype html><title>Screenshot viewport fixture</title><style>body{margin:0;background:#4369bb}section{height:125vh}footer{height:100vh;background:#ec6c52}</style><section></section><footer>Below fold</footer>');return;
  }
  requests.push({method:request.method,host:url.host,path:url.pathname});
  assert.equal(url.hostname,'api.cloudflare.com');
  assert.equal(request.headers.authorization,'Bearer disposable-local-token');
  if(url.pathname===bucketBase)return json(200,{buckets:[{name:'redown'},{name:'qa-screenshots'}]});
  const suffix=url.pathname.slice(bucketBase.length);
  const [,bucket,resourceName,...segments]=suffix.split('/');
  if(!['redown','qa-screenshots'].includes(bucket))return json(404,null,[{code:10006}]);
  if(!resourceName)return json(200,{name:bucket});
  if(resourceName!=='objects')return json(404,null);
  if(!segments.length){
   const folders=bucket==='redown'?['One/','Two/','Native/']:['Three/'];
   return json(200,{objects:[],delimited:url.searchParams.get('prefix')?[]:folders});
  }
  const key=segments.map(decodeURIComponent).join('/');
  const full=bucket+'/'+key;
  if(request.method==='GET'){
   const png=objects.get(full);
   if(!png)return json(404,null,[{code:10007}]);
   response.writeHead(200,{'content-type':'image/png','content-length':png.length}).end(png);return;
  }
  assert.equal(request.method,'PUT');
  assert.equal(request.headers['content-type'],'image/png');
  const received=[];
  for await(const chunk of request)received.push(chunk);
  const png=Buffer.concat(received);
  uploads.push({bucket,key,png});
  if(key.startsWith('Three/')&&denied)return json(403,null,[{code:10000,message:'Bucket action forbidden'}]);
  if(objects.has(full))return json(412,null);
  objects.set(full,png);
  return json(200,{key,size:String(png.length)});
 }catch(error){console.error('Local fixture',error.message);response.writeHead(500).end();}
});
await new Promise((ok,no)=>{resource.once('error',no);resource.listen(0,'127.0.0.1',ok);});
let browser;
try{
 browser=await chromium.launchPersistentContext(profile,{headless:false,executablePath,timeout:25000,viewport:null,
  args:['--no-sandbox','--disable-gpu','--no-proxy-server','--ignore-certificate-errors','--enable-unsafe-extension-debugging','--window-position=0,0','--window-size=1280,900',
   `--host-resolver-rules=MAP ${siteHost} 127.0.0.1:${resource.address().port}, MAP api.cloudflare.com 127.0.0.1:${resource.address().port}`],ignoreDefaultArgs:['--disable-extensions']});
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
 const grants=['workers-r2.read','workers-r2-bucket-item.read','workers-r2-bucket-item.write'];
 await service.evaluate(async ({target,grants,session})=>{
  await click2cloud.ready;
  await chrome.storage.local.set({
   click2cloudOAuth:{sessionId:session,accessToken:'disposable-local-token',expiresAt:Date.now()+3600000,scopes:grants,
    scopeEvidence:'provider-returned',accounts:[{id:target.accountId,name:'Screenshot test account'}]}
  });
 },{target:fixtureTarget,grants,session:fixtureSession});
 const app=await browser.newPage();await app.goto(c2c);
 app.on('pageerror',error=>console.error('App error',error.message));
 app.setDefaultTimeout(8000);
 await app.getByRole('button',{name:'Sign out'}).waitFor();
 async function openScreenshot(){
  await app.locator('#header-more').click();
  assert.deepEqual(await app.locator('#header-menu > button:visible').allTextContents(),['Screenshot','Settings']);
  await app.getByRole('menuitem',{name:'Screenshot',exact:true}).click();
 }
 await openScreenshot();
 const defaultCard=app.locator('.screenshot-card').filter({hasText:'Default Screenshots'});
 await defaultCard.getByText('All websites',{exact:true}).waitFor();
 assert.match(await defaultCard.innerText(),/redown\/screenshots\//);
 assert.equal(uploads.length,0);
 const page=browser.pages()[0]??await browser.newPage();
 await page.goto('https://'+siteHost+'/');
 await page.bringToFront();
 input('focus');
 input('click','420','400');
 const receipts=async()=>(await browser.serviceWorkers().at(-1)?.evaluate(()=>click2cloud.current.readScreenshotReceipts()).catch(()=>[]))??[];
 const contexts=()=>app.evaluate(()=>chrome.runtime.getContexts({contextTypes:['SIDE_PANEL']}));
 assert.equal((await contexts()).length,0);
 input('key','Alt_L','q');
 const single=await wait(async()=>(await receipts()).find(job=>job.state==='confirmed'),'Alt+Q direct R2 receipt');
 assert.equal(single.outputs.length,1);
 assert.equal(uploads.length,1);
 assert.match(uploads[0].key,/^screenshots\/Screenshot-/);
 assert.equal(single.outputs[0].verification,'direct-r2-get-sha256');
 const size=await page.evaluate(()=>[innerWidth,innerHeight]);
 assert.deepEqual([uploads[0].png.readUInt32BE(16),uploads[0].png.readUInt32BE(20)],size);
 assert.equal(createHash('sha256').update(objects.get('redown/'+uploads[0].key)).digest('hex'),single.captured.sha256);
 checks.push('Alt+Q with Shelf closed captured the HTTPS viewport and saved the exact PNG to the fresh redown/screenshots/ card');
 const staleKey='remoteTransport:'+await digest([fixtureTarget.accountId,'qa-screenshots']);
 await service.evaluate(async ({key,accountId})=>chrome.storage.local.set({[key]:{
  state:'ready',accountId,bucketName:'qa-screenshots',codeDigest:'superseded-fixture-digest',
  url:'https://stale-screenshot-fixture.invalid/',protocol:'click2cloud-remote-1'
 }}),{key:staleKey,accountId:fixtureTarget.accountId});
 await app.bringToFront();
 await defaultCard.getByRole('button',{name:'Delete Default Screenshots'}).click();
 await defaultCard.waitFor({state:'detached'});
 await app.reload();await openScreenshot();
 await app.locator('#screenshot-form').getByRole('button',{name:'Choose folders'}).click();
 const form=app.locator('#screenshot-form');
 await form.getByRole('button',{name:'Screenshot test account'}).click();
 await form.getByRole('button',{name:'Browse redown'}).click();
 const firstFolder=form.getByRole('checkbox',{name:'One',exact:true});
 await firstFolder.check();await firstFolder.uncheck();await firstFolder.check();
 await form.getByRole('checkbox',{name:'Two',exact:true}).check();
 await form.getByRole('button',{name:'Back'}).click();
 await form.getByRole('button',{name:'Browse qa-screenshots'}).click();
 await form.getByRole('checkbox',{name:'Three',exact:true}).check();
 await form.getByText('3 selected',{exact:true}).waitFor();
 assert.equal(await form.getByText('Use this directory',{exact:true}).count(),0);
 await form.getByRole('button',{name:'Save',exact:true}).click();
 const card=app.locator('.screenshot-card');
 await card.waitFor();
 assert.equal(await card.count(),1);
 assert.match(await card.innerText(),/redown\/One\/.*redown\/Two\/.*qa-screenshots\/Three\//s);
 assert.equal(uploads.length,1);
 await card.locator('[data-rule-edit]').click();
 await app.locator('#screenshot-editor').getByRole('button',{name:/Remove redown\/One/}).click();
 await app.keyboard.press('Escape');
 await app.locator('#dialog').waitFor({state:'hidden'});
 assert.match(await card.innerText(),/redown\/One\//);
 checks.push('Three folder selections across two buckets and one Save produced one card and zero uploads; Escape discarded the editor draft');
 await page.bringToFront();input('focus');input('click','420','400');
 input('key','Control_L','Shift_L','y');
 const partial=await wait(async()=>(await receipts()).find(job=>job.state==='partial'),'Ctrl+Shift+Y partial direct R2 receipt');
 assert.notEqual(partial.plan.captureId,single.plan.captureId);
 assert.equal(partial.plan.matchedRuleIds.length,1);
 assert.deepEqual(partial.outputs.map(out=>out.state),['confirmed','confirmed','blocked']);
 assert.equal(partial.outputs[2].code,'R2_BUCKET_ACCESS_DENIED');
 assert.equal(partial.outputs[2].httpStatus,403);
 assert.equal(uploads.length,4);
 assert.deepEqual(uploads.slice(1).map(({bucket,key})=>bucket+'/'+key).sort(),
  partial.plan.outputs.map(({target,key})=>target.bucketName+'/'+key).sort());
 assert(uploads.slice(1).every(item=>item.png.equals(uploads[1].png)));
 const rejected=uploads.slice(1).find(({bucket,key})=>bucket==='qa-screenshots'&&key===partial.plan.outputs[2].key);
 assert.equal((await contexts()).length,0);
 checks.push('Ctrl+Shift+Y with Shelf closed sent the same PNG to all three exact keys, including a bucket with a stale Worker record. Fixture HTTP 403 left two verified and one retryable');
 denied=false;
 await app.bringToFront();
 await app.locator('button[data-view="history"]:visible').click();
 const partialRow=app.locator('[data-operation="'+partial.plan.operationId+'"]');
 await partialRow.locator('summary').click();
 await partialRow.getByRole('button',{name:'Retry unconfirmed files'}).click();
 const retried=await wait(async()=>(await receipts()).find(job=>job.plan.operationId===partial.plan.operationId&&job.state==='confirmed'),'History direct retry');
 assert.deepEqual(retried.plan.outputs,partial.plan.outputs);
 assert.deepEqual(retried.outputs.slice(0,2),partial.outputs.slice(0,2));
 assert.equal(uploads.length,5);
 assert.equal(uploads[4].bucket,rejected.bucket);
 assert.equal(uploads[4].key,rejected.key);
 assert(rejected.png.equals(uploads[4].png));
 for(const output of retried.plan.outputs){
  assert.equal(createHash('sha256').update(objects.get(output.target.bucketName+'/'+output.key)).digest('hex'),retried.captured.sha256);
 }
 const diagnostics=await app.evaluate(async operationId=>{
  const call=async(method,params)=>{
   const response=await chrome.runtime.sendMessage({channel:'recorder',version:2,method,params});
   if(response?.state!=='completed')throw Error(response?.code??'RECORDER_UNAVAILABLE');
   return response.data;
  };
  await call('debug',{enabled:true});
  const snapshot=await call('snapshot',{scope:'screenshot-to-cloud'});
  const getPage=params=>call('page',{...params,snapshotId:snapshot.id});
  const {exportComplete}=await import(chrome.runtime.getURL('src/recorder/export.mjs'));
  const archive=await exportComplete({snapshot,getPage,privacy:'SECURE'});
  const page=await getPage({privacy:'SECURE'});
  return {receipt:page.transfers.find(job=>job.operationId===operationId),
   zip:[...new Uint8Array(await archive.blob.arrayBuffer())],count:archive.counts.transfersExported};
 },retried.plan.operationId);
 assert.equal(diagnostics.count,2);
 const receiptExport=diagnostics.receipt;
 assert.deepEqual(receiptExport.traceGaps,[]);
 assert(!JSON.stringify(receiptExport).includes(siteHost));
 await writeFile(join(out,'screenshot-fixture-secure.zip'),Buffer.from(diagnostics.zip));
 await writeFile(join(out,'installed-screenshot-receipt.json'),JSON.stringify({single,partial,retried,secure:receiptExport},null,2));
 checks.push('History Retry verified only the originally denied output with the same capture ID, output ID, key and PNG; SECURE trace has no gaps or URLs');
 await page.bringToFront();input('focus');
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
 await click('Choose folders');await click('Screenshot test account');
 await wait(()=>evaluate(`(()=>{const b=document.querySelector('#screenshot-one-off button[aria-label="Browse redown"]');b?.click();return !!b;})()`),'browse redown');
 await wait(()=>evaluate(`(()=>{const label=[...document.querySelectorAll('#screenshot-one-off label')].find(item=>item.textContent.trim()==='Native');label?.querySelector('input').click();return !!label;})()`),'select Native/');
 await click('Capture and save');
 const native=await wait(async()=> (await receipts()).find(job=>job.plan.commandId==='screenshot.one-off'&&job.state==='confirmed'),'native one-off receipt');
 assert.equal(native.outputs.length,1);
 assert.equal(native.plan.outputs[0].target.prefix,'Native/');
 assert.equal(uploads.length,6);
 assert.deepEqual(native.plan.matchedRuleIds,[]);
 checks.push('R12 real browser right-click Screenshot picker writes only the selected exact folder');
 await cdp.send('Target.detachFromTarget',{sessionId});
 }
 await page.goto('chrome://version/');
 await page.bringToFront();input('focus');input('key','Alt_L','q');
 const restricted=await wait(async()=>(await receipts()).find(job=>job.code==='SCREENSHOT_PAGE_UNSUPPORTED'||job.code==='TAB_URL_UNAVAILABLE'),'restricted page receipt');
 assert.equal(restricted.outputs.length,0);
 assert.equal(uploads.length,process.env.C2C_SCREENSHOT_NATIVE_MENU==='1'?6:5);
 checks.push('Chrome internal page produced a capture failure with zero uploads');
 const evidence={browser:browser.browser().version(),extensionId:service.url().split('/')[2],manifestVersion:manifest.version,
  checks,uploads:uploads.map(({bucket,key,png})=>({bucket,key,bytes:png.length})),requests};
 console.log(JSON.stringify(evidence,null,2));
 await writeFile(join(out,'results.json'),JSON.stringify(evidence,null,2));
}catch(error){
 console.error(error,JSON.stringify({checks,requests,uploads:uploads.length}));

 process.exitCode=1;
}finally{await browser?.close();await new Promise(ok=>resource.close(ok));await rm(profile,{recursive:true,force:true});}
