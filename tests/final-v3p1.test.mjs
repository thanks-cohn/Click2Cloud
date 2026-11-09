import test from 'node:test';
import assert from 'node:assert/strict';
import {compileMenuSpec} from '../src/core/menu-spec.mjs';
import {productState} from '../src/api/config.mjs';
import {targetKey,ancestors} from '../src/core/menu-identity.mjs';
import {generateChromePlan} from '../src/chrome/registrar.mjs';
import {organizationSuggestion,validate,toolRegistry} from '../src/api/service.mjs';
const base={provider:'cloudflare',connectionId:'fixture',accountId:'fixture',bucketName:'bucket',prefix:''};
const compile=(configs,product=productState(),inventory={scopes:[]})=>compileMenuSpec({mode:'composite',configs,product,defaultTarget:product.defaultTarget,inventory});
test('Narrow hides eight intermediate levels without altering full target; cancel source stays immutable',()=>{
 const prefix=Array.from({length:20},(_,i)=>'level'+(i+1)).join('/')+'/',target={...base,prefix};
 const levels=Object.fromEntries(ancestors(prefix).slice(10,18).map(p=>[p,{hidden:true}]));
 const configs={nested:{destinations:[{id:'deep',target,levels}]}};
 const before=JSON.stringify(configs),spec=compile(configs),save=spec.rows.find(r=>r.role==='save');
 assert.equal(targetKey(save.target),targetKey(target));assert.equal(before,JSON.stringify(configs));
 assert.deepEqual(compileMenuSpec({mode:'nested',configs}).rows.filter(r=>r.origin.mode==='nested'&&!['c2c:root','c2c:cloudflare'].includes(r.id)).map(r=>r.label),['bucket',...Array.from({length:10},(_,i)=>'level'+(i+1)),'level19','level20']);
 generateChromePlan(spec);
 const shown=compile({nested:{destinations:[{id:'deep',target}]}});assert.equal(shown.rows.length,spec.rows.length+8);
});
test('Narrow hidden final, shared children, overlapping paths and different accounts stay actionable',()=>{
 const target={...base,prefix:'a/b/c/'};
 const spec=compile({nested:{destinations:[{target,levels:{'a/b/':{hidden:true},'a/b/c/':{hidden:true}}},{target:{...base,prefix:'a/b/d/'}},{target:{...base,accountId:'other',prefix:'a/b/c/'}}]}});
 generateChromePlan(spec);assert.equal(spec.rows.filter(r=>r.role==='save').length,3);
 assert(spec.rows.some(r=>r.label==='c'&&r.target.prefix==='a/b/c/'));
});
test('hidden Quick persists but is omitted; shown Quick wins over duplicate exact default',()=>{
 const t={...base,prefix:'deep/folder/'},configs={simple:{destinations:[{id:'x',target:t,quick:true,hidden:true}]}};
 assert.equal(compile(configs).rows.filter(r=>r.role==='save').length,0);assert.equal(compile(configs).rows.filter(r=>r.role==='provider-action').length,4);configs.simple.destinations[0].hidden=false;
 const product=productState({defaultTarget:t});const spec=compile(configs,product);
 assert.equal(spec.rows.filter(r=>r.role==='save').length,1);assert.equal(spec.rows[0].parentId,null);
 assert.equal(spec.rows.find(r=>r.role==='save').target.prefix,t.prefix);assert.equal(spec.rows.filter(r=>r.role!=='provider-action').length,1);
});
test('composite modes preserve configs and checked trees even with Flat or missing default',()=>{
 const configs={simple:{destinations:[{target:{...base,prefix:'one/'}}]},nested:{destinations:[{target:{...base,prefix:'two/three/'}}]},depth:{scopes:[{target:base,maxDepth:50}]}};
 const before=JSON.stringify(configs),p=productState({show:{simple:true,nested:true,depth:true,flat:true},defaultTarget:{...base,prefix:'exact/'}});
 const spec=compile(configs,p);assert(!spec.rows.some(r=>r.role==='save'&&r.target.prefix==='exact/'));/* Selected Depth owns this bucket; Flat does not fabricate an undiscovered route. */assert(spec.rows.some(r=>r.origin.mode==='nested'));assert(spec.rows.some(r=>r.origin.mode==='depth'));assert.equal(JSON.stringify(configs),before);
 const missing=compile(configs,productState({show:p.show}));assert(missing.rows.filter(r=>r.role==='save').length>=3);assert.equal(missing.rows.filter(r=>r.role==='provider-action').length,3);assert(missing.omissions.some(r=>r.reason==='DEFAULT_LOCATION_REQUIRED'));
});
test('Quick order is stable, promoted actions follow the four providers without duplicated children',()=>{
 const configs={simple:{destinations:[0,1,2,3].map(i=>({target:{...base,prefix:'p'+i+'/'},quick:i<3,order:i}))}};
 const direct=compile(configs),nested=compile(configs,productState({placement:{cloudflare:'other'}}));
 assert.deepEqual(direct.rows.filter(r=>r.parentId===null).slice(4).map(r=>r.target.prefix),['p0/','p1/','p2/']);
 assert.deepEqual(nested.rows.filter(r=>r.role==='save').map(r=>r.actionId).sort(),direct.rows.filter(r=>r.role==='save').map(r=>r.actionId).sort());
 assert(nested.rows.slice(0,3).every(r=>r.parentId===null));generateChromePlan(nested);
});
test('organization trigger is exactly >=7 direct entries; dismiss signature changes only on relevant projection',()=>{
 for(const [providers,quick,expected] of [[4,2,false],[4,3,true],[5,2,true],[6,1,true]]){
  const rows=Array.from({length:providers+quick},(_,i)=>({id:''+i,parentId:null,role:i<quick?'save':'branch'}));
  const p=productState(),s=organizationSuggestion({rows},p);assert.equal(s.eligible,expected);
  p.suggestionDismissed=s.signature;assert.equal(organizationSuggestion({rows},p).eligible,false);
  p.theme='light';p.favorites=['cloudflare:fixture'];assert.equal(organizationSuggestion({rows},p).eligible,false);
 }
});
test('closed schemas reject malformed params and credentials; typed registry has all meaningful GUI families',()=>{
 for(const name of ['loginBegin','loginStatus','loginCancel','disconnect','listFolders','commitConfigChange','dispatchSave','chooseBackupLocation','restoreRightClickMenu','enableWholeCloudJob'])assert(toolRegistry.some(t=>t.name===name));
 const schema=toolRegistry.find(t=>t.name==='commitConfigChange').inputSchema;
 assert.throws(()=>validate(schema,{changes:[],expectedRevision:'0',idempotencyKey:'key'}));
 assert.throws(()=>validate(schema,{changes:[{type:'makeDefault',target:{...base,accessToken:'SECRET'}}],expectedRevision:0,idempotencyKey:'key'}));
 const a=compile({simple:{destinations:[{target:base}]}}),b=compile({simple:{destinations:[{target:base}]}},productState({theme:'light',favorites:['fixture']}));
 assert.deepEqual(a,b);
});

test('trusted scoped grants bind hidden record identities, response accounts, expiry, revocation and approval',async()=>{
 const {createPermissions}=await import('../src/api/permissions.mjs');let now=0;const owner=createPermissions({clock:()=>now});
 owner.issue({actor:'agent',methods:['commitConfigChange','dispatchSave','getProviderConnections'],accounts:['one'],expiresAt:100});
 assert.equal(owner.authorize({actor:'agent',method:'commitConfigChange',params:{},bindings:[{accountId:'two'}]}),false);
 assert.equal(owner.authorize({actor:'agent',method:'getProviderConnections',params:{},phase:'response',result:{accounts:[{id:'two'}]}}),false);
 const params={itemId:'exact-id',generation:1};owner.approve('agent','dispatchSave',params);assert.equal(owner.confirm({actor:'agent',method:'dispatchSave',params}),true);assert.equal(owner.confirm({actor:'agent',method:'dispatchSave',params}),false);
 now=101;assert.equal(owner.authorize({actor:'agent',method:'dispatchSave',params}),false);
 assert.throws(()=>owner.issue({actor:'gui',methods:['dispatchSave'],accounts:['one'],expiresAt:200}));
});

test('previous main product shape migrates exact targets, revisions, visibility, recovery and ancestor aliases',async()=>{
 const {validateProduct}=await import('../src/api/config.mjs');const t={...base,prefix:'a/b/'};
 const legacy={schemaVersion:1,revision:7,configs:{simple:{schemaVersion:1,mode:'simple',revision:2,destinations:[]},nested:{schemaVersion:1,mode:'nested',revision:4,destinations:[{id:'main-stable-id',target:t,aliases:['Bucket title','A title','B title']}]},depth:{schemaVersion:1,mode:'depth',revision:3,scopes:[]}},show:{simple:false,narrow:true,depth:true,flat:false},previousShow:{simple:false,narrow:true,depth:true},flatDefault:t,recoveryPolicy:{cadence:'daily',simple:false,narrow:true,buckets:[{target:base,maxDepth:40}],backupLocation:'documents'}};
 const migrated=validateProduct(legacy);assert.equal(migrated.product.revision,7);assert.equal(migrated.product.show.nested,true);assert.equal(migrated.product.show.simple,false);assert.equal(migrated.product.defaultTarget.prefix,'a/b/');assert.equal(migrated.product.recovery.buckets[0].depth,40);
 assert.equal(migrated.configs.nested.destinations[0].id,'main-stable-id');assert.deepEqual(migrated.configs.nested.destinations[0].levels,{'':{label:'Bucket title'},'a/':{label:'A title'},'a/b/':{label:'B title'}});
 assert.deepEqual(compileMenuSpec({mode:'nested',configs:migrated.configs}).rows.filter(r=>r.origin.mode==='nested'&&!['c2c:root','c2c:cloudflare'].includes(r.id)).map(r=>r.label),['Bucket title','A title','B title']);
 assert.throws(()=>validateProduct({...legacy,flatDefault:{...t,token:'must-not-enter-state'}}));
 assert.throws(()=>validateProduct({...legacy,previousShow:{...legacy.previousShow,token:'must-not-enter-state'}}));
});
