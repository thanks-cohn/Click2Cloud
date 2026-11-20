import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {capturePlan,createScreenshotRules,screenshotCommands,screenshotIds,websiteCondition} from '../src/screenshot/rules.mjs';
import {createScreenshotCapture} from '../src/screenshot/capture.mjs';
import {createRemoteTransport} from '../src/cloudflare/transport.mjs';
import {runScreenshot} from '../src/cloudflare/screenshot-worker.mjs';
import {screenshotDigest} from '../src/cloudflare/screenshot-wire.mjs';
import {screenshotReceipt} from '../src/recorder/schema.mjs';
import {createRecorderHost} from '../src/recorder/host.mjs';
import {exportComplete} from '../src/recorder/export.mjs';
import {fixtureTarget,fixtureSecret,fixtureSession,localScreenshotWorker} from './fixtures/screenshot-worker.mjs';

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
 const transfer={resolveScreenshotTargets:async outputs=>({target:outputs[0]?.target,outputs,excluded:[]}),
  async deliverScreenshot(input){
   uploads.push(input);
   assert(Object.isFrozen(input.plan.outputs));
   config={...config,revision:config.revision+1,rules:[rule([folder('B/')])]};
   return input.selection.outputs.map(output=>({outputId:output.outputId,state:'confirmed',bytes:png.length}));
  }};
 const runner=createScreenshotCapture({chrome:browser.chrome,rules:{read:async()=>config},transport:transfer,retryCache:cacheFixture(),...receipts});
 const a=await runner.start(screenshotCommands[0],browser.tab);
 const b=await runner.start(screenshotCommands[1],browser.tab);
 assert.equal(browser.captures(),2);assert.equal(uploads.length,2);
 assert.equal(a.plan.outputs[0].target.prefix,'A/');assert.equal(b.plan.outputs[0].target.prefix,'B/');
 for(const id of ['signalId','captureId','operationId'])assert.notEqual(a.plan[id],b.plan[id]);
 config={...config,rules:[]};
 assert.equal(await runner.start(screenshotCommands[0],browser.tab),null);
 assert.equal(browser.captures(),2);
 await runner.start('screenshot.one-off',browser.tab,{oneOff:folder('only/')});
 assert.deepEqual(uploads.at(-1).plan.outputs.map(o=>o.target.prefix),['only/']);
 browser.tab.url='chrome://extensions/';
 assert.equal((await runner.start(screenshotCommands[0],browser.tab)).code,'SCREENSHOT_PAGE_UNSUPPORTED');
 const race=browserFixture(chrome=>{chrome.tabs.onActivated.emit({windowId:context.windowId,tabId:85});});
 config={...config,rules:[rule([folder('A/')])]};
 const raced=createScreenshotCapture({chrome:race.chrome,rules:{read:async()=>config},transport:transfer,retryCache:cacheFixture(),...receipts});
 assert.equal((await raced.start(screenshotCommands[1],race.tab)).code,'SCREENSHOT_PAGE_CHANGED');
 assert.equal(race.captures(),1);assert.equal(uploads.length,3);assert.equal(race.chrome.tabs.onActivated.size(),0);
});

test('Screenshot W01/W02/W05/W07 actual local workerd one image, distinct R2 objects, lost HTTP ACK and unsupported bucket',async()=>{
 const worker=await localScreenshotWorker();
 try{
  const browser=browserFixture(),receipts=store(),bodies=[];
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
  const runner=createScreenshotCapture({chrome:browser.chrome,rules:{read:async()=>({revision:1,dedup:true,rules:plannedTargets.map(target=>rule([target]))})},
   transport,retryCache:cacheFixture(),...receipts});
  const job=await runner.start(screenshotCommands[0],browser.tab);
  assert.deepEqual(bodies,['/screenshot','/screenshot/verify']);
  assert.equal(job.state,'partial');
  assert.deepEqual(job.outputs.map(out=>out.state),['confirmed','confirmed','confirmed','blocked']);
  const bucket=await worker.getR2Bucket('STORAGE'),listed=await bucket.list();
  assert.equal(listed.objects.length,3);
  for(const [index,output] of job.outputs.slice(0,3).entries()){
   assert.equal(output.checksum,bytesHash);assert.equal(output.verification,'independent-r2-head-sha256');
   const saved=await bucket.get(job.plan.outputs[index].key);
   assert.deepEqual(Buffer.from(await saved.arrayBuffer()),png);
  }
  console.log('Screenshot workerd receipt '+JSON.stringify({captureId:job.plan.captureId,ruleIds:job.plan.matchedRuleIds,
   physicalFiles:listed.objects.length,outputs:job.outputs.map(({outputId,state,verification})=>({outputId,state,verification}))}));
 }finally{await worker.dispose();}
});

test('Screenshot W03/W04/W06/W09 partial R2 outcomes retry stable IDs after restart, with failed recorder and expired bytes',async()=>{
 const browser=browserFixture(),receipts=store(),cache=cacheFixture(),r2=new Map(),writes=[];
 const cap={destination:{provider:'cloudflare-r2',conflictPolicy:'keep-both'},storage:{
  head:async key=>r2.get(key)??null,
  async put(key,body,options){
   writes.push(key);
   if(r2.has(key))return null;
   if(key.startsWith('broken/')&&writes.filter(entry=>entry===key).length===1)throw Error('R2 is temporarily unavailable');
   const stored={etag:'v1',version:'v1',size:body.length,customMetadata:options.customMetadata,
    checksums:{sha256:Buffer.from(options.sha256,'hex')}};r2.set(key,stored);return stored;
  }}};
 const targetRules=[rule([folder('first/'),folder('broken/'),folder('last/')])];
 const transport={resolveScreenshotTargets:async outputs=>({target:outputs[0]?.target,outputs,excluded:[]}),async deliverScreenshot(params){
  const {plan,selection}=params;
  return (await runScreenshot({intent:{captureId:plan.captureId,operationId:plan.operationId,byteLength:png.length,imageDigest:bytesHash,
   retry:params.retry,outputs:selection.outputs.map(output=>({...output,prefix:output.target.prefix}))},
   image:params.verify?null:png},cap,async()=>true)).outputs;
 }};
 const adapt=record=>createScreenshotCapture({chrome:browser.chrome,rules:{read:async()=>({revision:1,dedup:true,rules:targetRules})},
  transport,retryCache:cache,...receipts,...(record?{record}:{})});
 const job=await adapt().start(screenshotCommands[0],browser.tab);
 assert.equal(job.state,'partial');assert.deepEqual(job.outputs.map(output=>output.state),['confirmed','failed','confirmed']);
 const retried=await adapt().retry(job.plan.operationId);
 assert.equal(retried.state,'confirmed');assert.equal(browser.captures(),1);
 assert.deepEqual(retried.plan.outputs,job.plan.outputs);
 assert.deepEqual(writes,[...job.plan.outputs.map(output=>output.key),job.plan.outputs[1].key]);
 const second=await adapt(async()=>{throw Error('recorder quota');}).start(screenshotCommands[1],browser.tab);
 assert.equal(second.state,'partial');assert.equal(r2.size,5);
 await cache.remove(second.plan.operationId);
 receipts.kept.set(second.plan.operationId,second);
 const expired=await adapt().retry(second.plan.operationId);
 assert.equal(expired.outputs[1].code,'SCREENSHOT_ORIGINAL_UNAVAILABLE');
 assert.equal(browser.captures(),2);
});
test('Screenshot W08 scoped RAW and SECURE ZIP receipts preserve IDs and redact sensitive URLs and targets',async()=>{
 const browser=browserFixture();browser.tab.url='https://secret.example/page?token=example-private-signature';
 const plan=makePlan([rule([folder('private-folder/')])],true,{...context,url:browser.tab.url});
 const job={plan,captured:{bytes:png.length,sha256:bytesHash},state:'confirmed',attempts:[],
  outputs:[{state:'confirmed',bytes:png.length,verification:'independent-r2-head-sha256',comparison:'match',checksum:bytesHash}]};
 const stub={setDebug:async()=>{},ready:Promise.resolve()};
 const host=await createRecorderHost({chrome:{storage:{local:{get:async()=>({uiDebugMode:true})}}},recorder:stub,readScreenshotReceipts:async()=>[job]});
 const call=async(method,params)=>{const value=await host.request({version:2,method,params});assert.equal(value.state,'completed',value.code);return value.data;};
 const snapshot=await call('snapshot',{scope:'screenshot-to-cloud'});
 const getPage=params=>call('page',{...params,snapshotId:snapshot.id});
 const secure=await exportComplete({snapshot,getPage,privacy:'SECURE'});
 const raw=await exportComplete({snapshot,getPage,privacy:'RAW',consent:true});
 const rawText=await raw.blob.text(),secureText=await secure.blob.text();
 assert.equal(raw.manifest.scope,'screenshot-to-cloud');
 assert.equal(secure.counts.transfersExported,1);
 assert.match(rawText,/example-private-signature|private-folder/);
 assert(!secureText.includes('secret.example')&&!secureText.includes('private-folder')&&!secureText.includes(bytesHash));
 assert(secureText.includes(plan.captureId)&&secureText.includes('independent-r2-head-sha256'));
 assert.equal(screenshotReceipt(job,{secure:true}).outputs[0].comparison,'match');
 assert(!rawText.includes(png.toString('base64')));
});
