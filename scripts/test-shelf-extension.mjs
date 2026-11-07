// Real unpacked-extension acceptance only. No runtime/sendMessage substitution.
// Uses an isolated disposable profile; never copies or clears the user's profile.
import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const extension=join(root,'dist/click2cloud'),output=resolve(process.env.C2C_SHELF_EVIDENCE_DIR??join(root,'docs/evidence/shelf-engine'));
const expectedId='ajppphdiamdobknpamcheohmdbdbeoal',appUrl=`chrome-extension://${expectedId}/extension/app.html`;
const request={channel:'engine',version:'3+1.1',method:'describeCapabilities',params:{}};
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const {BUILD_INFO}=await import(new URL('../dist/click2cloud/src/build-info.mjs',import.meta.url));
const evidence={time:new Date().toISOString(),sourceRevision:revision,build:BUILD_INFO,evidenceClass:'REAL_UNPACKED_EXTENSION_GENUINE_SIDE_PANEL_REQUIRED',request,response:null,result:'NOT_RUN',checks:[],policyBypassed:false};
await mkdir(output,{recursive:true});const profile=await mkdtemp(join(tmpdir(),'c2c-shelf-engine-'));let context;
try{
 assert.equal(BUILD_INFO.revision,revision,'Build is stale: run npm run build:extension at this commit.');
 const executablePath=process.env.C2C_CHROME_EXECUTABLE??(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
 context=await chromium.launchPersistentContext(profile,{...(executablePath?{executablePath}:{channel:'chrome'}),headless:process.env.C2C_HEADLESS==='1',ignoreDefaultArgs:['--disable-extensions'],args:[...(process.platform==='linux'?['--no-sandbox']:[]),'--enable-unsafe-extension-debugging',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 evidence.browser=context.browser().version();evidence.platform=process.platform;
 const cdp=await context.browser().newBrowserCDPSession();
 let worker=context.serviceWorkers().find(w=>w.url().startsWith(`chrome-extension://${expectedId}/`));
 if(!worker){try{await cdp.send('Extensions.loadUnpacked',{path:extension});}catch(e){if(/disabled by the administrator/i.test(e.message)){evidence.result='BLOCKED';evidence.blocker='UNPACKED_EXTENSION_DISABLED_BY_ADMINISTRATOR';process.exitCode=2;}else throw e;}}
 if(evidence.result!=='BLOCKED'){
  worker??=await context.waitForEvent('serviceworker',{predicate:w=>w.url().startsWith(`chrome-extension://${expectedId}/`),timeout:15000});
  await worker.evaluate(()=>globalThis.click2cloud.ready);evidence.checks.push({name:'actual-service-worker-ready',state:'PASS'});
  const opener=await context.newPage();await opener.goto(appUrl);await opener.getByRole('heading',{name:'Your clouds, one place.'}).waitFor({timeout:15000});
  const openerSession=await context.newCDPSession(opener),openerId=(await openerSession.send('Target.getTargetInfo')).targetInfo.targetId;
  // Automation supplies a real user gesture to Chrome's real sidePanel API.
  const opened=await openerSession.send('Runtime.evaluate',{expression:'(async()=>{await chrome.sidePanel.open({windowId:(await chrome.windows.getCurrent()).id});return true;})()',userGesture:true,awaitPromise:true,returnByValue:true});
  if(opened.exceptionDetails)throw Error('SIDE_PANEL_OPEN_REJECTED');
  let shelfContexts=[];for(let n=0;n<50;n++){shelfContexts=await opener.evaluate(()=>chrome.runtime.getContexts({contextTypes:['SIDE_PANEL']}));if(shelfContexts.some(c=>c.documentUrl===appUrl))break;await new Promise(r=>setTimeout(r,100));}
  assert(shelfContexts.some(c=>c.documentUrl===appUrl),'No genuine SIDE_PANEL document registered by Chrome');
  evidence.shelf={contextType:'SIDE_PANEL',url:appUrl,documentIdPresentInRuntimeContext:shelfContexts.some(c=>typeof c.documentId==='string')};
  let target;for(let n=0;n<50;n++){target=(await cdp.send('Target.getTargets')).targetInfos.find(t=>t.url===appUrl&&t.targetId!==openerId);if(target)break;await new Promise(r=>setTimeout(r,100));}assert(target,'Genuine Shelf target is not inspectable');
  // CDP session for the actual side-panel target (which Chrome may type "other").
  const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false});let next=0;const pending=new Map();
  cdp.on('Target.receivedMessageFromTarget',event=>{if(event.sessionId!==sessionId)return;const m=JSON.parse(event.message);const task=pending.get(m.id);if(task){pending.delete(m.id);clearTimeout(task.timer);m.error?task.reject(Error('SHELF_CDP_COMMAND_FAILED')):task.resolve(m.result);}});
  const command=(method,params)=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('SHELF_CDP_TIMEOUT'));},15000);pending.set(id,{resolve,reject,timer});void cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method,params})}).catch(reject);});
  const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error('SHELF_EVALUATION_FAILED');return r.result.value;};
  evidence.response=await evaluate(`chrome.runtime.sendMessage(${JSON.stringify(request)})`);
  assert.equal(evidence.response?.state,'completed','Shelf describeCapabilities must have a structured successful response');assert.deepEqual(evidence.response.data.build,BUILD_INFO);
  evidence.checks.push({name:'genuine-Shelf-describeCapabilities',state:'PASS'});
  const malformed={...request,method:'notAnEngineMethod'};const rejection=await evaluate(`chrome.runtime.sendMessage(${JSON.stringify(malformed)})`);assert.equal(rejection?.code,'VERSION_OR_METHOD_UNSUPPORTED');evidence.checks.push({name:'accepted-invalid-request-structured-failure',state:'PASS',request:malformed,response:rejection});
  // Exercise the production app's own bootstrap, not only a console request.
  await evaluate('location.reload();true');let ready=false;for(let n=0;n<50;n++){try{ready=await evaluate('document.querySelector("#status")?.textContent.startsWith("Ready ·") && !document.querySelector("header button").disabled');}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100));}assert(ready,'Shelf production bootstrap did not become ready');
  evidence.checks.push({name:'genuine-Shelf-startup-and-reload',state:'PASS'});
  try{const shot=await command('Page.captureScreenshot',{format:'png'});await writeFile(join(output,'genuine-shelf.png'),Buffer.from(shot.data,'base64'));}catch{evidence.screenshot='UNAVAILABLE';}
  const untrusted=await context.newPage();await untrusted.goto(appUrl+'?untrusted=1');const denied=await untrusted.evaluate(r=>chrome.runtime.sendMessage(r),request);assert.equal(denied?.code,'UNTRUSTED_APP_SENDER');evidence.checks.push({name:'query-changed-app-denied',state:'PASS',response:denied});
  evidence.result='PASS';
 }
}catch(error){evidence.result='FAIL';evidence.error={code:/^[A-Z][A-Z_]+$/.test(error.message)?error.message:'REAL_SHELF_ACCEPTANCE_FAILED',message:error.message};process.exitCode=1;}
finally{await context?.close();await rm(profile,{recursive:true,force:true});await writeFile(join(output,'real-shelf-receipt.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({result:evidence.result,blocker:evidence.blocker,receipt:join(output,'real-shelf-receipt.json')}));}
