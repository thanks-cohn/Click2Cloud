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
const searchHosts=['search-one.example','search-two.test','search-three.invalid'];
const bucketBase='/client/v4/accounts/'+fixtureTarget.accountId+'/r2/buckets';
const manifest=JSON.parse(await readFile(join(extension,'manifest.json'),'utf8'));
assert.equal(manifest.version,'0.3.21');
const uploads=[],requests=[],checks=[],objects=new Map();
const publicBuckets=new Set(),attached=new Map(),customWrites=[];
let showLongDomainList=false;
const qaDomain='pub-632e30fd.r2.dev',zoneId='c'.repeat(32),connectedDomain='new.screenshot.example.test';
const activeDomain=domain=>({domain,enabled:true,zoneId,zoneName:'screenshot.example.test',status:{ownership:'active',ssl:'active'}});
const etag=bytes=>`"${createHash('sha256').update(bytes).digest('hex')}"`;
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
  if(url.hostname===siteHost||searchHosts.includes(url.hostname)){
   response.writeHead(200,{'content-type':'text/html'}).end('<!doctype html><title>Viewport fixture</title><style>body{margin:0;background:#4369bb}section{height:125vh}footer{height:100vh;background:#ec6c52}</style><section><a href="/linked" style="position:absolute;left:180px;top:180px;color:white">Fixture link</a><img alt="Fixture image" width="100" height="70" style="position:absolute;left:300px;top:180px" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></section><footer>Below fold</footer>');return;
  }
  requests.push({method:request.method,host:url.host,path:url.pathname});
  assert.equal(url.hostname,'api.cloudflare.com');
  assert.equal(request.headers.authorization,'Bearer disposable-local-token');
  if(url.pathname===bucketBase)return json(200,{buckets:[{name:'redown'},{name:'qa-screenshots'}]});
  const suffix=url.pathname.slice(bucketBase.length);
  const [,bucket,resourceName,...segments]=suffix.split('/');
  if(!['redown','qa-screenshots'].includes(bucket))return json(404,null,[{code:10006}]);
  if(!resourceName)return json(200,{name:bucket});
  if(resourceName==='domains'){
   const [type]=segments;
   if(type==='managed'){
    if(request.method==='PUT'){
     const chunks=[];for await(const chunk of request)chunks.push(chunk);
     assert.deepEqual(JSON.parse(Buffer.concat(chunks)),{enabled:true});publicBuckets.add(bucket);
    }
    return json(200,{enabled:publicBuckets.has(bucket),domain:qaDomain,bucketId:bucket});
   }
   if(type==='custom'){
    if(request.method==='POST'){
     const chunks=[];for await(const chunk of request)chunks.push(chunk);
     const data=JSON.parse(Buffer.concat(chunks));customWrites.push({bucket,...data});
     if(data.zoneId!==zoneId||data.domain!==connectedDomain)return json(400,null,[{code:10012}]);
     attached.set(bucket,0);return json(200,data);
    }
    const domains=bucket==='redown'?[activeDomain('cdn.screenshot.example.test'),activeDomain('images.screenshot.example.test')]:[];
    if(bucket==='redown'&&showLongDomainList)for(let index=0;index<98;index++)domains.push(activeDomain(`custom-${index}.screenshot.example.test`));
    if(attached.has(bucket)){
     const reads=attached.get(bucket)+1;attached.set(bucket,reads);
     domains.push(reads>=3?activeDomain(connectedDomain):{...activeDomain(connectedDomain),status:{ownership:'active',ssl:'initializing'}});
    }
    return json(200,{domains});
   }
  }
  if(resourceName!=='objects')return json(404,null);
  if(!segments.length){
   const folders=bucket==='redown'?['One/','Two/','Native/']:['Three/'];
   const prefix=url.searchParams.get('prefix')??'',delimiter=url.searchParams.get('delimiter');
   const files=[...objects].flatMap(([identity,bytes])=>{
    if(!identity.startsWith(bucket+'/'+prefix))return [];
    const key=identity.slice(bucket.length+1);
    if(delimiter&&key.slice(prefix.length).includes(delimiter))return [];
    return [{key,size:String(bytes.length),etag:etag(bytes),uploaded:'2026-11-20T10:00:00Z'}];
   });
   return json(200,{objects:files,delimited:prefix?[]:folders});
  }
  const key=segments.map(decodeURIComponent).join('/');
  const full=bucket+'/'+key;
  if(request.method==='GET'){
   const png=objects.get(full);
   if(!png)return json(404,null,[{code:10007}]);
   response.writeHead(200,{'content-type':'image/png','content-length':png.length,etag:etag(png)}).end(png);return;
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
   '--lang=en-US',`--host-resolver-rules=${[siteHost,...searchHosts,'api.cloudflare.com'].map(host=>`MAP ${host} 127.0.0.1:${resource.address().port}`).join(', ')}`],ignoreDefaultArgs:['--disable-extensions']});
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
  assert.deepEqual(await app.locator('#header-menu > button:visible').allTextContents(),['Screenshots','Settings']);
  await app.getByRole('menuitem',{name:'Screenshots',exact:true}).click();
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
 const assertQuiet=async()=>assert.deepEqual(Object.keys(await service.evaluate(()=>chrome.notifications.getAll())).filter(id=>id.startsWith('screenshot-')),[]);
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
 await assertQuiet();
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
 await assertQuiet();
 assert.equal((await contexts()).length,0);
 checks.push('Ctrl+Shift+Y with Shelf closed sent the same PNG to all three exact keys, including a bucket with a stale Worker record. Fixture HTTP 403 left two verified and one retryable');
 denied=false;
 await app.bringToFront();
 await app.locator('button[data-view="history"]:visible').click();
 const partialRow=app.locator('[data-operation="'+partial.plan.operationId+'"]');
 await partialRow.getByText('2 of 3 files verified',{exact:true}).click();
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
 await assertQuiet();
 checks.push('Screenshot success, partial result and retry leave no screenshot desktop notifications');
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
 const cards=partialRow.locator('.screenshot-destination');
 await cards.nth(2).getByText(/Verified · R2 GET/).waitFor();
 assert.equal(await cards.count(),3);
 assert.equal(await partialRow.locator('[data-preview]').count(),1);
 const qaUrls=cards.nth(2).locator('[data-output-urls]');
 const qaKey=retried.plan.outputs[2].key,publicPath=qaKey.split('/').map(encodeURIComponent).join('/');
 assert.equal(requests.filter(r=>r.path.includes('/domains/')).length,0,'History and thumbnail reads stay private');
 await qaUrls.getByText('URLs',{exact:true}).click();
 await qaUrls.getByText('No public domain configured.',{exact:true}).waitFor();
 assert.equal(await partialRow.locator('[data-output-urls][open]').count(),1);
 assert(requests.filter(r=>r.path.includes('/domains/')).every(r=>r.path.includes('/qa-screenshots/')));
 const enable=qaUrls.getByRole('button',{name:'Enable public URLs for this bucket'});
 app.once('dialog',prompt=>prompt.dismiss());await enable.click();
 assert.equal(publicBuckets.size,0);
 app.once('dialog',prompt=>prompt.accept());await enable.click();
 await qaUrls.getByText(/Cloudflare requires R2 bucket permissions/).waitFor();
 assert.equal(publicBuckets.size,0);
 await service.evaluate(async()=>{
  const {click2cloudOAuth:session}=await chrome.storage.local.get('click2cloudOAuth');
  await chrome.storage.local.set({click2cloudOAuth:{...session,scopes:[...session.scopes,'workers-r2.write']}});
 });
 await qaUrls.getByRole('button',{name:'Refresh',exact:true}).click();
 app.once('dialog',prompt=>prompt.accept());await enable.click();
 await qaUrls.getByText(`https://${qaDomain}/${publicPath}`,{exact:true}).waitFor();
 assert.deepEqual([...publicBuckets],['qa-screenshots']);
 await qaUrls.getByRole('button',{name:/Development URL https/}).click();
 await qaUrls.getByText('URL copied.',{exact:true}).waitFor();
 const domainInput=qaUrls.getByRole('textbox',{name:'Custom domain'});
 await domainInput.fill(connectedDomain);
 const connect=qaUrls.getByRole('button',{name:'Connect domain',exact:true});
 app.once('dialog',prompt=>prompt.accept());await connect.click();
 const zone=qaUrls.getByRole('textbox',{name:'Cloudflare Zone ID'});
 await zone.waitFor();
 assert.equal(customWrites.length,0);
 await zone.fill(zoneId);
 app.once('dialog',prompt=>prompt.accept());await connect.click();
 await qaUrls.getByText(`https://${connectedDomain}/${publicPath}`,{exact:true}).waitFor();
 assert.equal(customWrites.length,1);
 assert.equal(await qaUrls.getByRole('link',{name:/Open (Development URL|Custom domain)/}).count(),2);
 assert.equal(await cards.nth(0).locator('[data-output-urls]').getAttribute('open'),null);
 await qaUrls.getByText('URLs',{exact:true}).click();
 const redownUrls=cards.nth(1).locator('[data-output-urls]');
 await redownUrls.getByText('URLs',{exact:true}).click();
 await redownUrls.getByRole('link',{name:/Open Custom domain for cdn/}).waitFor();
 assert.equal(await redownUrls.getByRole('link',{name:/Open Custom domain/}).count(),2);
 assert.equal(await redownUrls.getByRole('button',{name:'Enable public URLs for this bucket'}).count(),0);
 await app.screenshot({path:join(out,'history-destination-urls.png')});
 checks.push('History gives each output its own URL disclosure, preserves custom-only URLs, and publishes or attaches only the selected bucket after consent');

 await app.evaluate(()=>caches.delete('click2cloud-screenshot-retry-v1'));
 await app.reload();
 const previewReads=requests.length;
 await app.getByRole('button',{name:'History',exact:true}).click();
 const thumbnail=partialRow.locator('[data-preview] img');
 await thumbnail.waitFor();
 assert(await thumbnail.evaluate(image=>image.naturalWidth>0&&image.naturalHeight>0));
 assert.equal(await partialRow.locator('img').count(),1);
 assert(requests.slice(previewReads).some(r=>r.method==='GET'&&r.path.endsWith('/objects/'+retried.plan.outputs[0].key)));
 await app.screenshot({path:join(out,'history-verified-thumbnail.png')});
 for(let index=0;index<3;index++){
  const leaf=retried.plan.outputs[index].key.split('/').at(-1);
  await cards.nth(index).locator('[data-screenshot-goto]').click();
  const selected=app.locator('#files [aria-selected=true]').filter({hasText:leaf});await selected.waitFor();
  assert.equal(await selected.count(),1);
  await app.getByRole('button',{name:'History',exact:true}).click();
 }
 checks.push('After the retry image cache is deleted and the app reloads, History reads one R2 thumbnail and all three GO TO buttons select their own recorded file');
 const bytes=Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
 const populated=structuredClone(retried),historicalId=crypto.randomUUID(),captureId=crypto.randomUUID();
 const checksum=createHash('sha256').update(bytes).digest('hex');
 populated.plan={...populated.plan,captureId,operationId:historicalId,startedAt:new Date().toISOString(),outputs:[]};
 populated.captured={...populated.captured,bytes:bytes.length,sha256:checksum};
 populated.finishedAt=new Date().toISOString();populated.attempts=[];populated.outputs=[];
 for(let index=1;index<=100;index++){
  const outputId=captureId+'-'+index,key='One/legacy-image-'+index;
  populated.plan.outputs.push({outputId,key,target:{...fixtureTarget,bucketName:'redown',prefix:'One/'},ruleIds:[]});
  populated.outputs.push({outputId,state:'confirmed',verification:'direct-r2-get-sha256',bytes:bytes.length,checksum});
  objects.set('redown/'+key,bytes);
 }
 await service.evaluate(screenshot=>click2cloud.current.recordRemoteResult({kind:'screenshot-to-cloud',operationId:screenshot.plan.operationId,
  state:'confirmed',code:'SCREENSHOT_SAVED',screenshot}),populated);
 await app.getByRole('button',{name:'History',exact:true}).click();
 const long=app.locator(`[data-operation="${historicalId}"]`),longCards=long.locator('.screenshot-destination');
 await long.locator('.history-preview img').waitFor();
 assert.equal(await long.locator('img').count(),1);
 assert.equal(await longCards.count(),100);
 assert(await long.evaluate(entry=>entry.scrollHeight>entry.clientHeight));
 const last=longCards.last(),lastUrls=last.locator('[data-output-urls]');
 showLongDomainList=true;
 await lastUrls.getByText('URLs',{exact:true}).click();
 await wait(async()=>await lastUrls.getByRole('link',{name:/Open Custom domain/}).count()===100,'100 exact URLs in the last History card');
 const lastOpen=lastUrls.getByRole('link',{name:/Open Custom domain/}).last();
 await lastOpen.focus();
 assert(await lastOpen.evaluate(node=>node===document.activeElement));
 assert(await lastUrls.locator('.history-public-list').evaluate(el=>el.scrollHeight>el.clientHeight&&el.scrollTop>0));
 assert(await long.evaluate(entry=>entry.scrollTop>0&&entry.scrollWidth<=entry.clientWidth));
 assert((await lastOpen.getAttribute('href')).endsWith('/One/legacy-image-100'));
 await last.locator('[data-screenshot-goto]').click();
 await app.locator('#files [aria-selected=true]').filter({hasText:'legacy-image-100'}).waitFor();
 checks.push('A retained test capture with a GIF at an extensionless key has one thumbnail; all 100 destination cards and 100 domain links are reachable');
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
 const cdp=await browser.browser().newBrowserCDPSession();
 const appSession=await browser.newCDPSession(app);
 const appTarget=(await appSession.send('Target.getTargetInfo')).targetInfo.targetId;
 async function inspectShelf(){
  const target=await wait(async()=> (await cdp.send('Target.getTargets')).targetInfos.find(t=>t.url===c2c&&t.targetId!==appTarget),'Explorer Shelf');
  const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false});
  let serial=0;
  function evaluate(expression){
   const id=++serial;
   return new Promise((resolve,reject)=>{
    const listener=event=>{
     const message=JSON.parse(event.message);
     if(event.sessionId!==sessionId||message.id!==id)return;
     cleanup();
     if(message.result?.exceptionDetails)reject(Error('Side Panel evaluation failed'));
     else resolve(message.result.result.value);
    };
    const cleanup=()=>{cdp.off('Target.receivedMessageFromTarget',listener);clearTimeout(timer);};
    const timer=setTimeout(()=>{cleanup();reject(Error('Side Panel evaluation timed out'));},5000);
    cdp.on('Target.receivedMessageFromTarget',listener);
    void cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}})})
     .catch(error=>{cleanup();reject(error);});
   });
  }
  return {evaluate,detach:()=>cdp.send('Target.detachFromTarget',{sessionId})};
 }
 assert.equal(installed.find(entry=>entry.name==='shelf.explorer.search').shortcut,'');
 const shortcutPage=await browser.newPage();await shortcutPage.goto('chrome://extensions/shortcuts');
 const searchCommand=shortcutPage.locator('.command-entry').filter({hasText:'Open File Explorer and focus filename search'});
 await searchCommand.getByRole('button',{name:/edit/i}).click();
 await shortcutPage.keyboard.press('Alt+Shift+F');
 const chromeBinding=()=>service.evaluate(async()=>(await chrome.commands.getAll()).find(command=>command.name==='shelf.explorer.search')?.shortcut);
 await wait(async()=>await chromeBinding()==='Alt+Shift+F','configured Chrome shortcut');
 await shortcutPage.close();
 for(const host of searchHosts){
  await page.goto('https://'+host+'/');
  await page.bringToFront();input('focus');input('click','420','400');
  input('key','Alt_L','Shift_L','f');
  const shelf=await inspectShelf();
  const searchFocused="!!document.querySelector('#filename-search-popout:not([hidden]) #filename-search:focus')";
  await wait(()=>shelf.evaluate(searchFocused),'Explorer pop-out search focused');
  input('key','x');
  await wait(()=>shelf.evaluate("document.querySelector('#filename-search')?.value==='x'"),'real typed filename query');
  input('key','Return');
  assert(await shelf.evaluate("!document.querySelector('#filename-search-popout').hidden"));
  input('key','Escape');
  await wait(()=>shelf.evaluate("document.querySelector('#filename-search-popout').hidden"),'Escape dismisses Search');
  if(host===searchHosts[0]){
   await shelf.evaluate("document.querySelector('header [data-view=remotes]').click()");
   input('key','Alt_L','Shift_L','f');input('key','Alt_L','Shift_L','f');
   await wait(()=>shelf.evaluate(searchFocused),'Explorer search comes forward from Remotes');
  }
  await shelf.detach();
  await service.evaluate(async()=>chrome.sidePanel.close({windowId:(await chrome.windows.getLastFocused()).id}));
  await wait(async()=>!(await contexts()).length,'search Shelf closed');
 }
 checks.push('Chrome Alt+Shift+F was assigned through Chrome shortcut settings and opened focused Explorer search from three fixture HTTPS origins; Enter stayed open and Escape dismissed it');

 if(process.env.C2C_SCREENSHOT_NATIVE_MENU==='1'){
  const legacy=await service.evaluate(async()=>{
   const {screenshotMenu}=await import(chrome.runtime.getURL('src/chrome/screenshot-menu.mjs'));
   const spec=click2cloud.registrar.inspect().desired;
   const items=screenshotMenu(spec).items;
   for(const item of items)await new Promise((resolve,reject)=>chrome.contextMenus.create(item,()=>{
    const error=chrome.runtime.lastError;return error?reject(Error(error.message)):resolve();
   }));
   return {ids:items.map(item=>item.id),save:spec.rows.find(row=>row.role==='save'||row.role==='provider-action')?.id};
  });
  const oldService=service;
  const restarted=browser.waitForEvent('serviceworker',{predicate:worker=>worker!==oldService&&worker.url()===oldService.url()});
  await oldService.evaluate(()=>chrome.runtime.reload()).catch(()=>{});service=await restarted;
  await wait(()=>service.evaluate(()=>click2cloud.registrar.inspect().lastOutcome?.state==='completed'),'native menu reconciliation after extension reload');
  const nativeExists=id=>service.evaluate(id=>new Promise(resolve=>chrome.contextMenus.update(id,{},()=>resolve(!chrome.runtime.lastError))),id);
  for(const id of legacy.ids)assert.equal(await nativeExists(id),false,id);
  assert(legacy.save&&await nativeExists(legacy.save),'the ordinary Cloudflare command is still registered');
  await page.goto('https://'+siteHost+'/');await page.bringToFront();input('focus');
  await page.evaluate(()=>document.addEventListener('contextmenu',event=>{window.lastContext=event.target.tagName;},true));
  const frameTop=await page.evaluate(()=>screenY+outerHeight-innerHeight);
  for(const [name,element,tag] of [['page',null,'SECTION'],['link',page.getByRole('link',{name:'Fixture link'}),'A'],['image',page.getByRole('img',{name:'Fixture image'}),'IMG']]){
   const box=element?await element.boundingBox():{x:430,y:350,width:2,height:2};
   const x=Math.round(box.x+box.width/2),y=Math.round(frameTop+box.y+box.height/2);
   input('click',String(x),String(y),'3');await pause(230);
   const path=join(out,'native-'+name+'-menu.png');
   execFileSync('import',['-window','root','-crop',`545x385+${Math.max(0,x-8)}+${Math.max(0,y-8)}`,path]);
   input('key','Escape');
   assert.equal(await page.evaluate(()=>window.lastContext),tag);
   const text=execFileSync('tesseract',[path,'stdout','--psm','11'],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
   assert.match(text,/save|copy|reload|inspect|open/i,'actual native menu must be visible in '+name);
   assert.doesNotMatch(text,/screenshot|choose folder/i);
  }
  checks.push('An extension reload removed Chrome’s pre-existing native Screenshot submenu and kept its ordinary Cloudflare menu; webpage, link and image menus have no screenshot entry');
 }
 await app.goto(c2c);
 await app.getByRole('button',{name:'File Explorer',exact:true}).click();
 const rootFolder=app.getByRole('treeitem',{name:/redown/});
 await rootFolder.waitFor();
 if(await rootFolder.getAttribute('aria-expanded')==='true')await rootFolder.click();
 await rootFolder.click();
 const selectedFolder=app.getByRole('row').filter({hasText:'Native'});
 await selectedFolder.click({button:'right'});
 await app.getByRole('menuitem',{name:'Screenshot2Here',exact:true}).click();
 const here=app.locator('#screenshot-here');await here.getByText(/redown\/Native\//).waitFor();
 await here.getByRole('combobox',{name:'Website scope'}).selectOption('host');
 await here.getByRole('textbox',{name:'Website',exact:true}).fill(siteHost);
 const beforeRule=uploads.length;
 await here.getByRole('button',{name:'Save',exact:true}).click();
 await here.waitFor({state:'detached'});
 assert.equal(uploads.length,beforeRule,'Screenshot2Here Save edits rules without capturing');
 await app.reload();await openScreenshot();
 await app.getByText(/redown\/Native\//).first().waitFor();
 await page.goto('https://'+siteHost+'/');await page.bringToFront();input('focus');input('click','420','400');
 input('key','Alt_L','q');
 const destinationCapture=await wait(async()=>(await receipts()).find(job=>job.state==='confirmed'&&job.plan.outputs.some(entry=>entry.target.prefix==='Native/')),'Screenshot2Here verified save');
 const nativeFile=destinationCapture.plan.outputs.find(entry=>entry.target.prefix==='Native/');
 assert.equal(nativeFile.target.bucketName,'redown');
 assert.equal(createHash('sha256').update(objects.get('redown/'+nativeFile.key)).digest('hex'),destinationCapture.captured.sha256);
 checks.push('Explorer Screenshot2Here configured the exact folder and survived reload; the next matching shortcut saved and verified the image there');
 const beforeRestricted=uploads.length;
 await page.goto('chrome://version/');
 await page.bringToFront();input('focus');input('key','Alt_L','q');
 const restricted=await wait(async()=>(await receipts()).find(job=>job.code==='SCREENSHOT_PAGE_UNSUPPORTED'||job.code==='TAB_URL_UNAVAILABLE'),'restricted page receipt');
 assert.equal(restricted.outputs.length,0);
 assert.equal(uploads.length,beforeRestricted);
 await assertQuiet();
 checks.push('Chrome internal page produced a capture failure with zero uploads');
 const evidence={browser:browser.browser().version(),extensionId:service.url().split('/')[2],manifestVersion:manifest.version,
  checks,uploads:uploads.map(({bucket,key,png})=>({bucket,key,bytes:png.length})),requests};
 console.log(JSON.stringify(evidence,null,2));
 await writeFile(join(out,'results.json'),JSON.stringify(evidence,null,2));
}catch(error){
 console.error(error,JSON.stringify({checks,requests,uploads:uploads.length}));
 try{const visible=browser?.pages().find(page=>page.url().endsWith('/extension/app.html'));
  if(visible)await visible.screenshot({path:join(out,'failure-state.png')});}
 catch{}
 process.exitCode=1;
}finally{await browser?.close();await new Promise(ok=>resource.close(ok));await rm(profile,{recursive:true,force:true});}
