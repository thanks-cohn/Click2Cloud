// Read-only source/spec/ACK-fixture audit. Never starts Chrome, contacts a cloud,
// mutates CURRENT or changes menu implementation. Writes only the chosen report.
import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {compileMenuSpec} from '../src/core/menu-spec.mjs';
import {targetKey,scopeKey} from '../src/core/menu-identity.mjs';
import {productState,applyConfigChanges,validateProduct} from '../src/api/config.mjs';
import {createChromeRegistrar,generateChromePlan} from '../src/chrome/registrar.mjs';
import {resolveMenuAction} from '../src/core/action-resolver.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=process.argv[2]??'/tmp/c2c-logic2real-current.json';
const target=(bucketName='redown',prefix='',accountId='fixture-a')=>({provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName,prefix});
const redown=target(),valentiens=target('valentiens'),archives=target('archives');
const show=(simple,nested,depth)=>({simple,nested,depth,flat:false});
const empty=()=>({simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}});
const tree=Array.from({length:10},(_,i)=>Array.from({length:i+1},(_,j)=>'Level'+(j+1)).join('/')+'/');
const branching=[...tree,...Array.from({length:20},(_,i)=>'Sibling'+(i+1)+'/'),...Array.from({length:10},(_,i)=>tree[i]+'Side/')];
const inv=(targets=[redown,valentiens,archives])=>({revision:1,scopes:targets.map(t=>({target:t,folders:t.bucketName==='archives'?[]:t.bucketName==='valentiens'?['2D/','2D/Art/',...branching]:branching,authorized:true,workerReady:true,complete:true}))});
const rule='codex/11.13.2026-0355/P0_APP_WIDE_RESPONSIVENESS_SILENT_DEBUG_LOGIC2REAL_AUDIT.md §5';
const cases=[];
function add(id,title,flags,configs,inventory=inv(),more={}){cases.push({id,title,citation:rule,mode:'composite',generation:1,product:productState({show:flags,...more.product}),configs,inventory,...more});}
add('M01','Simple only',show(true,false,false),{...empty(),simple:{destinations:[{id:'simple-one',target:target('valentiens','2D/'),label:'Simple 2D'}]}});
add('M02','Narrow only, original labels',show(false,true,false),{...empty(),nested:{destinations:[{id:'narrow-original',target:target('valentiens','2D/')} ]}});
add('M03','Depth only, branching depth 5',show(false,false,true),{...empty(),depth:{scopes:[{target:redown,maxDepth:5}]}});
const mixed={simple:{destinations:[{id:'simple-one',target:target('valentiens','2D/'),label:'Simple 2D'}]},nested:{destinations:[{id:'narrow-original',target:target('valentiens','2D/')},{id:'narrow-custom',target:target('valentiens','2D/Art/'),levels:{'':{label:'Custom bucket'},'2D/':{label:'Custom 2D'},'2D/Art/':{label:'Custom Art'}}}]},depth:{scopes:[{target:valentiens,maxDepth:6} ]}};
add('M04','All three enabled; original/custom Narrow inside Depth tree',show(true,true,true),mixed);
add('M05','All three disabled, configurations retained',show(false,false,false),mixed);
add('M06','Single Depth root-only bucket',show(false,false,true),{...empty(),depth:{scopes:[{target:archives,maxDepth:10}]}},inv([archives]));
add('M07','Single Depth bucket with one child',show(false,false,true),{...empty(),depth:{scopes:[{target:redown,maxDepth:10}]}},{scopes:[{target:redown,folders:['Images/'],authorized:true,workerReady:true,complete:true}]});
add('M08','Two root-only Depth buckets',show(false,false,true),{...empty(),depth:{scopes:[{target:redown,maxDepth:5},{target:archives,maxDepth:6}]}},{scopes:[redown,archives].map(t=>({target:t,folders:[],authorized:true,workerReady:true,complete:true}))});
add('M09','Multiple branching buckets, independent depth 5 and 6',show(false,false,true),{...empty(),depth:{scopes:[{target:redown,maxDepth:5},{target:valentiens,maxDepth:6} ]}});
add('M10','Depth cutoff 5 vs real ten-level hierarchy plus twenty siblings',show(false,false,true),{...empty(),depth:{scopes:[{target:redown,maxDepth:5}]}});
add('M11','Depth cutoff 6 vs real ten-level hierarchy plus twenty siblings',show(false,false,true),{...empty(),depth:{scopes:[{target:redown,maxDepth:6}]}});
add('M12','valentiens original Narrow bucket-label expectation',show(false,true,false),{...empty(),nested:{destinations:[{id:'valentiens-original',target:target('valentiens','2D/')}]}});
add('M13','valentiens explicit Narrow bucket-label control',show(false,true,false),{...empty(),nested:{destinations:[{id:'valentiens-labeled',target:target('valentiens','2D/'),levels:{'':{label:'valentiens'}}}]}});
add('M14','redown compact Depth root and descendants',show(false,false,true),{...empty(),depth:{scopes:[{target:redown,maxDepth:6}]}});
const duplicates={...empty(),nested:{destinations:[{id:'duplicate-one',target:target('valentiens','2D/'),label:'2D'},{id:'duplicate-two',target:target('valentiens','2D/'),label:'2D'}]}};
add('M15','Duplicate Narrow 2D presentations and physical Default',show(false,true,false),duplicates,inv(),{defaultTarget:target('valentiens','2D/'),product:productState({show:show(false,true,false),defaultTarget:target('valentiens','2D/')})});
add('M16','Hidden first duplicate retains second presentation',show(false,true,false),{...duplicates,nested:{destinations:duplicates.nested.destinations.map((d,i)=>i===0?{...d,hidden:true}:d)}});
add('M17','Hide Depth mode while Simple and Narrow remain enabled',show(true,true,false),mixed);
add('M18','Hidden Depth scope keeps saved selection and other modes',show(true,true,true),{...mixed,depth:{scopes:[{target:valentiens,maxDepth:6,hidden:true}]}});
add('M19','Quick promoted; hidden entry excluded; Default retained',show(true,true,false),{...empty(),simple:{destinations:[{id:'quick-one',target:target('redown','Sibling1/'),label:'Quick target',quick:true},{id:'hidden-one',target:target('valentiens','2D/'),label:'Hidden',hidden:true}]},nested:{destinations:[{id:'default-narrow',target:target('redown','Level1/'),label:'Default target'}]}},inv(),{defaultTarget:target('redown','Level1/'),product:productState({show:show(true,true,false),defaultTarget:target('redown','Level1/')})});
add('M20','Failed/stale Depth inventory is not verified readiness',show(false,false,true),{...empty(),depth:{scopes:[{target:redown,maxDepth:5}]}},{scopes:[{target:redown,folders:['Images/'],authorized:true,workerReady:true,complete:false,stale:true}]});
add('M21','Expired authorization cannot save',show(false,false,true),{...empty(),depth:{scopes:[{target:redown,maxDepth:5}]}},{scopes:[{target:redown,folders:['Images/'],authorized:false,workerReady:false,complete:true}]});
add('M22','Five siblings, repeated names in distinct account/buckets',show(false,false,true),{...empty(),depth:{scopes:[{target:redown,maxDepth:30},{target:target('valentiens','','fixture-b'),maxDepth:30}]}},{scopes:[redown,target('valentiens','','fixture-b')].map(t=>({target:t,folders:['same/','same/child/',...Array.from({length:5},(_,i)=>'sibling'+i+'/')],authorized:true,workerReady:true,complete:true}))});
add('M23','Single non-redown Depth bucket uses same generic compact rule',show(false,false,true),{...empty(),depth:{scopes:[{target:valentiens,maxDepth:5}]}});
const used=['src/core/menu-spec.mjs','src/core/menu-identity.mjs','src/core/action-resolver.mjs','src/chrome/registrar.mjs','src/modes/simple/index.mjs','src/modes/nested/index.mjs','src/modes/depth/index.mjs','src/api/config.mjs'];
const hashes=Object.fromEntries(await Promise.all(used.map(async p=>[p,createHash('sha256').update(await readFile(new URL('../'+p,import.meta.url))).digest('hex')])));
const evidence={time:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceHashes:hashes,evidenceClass:'PRODUCTION_COMPILER_AND_REGISTRAR_FAKE_CHROME_CALLBACKS_NO_CLOUD',nativeChrome:'UNVERIFIED',realR2:'UNVERIFIED',cases:[],stateTransitions:[],negativeChecks:[]};
const checks=[];const check=(name,fn)=>{try{fn();checks.push({name,result:'PASS'});}catch(e){checks.push({name,result:'FAIL',error:e.message});}};
function paths(rows){const map=new Map();return rows.map(r=>{const path=[...(map.get(r.parentId)??[]),r.label];map.set(r.id,path);return {...r,path};});}
for(const c of cases){
 const before=JSON.stringify(c),spec=compileMenuSpec(c),plan=generateChromePlan(spec);let creates=0,removes=0;
 const chrome={runtime:{},contextMenus:{create:(_p,cb)=>{creates++;queueMicrotask(cb);},removeAll:cb=>{removes++;queueMicrotask(cb);},onClicked:{addListener(){},removeListener(){}}}};
 const registrar=createChromeRegistrar({chrome});const applied=await registrar.apply(spec),native=registrar.inspect();
 const routes=spec.rows.filter(r=>r.role==='save').map(r=>({itemId:r.id,actionId:r.actionId,target:r.target,targetKey:targetKey(r.target),resolver:resolveMenuAction(spec,{itemId:r.id,generation:spec.generation,acknowledgedGeneration:native.acknowledgedGeneration,authorizedTargets:[r.target]}).state}));
 evidence.cases.push({id:c.id,title:c.title,citation:c.citation,savedConfiguration:{product:c.product,configs:c.configs},inventory:c.inventory,composition:spec.composition,coverage:spec.coverage,rows:paths(spec.rows),nativePlan:plan.rows,simulatedACK:{...applied,creates,removes,acknowledgements:native.acknowledgements,nativeRendering:native.coverage.nativeRendering},routes,realChrome:'UNVERIFIED',realR2:'UNVERIFIED',receipt:null});
 check(c.id+' input immutable',()=>assert.equal(JSON.stringify(c),before));check(c.id+' fake ACK matches',()=>assert.equal(applied.state,'completed'));check(c.id+' exact resolver identities',()=>{for(const r of routes)if(spec.rows.find(x=>x.id===r.itemId).enabled){assert.equal(r.resolver,'completed');}});registrar.close();
}
const get=id=>evidence.cases.find(c=>c.id===id);
check('all modes hidden retain all configs and no save routes',()=>{assert.equal(get('M05').routes.length,0);assert.equal(get('M05').savedConfiguration.configs.nested.destinations.length,2);assert.equal(get('M05').savedConfiguration.configs.depth.scopes.length,1);});
for(const [id,limit] of [['M10',5],['M11',6]])check(id+' maxDepth exact and twenty root siblings retained',()=>{const rows=get(id).rows.filter(r=>r.origin.mode==='depth');assert.equal(Math.max(...rows.map(r=>r.target.prefix.split('/').filter(Boolean).length)),limit);assert.equal(rows.filter(r=>r.target.prefix.startsWith('Sibling')).length,20);});
check('duplicate Narrow presentations share physical action but retain native identities',()=>{const rows=get('M15').rows.filter(r=>r.role==='save'&&r.origin.mode==='nested');assert.equal(rows.length,2);assert.notEqual(rows[0].id,rows[1].id);assert.equal(rows[0].actionId,rows[1].actionId);assert.equal(targetKey(rows[0].target),targetKey(rows[1].target));});
check('hide duplicate is not physical-target deletion',()=>{const rows=get('M16').rows.filter(r=>r.role==='save');assert.equal(rows.length,1);assert.equal(rows[0].presentationId,'duplicate-two');});
check('Depth mode hide does not mutate peer config',()=>{assert.deepEqual(get('M17').savedConfiguration.configs,mixed);assert(get('M17').routes.some(r=>r.target.bucketName==='valentiens'));assert(!get('M17').rows.some(r=>r.origin.mode==='depth'));});
const val=get('M12').rows.filter(r=>r.role==='save');evidence.contractMismatches=[{id:'GAP-VALENTIENS',classification:'FACT (fixture) + SOURCE EXPLANATION; installed UNVERIFIED',normativeResult:val.some(r=>r.path.join(' > ')==='Cloudflare > valentiens > 2D')?'PASS':'FAIL',intent:'Cloudflare > valentiens > 2D',actual:val.map(r=>({path:r.path,itemId:r.id,parentId:r.parentId,target:r.target})),source:'src/core/menu-spec.mjs:148-150 (unlabeled Narrow bucket root omitted)',severity:'P1 owner-visible contract mismatch; no layout repair authorized',recommendation:'Record only. Owner must review bucket-label policy before any topology change.'}];
const configState=validateProduct({product:productState({show:show(true,true,true),defaultTarget:target('valentiens','2D/')}),configs:{simple:{destinations:[{id:'trash-simple-one',target:target('redown','Sibling1/'),label:'Simple one'},{id:'trash-simple-two',target:target('redown','Sibling2/'),label:'Simple two'}]},nested:duplicates.nested,depth:{scopes:[{target:redown,maxDepth:5},{target:archives,maxDepth:6}]}}});
const transitions=[['TRASH-SIMPLE',{type:'deleteDestinationConfig',mode:'simple',id:'trash-simple-one'}],['TRASH-NARROW',{type:'deleteDestinationConfig',mode:'nested',id:'duplicate-one'}],['TRASH-DEPTH',{type:'setDepthDisplayBuckets',scopes:[configState.configs.depth.scopes[1]]}]];
for(const [id,change] of transitions){const before=JSON.stringify(configState),next=applyConfigChanges(configState,[change]);const spec=compileMenuSpec({mode:'composite',product:next.product,defaultTarget:next.product.defaultTarget,configs:next.configs,inventory:inv()});evidence.stateTransitions.push({id,citation:rule+' scenarios 6-7',change,before:configState,after:next,afterRows:paths(spec.rows),level:'DOMAIN CHANGE APPLICATION ONLY; UI confirmation/Save/durability/native user behavior NOT established',nativeChrome:'UNVERIFIED',realR2:'UNVERIFIED'});check(id+' source state unchanged',()=>assert.equal(JSON.stringify(configState),before));
 if(id==='TRASH-SIMPLE')check(id+' exact ID only',()=>{assert.deepEqual(next.configs.simple.destinations.map(d=>d.id),['trash-simple-two']);assert.deepEqual(next.configs.nested,configState.configs.nested);});
 if(id==='TRASH-NARROW')check(id+' preserve duplicate and physical Default',()=>{assert.deepEqual(next.configs.nested.destinations.map(d=>d.id),['duplicate-two']);assert.equal(targetKey(next.product.defaultTarget),targetKey(configState.product.defaultTarget));assert(!spec.rows.some(r=>r.presentationId==='duplicate-one'));assert(spec.rows.some(r=>r.presentationId==='duplicate-two'));});
 if(id==='TRASH-DEPTH')check(id+' exact bucket scope only',()=>{assert.deepEqual(next.configs.depth.scopes,[configState.configs.depth.scopes[1]]);assert.deepEqual(next.configs.simple,configState.configs.simple);assert.deepEqual(next.configs.nested,configState.configs.nested);});
}
const reference=compileMenuSpec(cases[2]),row=reference.rows.find(r=>r.role==='save'&&r.enabled);
for(const [id,selection,expected] of [['STALE',{generation:reference.generation+1,acknowledgedGeneration:reference.generation,authorizedTargets:[row.target]},'STALE_GENERATION'],['MISSING-ACK',{generation:reference.generation,acknowledgedGeneration:null,authorizedTargets:[row.target]},'ACK_MISSING'],['EXPIRED-AUTH',{generation:reference.generation,acknowledgedGeneration:reference.generation,authorizedTargets:[]},'SCOPE_UNAUTHORIZED']]){const r=resolveMenuAction(reference,{itemId:row.id,...selection});evidence.negativeChecks.push({id,result:r,expected,evidenceClass:'PURE RESOLVER; NO CLICK OR TRANSFER'});check(id,()=>assert.equal(r.code,expected));}
const failedChrome={runtime:{},contextMenus:{create:(p,cb)=>{if(p.title==='Images')failedChrome.runtime.lastError={message:'fixture denied'};queueMicrotask(()=>{cb();delete failedChrome.runtime.lastError;});},removeAll:cb=>queueMicrotask(cb),onClicked:{addListener(){},removeListener(){}}}};
const failedRegistrar=createChromeRegistrar({chrome:failedChrome});const partial=await failedRegistrar.apply(compileMenuSpec(cases[6]));evidence.negativeChecks.push({id:'PARTIAL-ACK',result:partial,inspection:failedRegistrar.inspect(),evidenceClass:'FAKE CHROME CALLBACK'});check('partial ACK never claims full authority',()=>{assert.equal(partial.code,'NATIVE_APPLY_INCOMPLETE');assert.equal(failedRegistrar.inspect().acknowledgedGeneration,null);});failedRegistrar.close();
evidence.checks=checks;evidence.summary={scenarios:evidence.cases.length,configTransitions:evidence.stateTransitions.length,checks:checks.length,passed:checks.filter(c=>c.result==='PASS').length,failed:checks.filter(c=>c.result==='FAIL').length,compiledRows:evidence.cases.reduce((n,c)=>n+c.rows.length,0),saveRoutes:evidence.cases.reduce((n,c)=>n+c.routes.length,0),contractMismatches:evidence.contractMismatches.filter(c=>c.normativeResult==='FAIL').length};
if(process.argv[3]){
 const baseline=JSON.parse(await readFile(process.argv[3],'utf8'));
 const fields=['savedConfiguration','inventory','composition','coverage','rows','nativePlan','routes'];
 const comparisons=evidence.cases.map(c=>{const prior=baseline.cases.find(x=>x.id===c.id);return {id:c.id,identical:!!prior&&fields.every(k=>JSON.stringify(c[k])===JSON.stringify(prior[k]))};});
 const sourceComparison=Object.entries(hashes).map(([path,sha256])=>({path,before:baseline.sourceHashes[path],after:sha256,identical:baseline.sourceHashes[path]===sha256}));
 evidence.baselineComparison={baselineHead:baseline.head,currentHead:evidence.head,baselineEvidence:process.argv[3],fields,scenarios:comparisons,sourceHashes:sourceComparison,identicalScenarios:comparisons.filter(c=>c.identical).length,totalScenarios:comparisons.length,result:comparisons.every(c=>c.identical)&&sourceComparison.every(c=>c.identical)?'PASS':'FAIL',limitation:'Only listed production compiler/config/identity/resolver/registrar modules and generated fixture behavior. This is not proof of actual Chrome or R2 noninterference.'};
 if(evidence.baselineComparison.result!=='PASS')process.exitCode=1;
}
await writeFile(output,JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({output,...evidence.summary}));if(evidence.summary.failed)process.exitCode=1;
