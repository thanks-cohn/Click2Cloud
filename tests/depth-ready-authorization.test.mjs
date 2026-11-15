import test from 'node:test';import assert from 'node:assert/strict';
import {createRemoteTransport} from '../src/cloudflare/transport.mjs';import {PROTOCOL,remoteDestination} from '../src/cloudflare/wire.mjs';
const target={provider:'cloudflare',connectionId:'cloudflare:qa',accountId:'qa',bucketName:'click2cloud-qa',prefix:'C2C-QA/Narrow/A/'};
function fixture(){let now=Date.now(),sessionId='first',allowed=true,requests=0;const plan={state:'ready',accountId:'qa',bucketName:target.bucketName,url:'https://fixture.workers.dev',protocol:PROTOCOL,secret:'fixture-only',codeDigest:'fixture-code',verifiedTargets:{'':{codeDigest:'fixture-code'}}};
 const remote=createRemoteTransport({clock:()=>now,expectedCodeDigest:'fixture-code',oauth:{authority:async()=>({sessionId,accounts:[{id:'qa'}]})},lookup:async()=>plan,verifyAuthority:async()=>allowed,fetch:async()=>{requests++;return Response.json({state:'completed',protocol:PROTOCOL,destination:remoteDestination(target),storageBound:true,durableClaims:true,conditionalCreate:true,codeDigest:plan.codeDigest});}});
 return {remote,plan,requests:()=>requests,expire:()=>now+=10000,session:()=>sessionId='second',revoke:()=>allowed=false};
}
test('one gesture reuses exact capability observation while rechecking authority and binding; no repeated capability requests',async()=>{
 const f=fixture(),r=await f.remote.status(target);assert.equal(r.state,'READY');for(let i=0;i<20;i++){const a=await f.remote.authorizeReady(target,r);assert.equal(a.sessionId,'first');assert.deepEqual(a.authorizedTargets,[target]);}assert.equal(f.requests(),1);
 assert.deepEqual((await f.remote.authorizeReady({...target,prefix:'C2C-QA/'},r)).authorizedTargets,[]);assert.deepEqual((await f.remote.authorizeReady({...target,bucketName:'other'},r)).authorizedTargets,[]);
 assert.equal(await f.remote.authorizeReady(target,structuredClone(r)),null,'serialized or forged observations grant no cached authority');
 assert(!JSON.stringify(r).includes('fixture-only'));f.expire();assert.equal(await f.remote.authorizeReady(target,r),null);
});
test('session, revocation, Worker identity, exact prefix scope and verified proof changes fail closed during reuse',async()=>{
 for(const mutate of [f=>f.session(),f=>f.revoke(),f=>f.plan.secret='renewed',f=>f.plan.url='https://other.workers.dev',f=>f.plan.codeDigest='new-code',f=>f.plan.prefixScope='other',f=>f.plan.verifiedTargets={}]){
  const f=fixture(),r=await f.remote.status(target);assert.equal(r.state,'READY');mutate(f);assert.deepEqual((await f.remote.authorizeReady(target,r)).authorizedTargets,[]);assert.equal(f.requests(),1);
 }
});
test('unready and failed capability observations cannot be reused as authority',async()=>{
 const f=fixture();f.plan.verifiedTargets={};const r=await f.remote.status(target);assert.equal(r.state,'PREPARED');assert.equal(await f.remote.authorizeReady(target,r),null);
});
