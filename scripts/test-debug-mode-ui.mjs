// Production Shelf/Debug preference/API/IDB, real Chromium. Provider, lifecycle
// messages and chrome.storage are explicit isolated fixtures; no live save claim.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(process.env.C2C_DEBUG_EVIDENCE??'/tmp/c2c-debug-mode-ui');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root))return res.writeHead(403).end();try{res.setHeader('Content-Type',({'.mjs':'text/javascript','.html':'text/html','.css':'text/css'})[extname(path)]??'text/plain');res.end(await readFile(path));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const result={evidenceClass:'REAL_CHROMIUM_PRODUCTION_SHELF_PREFERENCE_API_IDB_WITH_FIXTURE_STORAGE_PROVIDER_AND_LIFECYCLE_MESSAGES_NOT_NATIVE_OR_R2',checks:[]};
try{
 browser=await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});result.browser=browser.version();const context=await browser.newContext({viewport:{width:760,height:850}});
 const open=async(failRead=false)=>{const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>{result.pageErrors??=[];result.pageErrors.push(error.message);});page.on('dialog',dialog=>/Turn Debug Mode off/.test(dialog.message())?dialog.accept():dialog.dismiss());await page.addInitScript(failRead=>{
  const host=import('/tests/product-browser-host.mjs'),runtimeListeners=[],storageListeners=[];const f=window.debugFixture={calls:[],storageDelay:400,failWrite:false,failRead,failApiMethod:null,storageReadCompleted:false,offVisibilityViolations:[],visibilitySamples:0};
  const stored=()=>{try{return JSON.parse(localStorage.getItem('fixtureDebugMode')??'false');}catch{return false;}};
  const changed=(oldValue,newValue)=>storageListeners.forEach(fn=>fn({uiDebugMode:{oldValue,newValue}},'local'));
  globalThis.chrome={runtime:{id:'fixture',getURL:path=>location.origin+'/'+path,onMessage:{addListener:fn=>runtimeListeners.push(fn)},sendMessage:async m=>{f.calls.push({method:m.method,params:m.params});if(f.failApiMethod===m.method){f.failApiMethod=null;return {state:'blocked',code:'OAUTH_IDENTITY_UNVERIFIED'};}if(m.method==='getHistoryPreferences'&&f.pauseHistoryPrefs)await new Promise(resolve=>{f.resumeHistoryPrefs=resolve;});return (await host).invoke({version:m.version,method:m.method,params:m.params});}},storage:{local:{get:async()=>{await new Promise(r=>setTimeout(r,f.storageDelay));f.storageReadCompleted=true;if(f.failRead)throw Error('fixture read denied');return {uiDebugMode:stored()};},set:async value=>{if(!Object.hasOwn(value,'uiDebugMode'))return;if(f.failWrite)throw Error('fixture write denied');const previous=stored();localStorage.setItem('fixtureDebugMode',JSON.stringify(value.uiDebugMode));changed(previous,value.uiDebugMode);}},onChanged:{addListener:fn=>storageListeners.push(fn),removeListener:fn=>{const i=storageListeners.indexOf(fn);if(i>=0)storageListeners.splice(i,1);}}}};
  addEventListener('storage',event=>{if(event.key==='fixtureDebugMode')changed(JSON.parse(event.oldValue??'false'),JSON.parse(event.newValue??'false'));});window.emitDebugFixture=message=>runtimeListeners.forEach(fn=>fn(message,{id:'fixture'}));
  const sample=()=>{const el=document.querySelector('#status');f.visibilitySamples++;if(el&&document.documentElement.dataset.debugMode!=='on'&&!el.hidden&&getComputedStyle(el).display!=='none'&&el.getClientRects().length)f.offVisibilityViolations.push({value:el.textContent,at:performance.now()});};new MutationObserver(sample).observe(document,{subtree:true,attributes:true,childList:true});const frame=()=>{sample();requestAnimationFrame(frame);};requestAnimationFrame(frame);
 },failRead);await page.goto('http://127.0.0.1:'+server.address().port+'/extension/app.html');await page.waitForFunction(()=>!!window.productFixture);return page;};
 const page=await open();await page.waitForFunction(()=>document.documentElement.dataset.debugMode==='off');assert.equal(await page.locator('#status').isVisible(),false);
 const settings=async()=>{await page.locator('#header-more').click();await page.getByRole('menuitem',{name:'Settings',exact:true}).click();await page.locator('#debug-mode').waitFor();};
 const openHistory=()=>page.getByRole('button',{name:'History',exact:true}).click();
 const hiddenResults=async()=>{for(const id of ['#cloudflare-setup','#remote-history','#show-save-results'])assert.equal(await page.locator(id).isVisible(),false);};
 const config=await page.evaluate(async()=>{const s=await window.productFixture.current.read();return JSON.stringify({configs:s.configs,product:s.product});});
 const beforeGrant=await page.evaluate(async()=>{const {createDebugHost}=await import('/src/chrome/debug-host.mjs');window.fixtureDebugHost=createDebugHost({runtime:chrome.runtime});return window.fixtureDebugHost.request({version:1,method:'inspectCanonicalMenu'},{id:'fixture',url:chrome.runtime.getURL('extension/mirror.html'),documentId:'unchanged-ui-document'});});assert.equal(beforeGrant.code,'DEBUG_AUTHORIZATION_REQUIRED');
 for(let n=0;n<3;n++){
  await page.evaluate(()=>window.emitDebugFixture({channel:'depth-click-outcome',state:'pending',code:'DEPTH_CLICK_STARTED',message:'Depth: save outcome not confirmed (DEPTH_CLICK_STARTED).'}));await page.waitForTimeout(20);assert.equal(await page.locator('#status').isVisible(),false);
  await page.evaluate(operationId=>window.emitDebugFixture({channel:'depth-click-outcome',operationId,state:'uncertain',code:'WRITE_UNCONFIRMED',message:'Depth: save outcome not confirmed (WRITE_UNCONFIRMED). Open Save results for details.'}),`fixture-sequence-${n}`);await page.waitForTimeout(20);assert.equal(await page.locator('#status').isVisible(),false);assert.match(await page.locator('#action-feedback').innerText(),/not confirmed/);await hiddenResults();
  await page.getByRole('button',{name:'Dismiss notification'}).press('Enter');
  await page.evaluate(()=>window.emitDebugFixture({channel:'depth-click-outcome',state:'completed',code:'DEPTH_CLICK_COMPLETED',message:'Depth save completed; inspect its verified remote receipt.'}));await page.waitForTimeout(20);assert.equal(await page.locator('#status').isVisible(),false);assert.equal(await page.locator('#action-feedback').isVisible(),false);
 }
 result.checks.push('Default OFF including delayed preference boot and three simulated pending/uncertain/completed lifecycle sequences: floating status never visible; uncertainty remains quietly actionable');
 await page.evaluate(()=>window.emitDebugFixture({channel:'depth-click-outcome',state:'blocked',code:'WORKER_SETUP_REQUIRED',message:'WORKER_SETUP_REQUIRED'}));await hiddenResults();await openHistory();await page.getByRole('heading',{name:'The Rest is History',exact:true}).waitFor();result.checks.push('Debug OFF required action has concise feedback and working History access');
 await page.evaluate(()=>window.debugFixture.pauseHistoryPrefs=true);await settings();await page.waitForFunction(()=>window.debugFixture.resumeHistoryPrefs);
 assert.equal(await page.locator('#debug-mode').isChecked(),false);await page.locator('#debug-mode').check();await page.waitForFunction(()=>document.documentElement.dataset.debugMode==='on'&&localStorage.getItem('fixtureDebugMode')==='true');assert.equal(await page.locator('#status').isVisible(),true);assert(await page.locator('#show-save-results').isVisible());
 await page.evaluate(()=>{window.debugFixture.pauseHistoryPrefs=false;window.debugFixture.resumeHistoryPrefs();});result.checks.push('Debug switch and Review save results are ready while History preferences are still loading');
 await page.locator('#debug-health').click();await page.waitForFunction(()=>document.querySelector('#debug-health-output').textContent.startsWith('{'));assert((await page.evaluate(()=>window.debugFixture.calls)).some(c=>c.method==='getEngineHealth'&&c.params.view==='support'));
 const afterGrant=await page.evaluate(()=>window.fixtureDebugHost.request({version:1,method:'inspectCanonicalMenu'},{id:'fixture',url:chrome.runtime.getURL('extension/mirror.html'),documentId:'unchanged-ui-document'}));assert.equal(afterGrant.code,'DEBUG_AUTHORIZATION_REQUIRED');result.checks.push('Settings ON shows retained diagnostic status and existing safe report API; protected debug-host grant remains denied');
 const other=await open();await other.waitForFunction(()=>document.documentElement.dataset.debugMode==='on');await page.locator('#debug-mode').uncheck();await page.waitForFunction(()=>document.documentElement.dataset.debugMode==='off');assert.equal(await page.locator('#status').isVisible(),false);await other.waitForFunction(()=>document.documentElement.dataset.debugMode==='off');assert.equal(await other.locator('#status').isVisible(),false);result.checks.push('Preference persists into another Shelf; OFF hides the debug status and propagates across documents');
 await page.reload();await page.waitForFunction(()=>!!window.productFixture);await settings();assert.equal(await page.locator('#debug-mode').isChecked(),false);assert.equal(await page.locator('#status').isVisible(),false);result.checks.push('OFF persists across reload without a visible status flash');
 await page.evaluate(()=>window.debugFixture.failWrite=true);await page.locator('#debug-mode').click();await page.getByText('Debug Mode is OFF for this window; the preference could not be saved. Try again.',{exact:true}).waitFor();assert.equal(await page.locator('#debug-mode').isChecked(),false);assert.equal(await page.locator('#status').isVisible(),false);
 await page.evaluate(()=>window.debugFixture.failWrite=false);await page.locator('#debug-mode').check();await page.waitForFunction(()=>localStorage.getItem('fixtureDebugMode')==='true');await page.evaluate(()=>window.debugFixture.failWrite=true);await page.locator('#debug-mode').uncheck();await page.getByText('Debug Mode is OFF for this window; the preference could not be saved. Try again.',{exact:true}).waitFor();assert.equal(await page.locator('#status').isVisible(),false);assert.equal(await page.locator('#debug-mode').isChecked(),false);result.checks.push('Failed enable and failed disable both fail closed for this window and explain unsaved preference inline');
 await page.evaluate(()=>window.debugFixture.failApiMethod='describeCapabilities');await page.locator('#capabilities').click();await page.locator('#action-feedback').waitFor();assert.equal(await page.locator('#status').isVisible(),false);assert.match(await page.locator('#action-feedback').innerText(),/Reconnect Cloudflare/);result.checks.push('Known API failures remain visible and actionable OFF even when their mapped prose is not a raw diagnostic code');
 const denied=await open(true);await denied.waitForFunction(()=>window.debugFixture.storageReadCompleted);assert.equal(await denied.evaluate(()=>document.documentElement.dataset.debugMode),'off');assert.equal(await denied.locator('#status').isVisible(),false);await denied.close();result.checks.push('Preference read failure starts OFF even when persisted fixture value was ON');
 await page.bringToFront();
 await page.locator('[data-view="remotes"]').click();
 await page.evaluate(async()=>{
  const {current,target}=window.productFixture,operationId='debug-pending-summary';
  const result={kind:'save',operationId,state:'pending',code:'REMOTE_TRANSFER_STARTED',destination:target};
  await current.recordRemoteResult(result);
  window.emitDebugFixture({channel:'remote-result',result});
 });
 await page.getByText('Saving remotely…',{exact:true}).filter({visible:true}).first().waitFor();
 assert.equal(await page.getByText('Not saved.',{exact:true}).count(),0);
 result.checks.push('A pending remote save shows bounded neutral feedback');
 // Narrow feedback fits the viewport while Manage Destinations remains independently reachable.
 await page.setViewportSize({width:320,height:800});await page.evaluate(()=>window.emitDebugFixture({channel:'depth-click-outcome',state:'completed',code:'DEPTH_CLICK_COMPLETED',message:'Depth save completed; inspect its verified remote receipt.'}));
 const layout=()=>page.evaluate(()=>{const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,feedback:rect('#action-feedback'),manage:rect('#manage')};});result.narrowLayout={baseline:await layout(),scenarios:[]};
 assert.equal(await page.locator('body > footer').count(),0);
 for(const [state,code,message] of [['blocked','WORKER_SETUP_REQUIRED','WORKER_SETUP_REQUIRED'],['uncertain','WRITE_UNCONFIRMED','Depth: save outcome not confirmed (WRITE_UNCONFIRMED). Open Save results for details.']]){await page.evaluate(({state,code,message})=>window.emitDebugFixture({channel:'depth-click-outcome',operationId:'narrow-'+state,state,code,message}),{state,code,message});await page.locator('#action-feedback').waitFor();await hiddenResults();const measured=await layout();result.narrowLayout.scenarios.push({state,...measured});await page.locator('#manage').focus();assert.equal(await page.evaluate(()=>document.activeElement.id),'manage');}
 await page.screenshot({path:resolve(out,'debug-off-320px-feedback.png')});for(const measured of result.narrowLayout.scenarios){for(const name of ['feedback','manage']){assert(measured[name].left>=0&&measured[name].right<=320,'320px '+name+' must fit viewport: '+JSON.stringify(measured));assert(measured[name].top>=0&&measured[name].bottom<=800);}assert(measured.documentWidth<=320&&measured.bodyWidth<=320,'320px body/document horizontal overflow: '+JSON.stringify(measured));}result.checks.push('320px blocked and uncertain feedback fits and Manage Destinations is focusable');
 const after=await page.evaluate(async()=>{const s=await window.productFixture.current.read();return {config:JSON.stringify({configs:s.configs,product:s.product}),violations:window.debugFixture.offVisibilityViolations,samples:window.debugFixture.visibilitySamples,calls:window.debugFixture.calls};});assert.equal(after.config,config);assert.deepEqual(after.violations,[]);assert(!after.calls.some(c=>['commitConfigChange','loginBegin','initializeCloudflare','approveCloudflareSetup','repairCloudflareDestination','prepareDepthDestination'].includes(c.method)));assert.deepEqual(await other.evaluate(()=>window.debugFixture.offVisibilityViolations),[]);result.visibilitySamples=after.samples+await other.evaluate(()=>window.debugFixture.visibilitySamples);result.checks.push('No off-mode visible frames/mutations; no CURRENT/config/credentials/provisioning change from Debug preference');await page.screenshot({path:resolve(out,'debug-off-inline-feedback.png')});

 const noticePage=await open();
 await noticePage.setViewportSize({width:310,height:720});
 await noticePage.clock.install();
 const emit=operationId=>noticePage.evaluate(operationId=>window.emitDebugFixture({
  channel:'depth-click-outcome',operationId,state:'failed',code:'TEST_FAILURE',message:'TEST_FAILURE'
 }),operationId);
 const banner=noticePage.locator('#action-feedback');
 await emit('repeat');
 await noticePage.getByText('Review the current panel or History for details.',{exact:true}).filter({visible:true}).first().waitFor();
 await noticePage.clock.fastForward(5000);
 await emit('repeat');
 await noticePage.clock.fastForward(4001);
 assert(await banner.isHidden());
 await noticePage.clock.fastForward(7200000);
 await emit('repeat');
 assert(await banner.isHidden());
 await emit('hover');
 await banner.hover();
 assert(await banner.isHidden());
 await emit('hover');
 assert(await banner.isHidden());
 await noticePage.reload();
 await noticePage.waitForFunction(()=>window.productFixture);
 await emit('hover');
 assert(await banner.isHidden());

 await noticePage.evaluate(async()=>{
  const {current,target}=window.productFixture;
  await current.setHistoryPreferences({range:'all',previews:'closed',timezone:'America/Chicago'});
  for(let i=0;i<26;i++)await current.recordRemoteResult({kind:'save',state:'failed',operationId:'notice-history-'+i,destination:target,code:'SOURCE_UNAVAILABLE'});
 });
 await noticePage.getByRole('button',{name:'History',exact:true}).click();
 await noticePage.locator('#history-next').waitFor();
 await emit('history');
 assert(await banner.isVisible());
 await noticePage.locator('#history-next').scrollIntoViewIfNeeded();
 assert((await noticePage.locator('#history-next').boundingBox()).y < (await banner.boundingBox()).y);
 await noticePage.locator('#history-next').click();
 await noticePage.getByText('Page 2 of 2',{exact:true}).waitFor();
 await noticePage.getByRole('button',{name:'Remotes',exact:true}).press('Enter');
 assert(await banner.isHidden());
 result.checks.push('Notifications expire without extension on repeat, 2-hour fast-forward, immediate hover and keyboard dismissal, replay suppression after reload, and unobstructed History pagination');
 await context.close();assert.deepEqual(result.pageErrors??[],[]);result.result='PASS';
}catch(error){result.result='FAIL';result.error=error.stack;process.exitCode=1;}
finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));}
