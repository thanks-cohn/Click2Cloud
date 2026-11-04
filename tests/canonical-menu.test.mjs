import test from 'node:test';
import assert from 'node:assert/strict';
import {compileMenuSpec,inspectMenuTree,diffMenuSpecs,targetKey} from '../src/core/menu-spec.mjs';
import {resolveMenuAction} from '../src/core/action-resolver.mjs';
import * as simple from '../src/modes/simple/index.mjs';
import * as nested from '../src/modes/nested/index.mjs';
import * as depth from '../src/modes/depth/index.mjs';
import {createDiagnostics} from '../src/glaciaring/index.mjs';

const target=(prefix='',accountId='account-a',provider='cloudflare')=>({provider,connectionId:'connection-'+accountId,accountId,bucketName:'redown',prefix});
function fixture(mode='depth') {
  return {mode,generation:7,revision:3,defaultTarget:target(),inventory:{revision:2,scopes:[{...target(),authorized:true,workerReady:true,complete:true,folders:['alpha','alpha/child','beta','unconfigured/child',...Array.from({length:20},(_,i)=>Array.from({length:i+1},(_,n)=>'level-'+n).join('/'))]}]},configs:{simple:{revision:4,destinations:[{id:'a',target:target('alpha/'),label:'Alpha'}]},nested:{revision:6,destinations:[{target:target('alpha/')},{target:target('alpha/child/')},{target:target('beta/')}]},depth:{revision:9,scopes:[{target:target(),maxDepth:20}]}},flatProviders:['google-drive','dropbox','onedrive'].map(id=>({id:'legacy:'+id,label:id,target:target('','external',id)}))};
}
const auth=spec=>spec.rows.filter(r=>r.role==='save').map(r=>r.target);
const resolve=(spec,row,extra={})=>resolveMenuAction(spec,{itemId:row.id,generation:spec.generation,acknowledgedGeneration:spec.generation,authorizedTargets:auth(spec),...extra});

test('canonical MenuSpec preserves full arbitrary supported depth, row order, role and immutable exact identity',()=>{
  const spec=compileMenuSpec(fixture());
  assert.ok(spec.rows.some(row=>row.target?.prefix.split('/').filter(Boolean).length===20));
  for(const row of spec.rows) {
    assert.equal(row.id,row.itemId);assert.ok(Object.isFrozen(row));
    const peers=spec.rows.filter(p=>p.parentId===row.parentId);
    assert.equal(peers[row.siblingIndex],row);
    if(row.role==='save'){assert.ok(row.actionId);assert.ok(row.intent);assert.equal(row.intent.accountId,row.target.accountId);}
    else assert.equal(row.actionId,null);
  }
  assert.throws(()=>spec.rows.push({}),TypeError);
  assert.throws(()=>{spec.rows[0].label='changed';},TypeError);
});

test('input permutations compile byte-identical canonical output without mutation',()=>{
  const input=fixture(),a=compileMenuSpec(input),before=JSON.stringify(input);
  const b=compileMenuSpec({...input,flatProviders:[...input.flatProviders].reverse(),inventory:{...input.inventory,scopes:input.inventory.scopes.map(s=>({...s,folders:[...s.folders].reverse()}))}});
  assert.deepEqual(a,b);assert.equal(JSON.stringify(input),before);
});

test('single default is a direct Cloudflare save; extra destination expands with native separator and Home last',()=>{
  const base=fixture('simple');base.configs.simple.destinations=[];
  const single=compileMenuSpec(base),direct=single.rows.find(r=>r.id==='c2c:cloudflare');
  assert.equal(direct.role,'save');assert.equal(resolve(single,direct).action.target.prefix,'');
  base.configs.simple.destinations=[{target:target('alpha/')}];
  const expanded=compileMenuSpec(base),children=expanded.rows.filter(r=>r.parentId==='c2c:cloudflare');
  assert.equal(children.at(-2).role,'separator');assert.equal(children.at(-1).label,'Home');
  assert.equal(children.at(-1).role,'save');assert.deepEqual(resolve(expanded,children.at(-1)).action.target,resolve(single,direct).action.target);
  assert.equal(resolve(expanded,expanded.rows.find(r=>r.id==='c2c:cloudflare')).code,'NOT_ACTIONABLE');
});

test('same named bucket and path in different accounts retain separate canonical actions',()=>{
  const input=fixture();input.inventory.scopes.push({...input.inventory.scopes[0],...target('','account-b')});
  input.configs.depth.scopes.push({target:target('','account-b'),maxDepth:20});
  const spec=compileMenuSpec(input);
  const rows=spec.rows.filter(r=>r.role==='save'&&r.target?.prefix==='alpha/child/');
  assert.equal(rows.length,2);assert.notEqual(rows[0].actionId,rows[1].actionId);
  assert.notEqual(targetKey(rows[0].target),targetKey(rows[1].target));
  assert.deepEqual(new Set(rows.map(r=>resolve(spec,r).action.target.accountId)),new Set(['account-a','account-b']));
});

test('provider-neutral S3 modes are siblings of Cloudflare and unchanged flat provider native IDs survive all modes',()=>{
  const input=fixture(),s3=target('','s3-account','s3:example');
  input.inventory.scopes.push({...s3,authorized:true,workerReady:true,complete:true,folders:['foreign/leaf']});
  input.configs.depth.scopes.push({target:s3,maxDepth:4});
  const spec=compileMenuSpec(input),provider=spec.rows.find(r=>r.origin.provider==='s3:example'&&r.parentId==='c2c:root');
  assert.ok(provider);assert.notEqual(provider.id,'c2c:cloudflare');
  assert.ok(spec.rows.some(r=>r.parentId===provider.id));
  const peers=mode=>compileMenuSpec({...input,mode}).rows.filter(r=>r.id.startsWith('legacy:'));
  assert.deepEqual(peers('simple'),peers('nested'));assert.deepEqual(peers('nested'),peers('depth'));
});

test('independent mode configurations own migrations, revisions and pure projections; replacement leaves peers exact',()=>{
  const s=simple.createConfig(fixture().configs.simple),n=nested.createConfig(fixture().configs.nested),d=depth.createConfig(fixture().configs.depth);
  const original=JSON.stringify({s,n,d});
  const changed=nested.updateConfig(n,{destinations:[{target:target('beta/'),label:'Changed'}]},{expectedRevision:6});
  assert.equal(changed.revision,7);assert.equal(s.revision,4);assert.equal(d.revision,9);assert.equal(JSON.stringify({s,n,d}),original);
  assert.throws(()=>nested.updateConfig(changed,{}, {expectedRevision:6}),{code:'STALE_REVISION'});
  for(const [module,config] of [[simple,s],[nested,n],[depth,d]]){
    assert.deepEqual(module.migrateConfig(config),config);assert.throws(()=>module.migrateConfig({...config,schemaVersion:99}),/Unsupported/);
  }
  const input=fixture('simple'),before=compileMenuSpec(input);
  assert.deepEqual(compileMenuSpec({...input,configs:{...input.configs,nested:changed}}),before);
  const replacement={...nested,project:()=>({mode:'nested',revision:0,rows:[],omissions:[]})};
  assert.deepEqual(compileMenuSpec({...input,modules:{simple,nested:replacement,depth}}),before);
});

test('Nested natural ancestors never accidentally save; selected parents receive explicit Save here',()=>{
  const spec=compileMenuSpec(fixture('nested'));
  const alpha=spec.rows.find(r=>r.target?.prefix==='alpha/'&&r.role==='branch');
  assert.ok(alpha);assert.equal(resolve(spec,alpha).code,'NOT_ACTIONABLE');
  const saveHere=spec.rows.find(r=>r.parentId===alpha.id&&r.label==='Save here');
  assert.equal(resolve(spec,saveHere).action.target.prefix,'alpha/');
  assert.ok(spec.omissions.some(o=>o.target?.prefix==='unconfigured/child/'&&o.reason==='NOT_CONFIGURED'));
});

test('unwritable actionable ancestor stays a navigable branch without concealing a writable descendant',()=>{
  for(const mode of ['nested','depth']) {
    const input=fixture(mode);input.inventory.scopes[0].folders=input.inventory.scopes[0].folders.map(f=>f==='alpha'?{prefix:'alpha/',writable:false}:f);
    const spec=compileMenuSpec(input),parent=spec.rows.find(r=>r.target?.prefix==='alpha/'&&r.role==='branch');
    assert.equal(parent.enabled,true);
    const ownSave=spec.rows.find(r=>r.parentId===parent.id&&r.label==='Save here');
    assert.equal(resolve(spec,ownSave).code,'ITEM_DISABLED');
    const child=spec.rows.find(r=>r.target?.prefix==='alpha/child/'&&r.role==='save');
    assert.equal(resolve(spec,child).state,'completed');
    assert.ok(spec.omissions.some(o=>o.target?.prefix==='alpha/'&&o.reason==='FOLDER_NOT_WRITABLE'));
  }
});

test('read-only paging retrieves every nested row and omission, and rejects stale cursors or scope changes',()=>{
  const spec=compileMenuSpec(fixture()),all=[];let cursor=null;
  do {const page=inspectMenuTree(spec,{cursor,limit:3,includeOmissions:true});all.push(...page.items);cursor=page.nextCursor;}while(cursor);
  assert.equal(all.filter(x=>x.kind==='row').length,spec.rows.length);
  assert.equal(all.filter(x=>x.kind==='omission').length,spec.omissions.length);
  const page=inspectMenuTree(spec,{limit:1});
  assert.throws(()=>inspectMenuTree({...spec,generation:8},{cursor:page.nextCursor,limit:1}),{code:'STALE_CURSOR'});
  assert.throws(()=>inspectMenuTree(spec,{cursor:page.nextCursor,parentId:'c2c:root'}),{code:'STALE_CURSOR'});
  const subtree=inspectMenuTree(spec,{parentId:'c2c:cloudflare',limit:1000});
  assert.ok(subtree.items.length>20);assert.ok(!subtree.items.some(r=>r.id.startsWith('legacy:')));
});

test('partial Depth scans, bounded omissions, invalid targets and budget omissions stay explicitly incomplete',()=>{
  const input=fixture();input.inventory.scopes[0].complete=false;input.configs.depth.scopes[0].maxDepth=2;
  const spec=compileMenuSpec({...input,maxOmissions:2,maxRows:8});
  assert.equal(spec.coverage.complete,false);assert.equal(spec.coverage.inventoryComplete,false);
  assert.equal(spec.coverage.rowsComplete,false);assert.ok(spec.coverage.rowsDropped>0);
  assert.equal(spec.coverage.omissionsComplete,false);assert.ok(spec.coverage.omissionsDropped>0);
  assert.equal(spec.coverage.unobservedDescendants[0].reason,'INVENTORY_INCOMPLETE');
  assert.throws(()=>compileMenuSpec({...input,configs:{...input.configs,depth:{scopes:[{target:target(),maxDepth:0}]}}}),{code:'INVALID_DEPTH'});
  assert.throws(()=>compileMenuSpec({...input,defaultTarget:target('../escape')}),{code:'INVALID_PREFIX'});
  assert.throws(()=>compileMenuSpec({...input,defaultTarget:{provider:'cloudflare',bucketName:'redown'}}),{code:'INVALID_TARGET'});
});

test('ineligible scope/default remains visible and blocked; unknown inventory is never healthy',()=>{
  for(const [field,value,reason] of [['authorized',false,'SCOPE_UNAUTHORIZED'],['workerReady',false,'WORKER_UNVERIFIED'],['stale',true,'INVENTORY_STALE']]) {
    const input=fixture('simple');input.configs.simple.destinations=[];input.inventory.scopes[0][field]=value;
    const spec=compileMenuSpec(input),cloud=spec.rows.find(r=>r.id==='c2c:cloudflare');
    assert.equal(cloud.enabled,false);assert.equal(resolve(spec,cloud).code,'ITEM_DISABLED');
    assert.ok(spec.omissions.some(o=>o.reason===reason));assert.equal(spec.coverage.complete,false);
  }
  const missing=fixture('simple');missing.configs.simple.destinations=[{target:target('not-scanned/')}];missing.inventory.scopes[0].complete=false;
  assert.ok(compileMenuSpec(missing).omissions.some(o=>o.reason==='INVENTORY_INCOMPLETE'));
});

test('all simultaneous scope faults remain inspectable and contradictory observations fail explicitly',()=>{
  const input=fixture('simple');input.inventory.scopes[0].authorized=false;input.inventory.scopes[0].workerReady=false;input.inventory.scopes[0].stale=true;
  const reasons=new Set(compileMenuSpec(input).omissions.map(o=>o.reason));
  for(const reason of ['SCOPE_UNAUTHORIZED','WORKER_UNVERIFIED','INVENTORY_STALE'])assert.ok(reasons.has(reason));
  const conflict=fixture();conflict.inventory.scopes[0].folders.push({prefix:'alpha/',writable:false});
  assert.throws(()=>compileMenuSpec(conflict),{code:'INVENTORY_INVALID'});
  conflict.inventory.scopes[0].folders.reverse();
  assert.throws(()=>compileMenuSpec(conflict),{code:'INVENTORY_INVALID'});
});

test('native, mirror and agent simulation resolve identical action without reads writes or feedback',()=>{
  const spec=compileMenuSpec(fixture()),row=spec.rows.find(r=>r.role==='save'&&r.target.prefix==='alpha/child/');
  let effects=0;
  const extra={upload:()=>effects++,fetch:()=>effects++,history:()=>effects++};
  assert.deepEqual(resolve(spec,row,{...extra,surface:'native'}),resolve(spec,row,{...extra,surface:'mirror'}));
  assert.deepEqual(resolve(spec,row,{...extra,surface:'native'}),resolve(spec,row,{...extra,surface:'simulation'}));
  assert.equal(effects,0);
});

test('resolver rejects all stale unknown unacknowledged disabled context and revoked selections without rerouting',()=>{
  const spec=compileMenuSpec(fixture()),row=spec.rows.find(r=>r.role==='save');
  for(const [extra,code] of [[{generation:6},'STALE_GENERATION'],[{acknowledgedGeneration:6},'STALE_GENERATION'],[{acknowledgedGeneration:null},'ACK_MISSING'],[{itemId:'unknown'},'ITEM_UNKNOWN'],[{context:'selection'},'CONTEXT_MISMATCH'],[{authorizedTargets:[]},'SCOPE_UNAUTHORIZED'],[{authorizedTargets:undefined},'AUTHORIZATION_MISSING']])
    assert.equal(resolve(spec,row,extra).code,code);
  assert.equal(resolveMenuAction(spec,{itemId:row.id,acknowledgedGeneration:7,authorizedTargets:auth(spec)}).code,'STALE_GENERATION');
});

test('forged stored action binding cannot resolve an authorized target to a different intent',()=>{
  const spec=compileMenuSpec(fixture()),row=spec.rows.find(r=>r.role==='save');
  for(const replacement of [{...row,intent:{...row.intent,accountId:'attacker'}},{...row,actionId:'forged'},{...row,intent:{...row.intent,token:'private'}}]) {
    const forged={...spec,rows:spec.rows.map(item=>item.id===row.id?replacement:item)};
    assert.equal(resolve(forged,replacement).code,'ACTION_BINDING_INVALID');
  }
  assert.equal(resolveMenuAction({...spec,rows:null},{itemId:row.id,generation:7,acknowledgedGeneration:7,authorizedTargets:[]}).code,'MENU_INVALID');
  assert.equal(resolve(spec,row,{authorizedTargets:[null]}).code,'SCOPE_UNAUTHORIZED');
});

test('structured generation diff detects lost flat peers, misrouting, stale baselines and mode output changes',()=>{
  const before=compileMenuSpec(fixture()),changed=fixture();changed.generation=8;changed.flatProviders=changed.flatProviders.slice(1);changed.configs.depth.scopes[0].maxDepth=2;
  const after=compileMenuSpec(changed),diff=diffMenuSpecs(before,after);
  assert.equal(diff.fromGeneration,7);assert.equal(diff.toGeneration,8);assert.equal(diff.equivalent,false);
  assert.ok(diff.changes.some(c=>c.type==='removed'&&c.itemId==='legacy:google-drive'));
  assert.ok(diff.changes.some(c=>c.type==='removed'&&c.owner.mode==='depth'));
  const mutated={...before,rows:before.rows.map(r=>r.role==='save'?{...r,actionId:'wrong'}:r)};
  assert.ok(diffMenuSpecs(before,mutated).changes.some(c=>c.type==='action-mismatch'));
  assert.equal(diffMenuSpecs(before,compileMenuSpec({...fixture(),generation:8})).equivalent,true);
});

test('duplicate logical labels, duplicate targets and identities fail visibly instead of silently rerouting',()=>{
  const input=fixture('simple');input.configs.simple.destinations=[{target:target('alpha/'),label:'Same'},{target:target('beta/'),label:'Same'}];
  assert.throws(()=>compileMenuSpec(input),{code:'LABEL_COLLISION'});
  input.configs.simple.destinations=[{target:target('alpha/')},{target:target('alpha/')}];
  assert.throws(()=>compileMenuSpec(input),{code:'DUPLICATE_DESTINATION'});
  const duplicate=fixture();duplicate.flatProviders.push(duplicate.flatProviders[0]);
  assert.throws(()=>compileMenuSpec(duplicate),{code:'DUPLICATE_ITEM'});
});

test('diagnostics disabled or throwing cannot alter compile or resolution, and decision evidence is source-owned',()=>{
  const input=fixture('simple'),plain=compileMenuSpec(input),events=[];
  assert.deepEqual(compileMenuSpec({...input,sink:()=>{throw Error('observer down');}}),plain);
  const spec=compileMenuSpec({...input,operationId:12,sink:event=>events.push(event)});
  assert.deepEqual(spec,plain);assert.deepEqual(events.map(e=>[e.stage,e.outcome]),[['menu.compile','started'],['modes.simple','started'],['modes.simple','ok'],['menu.compile','ok']]);
  const row=spec.rows.find(r=>r.role==='save');
  assert.deepEqual(resolve(spec,row,{sink:()=>{throw Error('observer down');}}),resolve(spec,row));
  const diagnostics=createDiagnostics();compileMenuSpec({...input,operationId:12,sink:diagnostics});
  const evidence=diagnostics.snapshot({operationId:12,expectedStages:['menu.compile','modes.simple']});
  assert.equal(evidence.events.length,4);assert.equal(evidence.gaps.length,0);
});
