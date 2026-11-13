import test from 'node:test';
import assert from 'node:assert/strict';
import {compileMenuSpec} from '../src/core/menu-spec.mjs';
import {productState} from '../src/api/config.mjs';
import {targetKey} from '../src/core/menu-identity.mjs';
import {generateChromePlan} from '../src/chrome/registrar.mjs';
import {resolveMenuAction} from '../src/core/action-resolver.mjs';
import {createRemoteTransport} from '../src/cloudflare/transport.mjs';
import {PROTOCOL,verifyGrant} from '../src/cloudflare/wire.mjs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export const root=(bucketName='bucket',accountId='fixture')=>({provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName,prefix:''});
export function scenarios(){
 const result=[];
 for(const depth of [false,true])for(const count of [0,1,2,4])for(const limit of [1,4,5,10])for(const shape of ['empty','chain','siblings'])for(const hidden of [false,true])for(const mixed of [false,true]){
  const targets=Array.from({length:count},(_,i)=>root('bucket-'+i,i%2?'other':'fixture'));
  const folders=shape==='empty'?[]:shape==='chain'?['Images/','Images/same/','Images/same/deep/','Images/same/deep/4/','Images/same/deep/4/5/','Images/same/deep/4/5/6/']:['Images/','same/'];
  const control=root('control');
  result.push({name:JSON.stringify({depth,count,limit,shape,hidden,mixed}),mode:'composite',product:productState({show:{simple:mixed,nested:mixed,depth,flat:mixed}}),
   configs:{simple:{destinations:mixed?[{target:control,label:'Control',quick:true}]:[]},nested:{destinations:mixed?[{target:{...control,prefix:'Images/same/'},label:'Named control'}]:[]},depth:{scopes:targets.map(target=>({target,maxDepth:limit,hidden}))}},
   inventory:{scopes:[...targets,control].map(target=>({target,authorized:true,workerReady:true,complete:true,folders}))}});
 }
 return result;
}
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
test('Depth exception matrix: exact target/action identity and nested actions across 384 scenarios',()=>{
 let checked=0;
 for(const input of scenarios()){
  const spec=compileMenuSpec(input);generateChromePlan(spec);
  const cloud=spec.rows.find(r=>r.origin.provider==='cloudflare'&&r.origin.mode===null);
  assert(!spec.rows.some(r=>r.parentId===cloud?.id&&r.origin.mode==='depth'&&r.role==='save'&&!r.target.prefix&&r.label==='Save here'));
  for(const row of spec.rows.filter(r=>r.role==='save')){
   const resolved=resolveMenuAction(spec,{itemId:row.id,generation:spec.generation,acknowledgedGeneration:spec.generation,authorizedTargets:[row.target]});
   if(row.enabled){assert.equal(targetKey(resolved.action.target),targetKey(row.target));checked++;}
   else assert.equal(resolved.code,'ITEM_DISABLED');
   if(row.label==='Save here')assert.notEqual(row.parentId,cloud.id,'nested Save here stays on named folder/bucket');
  }
 }
 assert(checked>500);
});
test('non-Depth composition remains byte-identical to the request baseline',async()=>{
 const expected=JSON.parse(await readFile(new URL('../codex/11.13.2026-0355/EVIDENCE/non-depth-baseline.json',import.meta.url)));
 const actual=scenarios().filter(s=>!s.product.show.depth).map(input=>({name:input.name,digest:digest(compileMenuSpec(input))}));
 assert.deepEqual(actual,expected);
});
test('Depth root qualification does not rename a child folder with the same name as its bucket',()=>{
 const target=root('bucket'),spec=compileMenuSpec({mode:'composite',product:productState({show:{simple:false,nested:false,depth:true,flat:false}}),configs:{depth:{scopes:[{target,maxDepth:2}]}},inventory:{scopes:[{target,authorized:true,workerReady:true,complete:true,folders:['bucket/','bucket/nested/']}]}});
 assert.equal(spec.rows.find(r=>r.role==='save'&&r.target.prefix==='').label,'bucket/');
 assert.equal(spec.rows.find(r=>r.role==='branch'&&r.target?.prefix==='bucket/').label,'bucket');
 assert(spec.rows.some(r=>r.label==='Save here'&&r.target.prefix==='bucket/'));
});
test('Depth same-bucket root, intermediate Save here and leaf reuse the identical worker plan; different buckets do not',async()=>{
 const plan={state:'ready',protocol:PROTOCOL,accountId:'fixture',bucketName:'bucket',url:'https://fixture.workers.dev',secret:'synthetic-test-secret',codeDigest:'fixture-code',verifiedTargets:{'':{codeDigest:'fixture-code'}}};
 let requests=0;const targets=[];
 const transport=createRemoteTransport({oauth:{authority:async()=>({sessionId:'fixture-session',accounts:[{id:'fixture'},{id:'other'}]})},expectedCodeDigest:'fixture-code',lookup:async target=>{targets.push(target);return target.bucketName==='missing'?null:plan;},fetch:async(_u,options)=>{requests++;const grant=await verifyGrant(plan.secret,options.headers.authorization.slice(7));return Response.json({state:'completed',protocol:PROTOCOL,destination:grant.destination,storageBound:true,durableClaims:true,conditionalCreate:true,codeDigest:plan.codeDigest});}});
 for(const prefix of ['','Images/','Images/same/'])assert.equal((await transport.status({...root(),prefix})).state,'READY');
 assert.equal(requests,3);assert.deepEqual([...new Set(targets.map(t=>t.prefix))],['','Images/','Images/same/']);assert(targets.every(t=>t.accountId==='fixture'&&t.bucketName==='bucket'));
 for(const target of [root('missing'),root('different'),root('bucket','other')])assert.equal((await transport.status(target)).code,'WORKER_SETUP_REQUIRED');
 assert.equal(requests,3,'no remote request or provisioning for mismatched plans');
 for(const patch of [{state:'pending'},{protocol:'wrong'}]){const bad=createRemoteTransport({oauth:{authority:async()=>({accounts:[{id:'fixture'}]})},lookup:async()=>({...plan,...patch}),fetch:async()=>{throw Error('must not fetch');}});assert.equal((await bad.status(root())).code,'WORKER_SETUP_REQUIRED');}
});
