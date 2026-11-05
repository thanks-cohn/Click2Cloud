import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiagnostics,emitDiagnostic,CRITICAL_BOUNDARIES,OUTCOMES,REASON_CODES} from '../src/glaciaring/index.mjs';
import {createAgentDebugApi,createDiagnosticAuthorizer} from '../src/glaciaring/agent-api.mjs';

const emit=(d,stage,outcome='ok',code='OK',extra={})=>d.emit({stage,outcome,code,operationId:1,...extra});
test('all catalog stages retain every critical fault outcome; no first-fault early stop',()=>{
  const d=createDiagnostics({capacity:4096});
  let count=0;
  for(const row of CRITICAL_BOUNDARIES)for(const outcome of OUTCOMES){assert.ok(emit(d,row.stage,outcome,'OK'));count++;}
  const snapshot=d.snapshot();
  assert.equal(snapshot.events.length,count);
  assert.equal(snapshot.stats.dropped,0);
  assert.equal(snapshot.candidates.length,CRITICAL_BOUNDARIES.length*7);
  assert.equal(snapshot.status,'FAIL');
  assert.equal(snapshot.stats.slotBytes,63);
  assert.ok(Object.isFrozen(snapshot.events));
});
test('misleading green parent does not hide child, cascade or independent sibling',()=>{
  const d=createDiagnostics();d.declareOperation(1,['auth.check','worker.capability','transfer.upload','completion.history','transfer.verify']);
  emit(d,'auth.check');
  const failure=emit(d,'worker.capability','failed','CAPABILITY_MISMATCH');
  const cascade=emit(d,'transfer.upload','blocked','UPLOAD_UNCERTAIN',{requires:[failure]});
  emit(d,'completion.history','skipped','HANDOFF_PENDING',{requires:[cascade]});
  const second=emit(d,'transfer.verify','failed','RECEIPT_MISMATCH',{operationId:2});
  const all=d.snapshot();
  assert.equal(all.candidates.find(x=>x.signal===failure).classification,'observed-fault-candidate');
  assert.equal(all.candidates.find(x=>x.signal===cascade).classification,'dependent-symptom');
  assert.equal(all.candidates.find(x=>x.signal===second).classification,'observed-fault-candidate');
  assert.equal(all.candidates.length,3);
  assert.ok(!all.edges.some(x=>x.from===failure&&x.to===second));
  assert.ok(d.snapshot({operationId:1}).gaps.some(g=>g.stage==='transfer.verify'&&g.code==='CHECKPOINT_MISSING'));
});
test('missing, in-flight, stale generation, epoch, evictions, dependencies, drops and restart stay visible',()=>{
  let now=0;const d=createDiagnostics({capacity:3,clock:()=>now,retentionMs:100});
  d.declareOperation(1,['auth.check','transfer.upload','transfer.verify']);
  const auth=emit(d,'auth.check');
  emit(d,'transfer.upload','started','UPLOAD_STARTED',{generation:1});
  assert.ok(d.snapshot({operationId:1}).gaps.some(g=>g.code==='TERMINAL_MISSING'));
  emit(d,'transfer.verify','failed','RECEIPT_MISMATCH',{requires:[auth],epoch:0,generation:1});
  emit(d,'auth.check');
  d.emit({stage:'auth.check',outcome:'ok',code:'secret https://private/path?token=canary',operationId:1});
  const s=d.snapshot({operationId:1,generation:2});
  assert.ok(s.gaps.some(g=>g.code==='OBSERVATION_EVICTED'));
  assert.ok(s.gaps.some(g=>g.code==='OBSERVATION_DROPPED'));
  assert.ok(s.gaps.some(g=>g.code==='DEPENDENCY_MISSING'));
  assert.ok(s.gaps.some(g=>g.code==='STALE_EPOCH'));
  assert.ok(s.gaps.some(g=>g.code==='STALE_GENERATION'));
  assert.ok(!JSON.stringify(s).includes('canary'));
  now=200;assert.ok(d.snapshot({operationId:1}).gaps.some(g=>g.code==='OBSERVATION_EXPIRED'));
  d.restart(2);assert.equal(d.stats().occupancy,0);assert.ok(d.snapshot().gaps.some(g=>g.code==='OBSERVATION_GAP'));
});
test('disabled/throwing instrumentation is fail-open without inventing health',()=>{
  const d=createDiagnostics({enabled:false});d.declareOperation(1,['auth.check']);
  assert.equal(emit(d,'auth.check'),0);
  assert.equal(d.snapshot({operationId:1}).status,'COVERAGE_GAP');
  assert.equal(emitDiagnostic(()=>{throw Error('canary');},{stage:'auth.check'}),0);
  assert.equal(emitDiagnostic(null,{}),0);
});
test('future provider boundary registration requires safe source manifest, preserves vocabulary',()=>{
  const d=createDiagnostics();
  d.registerBoundary({stage:'s3.verify',source:'src/explorer/save-provider.mjs',tests:['tests/glaciaring.test.mjs'],codes:['S3_HEAD_MISMATCH'],coverage:'partial'});
  d.declareOperation(1,['s3.verify']);
  emit(d,'s3.verify','failed','S3_HEAD_MISMATCH');
  assert.equal(d.snapshot({operationId:1}).candidates[0].code,'S3_HEAD_MISMATCH');
  assert.throws(()=>d.registerBoundary({stage:'unsafe',source:'https://token@secret',tests:[],codes:[]}));
});
const fixture=()=>({generation:42,revision:2,mode:'depth',inventoryRevision:3,coverage:{complete:false},rows:[
  {id:'root-private',parentId:null,siblingIndex:0,type:'normal',label:'https://private.example/token-canary',contexts:['image'],enabled:true,visible:true,role:'branch',origin:{mode:'depth',provider:'private-provider'}},
  {id:'leaf-private',parentId:'root-private',siblingIndex:0,type:'normal',label:'token secret filename.jpg',contexts:['image'],enabled:true,visible:true,role:'save',origin:{mode:'depth',provider:'private-provider'},actionId:'secret-action',target:{prefix:'private/path/'}}
],omissions:[{candidate:'private filename',code:'CAPABILITY_MISMATCH',origin:{mode:'depth'}}]});
test('API denies unknown/expired grants, sender spoofing and write methods',async()=>{
  const api=createAgentDebugApi({diagnostics:createDiagnostics()});
  assert.equal((await api.describeEngine()).result.code,'DIAGNOSTIC_GRANT_REQUIRED');
  assert.equal((await api.request('upload')).result.code,'UNKNOWN_METHOD');
  const authorizer=createDiagnosticAuthorizer({extensionId:'test',allowedPaths:['/extension/mirror.html'],readSession:()=>({authenticated:true}),readGrant:()=>({debug:true,expiresAt:100}),clock:()=>50});
  assert.equal(await authorizer({}, {sender:{id:'test',url:'https://bad.example/extension/mirror.html'}}),false);
  assert.equal(await authorizer({}, {sender:{id:'test',url:'chrome-extension://test/extension/other.html'}}),false);
  assert.equal((await authorizer({}, {sender:{id:'test',url:'chrome-extension://test/extension/mirror.html'}})).debug,true);
  const expired=createAgentDebugApi({diagnostics:createDiagnostics(),authorize:()=>({debug:true,expiresAt:1}),clock:()=>2});
  assert.equal((await expired.describeEngine()).result.code,'DIAGNOSTIC_GRANT_REQUIRED');
});
test('API paginates immutable complete available traces and scoped menu aliases; no private strings exported',async()=>{
  const d=createDiagnostics();d.declareOperation(1,['auth.check']);emit(d,'auth.check');
  let current=fixture();let calls=0;
  const api=createAgentDebugApi({diagnostics:d,getMenu:()=>current,getEvidence:()=>({appliedGeneration:41}),authorize:()=>({debug:true,export:true}),resolveAction:(_spec,selection)=>{calls++;assert.equal(selection.itemId,'leaf-private');return {state:'completed',code:'RESOLVE_OK',action:{actionId:'secret-action'}};}});
  const first=await api.inspectMenu({generation:42,limit:1});assert.ok(first.cursor);assert.equal(first.result.total,3);
  current={...current,rows:[]};
  const second=await api.inspectMenu({generation:42,limit:1,cursor:first.cursor});assert.equal(second.result.rows.length,1);assert.equal(second.result.rows[0].role,'save');
  assert.ok(first.gaps.some(g=>g.code==='STALE_GENERATION'));
  assert.ok(first.gaps.some(g=>g.code==='INSTALLED_CHROME_NOT_OBSERVED'));
  const text=JSON.stringify([first,second]);
  for(const secret of ['private.example','token-canary','secret filename','private/path','secret-action'])assert.ok(!text.includes(secret));
  current=fixture();
  const selection=await api.simulateMenuAction({generation:42,itemId:second.result.rows[0].id,fixtureContext:{context:'image'}});
  assert.equal(selection.result.state,'completed');assert.equal(calls,1);assert.deepEqual(selection.result.effects,{capture:0,providerWrites:0,historyWrites:0,successEffects:0});
  const trace=await api.inspectOperation({operationId:1,view:'timeline',limit:1});
  emit(d,'auth.check','failed','AUTH_REVOKED');
  assert.equal(trace.result.total,1);assert.equal(trace.result.status,'OBSERVED_OK');
  const exported=await api.exportReceipt({operationId:1,limit:2});assert.ok(exported.export.bytes<=65536);assert.equal(exported.export.transmission,'none; local user handoff only');
  assert.equal((await api.inspectMenu({generation:42,limit:1,cursor:'999:0'})).result.code,'SNAPSHOT_EXPIRED');
  assert.equal((await api.inspectMenu({generation:42,limit:257})).result.code,'INVALID_REQUEST');
  assert.equal((await api.inspectMenu({generation:42,unexpected:'unsafe'})).result.code,'INVALID_REQUEST');
});
test('export grant distinct from debug read grant; bounded errors and cursor scopes are safe',async()=>{
  let now=0;const d=createDiagnostics();
  const api=createAgentDebugApi({diagnostics:d,getMenu:()=>fixture(),authorize:()=>({debug:true}),clock:()=>now,snapshotTtlMs:10});
  assert.equal((await api.exportReceipt()).result.code,'EXPORT_GRANT_REQUIRED');
  const first=await api.inspectMenu({generation:42,limit:1});
  assert.equal((await api.inspectOperation({operationId:42,cursor:first.cursor})).result.code,'CURSOR_INVALID');
  now=11;assert.equal((await api.inspectMenu({generation:42,limit:1,cursor:first.cursor})).result.code,'SNAPSHOT_EXPIRED');
});
test('source manifest anchors exist and all source-defined typed codes remain in the vocabulary',async()=>{
  const {readFile,access}=await import('node:fs/promises');
  for(const row of CRITICAL_BOUNDARIES){
    await access(new URL('../'+row.source,import.meta.url));
    for(const file of row.tests)await access(new URL('../'+file,import.meta.url));
  }
  for(const source of new Set(CRITICAL_BOUNDARIES.map(x=>x.source))){
    const text=await readFile(new URL('../'+source,import.meta.url),'utf8');
    const codes=[...text.matchAll(/['"]([A-Z][A-Z0-9_]{2,})['"]/g)].map(x=>x[1]);
    for(const code of codes)assert.ok(REASON_CODES.includes(code),`${source} source-owned reason ${code} is absent from closed diagnostic vocabulary`);
  }
});
test('desired/generated/ACK/observed states and omissions differ independently, without invented proof',async()=>{
  const d=createDiagnostics();
  const original=fixture();
  original.omissions=[{target:{provider:'cloudflare',connectionId:'one',accountId:'a',bucketName:'bucket',prefix:'one/'},reason:'INVENTORY_INCOMPLETE'},{target:{provider:'cloudflare',connectionId:'one',accountId:'a',bucketName:'bucket',prefix:'two/'},reason:'WORKER_UNVERIFIED'}];
  const changed={...original,generation:43,omissions:[{...original.omissions[0],reason:'FOLDER_NOT_WRITABLE'},original.omissions[1]]};
  let evidence={acknowledgedGeneration:42,observed:{generation:42,complete:false,rendering:false}};
  const api=createAgentDebugApi({diagnostics:d,getMenu:g=>g===42?original:changed,getEvidence:()=>evidence,authorize:()=>({debug:true})});
  const before=await api.inspectMenu({generation:42});
  assert.equal(before.result.evidence.generated.state,'unknown');
  assert.ok(before.gaps.some(g=>g.code==='GENERATED_PLAN_UNKNOWN'));
  assert.ok(before.gaps.some(g=>g.code==='NATIVE_OBSERVATION_PARTIAL'));
  assert.ok(before.gaps.some(g=>g.code==='NATIVE_RENDERING_NOT_OBSERVED'));
  const omissions=before.result.rows.filter(x=>x.kind==='omission');
  assert.notEqual(omissions[0].candidate,omissions[1].candidate);
  const diff=await api.diffMenuGenerations({generation:43,compareTo:42});
  assert.ok(diff.result.rows.some(x=>x.kind==='changed'&&x.fields.includes('code')&&x.before.kind==='omission'));
  evidence={generated:{generation:42,rows:[]},acknowledgedGeneration:42};
  const missing=await api.inspectMenu({generation:42});
  assert.ok(missing.gaps.some(g=>g.code==='GENERATED_ITEM_MISSING'));
});
test('external skipped checks and unobservable mandatory boundaries cannot be healthy',()=>{
  const d=createDiagnostics();d.declareOperation(1,['auth.check']);
  emit(d,'auth.check','skipped','AUTH_EXTERNAL');
  assert.equal(d.snapshot({operationId:1}).status,'COVERAGE_GAP');
  assert.ok(d.snapshot({operationId:1}).gaps.some(g=>g.code==='EXTERNAL_BOUNDARY_UNOBSERVED'));
  d.declareOperation(2,['entitlement.check']);emit(d,'entitlement.check','ok','OK',{operationId:2});
  assert.ok(d.snapshot({operationId:2}).gaps.some(g=>g.code==='UNOBSERVABLE_BOUNDARY'));
});
test('fixture authorized simulation resolves selected aliases without disclosing routes or granting live authority',async()=>{
  const {compileMenuSpec}=await import('../src/core/menu-spec.mjs');
  const {resolveMenuAction}=await import('../src/core/action-resolver.mjs');
  // The API accepts a fixture-only authorization assertion; no live dispatcher is reachable.
  const spec=fixture();spec.rows[1].intent={};
  const api=createAgentDebugApi({diagnostics:createDiagnostics(),getMenu:()=>spec,getEvidence:()=>({acknowledgedGeneration:42}),authorize:()=>({debug:true}),resolveAction:(_spec,selection)=>({state:selection.authorizedTargets?.[0]===spec.rows[1].target?'completed':'blocked',code:'RESOLVE_OK',action:{actionId:'secret-action'}})});
  const menu=await api.inspectMenu({generation:42});
  const row=menu.result.rows.find(x=>x.role==='save');
  const result=await api.simulateMenuAction({generation:42,actionId:row.actionId,fixtureContext:{authorizedTargetAliases:[row.targetAlias]}});
  assert.equal(result.result.state,'completed');assert.equal(result.result.simulation,true);
  assert.ok(result.gaps.some(g=>g.code==='LIVE_AUTHORITY_NOT_PROBED'));
});
test('one green native ACK cannot conceal an entirely absent child checkpoint',()=>{
  const d=createDiagnostics();d.declareOperation(1,['chrome.plan','chrome.ack','chrome.apply']);
  emit(d,'chrome.plan','ok','PLAN_GENERATED',{generation:4,count:3});
  emit(d,'chrome.ack','ok','ITEM_ACKNOWLEDGED',{generation:4,count:1});
  emit(d,'chrome.ack','ok','ITEM_ACKNOWLEDGED',{generation:4,count:3});
  emit(d,'chrome.apply','ok','NATIVE_ACKNOWLEDGED',{generation:4,count:3});
  const snapshot=d.snapshot({operationId:1});
  assert.equal(snapshot.status,'COVERAGE_GAP');
  assert.ok(snapshot.gaps.some(g=>g.code==='NATIVE_ITEM_OBSERVATION_MISSING'&&g.expectedCount===3&&g.observedCount===2));
  emit(d,'chrome.ack','failed','CHROME_API_ERROR',{generation:4,count:2});
  const repaired=d.snapshot({operationId:1});assert.equal(repaired.status,'FAIL');
  assert.ok(!repaired.gaps.some(g=>g.code==='NATIVE_ITEM_OBSERVATION_MISSING'));
});
test('failure storms paginate every available gap and keep each authorized export inside its actual byte cap',async()=>{
  const d=createDiagnostics({capacity:512});d.declareOperation(1,['transfer.upload']);
  for(let i=0;i<300;i++)emit(d,'transfer.upload','uncertain','UPLOAD_UNCERTAIN',{requires:[10000+i,20000+i,30000+i,40000+i]});
  const full=d.snapshot({operationId:1});assert.ok(full.gaps.length>1000);
  const api=createAgentDebugApi({diagnostics:d,authorize:()=>({debug:true,export:true})});
  let cursor,seen=0,pages=0;
  do{
    const page=await api.exportReceipt({operationId:1,limit:16,...(cursor?{cursor}:{})});
    assert.notEqual(page.result?.state,'blocked');
    assert.ok(new TextEncoder().encode(JSON.stringify(page)).length<=65536);
    assert.equal(page.export.bytes,new TextEncoder().encode(JSON.stringify(page)).length);
    assert.ok(page.gaps.some(g=>g.code==='ADDITIONAL_GAPS_PAGINATED'));
    seen+=page.result.rows.filter(x=>x.kind==='gap').length;cursor=page.cursor;pages++;
  }while(cursor);
  assert.equal(seen,full.gaps.length);assert.ok(pages>10);
});
test('unrepresentable revision metadata is a visible diagnostic gap instead of silent correlation',()=>{
  const d=createDiagnostics();d.declareOperation(1,['auth.check']);
  emit(d,'auth.check','ok','OK',{generation:2**40,revision:-1});
  const snapshot=d.snapshot({operationId:1});
  assert.ok(snapshot.gaps.some(g=>g.code==='OBSERVATION_METADATA_DROPPED'&&g.count===2));
  assert.equal(snapshot.status,'COVERAGE_GAP');
});
test('a green checkpoint on another operation cannot conceal a declared absent checkpoint',()=>{
  const d=createDiagnostics();d.declareOperation(1,['transfer.verify']);d.declareOperation(2,['transfer.verify']);
  emit(d,'transfer.verify','ok','RECEIPT_VERIFIED',{operationId:2});
  const snapshot=d.snapshot();
  assert.ok(snapshot.gaps.some(g=>g.code==='CHECKPOINT_MISSING'&&g.stage==='transfer.verify'&&g.operationId===1));
});
test('aggregate current ACK cannot conceal missing failed uncertain or stale per-item proof; extra generated rows stay visible',async()=>{
  const spec=fixture();spec.coverage={complete:true};
  const plan=spec.rows.map(row=>({itemId:row.id,actionId:row.actionId??null,properties:{id:row.id,parentId:row.parentId??undefined,title:row.label,type:row.type,enabled:row.enabled,visible:row.visible,contexts:row.contexts}}));
  plan.push({itemId:'unintended-private-row',actionId:null,properties:{id:'unintended-private-row',parentId:'root-private',title:'secret-extra-label',type:'normal'}});
  let evidence={epoch:3,generated:{generation:42,rows:plan},acknowledgedGeneration:42,observed:{generation:42,complete:true,rendering:true},acknowledgements:[{itemId:'leaf-private',state:'failed',code:'CHROME_API_ERROR',generation:41,epoch:2}]};
  const api=createAgentDebugApi({diagnostics:createDiagnostics(),getMenu:()=>spec,getEvidence:()=>evidence,authorize:()=>({debug:true})});
  let result=await api.inspectMenu({generation:42});
  for(const code of ['NATIVE_ITEM_ACK_UNKNOWN','NATIVE_ITEM_ACK_FAILED','NATIVE_ITEM_ACK_STALE_GENERATION','NATIVE_ITEM_ACK_STALE_EPOCH','GENERATED_ITEM_EXTRA'])assert.ok(result.gaps.some(g=>g.code===code),code);
  assert.ok(result.result.rows.some(row=>row.kind==='generated-extra'));
  assert.ok(!JSON.stringify(result).includes('secret-extra-label'));
  evidence={...evidence,acknowledgements:[{itemId:'leaf-private',state:'uncertain',code:'CHROME_ACK_TIMEOUT'}]};
  result=await api.inspectMenu({generation:42});
  assert.ok(result.gaps.some(g=>g.code==='NATIVE_ITEM_ACK_UNCERTAIN'));
  assert.ok(result.gaps.some(g=>g.code==='NATIVE_ITEM_ACK_PROVENANCE_UNKNOWN'));
});
