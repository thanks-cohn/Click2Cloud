import test from 'node:test';import assert from 'node:assert/strict';
import {compileMenuSpec} from '../src/core/menu-spec.mjs';import {productState} from '../src/api/config.mjs';import {targetKey} from '../src/core/menu-identity.mjs';
import {createChromeRegistrar,generateChromePlan} from '../src/chrome/registrar.mjs';import {createEngine} from '../src/core/engine.mjs';import {createEngineApi} from '../src/api/service.mjs';
const redown={provider:'cloudflare',connectionId:'cloudflare:a',accountId:'a',bucketName:'redown',prefix:''},photos={...redown,bucketName:'photos',prefix:'saved/'};
const configs=()=>({simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}});
function compile(targets=[],options={}){const product=productState({defaultTarget:options.defaultTarget??null,...options.product}),c=options.configs??configs();if(!options.configs)c.simple.destinations=targets.map((target,i)=>({id:'dest-'+i,target}));const inventory={scopes:[redown,photos,{...redown,bucketName:'unassigned'}].map(target=>({target:{...target,prefix:''},authorized:true,workerReady:true,complete:true,folders:[target.prefix]}))};return compileMenuSpec({mode:'composite',generation:options.generation??1,configs:c,product,defaultTarget:product.defaultTarget,inventory});}
const root=spec=>spec.rows.filter(r=>r.parentId===null),cloud=spec=>root(spec).filter(r=>r.origin.provider==='cloudflare');
test('Nov6 exact zero/one/two/one/zero native shapes preserve stable provider identity',()=>{
 const specs=[compile(),compile([],{defaultTarget:redown}),compile([photos],{defaultTarget:redown}),compile([photos]),compile()];
 for(const spec of specs){assert.deepEqual(root(spec).map(r=>r.label),['Google Drive','Dropbox','OneDrive','Cloudflare']);assert.equal(cloud(spec).length,1);generateChromePlan(spec);assert(!spec.rows.some(r=>/REDOWN|Cloudflare R2|Other Clouds/.test(r.label)));}
 assert.equal(new Set(specs.map(s=>cloud(s)[0].id)).size,1);assert.equal(cloud(specs[0])[0].role,'provider-action');assert.equal(cloud(specs[1])[0].role,'save');assert.equal(cloud(specs[1])[0].target.prefix,'');assert.equal(cloud(specs[2])[0].role,'branch');assert.deepEqual(specs[2].rows.filter(r=>r.parentId===cloud(specs[2])[0].id).map(r=>targetKey(r.target)),[redown,photos].map(targetKey));assert.equal(targetKey(cloud(specs[3])[0].target),targetKey(photos));
});
test('Nov6 discovered buckets, duplicate modes, hidden assignments and disabled modes do not inflate count',()=>{
 const c=configs();c.simple.destinations=[{target:photos},{target:redown,hidden:true}];c.nested.destinations=[{target:photos}];c.depth.scopes=[{target:redown,maxDepth:10}];const spec=compile([],{configs:c});assert.equal(cloud(spec)[0].role,'save');assert.equal(targetKey(cloud(spec)[0].target),targetKey(photos));assert.equal(spec.rows.length,4);
 const flat=compile([photos],{defaultTarget:redown,product:{show:{simple:true,nested:true,depth:true,flat:true}}});assert.equal(cloud(flat)[0].role,'save');assert.equal(targetKey(cloud(flat)[0].target),targetKey(redown));
});
test('Nov6 each Settings toggle removes whole native branch and restores exact target without mutation',()=>{
 const shown=compile([photos],{defaultTarget:redown});for(const provider of ['google-drive','dropbox','onedrive','cloudflare']){const p=productState({defaultTarget:redown,providerVisibility:{[provider]:false}}),before=JSON.stringify(p),hidden=compile([photos],{defaultTarget:redown,product:p});assert(!hidden.rows.some(r=>r.origin.provider===provider));assert.equal(root(hidden).length,3);assert.equal(JSON.stringify(p),before);assert.deepEqual(compile([photos],{defaultTarget:redown}).rows,shown.rows);}
});
test('Nov6 two accounts with identical display names keep distinct exact targets and disambiguated labels',()=>{
 const second={...redown,accountId:'b',connectionId:'cloudflare:b'};const spec=compile([redown,second]);const leaves=spec.rows.filter(r=>r.role==='save');assert.equal(leaves.length,2);assert.notEqual(leaves[0].label,leaves[1].label);assert.equal(new Set(leaves.map(r=>targetKey(r.target))).size,2);
});
test('Nov6 deliberate default assignment deletion persists sole survivor and does not recreate deleted target',async()=>{
 let state={product:productState({defaultTarget:redown,cloudflare:{initialized:['a'],pending:[],selectedAccountId:'a'}}),configs:configs(),generation:{desired:0,applied:null}};state.configs.simple.destinations=[{id:'redown',target:redown},{id:'photos',target:photos}];
 const current={read:async()=>structuredClone(state),findRetry:async()=>null,commitProduct:async next=>{state={...state,product:{...next.product,revision:state.product.revision+1},configs:next.configs};return {};}};
 const api=createEngineApi({current,engine:{compile:async()=>compile([],{configs:state.configs,defaultTarget:state.product.defaultTarget,product:state.product}),apply:async()=>({state:'completed'})},getInventory:async()=>({scopes:[]}),authorize:async()=>true,confirm:async()=>true,recovery:{writeVerified:async()=>({})}});
 const result=await api.invoke({version:'3+1.1',method:'commitConfigChange',params:{changes:[{type:'deleteDestinationConfig',mode:'simple',id:'redown'}],expectedRevision:0,idempotencyKey:'remove-redown'}},'gui');assert.equal(result.state,'completed',JSON.stringify(result));assert.equal(targetKey(state.product.defaultTarget),targetKey(photos));assert(state.product.cloudflare.removed.includes('a'));assert.equal(state.configs.simple.destinations.length,1);
});
test('Nov6 real registrar ACK click uses engine exact target without provider/dashboard detour, including restart',async()=>{
 let saved=0,panels=0;const selected=[];const generation={desired:0,applied:null};const current={read:async()=>({generation:{...generation}}),setDesiredGeneration:async g=>{generation.desired=g;},acknowledgeGeneration:async g=>{generation.applied=g;}};
 const chrome={runtime:{},contextMenus:{create:(_p,cb)=>cb(),removeAll:cb=>cb(),onClicked:{addListener(){},removeListener(){}}}};
 for(let restart=0;restart<2;restart++){let engine;const registrar=createChromeRegistrar({chrome,getAuthorization:async info=>{const t=registrar.inspect().desired.rows.find(r=>r.id===info.menuItemId).target;return {authorizedTargets:[t]};},dispatch:async(_action,{info})=>engine.save({itemId:info.menuItemId,generation:1,context:'link',source:{url:'https://public.org/file',filename:'file'}})});
 engine=createEngine({current,registrar,getAuthorization:async target=>{selected.push(target);return {sessionId:'s',authorizedTargets:[target]};},onProviderAction:()=>{panels++;},remoteSave:async input=>{assert.equal(targetKey(input.target),targetKey(photos));assert(await input.authorize());saved++;return {state:'verified'};}});
 const spec=compile([photos]);await engine.apply(spec);const result=await registrar.handleClick({menuItemId:cloud(spec)[0].id,linkUrl:'https://public.org/file'});assert.equal(result.state,'completed');const stale=await engine.save({itemId:cloud(spec)[0].id,generation:0,context:'link'});assert.equal(stale.state,'blocked');registrar.close();}
 assert.equal(saved,2);assert.equal(panels,0);assert(selected.every(t=>targetKey(t)===targetKey(photos)));
});

test('Shelf attention replaces legacy popup and retains the exact trusted app boundary',async()=>{
 const {createShelfAttention}=await import('../src/chrome/provider-panel.mjs'),{trustedAppSender}=await import('../src/chrome/trusted-sender.mjs');const opened=[],data={},runtime={id:'installed',getURL:p=>'chrome-extension://installed/'+p,sendMessage:async()=>{}},chrome={runtime,storage:{session:{get:async k=>({[k]:data[k]}),set:async v=>Object.assign(data,v)}},sidePanel:{open:async p=>opened.push(p)},action:{setBadgeText:async()=>{}},windows:{getLastFocused:async()=>({id:7})}};
 const shelf=createShelfAttention({chrome});await shelf.attend('cloudflare',undefined,{code:'LOGIN_REQUIRED'});assert.equal(opened.length,1);assert.equal((await shelf.read()).provider,'cloudflare');assert(trustedAppSender(runtime,{id:'installed',documentId:'doc',url:runtime.getURL('extension/app.html')}));assert(!trustedAppSender(runtime,{id:'installed',documentId:'doc',url:runtime.getURL('extension/connect.html')}));
});

test('future trusted flat provider ports replace their one canonical entry, never add a second provider row',()=>{
 const target={provider:'dropbox',connectionId:'dropbox:a',accountId:'a',bucketName:'root',prefix:''};const spec=compileMenuSpec({mode:'composite',product:productState(),configs:configs(),inventory:{scopes:[]},flatProviders:[{id:'trusted-dropbox-port',label:'Dropbox',target,enabled:true}]});assert.deepEqual(root(spec).map(r=>r.label),['Google Drive','Dropbox','OneDrive','Cloudflare']);assert.equal(root(spec)[1].role,'save');assert.equal(root(spec)[1].target.provider,'dropbox');
});
test('explicit Quick labels cannot rename or duplicate a canonical provider heading',()=>{
 const c=configs();c.simple.destinations=[{target:redown,label:'Cloudflare',quick:true},{target:photos}];const spec=compile([],{configs:c});assert.equal(root(spec).filter(r=>r.label==='Cloudflare').length,1);assert(root(spec).some(r=>r.label==='Quick: Cloudflare'));assert.equal(spec.rows.filter(r=>r.role==='save'&&r.parentId!==null).length,0);assert.equal(targetKey(cloud(spec)[0].target),targetKey(photos));
});

test('hidden destination eye wins over Flat without deleting its saved default',()=>{const c=configs();c.simple.destinations=[{target:redown,hidden:true}];const spec=compile([],{configs:c,defaultTarget:redown,product:{show:{simple:true,nested:true,depth:false,flat:true}}});assert.equal(cloud(spec)[0].role,'provider-action');assert.equal(cloud(spec)[0].target,null);assert(c.simple.destinations[0].hidden);});

test('programmatic provider action binds the sole canonical target before dispatch, even without a stored default',async()=>{
 const {createPermissions}=await import('../src/api/permissions.mjs');const permissions=createPermissions();permissions.issue({actor:'limited',methods:['invokeProviderAction'],accounts:['other'],expiresAt:Date.now()+10000});let writes=0;
 const spec=compile([photos]),api=createEngineApi({current:{read:async()=>({product:productState(),configs:configs()}),reserveOperation:async()=>{writes++;return true;}},engine:{getMenu:()=>spec,save:async()=>{writes++;}},cloudflare:{},authorize:r=>permissions.authorize(r),confirm:async()=>true});
 const result=await api.invoke({version:'3+1.1',method:'invokeProviderAction',params:{provider:'cloudflare',generation:1,source:{url:'https://public.org/file',filename:'file'},idempotencyKey:'foreign'}},'limited');assert.equal(result.code,'PERMISSION_DENIED');assert.equal(writes,0);
});
