import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {initialConfig,validateProduct} from '../src/api/config.mjs';
import {createEngineApi} from '../src/api/service.mjs';
import {createEngine} from '../src/core/engine.mjs';
import {createChromeRegistrar} from '../src/chrome/registrar.mjs';
import {createAgentGateway} from '../src/api/gateway.mjs';
import {createExternalRecovery} from '../src/persistence/external-recovery.mjs';
import {nodeFiles} from '../src/persistence/node-files.mjs';
import {createWholeCloudJobs} from '../src/api/whole-cloud.mjs';
const target={provider:'cloudflare',connectionId:'c',accountId:'a',bucketName:'b',prefix:'parent/child/'};
function fixture({recovery}={}) {
 let product=initialConfig(),generation={desired:0,applied:null},confirmed=false;
 const current={readProduct:async()=>structuredClone(product),commitProduct:async(value,{expectedRevision})=>{assert.equal(expectedRevision,product.revision);return product=validateProduct({...value,revision:product.revision+1});},read:async()=>({configs:product.configs,generation}),setDesiredGeneration:async desired=>{generation={...generation,desired};},acknowledgeGeneration:async applied=>{generation={...generation,applied};}};
 // Explicit unit double: this is NOT native Chrome evidence.
 const chrome={contextMenus:{create:(_p,cb)=>cb(),removeAll:cb=>cb(),onClicked:{addListener(){},removeListener(){}}},runtime:{}};
 const registrar=createChromeRegistrar({chrome}),engine=createEngine({current,registrar,getAuthorization:async()=>null});
 const api=createEngineApi({engine,current,recovery,getInventory:async()=>({scopes:[{target:{...target,prefix:''},folders:['parent/child/'],authorized:false,workerReady:false,complete:true}]}),authorize:({actor})=>actor==='owner',confirm:()=>{const v=confirmed;confirmed=false;return v;}});
 const invoke=(method,params={})=>api.invoke({version:1,method,params},'owner');
 async function change(change){const p=await invoke('previewConfigChange',{change,expectedRevision:product.revision});confirmed=true;return invoke('commitConfigChange',{previewId:p.previewId,expectedRevision:p.expectedRevision,idempotencyKey:crypto.randomUUID()});}
 return {api,invoke,change,current,engine,confirm:()=>{confirmed=true;}};
}
test('headless create, additive composition, hidden edits, Flat and retained Show are the same canonical engine',async()=>{
 const f=fixture();await f.change({type:'createDestination',mode:'simple',target,label:'Photos'});await f.change({type:'createDestination',mode:'narrow',target,aliases:['Bucket alias','Parent alias','Child alias']});
 let preview=await f.invoke('previewNativeMenu');assert(preview.items.some(x=>x.row?.label==='Photos'));assert(preview.items.some(x=>x.row?.label==='Parent alias'));
 await f.change({type:'setShowInChrome',show:{simple:false,narrow:true,depth:false}});assert.equal((await f.invoke('listDestinations')).total,1);preview=await f.invoke('previewNativeMenu');assert(!preview.items.some(x=>x.row?.label==='Photos'));
 await f.change({type:'batch',changes:[{type:'setFlatDefault',target},{type:'setShowInChrome',show:{flat:true}}]});preview=await f.invoke('previewNativeMenu');assert.equal(preview.items.filter(x=>x.row?.role==='save').length,1);assert.equal(preview.items.find(x=>x.row?.role==='save').row.id,'c2c:cloudflare');
 await f.change({type:'setShowInChrome',show:{flat:false}});assert.equal((await f.invoke('getConfiguration')).show.simple,false);
 await f.change({type:'setDepthDisplayBuckets',scopes:[{target,maxDepth:50}]});assert.equal((await f.invoke('getConfiguration')).configs.depth.scopes[0].maxDepth,50);
});
test('authorization, confirmation, stale revisions, replay and gateway expiration fail closed',async()=>{
 const f=fixture();await assert.rejects(f.api.invoke({version:1,method:'getConfiguration'},'stranger'),{code:'PERMISSION_DENIED'});
 const p=await f.invoke('previewConfigChange',{change:{type:'createDestination',mode:'simple',target},expectedRevision:0});const args={previewId:p.previewId,expectedRevision:0,idempotencyKey:'unique-key-1'};
 await assert.rejects(f.invoke('commitConfigChange',args),{code:'CONFIRMATION_REQUIRED'});f.confirm();const result=await f.invoke('commitConfigChange',args);assert.deepEqual(await f.invoke('commitConfigChange',args),result);
 await assert.rejects(f.invoke('previewConfigChange',{change:{type:'setFlatDefault',target},expectedRevision:0}),{code:'REVISION_CONFLICT'});
 const gateway=createAgentGateway({api:f.api});const handle=gateway.grant({actor:'owner',methods:['getConfiguration'],expiresAt:Date.now()+1000});
 await assert.rejects(gateway.request(handle,{version:1,method:'getConfiguration'},'stranger'),{code:'PERMISSION_DENIED'});assert.equal((await gateway.request(handle,{version:1,method:'getConfiguration'},'owner')).revision,1);gateway.revoke(handle);await assert.rejects(gateway.request(handle,{version:1,method:'getConfiguration'},'owner'),{code:'PERMISSION_DENIED'});
});
test('actual external disk CURRENT, monthly journals, corrupt CURRENT fallback and protected API restore',async()=>{
 const root=await mkdtemp(join(tmpdir(),'c2c-recovery-'));let now=Date.UTC(2026,11,31);
 try{const recovery=createExternalRecovery({files:nodeFiles(root),clock:()=>now}),f=fixture({recovery});await f.change({type:'createDestination',mode:'simple',target,label:'Preserved'});now=Date.UTC(2027,0,2);await f.change({type:'setFlatDefault',target});
 assert((await readFile(join(root,'menu-config/journal/2026-12.jsonl'),'utf8')).includes('Preserved'));assert((await readFile(join(root,'menu-config/journal/2027-01.jsonl'),'utf8')).includes('Preserved'));
 await writeFile(join(root,'menu-config/CURRENT.json'),'damaged');const restored=await recovery.readVerified();assert.deepEqual(restored.flatDefault,target);
 const fresh=fixture({recovery});const p=await fresh.invoke('requestRestorePreview',{recoveryPoint:{},expectedRevision:0});fresh.confirm();const r=await fresh.invoke('restoreRightClickMenu',{previewId:p.previewId,expectedRevision:0,idempotencyKey:'restore-key-1'});assert.equal(r.native.state,'completed');assert.equal((await fresh.invoke('listDestinations')).items[0].label,'Preserved');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('whole cloud uses real disk checkpoints, pauses quietly and continues another weekly pass',async()=>{
 const root=await mkdtemp(join(tmpdir(),'c2c-outline-'));let now=Date.UTC(2026,10,5),auth=true,calls=0;
 try{const recovery=createExternalRecovery({files:nodeFiles(root),clock:()=>now}),identity={provider:'cloudflare',connectionId:'c',accountId:'a'},fileApi={run:async(op,input)=>{calls++;return {state:'completed',data:op==='buckets'?{buckets:[{name:'b'}]}:{entries:[{key:'a/b/file'}],cursor:''}}}};
 const jobs=createWholeCloudJobs({recovery,fileApi,isAuthorized:async()=>auth,clock:()=>now});await jobs.enable(identity);await jobs.tick(identity);auth=false;assert.equal((await jobs.tick(identity)).state,'PAUSED_AUTH');const before=calls;assert.equal((await jobs.tick(identity)).state,'PAUSED_AUTH');assert.equal(calls,before);auth=true;await jobs.onSameAccountLogin(identity);await jobs.tick(identity);assert.equal((await jobs.tick(identity)).state,'WAITING_REFRESH');now+=15*86400000;await jobs.tick(identity);await jobs.tick(identity);await jobs.tick(identity);const r=await jobs.tick(identity);assert.equal(r.state,'WAITING_REFRESH');assert.equal(r.revision,3);assert.equal(r.exportReceipt.state,'VERIFIED');assert.equal(r.exportReceipt.complete,true);const exported=JSON.parse(await readFile(join(root,r.exportName),'utf8'));assert.equal(JSON.parse(exported.payload).value.complete,true);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('closed API schemas reject unexpected fields and bind permissions to account and exact confirmation',async()=>{
 const {createPermissions}=await import('../src/api/permissions.mjs');const p=createPermissions();
 p.issue({actor:'agent',methods:['commitConfigChange','dispatchSave','getConfiguration'],accounts:['a'],expiresAt:Date.now()+10000});
 assert.equal(p.authorize({actor:'agent',method:'getConfiguration',params:{},phase:'response',result:{target:{accountId:'other'}}}),false);
 p.approve({actor:'agent',previewId:'exact-preview'});assert.equal(p.confirm({actor:'agent',method:'commitConfigChange',previewId:'wrong-preview',configuration:{target}}),false);assert.equal(p.confirm({actor:'agent',method:'commitConfigChange',previewId:'exact-preview',configuration:{target}}),true);assert.equal(p.confirm({actor:'agent',method:'commitConfigChange',previewId:'exact-preview',configuration:{target}}),false);
 const f=fixture();await assert.rejects(f.invoke('previewConfigChange',{change:{type:'setFlatDefault',target:{...target,token:'do-not-accept'}},expectedRevision:0}),{code:'INVALID_TARGET'});
 await assert.rejects(f.invoke('commitConfigChange',{previewId:'missing'}),{code:'INVALID_REQUEST'});
 await assert.rejects(f.api.invoke({version:2,method:'getConfiguration'},'owner'),{code:'UNSUPPORTED_METHOD_OR_VERSION'});
});
