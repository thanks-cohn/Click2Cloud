import assert from 'node:assert/strict';
import test from 'node:test';
import {indexedDB,IDBKeyRange} from 'fake-indexeddb';
import {createHistoryStore} from '../src/queue/store.mjs';
import {basicReceipt} from '../src/queue/receipts.mjs';
import {openStore} from '../src/basic/lib/store.js';
import {createSaveIntents} from '../src/basic/lib/intent.js';
import {createCoordinator} from '../src/basic/lib/coordinator.js';
import {createRemoteTransport} from '../src/cloudflare/transport.mjs';
import {PROTOCOL} from '../src/cloudflare/wire.mjs';
import {createTransientNotice} from '../extension/shelf-notifications.mjs';

globalThis.IDBKeyRange=IDBKeyRange;
const minute=60_000;
const identity=['fixture-account','fixture-root'];
const source={provider:'google',sourceUrl:'https://fixture.example/photo.png',hostUrl:'https://host.example/article'};

test('Queue expires normal and error results independently, preserving archive and manual dismissal on reopen',async()=>{
  let now=Date.now();
  const options={indexedDB,database:crypto.randomUUID(),clock:()=>now};
  let store=createHistoryStore(options);
  const row=(id,status,rank,terminal=true,at=now)=>({
    schemaVersion:1,recordId:id,status,rank,terminal,sortAt:at,updatedAt:at,terminalAt:terminal?at:null,
    filename:id,provider:'cloudflare',kind:'save',metadata:{large:'x'.repeat(4096)}
  });
  const completed=row('completed','verified',3), error=row('failed','failed',1);
  const live=row('running','uploading',0,false), pending=row('pending','waiting',2,false);
  await store.reconcile([completed,error,live,pending]);
  assert.equal((await store.jobs()).finished,1);
  assert.equal((await store.job('completed')).metadata,undefined);
  await store.acknowledge('pending');
  assert.equal((await store.jobs()).waiting,1);
  now+=15*minute;
  await store.maintainJobs();
  assert.deepEqual((await store.jobs()).items.map(item=>item.recordId),['running','failed','pending']);
  await store.clearJobs();
  assert.equal(await store.count(),2);
  await store.close();
  store=createHistoryStore(options);
  await store.reconcile([completed,error,live,pending]);
  assert.deepEqual((await store.jobs()).items.map(item=>item.recordId),['running','pending']);
  const secondError=row('failed','failed',1);
  await store.reconcile([secondError]);
  assert.equal((await store.jobs()).attention,1);
  await store.setQueuePolicy({normalMinutes:null,errorMinutes:2,keepErrors:false});
  now+=2*minute;
  await store.maintainJobs();
  assert.equal((await store.jobs()).attention,0);
  await store.setQueuePolicy({keepErrors:true});
  await store.reconcile([row('new-error','uncertain',1),row('cancelled','cancelled',3)]);
  now+=24*60*minute;
  await store.maintainJobs();
  assert.deepEqual((await store.jobs()).items.map(item=>item.recordId),['running','new-error','pending','cancelled']);
  assert.equal(await store.count(),4);
  await store.close();
});

test('Lost transport response keeps a potentially live remote save outside automatic and manual clearing',async()=>{
  let now=Date.now();
  const store=createHistoryStore({indexedDB,database:crypto.randomUUID(),clock:()=>now});
  const row={schemaVersion:1,recordId:'r2:pending-remote',status:'uncertain',rank:1,terminal:true,
    queueTerminal:false,at:now,sortAt:now,terminalAt:now,updatedAt:now,filename:'pending.png'};
  await store.reconcile([row]);
  now+=120*minute;
  await store.maintainJobs();
  await store.clearJobs();
  assert.equal((await store.jobs()).attention,1);
  assert.equal(await store.count(),1);
  await store.reconcile([{...row,queueTerminal:true,code:'OPERATION_INTERRUPTED',updatedAt:now,terminalAt:now,sortAt:now}]);
  await store.clearJobs();
  assert.equal((await store.jobs()).attention,0);
  assert.equal(await store.count(),1);
  await store.close();
});

test('Confirmed rename preserves original receipt fields, searchable reference and archive removal fences',async()=>{
  const store=createHistoryStore({indexedDB,database:crypto.randomUUID()});
  const at=Date.now();
  const row={schemaVersion:1,recordId:'r2:original',status:'verified',rank:3,terminal:true,sortAt:at,terminalAt:at,
    updatedAt:at,filename:'old.png',originalFilename:'old.png',destination:{bucket:'test',key:'older/old.png'},etag:'old'};
  await store.reconcile([row]);
  await store.rememberRename(row.recordId,{filename:'new.png',destination:{bucket:'test',key:'older/new.png'},etag:'new'});
  await store.reconcile([{...row,updatedAt:at+1}]);
  assert.equal((await store.page({query:'old.png'})).total,0);
  const [renamed]=(await store.page({query:'new.png'})).items;
  assert.equal(renamed.originalFilename,'old.png');
  assert.equal(renamed.destination.key,'older/new.png');
  assert.equal(row.destination.key,'older/old.png');
  await store.clear({confirmed:true});
  await store.reconcile([row]);
  assert.equal(await store.count(),0);
  assert.equal((await store.jobs()).finished,1);
  await store.close();
});

function basicFixture(t,acquire,upload){
  const values={};
  const chrome={storage:{session:{
    async get(key){return {[key]:values[key]};},
    async set(patch){Object.assign(values,patch);},
    async remove(key){delete values[key];}
  }}};
  const intents=createSaveIntents(chrome,async()=>{});
  return openStore(indexedDB,crypto.randomUUID()).then(store=>{
    t.after(()=>store.close());
    const context={account:identity,commits:0};
    const auth={authorization:async()=>({identity:context.account,accessToken:'fixture-token'})};
    const coordinator=createCoordinator({store,auth,intents,acquire,adapters:{google:{upload:async input=>{
      if(upload)return upload(input);
      input.onCommitting();
      context.commits++;
      return {confirmed:true,provider:'google',id:'test-object',name:input.filename,size:input.bytes.byteLength};
    }}}});
    return {store,intents,coordinator,context};
  });
}

test('Cancel All interrupts two stalled Basic sources and parked work without automatic replay',async t=>{
  let signalCount=0;
  const stalled=Promise.withResolvers();
  const originalId='parked-fixture-id';
  const {store,intents,coordinator,context}=await basicFixture(t,(input,signal)=>new Promise((_,reject)=>{
    if(++signalCount===2)stalled.resolve();
    signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
  }));
  const first=coordinator.start({...source,requestId:'first-active-fixture'});
  const second=coordinator.start({...source,requestId:'second-active-fixture'});
  await stalled.promise;
  await store.begin({id:originalId,provider:'google',state:'AWAITING_SOURCE',createdAt:new Date().toISOString()});
  await intents.keep('google',{id:originalId,input:source,identity,expiresAt:Date.now()+minute},Date.now());
  const requested=await coordinator.cancelAll();
  assert.equal(requested.filter(job=>job.state==='cancelling').length,2);
  assert.equal(requested.filter(job=>job.state==='cancelled').length,1);
  assert.equal((await first).state,'CANCELLED');
  assert.equal((await second).state,'CANCELLED');
  assert.equal((await store.getAttempt(originalId)).state,'CANCELLED');
  assert.equal(await coordinator.afterLogin('google'),undefined);
  assert.equal(await intents.get('google'),undefined);
  assert.equal(context.commits,0);
});

test('Basic retry is explicit, account-bound, single-use and linked to a new verified attempt',async t=>{
  let reads=0;
  const {store,coordinator,context}=await basicFixture(t,async()=>{
    if(++reads===1)throw Object.assign(Error('Fixture source retry'),{code:'SOURCE_UNAVAILABLE'});
    return {filename:'photo.png',mime:'image/png',bytes:new Uint8Array([42])};
  });
  const failed=await coordinator.start({...source,requestId:'original-failed-fixture'});
  assert.equal(failed.state,'FAILED');
  assert.equal(basicReceipt(failed)[0].retryable,true);
  context.account=['different-account','fixture-root'];
  await assert.rejects(coordinator.retry('google',failed.id),{code:'AUTH_ACCOUNT_CHANGED'});
  assert.equal(reads,1);
  context.account=identity;
  const results=await Promise.allSettled([coordinator.retry('google',failed.id),coordinator.retry('google',failed.id)]);
  assert.equal(results[0].value.state,'SAVED');
  assert.equal(results[0].value.parentAttemptId,failed.id);
  assert.equal(results[1].reason.code,'SAVE_RETRY_IN_PROGRESS');
  assert.equal((await store.getAttempt(failed.id)).retryAttemptId,results[0].value.id);
  await assert.rejects(coordinator.retry('google',failed.id),{code:'SAVE_RETRY_UNAVAILABLE'});
  assert.equal(context.commits,1);
});

test('Basic cancellation cannot override a provider final request that later verifies',async t=>{
  const committing=Promise.withResolvers(),finish=Promise.withResolvers();
  const {coordinator}=await basicFixture(t,async()=>({filename:'photo.png',mime:'image/png',bytes:new Uint8Array([42])}),
    async input=>{
      input.onCommitting();
      committing.resolve();
      await finish.promise;
      return {confirmed:true,provider:'google',id:'fixture-committed',name:input.filename,size:1};
    });
  const id='commit-race-fixture';
  const attempt=coordinator.start({...source,requestId:id});
  await committing.promise;
  assert.equal((await coordinator.cancel('google',id)).code,'PROVIDER_COMMIT_IN_PROGRESS');
  finish.resolve();
  assert.equal((await attempt).state,'SAVED');
});

const target={provider:'cloudflare',connectionId:'cloudflare:acct',accountId:'acct',bucketName:'fixture-bucket',prefix:''};
const createTransport=options=>createRemoteTransport({
  oauth:{authority:async()=>({sessionId:'test-session',accounts:[{id:'acct'}]})},
  lookup:async()=>({state:'ready',protocol:PROTOCOL,accountId:'acct',bucketName:'fixture-bucket',
    url:'https://fixture.workers.dev',secret:'fixture-signing-key'}),pollIntervalMs:1,...options
});
const remoteSource={url:'https://raw.githubusercontent.com/fixture/photo.png',filename:'photo.png'};

test('Cloudflare stops before dispatch even when authorization is stalled',async()=>{
  const records=[], authorization=Promise.withResolvers();
  const transport=createTransport({
    record:async record=>records.push(record),fetch:async()=>assert.fail('No remote request may start.')
  });
  const id=crypto.randomUUID();
  const transfer=transport.save({target,source:remoteSource,operationId:id,authorize:()=>authorization.promise});
  assert.equal(transport.cancelActive()[0].state,'cancelling');
  assert.equal((await transfer).state,'cancelled');
  assert.equal(records.at(-1).state,'cancelled');
  authorization.resolve(true);
});

for(const outcome of ['cancelled','verified','uncertain']){
  test('Cloudflare cancellation reports '+outcome+' after worker settlement',{timeout:5000},async()=>{
    const request=Promise.withResolvers(),stop=Promise.withResolvers(),records=[];
    const id=crypto.randomUUID();
    let receipt,claims=0;
    const transport=createTransport({record:async record=>records.push(record),fetch:async(url,options)=>{
      const endpoint=new URL(url).pathname;
      if(endpoint==='/remote-save'){
        claims++;
        receipt={destination:JSON.parse(options.body).destination,operationId:id,
          key:'photo.png',etag:'etag',version:'version',size:1};
        request.resolve();
        await stop.promise;
        return Response.json({state:'pending',code:'REMOTE_ACCEPTED',operationId:id});
      }
      if(endpoint==='/cancel'){
        stop.resolve();
        return Response.json({state:'uncertain',code:'CANCELLATION_REQUESTED_INSPECT',operationId:id});
      }
      if(endpoint==='/operation')return Response.json(outcome==='verified'?{state:'written',receipt}:
        outcome==='uncertain'?{state:'uncertain',code:'WRITE_UNCONFIRMED'}:{state:'blocked',code:'AUTHORIZATION_REVOKED'});
      if(endpoint==='/verify')return Response.json({state:'completed',proof:receipt});
      assert.fail(endpoint);
    }});
    const pending=transport.save({target,source:remoteSource,operationId:id});
    await request.promise;
    assert.equal((await transport.cancel(target,id)).state,'cancelling');
    assert.equal((await pending).state,outcome);
    assert.equal(records.at(-1).state,outcome);
    assert.equal(claims,1);
  });
}

test('Shelf notification identity spans producers while equal text can describe distinct saves',()=>{
  const rendered=[];
  const notice=createTransientNotice({paint:value=>{if(value)rendered.push(value.text);}});
  notice.show('Saved.',{key:'operation-a:verified'});
  notice.show('Independently verified.',{key:'operation-a:verified'});
  notice.show('Saved.',{key:'operation-b:verified'});
  notice.show('Saved.');
  notice.show('Saved.');
  notice.clear();
  assert.deepEqual(rendered,['Saved.','Saved.','Saved.','Saved.']);
});
