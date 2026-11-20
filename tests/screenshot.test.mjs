import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {capturePlan,createScreenshotRules,screenshotCommands,screenshotIds,websiteCondition} from '../src/screenshot/rules.mjs';
import {createScreenshotCapture} from '../src/screenshot/capture.mjs';
import {createRemoteTransport} from '../src/cloudflare/transport.mjs';
import {createCloudflareOAuth} from '../src/auth/cloudflare-oauth.mjs';
import {createDirectScreenshotUpload} from '../src/cloudflare/screenshot-direct-upload.mjs';
import {createScreenshotRetryCache,screenshotRetryLifetime} from '../src/screenshot/retry-cache.mjs';
import {screenshotDigest} from '../src/cloudflare/screenshot-wire.mjs';
import {screenshotReceipt} from '../src/recorder/schema.mjs';
import {historyRecord} from '../src/history/model.mjs';
import {createRecorderHost} from '../src/recorder/host.mjs';
import {exportComplete} from '../src/recorder/export.mjs';
import {fixtureTarget,fixtureSecret,fixtureSession,localScreenshotWorker} from './fixtures/screenshot-worker.mjs';
import {createScreenshotBackground} from '../extension/screenshot-background.mjs';
import {retainedScreenshotOutput,matchScreenshotObject} from '../src/history/screenshot-output.mjs';

const folder=prefix=>({...fixtureTarget,prefix});
const rule=(destinations,websites=[],active=true)=>({ruleId:crypto.randomUUID(),name:'fixture',revision:1,websites,destinations,active});
const context={tabId:13,windowId:3,url:'https://mail.google.com/mail?x=1#inbox',documentId:'navigation-1'};
const png=await readFile(new URL('./fixtures/images/picture.png',import.meta.url));
const dataUrl='data:image/png;base64,'+png.toString('base64');
const bytesHash=await screenshotDigest(png);
const makePlan=(rules,dedup=true,source=context,oneOff)=>capturePlan({ids:screenshotIds(screenshotCommands[0]),config:{revision:3,rules,dedup},
 context:source,startedAt:new Date().toISOString(),oneOff});
const forSite=(kind,value)=>websiteCondition({kind,value});
const event=()=>{
 const observers=new Set();
 return {addListener:fn=>observers.add(fn),removeListener:fn=>observers.delete(fn),emit:(...args)=>{for(const fn of observers)fn(...args);},size:()=>observers.size};
};
function browserFixture(hook=()=>{}){
 let captures=0;
 const tab={id:context.tabId,windowId:context.windowId,url:context.url};
 const chrome={windows:{getLastFocused:async()=>({id:context.windowId,type:'normal',focused:true}),onFocusChanged:event()},
  tabs:{query:async()=>[tab],onActivated:event(),onUpdated:event(),onRemoved:event(),onReplaced:event(),
   captureVisibleTab:async(id,options)=>{assert.equal(id,context.windowId);assert.equal(options.format,'png');captures++;await hook(chrome);return dataUrl;}},
  webNavigation:{getFrame:async()=>({documentId:context.documentId,url:tab.url,documentLifecycle:'active'}),onCommitted:event(),onHistoryStateUpdated:event()}};
 return {chrome,tab,captures:()=>captures};
}
function cacheFixture(){
 const files=new Map();
 return {store:async(id,image)=>files.set(id,image),read:async id=>files.get(id),remove:async id=>files.delete(id),files};
}
const store=()=>{
 const kept=new Map();
 return {kept,record:async job=>kept.set(job.plan.operationId,structuredClone(job)),read:async id=>structuredClone(kept.get(id))};
};
test('History resolves only the selected retained screenshot output and recognizes changed objects',()=>{
 const plan=makePlan([rule([folder('One/'),{...folder('Other/'),bucketName:'another-bucket'}])]);
 const outputs=plan.outputs.map(output=>({outputId:output.outputId,state:'confirmed',bytes:png.length,
  checksum:bytesHash,verification:'direct-r2-get-sha256'}));
 const row={kind:'screenshot-to-cloud',screenshot:{plan,outputs,captured:{bytes:png.length,sha256:bytesHash}}};
 const identity={operationId:plan.operationId,outputId:outputs[1].outputId};
 const result=retainedScreenshotOutput(row,identity);
 assert.equal(result.target.bucketName,'another-bucket');
 assert.equal(result.target.prefix,'Other/');
 assert.equal(result.key,plan.outputs[1].key);
 assert.equal(result.checksum,bytesHash);
 assert(matchScreenshotObject(result,{key:result.key,size:String(png.length)}));
 assert.equal(matchScreenshotObject(result,{key:plan.outputs[0].key,size:png.length}),false);
 assert.equal(matchScreenshotObject(result,{key:result.key,size:png.length+1}),false);
 assert.throws(()=>retainedScreenshotOutput(row,{...identity,operationId:crypto.randomUUID()}),{code:'RESULT_NOT_FOUND'});
 outputs[1].state='blocked';
 assert.equal(retainedScreenshotOutput(row,identity).confirmed,false);
 const bad=structuredClone(row);bad.screenshot.plan.outputs[1].key='Different/image.png';
 assert.throws(()=>retainedScreenshotOutput(bad,identity),{code:'SOURCE_SCOPE_MISMATCH'});
});
test('Screenshot R04–R08 and C01–C07 additivity, URL boundaries, OR, cardinality, and exact R2 identities',()=>{
 const google=rule([folder('photos/')],[forSite('domain','Google.COM.'),forSite('host','mail.google.com'),forSite('url',context.url)]);
 const all=rule([folder('general/')]);
 assert.equal(makePlan([google,all]).outputs.length,2);
 assert.equal(makePlan([google,all],true,{...context,url:'https://notgoogle.com/mail'}).outputs[0].target.prefix,'general/');
 assert.equal(makePlan([google],false).outputs.length,1);
 assert.equal(makePlan([google],true,{...context,url:'https://notgoogle.com'}),null);
 assert.equal(makePlan([rule([folder('exact/')],[forSite('url',context.url)])],true,{...context,url:context.url+'2'}),null);
 const many=Array.from({length:100},()=>rule([folder('photos/')]));
 assert.equal(makePlan(many).outputs.length,1);
 assert.equal(makePlan(many).outputs[0].ruleIds.length,100);
 assert.equal(new Set(makePlan(many,false).outputs.map(output=>output.key)).size,100);
 assert.equal(makePlan(many.map((item,index)=>({...item,destinations:[folder(index%3+'/')]}))).outputs.length,3);
 const sameName=rule([folder('Photos/'),folder('photos/'),{...folder('photos/'),bucketName:'other'},
  {...folder('photos/'),accountId:'other',connectionId:'cloudflare:other'}]);
 assert.equal(makePlan([sameName]).outputs.length,4);
 const oneOff=makePlan(many,false,context,folder('only/'));
 assert.equal(oneOff.outputs[0].target.prefix,'only/');
 assert.deepEqual(oneOff.matchedRuleIds,[]);
});
test('Screenshot R09–R13 config preserves 26+ rules, immutable IDs, explicit deletion and dedup preference',async()=>{
 const persisted={};let authorizationCount=0;
 const backend={get:async key=>({[key]:persisted[key]}),set:async values=>Object.assign(persisted,structuredClone(values))};
 const rules=createScreenshotRules({storage:backend,authorizeTarget:async()=>authorizationCount++});
 const first=await rules.read();assert(first.dedup);
 await Promise.all(Array.from({length:27},(_,i)=>rules.change('save',{name:'Rule '+i,websites:[],destinations:[folder('same/')]})));
 const config=await rules.read(),edit=config.rules[26],other=config.rules[0];
 assert.equal(config.rules.length,27);
 const saved=await rules.change('save',{ruleId:edit.ruleId,expectedRevision:edit.revision,name:'Renamed',
  websites:[forSite('domain','example.com')],destinations:[folder('same/'),folder('same/'),folder('new/')]});
 assert.equal(saved.rules[26].ruleId,edit.ruleId);assert.equal(saved.rules[26].destinations.length,2);assert.equal(authorizationCount,28);
 await rules.change('toggle',{ruleId:edit.ruleId,active:false});
 await rules.change('dedup',{enabled:false});
 await rules.change('delete',{ruleId:other.ruleId});
 const reopened=await createScreenshotRules({storage:backend}).read();
 assert.equal(reopened.rules.length,26);assert.equal(reopened.rules.at(-1).name,'Renamed');
 assert.equal(reopened.rules.at(-1).active,false);assert.equal(reopened.dedup,false);
});
test('Screenshot S02–S09/C08–C10 dispatch preserves independent IDs, frozen plans, zero match, and tab-race protection',async()=>{
 let config={revision:1,dedup:true,rules:[rule([folder('A/')])]},uploads=[];
 const browser=browserFixture(),receipts=store();
 const uploader={authority:async()=>({sessionId:fixtureSession}),async deliver(input){
  uploads.push(input);
  assert(Object.isFrozen(input.output));
  config={...config,revision:config.revision+1,rules:[rule([folder('B/')])]};
  return {outputId:input.output.outputId,state:'confirmed',bytes:png.length};
 }};
 const runner=createScreenshotCapture({chrome:browser.chrome,rules:{change:async()=>config},uploader,retryCache:cacheFixture(),...receipts});
 const a=await runner.start(screenshotCommands[0],browser.tab);
 const b=await runner.start(screenshotCommands[1],browser.tab);
 assert.equal(browser.captures(),2);assert.equal(uploads.length,2);
 assert.equal(a.plan.outputs[0].target.prefix,'A/');assert.equal(b.plan.outputs[0].target.prefix,'B/');
 for(const id of ['signalId','captureId','operationId'])assert.notEqual(a.plan[id],b.plan[id]);
 config={...config,rules:[]};
 assert.equal((await runner.start(screenshotCommands[0],browser.tab)).code,'SCREENSHOT_NO_MATCHING_RULES');
 assert.equal(browser.captures(),2);
 await runner.start('screenshot.one-off',browser.tab,{oneOff:folder('only/')});
 assert.equal(uploads.at(-1).output.target.prefix,'only/');
 browser.tab.url='chrome://extensions/';
 assert.equal((await runner.start(screenshotCommands[0],browser.tab)).code,'SCREENSHOT_PAGE_UNSUPPORTED');
 const race=browserFixture(chrome=>{chrome.tabs.onActivated.emit({windowId:context.windowId,tabId:85});});
 config={...config,rules:[rule([folder('A/')])]};
 const raced=createScreenshotCapture({chrome:race.chrome,rules:{change:async()=>config},uploader,retryCache:cacheFixture(),...receipts});
 assert.equal((await raced.start(screenshotCommands[1],race.tab)).code,'SCREENSHOT_PAGE_CHANGED');
 assert.equal(race.captures(),1);assert.equal(uploads.length,3);assert.equal(race.chrome.tabs.onActivated.size(),0);
});

test('Screenshot W01/W02/W05/W07 actual local workerd one image, distinct R2 objects, lost HTTP ACK and unsupported bucket',async()=>{
 const worker=await localScreenshotWorker();
 try{
  const bodies=[];
  const plannedTargets=[folder('One/'),folder('Two/'),folder('Three/'),{...folder('One/'),bucketName:'other'}];
  const plan={state:'ready',url:'https://screenshot.fixture.workers.dev',accountId:fixtureTarget.accountId,bucketName:fixtureTarget.bucketName,
   protocol:'click2cloud-remote-2',secret:fixtureSecret,codeDigest:'screenshot-fixture'};
  const transport=createRemoteTransport({expectedCodeDigest:plan.codeDigest,oauth:{authority:async()=>({sessionId:fixtureSession,
   accounts:[{id:fixtureTarget.accountId}]})},lookup:async()=>plan,verifyAuthority:async()=>true,fetch:async(url,input)=>{
    const path=new URL(url).pathname;
    bodies.push(path);
    const response=await worker.dispatchFetch('https://fixture.invalid'+path,{...input,body:input.body instanceof Blob?await input.body.arrayBuffer():input.body});
    if(path==='/screenshot'){assert.equal(response.status,200);await response.text();throw Error('lost HTTP acknowledgment');}
    return response;
   }});
  async function legacyTransfer(rules,dedup=true){
   const plan=makePlan(rules,dedup),selection=await transport.resolveScreenshotTargets(plan.outputs);
   const data={plan,selection,image:new Blob([png],{type:'image/png'}),byteLength:png.length,imageDigest:bytesHash};
   await assert.rejects(()=>transport.deliverScreenshot(data),{code:'SCREENSHOT_WORKER_RESPONSE_LOST'});
   return {plan,outputs:[...await transport.deliverScreenshot({...data,verify:true}),...selection.excluded]};
  }
  const job=await legacyTransfer(plannedTargets.map(target=>rule([target])));
  assert.deepEqual(bodies,['/screenshot','/screenshot/verify']);
  assert.deepEqual(job.outputs.map(out=>out.state),['confirmed','confirmed','confirmed','blocked']);
  const bucket=await worker.getR2Bucket('STORAGE'),listed=await bucket.list();
  assert.equal(listed.objects.length,3);
  for(const [index,output] of job.outputs.slice(0,3).entries()){
   assert.equal(output.checksum,bytesHash);assert.equal(output.verification,'independent-r2-head-sha256');
   const saved=await bucket.get(job.plan.outputs[index].key);
   assert.deepEqual(Buffer.from(await saved.arrayBuffer()),png);
  }
  const repeated=Array.from({length:100},()=>rule([folder('Many/')]));
  for(const dedup of [true,false]){
   const count=dedup?1:100,requests=bodies.length;
   const capture=await legacyTransfer(repeated,dedup);
   assert.equal(capture.outputs.filter(output=>output.state==='confirmed').length,count);
   assert.equal(new Set(capture.plan.outputs.map(output=>output.key)).size,count);
   assert.deepEqual(bodies.slice(requests),['/screenshot','/screenshot/verify']);
  }
  assert.equal((await bucket.list({prefix:'Many/'})).objects.length,101);
  console.log('Screenshot workerd receipt '+JSON.stringify({captureId:job.plan.captureId,ruleIds:job.plan.matchedRuleIds,
   physicalFiles:listed.objects.length,outputs:job.outputs.map(({outputId,state,verification})=>({outputId,state,verification}))}));
 }finally{await worker.dispose();}
});

const itemGrants=['workers-r2-bucket-item.read','workers-r2-bucket-item.write'];
function directFixture(handler,{scopes=itemGrants,scopeEvidence='provider-returned',refreshToken}={}){
 const objects=new Map(),calls=[];
 const state={click2cloudOAuth:{sessionId:fixtureSession,accessToken:'test-token',expiresAt:Date.now()+3600000,
  scopeEvidence,scopes,refreshToken,accounts:[{id:fixtureTarget.accountId},{id:'other'}]}};
 const storage={get:async key=>({[key]:structuredClone(state[key])}),set:async values=>Object.assign(state,structuredClone(values))};
 const oauth=createCloudflareOAuth({chrome:{storage:{local:storage,session:storage}},async fetch(url,options){
  const address=new URL(url);
  if(address.hostname==='dash.cloudflare.com')
   return Response.json({access_token:'new-test-token',expires_in:3600,scope:itemGrants.join(' ')});
  const path=address.pathname,parts=path.split('/'),key=parts.slice(9).map(decodeURIComponent).join('/');
  const call={path,key,account:parts[4],bucket:parts[7],method:options.method??'GET',token:options.headers.get('authorization')};
  calls.push(call);
  const identity=path;
  const failure=await handler?.({call,objects,state,identity});
  if(failure)return failure;
  if(call.method==='PUT'){
   assert.equal(options.headers.get('content-type'),'image/png');
   assert(options.body instanceof Blob);assert.equal(options.body.type,'image/png');
   assert.equal(options.headers.get('if-none-match'),'*');
   objects.set(identity,Buffer.from(await options.body.arrayBuffer()));
   return Response.json({success:true,result:{key,size:String(options.body.size)}});
  }
  return objects.has(identity)?new Response(objects.get(identity),{headers:{'content-type':'image/png'}}):new Response(null,{status:404});
 }});
 return {oauth,uploader:createDirectScreenshotUpload(oauth,{backoff:async()=>{}}),calls,objects,state};
}
test('Screenshot completion and retry send Shelf and History results without desktop notifications',async()=>{
 let failCapture=false, denyUpload=false, terminal;
 const browser=browserFixture(()=>{if(failCapture)throw Error('Capture unavailable');});
 const provider=directFixture(({call})=>{
  if(!call.path.includes('/objects'))return Response.json({success:true,result:{name:fixtureTarget.bucketName}});
  if(call.method==='PUT'&&denyUpload)return Response.json({success:false,errors:[{code:10000}]},{status:403});
 });
 const saved=new Map(), settings={}, notices=[];
 const local={get:async key=>({[key]:settings[key]}),set:async update=>Object.assign(settings,structuredClone(update))};
 Object.assign(browser.chrome,{storage:{local},runtime:{
  getURL:path=>'chrome-extension://fixture/'+path,
  async sendMessage(message){if(message.channel==='screenshot-result'&&message.state!=='uploading')setImmediate(()=>terminal?.(message));}
 },notifications:{async create(...args){notices.push(args);}}});
 const background=createScreenshotBackground({chrome:browser.chrome,oauth:provider.oauth,retryCache:cacheFixture(),
  current:{read:async()=>({product:{cloudflare:{}}}),recordRemoteResult:async job=>saved.set(job.operationId,structuredClone(job)),readRemoteResult:async id=>saved.get(id)},
  fileApi:{noteRemoteWrite(){}}});
 await background.request('save',{name:'Quiet test',websites:[],destinations:[folder('quiet/')]});
 async function capture(command){
  const result=new Promise(resolve=>{terminal=resolve;});
  background.onCommand(command,browser.tab);
  return result;
 }
 assert.equal((await capture(screenshotCommands[0])).state,'confirmed');
 denyUpload=true;
 assert.equal((await capture(screenshotCommands[1])).state,'blocked');
 const blocked=[...saved.values()].at(-1);
 denyUpload=false;
 const feedback=new Promise(resolve=>{terminal=resolve;});
 await background.request('retry',{operationId:blocked.operationId});
 assert.equal((await feedback).state,'confirmed');
 assert.equal(saved.get(blocked.operationId).screenshot.state,'confirmed');
 failCapture=true;
 assert.equal((await capture(screenshotCommands[0])).state,'failed');
 assert.equal(saved.size,3);
 assert.deepEqual(notices,[]);
});
function directRunner(fixture,targetRules,options={}){
 const {browser=browserFixture(),receipts=store(),cache=cacheFixture(),dedup=true,record}=options;
 const runner=createScreenshotCapture({chrome:browser.chrome,rules:{change:async()=>({revision:1,dedup,rules:targetRules})},
  uploader:fixture.uploader,retryCache:cache,...receipts,...(record?{record}:{})});
 return {runner,browser,receipts,cache};
}
test('Direct R2 makes exact encoded PUT and GET for PNG, with item grants and without any Worker record',async()=>{
 const fixture=directFixture();
 const target={...folder("Screenshots/日 #! stray..dots/"),bucketName:'redown'};
 const {runner,browser}=directRunner(fixture,[rule([target])]);
 const job=await runner.start(screenshotCommands[0],undefined);
 assert.equal(browser.captures(),1);
 assert.equal(job.state,'confirmed');
 const output=job.outputs[0];
 assert.equal(output.checksum,bytesHash);
 assert.equal(output.bytes,png.length);
 assert.equal(output.verification,'direct-r2-get-sha256');
 assert.deepEqual(fixture.calls.map(call=>call.method),['PUT','GET']);
 assert.match(fixture.calls[0].path,/\/redown\/objects\/Screenshots\/%E6%97%A5%20%23%21%20stray%2E%2Edots\/Screenshot-/);
 assert.equal(fixture.calls[0].key,job.plan.outputs[0].key);
 assert.deepEqual([...fixture.objects.values()],[png]);
 const limited=directFixture(undefined,{scopes:[itemGrants[0]]});
 const blocked=await directRunner(limited,[rule([target])]).runner.start(screenshotCommands[0]);
 assert.equal(blocked.outputs[0].code,'INSUFFICIENT_SCOPE');
 assert.equal(limited.calls.length,0);
 const inferred=directFixture(undefined,{scopes:[],scopeEvidence:'oauth-default-requested'});
 const accepted=await directRunner(inferred,[rule([target])]).runner.start(screenshotCommands[0]);
 assert.equal(accepted.state,'confirmed');
});
test('Direct R2 updates expired OAuth using the existing wrapper and GET after a rejected PUT',async()=>{
 const fixture=directFixture(({call})=>call.token==='Bearer test-token'?
  Response.json({success:false,errors:[{code:10000,message:'Token has expired'}]},{status:401}):null,{refreshToken:'test-refresh'});
 const job=await directRunner(fixture,[rule([folder('screenshots/')])]).runner.start(screenshotCommands[0]);
 assert.equal(job.state,'confirmed');
 assert.deepEqual(fixture.calls.map(({method,token})=>[method,token]),[
  ['PUT','Bearer test-token'],['GET','Bearer new-test-token'],['PUT','Bearer new-test-token'],['GET','Bearer new-test-token']
 ]);
});
test('Direct R2 multi-target across accounts and buckets keeps confirmed results untouched on partial retry',async()=>{
 let denied=true;
 const fixture=directFixture(({call})=>call.key.startsWith('broken/')&&call.method==='PUT'&&denied?
  Response.json({success:false,errors:[{code:10000,message:'private bucket access denied'}]},{status:403}):null);
 const targets=[folder('first/'),{...folder('broken/'),bucketName:'redown'},{
  ...folder('last/'),accountId:'other',connectionId:'cloudflare:other'}];
 const browser=browserFixture(),receipts=store(),cache=cacheFixture(),options={browser,receipts,cache};
 const create=()=>directRunner(fixture,[rule(targets)],options).runner;
 const job=await create().start(screenshotCommands[0],browser.tab);
 assert.equal(job.state,'partial');
 assert.deepEqual(job.outputs.map(output=>output.state),['confirmed','blocked','confirmed']);
 assert.equal(job.outputs[1].code,'R2_BUCKET_ACCESS_DENIED');
 assert.equal(job.outputs[1].httpStatus,403);
 assert.deepEqual(job.outputs[1].providerCodes,[10000]);
 assert.equal(fixture.calls.filter(call=>call.method==='PUT').length,3);
 assert.deepEqual(new Set(fixture.calls.map(call=>call.account)),new Set([fixtureTarget.accountId,'other']));
 denied=false;
 const retried=await create().retry(job.plan.operationId);
 assert.equal(retried.state,'confirmed');
 assert.equal(browser.captures(),1);
 assert.deepEqual(retried.plan.outputs,job.plan.outputs);
 assert.deepEqual([retried.outputs[0],retried.outputs[2]],[job.outputs[0],job.outputs[2]]);
 assert.deepEqual(fixture.calls.slice(-3).map(call=>[call.method,call.key]),[['GET',job.plan.outputs[1].key],['PUT',job.plan.outputs[1].key],['GET',job.plan.outputs[1].key]]);
 assert.deepEqual(screenshotReceipt(retried,{secure:true}).traceGaps,[]);
});
test('Direct R2 dedup is per capture and off produces a unique PNG for each matching rule',async()=>{
 const fixture=directFixture(),browser=browserFixture();
 const targetRules=[rule([folder('same/')]),rule([folder('same/')])];
 const a=await directRunner(fixture,targetRules,{browser}).runner.start(screenshotCommands[0]);
 const b=await directRunner(fixture,targetRules,{browser,dedup:false}).runner.start(screenshotCommands[1]);
 assert.equal(a.state,'confirmed');assert.equal(b.state,'confirmed');
 assert.notEqual(a.plan.captureId,b.plan.captureId);
 assert.equal(a.plan.outputs.length,1);assert.equal(a.plan.outputs[0].ruleIds.length,2);
 assert.equal(b.plan.outputs.length,2);
 assert.equal(browser.captures(),2);
 assert.equal(fixture.calls.filter(call=>call.method==='PUT').length,3);
 assert.equal(fixture.objects.size,3);
 assert([...fixture.objects.values()].every(bytes=>bytes.equals(png)));
});
test('Direct R2 lost PUT response reconciles equal bytes, retries absence once and never overwrites a conflict',async()=>{
 for(const mode of ['written','absent','conflict']){
  let first=true;
  const fixture=directFixture(({call,objects,identity})=>{
   if(call.method==='PUT'&&first){
    first=false;
    if(mode==='written')objects.set(identity,png);
    if(mode==='conflict')objects.set(identity,Buffer.from('wrong object'));
    throw Error('response lost');
   }
  });
  const job=await directRunner(fixture,[rule([folder('screenshots/')])]).runner.start(screenshotCommands[0]);
  assert.deepEqual(fixture.calls.map(call=>call.method),mode==='absent'?['PUT','GET','PUT','GET']:['PUT','GET']);
  assert.equal(new Set(fixture.calls.map(call=>call.path)).size,1);
  assert.equal(job.state,mode==='conflict'?'failed':'confirmed');
  if(mode==='conflict'){
   assert.equal(job.outputs[0].code,'R2_OBJECT_CONFLICT');
   assert.equal(job.outputs[0].recoverable,false);
  }
 }
});
test('Direct R2 rejects accepted PUT with absent bytes, wrong key, wrong size, wrong digest or a false success envelope',async()=>{
 for(const mode of ['absent','key','size','digest','envelope']){
  const fixture=directFixture(({call,identity,objects})=>{
   if(call.method==='PUT'){
    if(!['absent','envelope'].includes(mode))objects.set(identity,mode==='size'?Buffer.concat([png,png]):
     mode==='digest'?Buffer.from(png).fill(1):png);
    return Response.json({success:mode!=='envelope',result:{key:mode==='key'?'wrong.png':call.key,size:png.length}});
   }
  });
  const job=await directRunner(fixture,[rule([folder('screenshots/')])]).runner.start(screenshotCommands[0]);
  assert.notEqual(job.state,'confirmed',mode);
  if(job.state==='failed')assert.equal(historyRecord({kind:'screenshot-to-cloud',screenshot:job}).statusLabel,'Delivery failed');
  assert.equal(job.outputs[0].code,({absent:'R2_OBJECT_UNCONFIRMED',key:'R2_UPLOAD_METADATA_MISMATCH',
   size:'R2_OBJECT_CONFLICT',digest:'R2_OBJECT_CONFLICT',envelope:'R2_API_REJECTED'})[mode]);
 }
});
test('Direct R2 retries frozen bytes only, expires the real cache policy and tolerates recording failure',async()=>{
 let clock=Date.now();
 const entries=new Map();
 const cache=createScreenshotRetryCache({open:async()=>({
  keys:async()=>[...entries.keys()],match:async key=>entries.get(key)?.clone(),
  put:async(key,response)=>entries.set(key,response),delete:async key=>entries.delete(key)
 })},()=>clock);
 const fixture=directFixture(({call})=>call.method==='PUT'?new Response(null,{status:503}):null);
 const {runner,browser}=directRunner(fixture,[rule([folder('retry/')])],{cache});
 const first=await runner.start(screenshotCommands[0]);
 assert.equal(first.outputs[0].state,'pending');
 assert.equal(first.outputs[0].recoverable,true);
 assert.equal(fixture.calls.filter(call=>call.method==='PUT').length,2);
 clock+=screenshotRetryLifetime;
 const expired=await runner.retry(first.plan.operationId);
 assert.equal(expired.outputs[0].code,'SCREENSHOT_ORIGINAL_UNAVAILABLE');
 assert.equal(expired.originalUnavailable,true);
 assert.equal(expired.outputs[0].recoverable,false);
 assert.equal(browser.captures(),1);
 assert.equal(fixture.calls.filter(call=>call.method==='PUT').length,2);
 const logged=directRunner(directFixture(),[rule([folder('ok/')])],{record:async()=>{throw Error('recorder quota');}});
 assert.equal((await logged.runner.start(screenshotCommands[0])).state,'confirmed');
});
test('Direct R2 does not silently follow a changed Cloudflare session during readback or retry',async()=>{
 const fixture=directFixture(({call,state})=>{
  if(call.method==='PUT')state.click2cloudOAuth.sessionId='different-session';
 });
 const {runner}=directRunner(fixture,[rule([folder('screenshots/')])]);
 const job=await runner.start(screenshotCommands[0]);
 assert.equal(job.outputs[0].code,'AUTH_SESSION_CHANGED');
 assert.deepEqual(fixture.calls.map(call=>call.method),['PUT']);
 fixture.state.click2cloudOAuth.accounts=[{id:'other'}];
 const retried=await runner.retry(job.plan.operationId);
 assert.equal(retried.outputs[0].code,'WRONG_ACCOUNT');
 assert.equal(fixture.calls.length,1);
});
test('Chrome capture failures have distinct stage/code classifications and no R2 requests',async()=>{
 for(const [mode,code,stage,errorName] of [
  ['url','TAB_URL_UNAVAILABLE','tab-observation',null],
  ['unsupported','SCREENSHOT_PAGE_UNSUPPORTED','page-eligibility',null],
  ['permission','CHROME_CAPTURE_PERMISSION_DENIED','capture-api','chrome-permission-denied'],
  ['rate','SCREENSHOT_CAPTURE_RATE_LIMIT','capture-api','chrome-rate-limit'],
  ['race','SCREENSHOT_PAGE_CHANGED','tab-observation',null],
  ['png','SCREENSHOT_PNG_INVALID','png-validation',null]
 ]){
  const fixture=directFixture();
  const browser=browserFixture(chrome=>{
   if(mode==='permission')throw Error('The activeTab permission was denied: https://private.example?token=secret');
   if(mode==='rate')throw Error('MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND');
   if(mode==='race')chrome.tabs.onActivated.emit({windowId:context.windowId,tabId:999});
  });
  if(mode==='url')delete browser.tab.url;
  if(mode==='unsupported')browser.tab.url='chrome://version';
  if(mode==='png')browser.chrome.tabs.captureVisibleTab=async()=>'data:image/png;base64,AA==';
  const {runner}=directRunner(fixture,[rule([folder('screenshots/')])],{browser});
  const job=await runner.start(screenshotCommands[0],browser.tab);
  const secure=screenshotReceipt(job,{secure:true});
  assert.equal(secure.code,code,mode);
  assert.equal(secure.failureStage,stage,mode);
  assert.equal(secure.trace.at(-1).browserError,errorName,mode);
  assert(!JSON.stringify(secure).includes('private.example'));
  assert.equal(fixture.calls.length,0);
 }
});
test('Default screenshot card initializes once, preserves legacy rules, and respects disable, deletion and dismissal',async()=>{
 const persisted={};let discoveries=0;
 const storage={get:async key=>({[key]:persisted[key]}),set:async values=>Object.assign(persisted,structuredClone(values))};
 const target={...folder('screenshots/'),bucketName:'redown'};
 const discoverDefault=async()=>{discoveries++;return target;};
 let rules=createScreenshotRules({storage,discoverDefault});
 const [fresh,parallel]=await Promise.all([rules.change('initialize-default'),rules.change('initialize-default')]);
 assert.deepEqual(fresh,parallel);
 assert.equal(fresh.rules[0].name,'Default Screenshots');
 assert.deepEqual(fresh.rules[0].destinations,[target]);
 assert.equal(discoveries,1);
 const ruleId=fresh.rules[0].ruleId;
 await rules.change('toggle',{ruleId,active:false});
 rules=createScreenshotRules({storage,discoverDefault});
 assert.equal((await rules.change('initialize-default')).rules[0].active,false);
 await rules.change('delete',{ruleId});
 assert.equal((await rules.change('initialize-default')).rules.length,0);
 assert.equal(discoveries,1);
 const legacy={schemaVersion:1,revision:10,dedup:false,rules:[rule([{...folder('files/'),bucketName:'images'}])]};
 persisted.screenshotRulesV1=legacy;
 assert.deepEqual(await rules.change('initialize-default'),legacy);
 assert.equal(discoveries,1);
 const dismissed=await rules.change('dismiss-default');
 assert.deepEqual(dismissed.rules,legacy.rules);
 assert.equal((await rules.change('initialize-default')).dedup,false);
 delete persisted.screenshotRulesV1;
 rules=createScreenshotRules({storage,discoverDefault:async()=>null,authorizeTarget:async()=>{}});
 assert.equal((await rules.change('initialize-default')).rules.length,0);
 assert.equal(persisted.screenshotRulesV1,undefined);
 const configured=await rules.change('save-default',{destinations:[target]});
 assert.equal(configured.rules[0].active,true);
 assert.equal((await rules.change('save-default',{destinations:[target]})).rules.length,1);
});
test('Screenshot W08 scoped RAW and SECURE ZIP receipts preserve IDs and redact sensitive URLs and targets',async()=>{
 const browser=browserFixture();browser.tab.url='https://secret.example/page?token=example-private-signature';
 const plan=makePlan([rule([folder('private-folder/')])],true,{...context,url:browser.tab.url});
 const job={plan,captured:{bytes:png.length,sha256:bytesHash},state:'confirmed',attempts:[],
  outputs:[{state:'confirmed',bytes:png.length,verification:'independent-r2-head-sha256',comparison:'match',checksum:bytesHash}]};
 const direct=await directRunner(directFixture(),[rule([folder('private-folder/')])],{browser}).runner.start(screenshotCommands[0]);
 const interrupted=structuredClone(direct);
 interrupted.trace=interrupted.trace.filter(event=>event.stage!=='R2_RESPONSE');
 assert.deepEqual(screenshotReceipt(interrupted,{secure:true}).traceGaps,[{stage:'R2_RESPONSE',outputId:direct.outputs[0].outputId}]);
 const stub={setDebug:async()=>{},ready:Promise.resolve()};
 const host=await createRecorderHost({chrome:{storage:{local:{get:async()=>({uiDebugMode:true})}}},recorder:stub,readScreenshotReceipts:async()=>[job,direct]});
 const call=async(method,params)=>{const value=await host.request({version:2,method,params});assert.equal(value.state,'completed',value.code);return value.data;};
 const snapshot=await call('snapshot',{scope:'screenshot-to-cloud'});
 const getPage=params=>call('page',{...params,snapshotId:snapshot.id});
 const secure=await exportComplete({snapshot,getPage,privacy:'SECURE'});
 const raw=await exportComplete({snapshot,getPage,privacy:'RAW',consent:true});
 const rawText=await raw.blob.text(),secureText=await secure.blob.text();
 assert.equal(raw.manifest.scope,'screenshot-to-cloud');
 assert.equal(secure.counts.transfersExported,2);
 assert.match(rawText,/example-private-signature|private-folder/);
 assert(!secureText.includes('secret.example')&&!secureText.includes('private-folder')&&!secureText.includes(bytesHash));
 assert(secureText.includes(plan.captureId)&&secureText.includes('independent-r2-head-sha256'));
 assert(secureText.includes(direct.plan.captureId)&&secureText.includes('direct-r2-get-sha256')&&secureText.includes('R2_READBACK'));
 assert.equal(screenshotReceipt(job,{secure:true}).outputs[0].comparison,'match');
 assert(!rawText.includes(png.toString('base64')));
});
