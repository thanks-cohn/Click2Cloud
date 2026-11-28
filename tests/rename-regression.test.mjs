import assert from 'node:assert/strict';
import test from 'node:test';
import {createEngineApi} from '../src/api/service.mjs';
import {createCloudflareOnboarding} from '../src/cloudflare/onboarding.mjs';
import {createFileTransport} from '../src/cloudflare/file-transport.mjs';
import {createRemoteTransport,previousWorkerDigests} from '../src/cloudflare/transport.mjs';
import {PROTOCOL} from '../src/cloudflare/wire.mjs';
import {createClick2CloudFileApi} from '../src/explorer/index.mjs';
import {fixtureSecret,fixtureSession,fixtureTarget,localScreenshotWorker} from './fixtures/screenshot-worker.mjs';

const prefix='Projects/2026/';
const source={...fixtureTarget,prefix};
const oldKey=prefix+'original.png';
const contents=new Uint8Array([2,37,104,216,0]);
const currentDigest='fixture-current-build';

async function fixture(t,{codeDigest=currentDigest,deployedDigest=codeDigest,prefixScope='Projects'}={}){
 const worker=await localScreenshotWorker({codeDigest:deployedDigest,prefixScope});
 t.after(()=>worker.dispose());
 const storage=await worker.getR2Bucket('STORAGE');
 await storage.put(oldKey,contents,{httpMetadata:{contentType:'image/png'},customMetadata:{retained:'fixture'}});
 let plan={state:'ready',...fixtureTarget,protocol:PROTOCOL,codeDigest,prefixScope,secret:fixtureSecret,url:'https://qa-rename.account.workers.dev'};
 let sessionId=fixtureSession,connected=true,canWrite=true,dropResponse=false,corruptReceipt=false;
 let defaultTarget={...fixtureTarget,bucketName:'unrelated-default'};
 const requests=[],receipts=[],operations=new Set(),preparations=[];
 const oauth={
  status:async()=>({state:connected?'CONNECTED':'DISCONNECTED',accounts:[{id:source.accountId}]}),
  authority:async()=>{
   if(!connected)throw Object.assign(Error(),{code:'AUTH_REQUIRED'});
   return {sessionId,accounts:[{id:source.accountId}],scopes:['workers-r2.read','workers-r2.write']};
  }
 };
 const current={
  read:async()=>({product:{defaultTarget}}),
  reserveOperation:async id=>!operations.has(id)&&!!operations.add(id),
  recordRemoteResult:async entry=>receipts.push(entry)
 };
 const lookup=async(target,sourceBucket)=>target.accountId===source.accountId&&target.bucketName===source.bucketName&&!sourceBucket?plan:undefined;
 function boot(){
  const remote=createRemoteTransport({oauth,lookup,expectedCodeDigest:currentDigest,compatibleCodeDigests:previousWorkerDigests,pollIntervalMs:10,
   verifyAuthority:async()=>canWrite,
   fetch:async(url,options)=>{
    const path=new URL(url).pathname;
    requests.push(path);
    const response=await worker.dispatchFetch(url,options);
    if(path==='/files'&&dropResponse){
     await response.body?.cancel();
     throw Error('fixture lost the Worker acknowledgement');
    }
    if(path==='/operation'&&corruptReceipt){
     const result=await response.json();
     if(result.receipt)result.receipt.key=prefix+'different-key.png';
     return Response.json(result,{status:response.status});
    }
    return response;
   }});
  const cloudflare=createCloudflareOnboarding({current,oauth,transport:remote,provisioner:{lookup,prepare:async(...args)=>{preparations.push(args);}}});
  const denyUnexpectedRead=()=>assert.fail('Rename uses the signed file transport');
  const fileApi=createClick2CloudFileApi({send:createFileTransport({remote}),
   http:{request:denyUnexpectedRead,boundedFetch:denyUnexpectedRead}});
  return createEngineApi({engine:{},current,fileApi,oauth,prepareFileWorker:cloudflare.ensureFileWorker,
   authorize:async({scope})=>scope==='execute',confirm:async()=>true});
 }
 let api=boot();
 return {storage,requests,receipts,preparations,
  restart:()=>{api=boot();},disconnect:()=>{connected=false;},reconnect:()=>{connected=true;sessionId='fixture-new-session';},
  denyWrite:()=>{canWrite=false;},loseResponse:()=>{dropResponse=true;},corruptReceipt:()=>{corruptReceipt=true;},
  changeDefault:()=>{defaultTarget={...defaultTarget,bucketName:'another-default'};},
  changePlan:change=>plan=change(plan),
  rename:(key,name,params={})=>api.invoke({version:'3+1.1',method:'fileAction',params:{
   action:'rename',idempotencyKey:crypto.randomUUID(),source,entry:{key,folder:false},name,...params
  }},'gui')
 };
}

async function confirmRename(f,result,from,to){
 assert.equal(result.state,'completed',result.code);
 assert.equal(result.data.data.receipt.key,to);
 assert.equal(await f.storage.head(from),null);
 const entry=await f.storage.get(to);
 assert.deepEqual(new Uint8Array(await entry.arrayBuffer()),contents);
 assert.equal(entry.httpMetadata.contentType,'image/png');
 assert.equal(entry.customMetadata.retained,'fixture');
 assert.equal(f.receipts.at(-1).state,'verified');
 assert.equal(f.receipts.at(-1).receipt.version,entry.version);
 assert.deepEqual(f.preparations,[]);
}

test('ordinary Rename uses a prepared prefix-scoped Worker across nested paths, reconnect and a new host',async t=>{
 const f=await fixture(t);
 const first=prefix+'first.png',second=prefix+'second.png';
 await confirmRename(f,await f.rename(oldKey,'first.png'),oldKey,first);
 f.disconnect();
 assert.equal((await f.rename(first,'second.png')).code,'AUTH_REQUIRED');
 f.reconnect();
 f.changeDefault();
 f.restart();
 await confirmRename(f,await f.rename(first,'second.png',{source:fixtureTarget}),first,second);
 assert.equal(f.requests.filter(path=>path==='/files').length,2);
});

test('ordinary Rename uses a compatible earlier Worker and a collision leaves both objects untouched',async t=>{
 const f=await fixture(t,{codeDigest:previousWorkerDigests[0],prefixScope:''});
 const collision=prefix+'taken.png';
 const existing=await f.storage.put(collision,new Uint8Array([55,13]));
 const result=await f.rename(oldKey,'taken.png',{conflict:'skip'});
 assert.equal(result.state,'partial');
 assert.equal(result.code,'FILES_SKIPPED');
 assert.deepEqual(new Uint8Array(await (await f.storage.get(oldKey)).arrayBuffer()),contents);
 assert.equal((await f.storage.head(collision)).version,existing.version);
 assert.equal((await f.storage.list({prefix})).objects.length,2);
 await confirmRename(f,await f.rename(oldKey,'available.png'),oldKey,prefix+'available.png');
});

test('ordinary Rename identifies missing, incompatible and out-of-scope plans and revoked write authority',async t=>{
 const f=await fixture(t);
 for(const [change,code] of [
  [plan=>({...plan,codeDigest:'unrecognized-build'}),'WORKER_BUILD_MISMATCH'],
  [plan=>({...plan,codeDigest:currentDigest,prefixScope:'Projects-old'}),'WORKER_DESTINATION_SCOPE_REQUIRED'],
  [plan=>({...plan,prefixScope:'Projects',secret:''}),'WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED'],
  [plan=>({...plan,secret:fixtureSecret,protocol:'click2cloud-remote-1'}),'WORKER_PROTOCOL_INCOMPATIBLE'],
  [plan=>({...plan,protocol:PROTOCOL,state:'pending'}),'WORKER_SETUP_REQUIRED'],
  [plan=>({...plan,state:'ready',codeDigest:previousWorkerDigests[0]}),'WORKER_BUILD_MISMATCH']
 ]){
  f.changePlan(change);
  const result=await f.rename(oldKey,'refused.png');
  assert.equal(result.state,'failed',result.code);
  assert.equal(result.code,code);
 }
 const readyPlan=f.changePlan(plan=>({...plan,codeDigest:currentDigest}));
 f.changePlan(()=>undefined);
 assert.equal((await f.rename(oldKey,'refused.png')).code,'WORKER_SETUP_REQUIRED');
 f.changePlan(()=>readyPlan);
 f.denyWrite();
 assert.equal((await f.rename(oldKey,'refused.png')).code,'AUTHORIZATION_REVOKED');
 assert.equal(f.requests.includes('/files'),false);
 assert(await f.storage.head(oldKey));
 assert.deepEqual(f.preparations,[]);
});

test('a lost Rename response requires inspection and has no verified receipt',async t=>{
 const f=await fixture(t);
 f.loseResponse();
 const idempotencyKey=crypto.randomUUID();
 const result=await f.rename(oldKey,'lost.png',{idempotencyKey});
 assert.equal(result.state,'uncertain');
 assert.equal(result.code,'FILE_ACTION_UNCONFIRMED');
 assert.equal((await f.rename(oldKey,'lost.png',{idempotencyKey})).code,'FILE_RETRY_REQUIRES_INSPECTION');
 assert.deepEqual(f.receipts.map(({state})=>state),['pending','uncertain']);
 assert.equal(f.requests.filter(path=>path==='/files').length,1);
});

test('a Worker reply with the wrong destination key never becomes a verified Rename receipt',async t=>{
 const f=await fixture(t);
 f.corruptReceipt();
 const result=await f.rename(oldKey,'actual.png');
 assert.equal(result.state,'uncertain');
 assert.equal(result.code,'FILE_RENAME_UNCONFIRMED');
 assert.equal(f.receipts.at(-1).receipt,undefined);
 assert.equal(f.receipts.at(-1).code,'FILE_RENAME_UNCONFIRMED');
 assert(await f.storage.head(prefix+'actual.png'));
});
