import test from 'node:test';import assert from 'node:assert/strict';
import {compileMenuSpec,targetKey} from '../src/core/menu-spec.mjs';
import {generateChromePlan,createChromeRegistrar} from '../src/chrome/registrar.mjs';
import {resolveMenuAction} from '../src/core/action-resolver.mjs';
import {productState} from '../src/api/config.mjs';
const root=(bucketName,accountId='qa')=>({provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName,prefix:''});
const destinations=['click2cloud-qa','click2cloud-qa-2'].flatMap(bucket=>['A','B','C'].map(name=>({id:bucket+'-'+name,target:{...root(bucket),prefix:'C2C-QA/Narrow/'+name+'/'},label:name,levels:{'':{label:'not a bucket',hidden:true}}})));
const fixture=(ds=destinations,show={simple:false,nested:true,depth:false,flat:false})=>({mode:'composite',product:productState({show}),configs:{nested:{destinations:ds},simple:{destinations:[]},depth:{scopes:[]}},inventory:{scopes:[...new Map(ds.map(d=>[JSON.stringify([d.target.accountId,d.target.bucketName]),{target:{...d.target,prefix:''},authorized:true,workerReady:true,complete:true,folders:ds.filter(x=>x.target.accountId===d.target.accountId&&x.target.bucketName===d.target.bucketName).map(x=>x.target.prefix)}])).values()]}});
const path=(s,row)=>row?[...path(s,s.rows.find(r=>r.id===row.parentId)),row.label]:[];
test('two real QA bucket boundaries and all exact ancestor saves have native parentId and resolver proof',async()=>{
 const f=fixture(),before=JSON.stringify(f.configs),s=compileMenuSpec(f),plan=generateChromePlan(s),cloud=s.rows.find(r=>r.label==='Cloudflare');
 assert.deepEqual(s.rows.filter(r=>r.parentId===cloud.id).map(r=>r.label),['click2cloud-qa','click2cloud-qa-2']);
 for(const bucketName of ['click2cloud-qa','click2cloud-qa-2'])for(const prefix of ['','C2C-QA/','C2C-QA/Narrow/','C2C-QA/Narrow/A/','C2C-QA/Narrow/B/','C2C-QA/Narrow/C/']){
  const row=s.rows.find(r=>r.role==='save'&&r.target.bucketName===bucketName&&r.target.prefix===prefix);assert(row,prefix);assert(row.enabled);
  assert.equal(plan.rows.find(r=>r.itemId===row.id).properties.parentId,row.parentId);
  assert.deepEqual(path(s,row),['Cloudflare',bucketName,...prefix.split('/').filter(Boolean).slice(0,row.label!=='Save here'?-1:prefix.split('/').filter(Boolean).length),row.label]);
  const resolved=resolveMenuAction(s,{itemId:row.id,generation:s.generation,acknowledgedGeneration:s.generation,authorizedTargets:[row.target]});assert.equal(resolved.state,'completed');assert.equal(targetKey(resolved.action.target),targetKey(row.target));assert.deepEqual(row.provenance.location.directories,prefix.split('/').filter(Boolean));assert.equal(row.provenance.location.bucket,bucketName);if(row.presentationId?.includes('-A')||row.presentationId?.includes('-B')||row.presentationId?.includes('-C')){assert.equal(row.provenance.presentation.bucketTitle,bucketName);assert.equal(row.provenance.presentation.bucketVisible,true);}
  assert.equal(resolveMenuAction(s,{itemId:row.id,generation:s.generation,acknowledgedGeneration:s.generation,authorizedTargets:[{...row.target,accountId:'other'}]}).code,'SCOPE_UNAUTHORIZED');
 }
 const created=[],chrome={runtime:{},contextMenus:{create:(p,cb)=>{created.push(p);cb();},removeAll:cb=>cb(),onClicked:{addListener(){},removeListener(){}}}},r=createChromeRegistrar({chrome});
 try{assert.equal((await r.apply(s)).state,'completed');assert.equal(r.inspect().acknowledgedGeneration,s.generation);assert.deepEqual(created.map(p=>[p.id,p.parentId]),plan.rows.map(r=>[r.itemId,r.properties.parentId]));}finally{r.close();}
 assert.equal(JSON.stringify(f.configs),before);assert.deepEqual(compileMenuSpec(f).rows.map(r=>r.id),s.rows.map(r=>r.id));
});
test('hidden ancestors never remove bucket, hidden destinations and unchecked Narrow never resurrect structural saves',()=>{
 for(const visibilityMode of ['all','custom','hide-all']){
  const f=fixture([{...destinations[0],visibilityMode}]),s=compileMenuSpec(f),leaf=s.rows.find(r=>r.presentationId===destinations[0].id);assert.equal(path(s,leaf)[1],'click2cloud-qa');
  assert.equal(s.rows.filter(r=>r.role==='branch'&&r.target?.prefix==='').length,1);
  if(visibilityMode==='hide-all')assert.deepEqual(path(s,leaf),['Cloudflare','click2cloud-qa','A']);
 }
 for(let bits=0;bits<8;bits++){const f=fixture(destinations.map(d=>({...d,hidden:true})),{simple:!!(bits&1),nested:!!(bits&2),depth:!!(bits&4),flat:false});assert(!compileMenuSpec(f).rows.some(r=>r.origin.mode==='nested'));}
});
test('root-only configured destinations stay inside actual bucket; duplicated presentations remain independent',()=>{
 const ds=[{id:'one',target:root('bucket'),label:'custom root'},{id:'two',target:root('bucket'),label:'different root'}],s=compileMenuSpec(fixture(ds)),saves=s.rows.filter(r=>r.role==='save');
 assert.equal(saves.length,2);assert.deepEqual(saves.map(r=>r.presentationId),['one','two']);assert(saves.every(r=>path(s,r)[1]==='bucket'));assert.equal(saves[0].label,'Save here');assert.equal(saves[1].label,'Save here (2)');
 const scopes=fixture([{...destinations[0],target:root('same','one')},{...destinations[1],target:root('same','two')}]);const rows=compileMenuSpec(scopes).rows;assert(rows.some(r=>r.label==='same [cloudflare:one/one]'));assert(rows.some(r=>r.label==='same [cloudflare:two/two]'));
});
test('ancestor availability never borrows a child capability or enters automatic setup',()=>{
 const f=fixture([destinations[0]]);f.providerSetupActions=true;f.inventory.scopes[0].workerReady=false;f.inventory.scopes[0].folders=[{prefix:destinations[0].target.prefix,workerReady:true}];
 const s=compileMenuSpec(f);for(const row of s.rows.filter(r=>r.reason==='NARROW_ANCESTOR_AUTHORIZATION_REQUIRED')){assert.equal(row.enabled,false);assert.equal(row.actionKind,'save');assert.equal(resolveMenuAction(s,{itemId:row.id,generation:1,acknowledgedGeneration:1,authorizedTargets:[row.target]}).code,'ITEM_DISABLED');}
 assert(s.rows.find(r=>r.presentationId===destinations[0].id).enabled);
});
