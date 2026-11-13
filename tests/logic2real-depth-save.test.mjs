import test from 'node:test';
import assert from 'node:assert/strict';
import {productState} from '../src/api/config.mjs';
import {createEngineApi} from '../src/api/service.mjs';
import {createChromeRegistrar,generateChromePlan} from '../src/chrome/registrar.mjs';
import {createEngine} from '../src/core/engine.mjs';
import {compileMenuSpec} from '../src/core/menu-spec.mjs';
import {ancestors,targetKey} from '../src/core/menu-identity.mjs';
import {discoverDepthScope} from '../src/explorer/depth-inventory.mjs';

const root=(bucketName,accountId='fixture')=>({provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName,prefix:''});
const showDepth={simple:false,nested:false,depth:true,flat:false};
const bucketNames=['redown','archives','projects','work'];
const chain=ancestors(Array.from({length:10},(_,i)=>'Folder '+(i+1)).join('/'));
const fixtures=[
  ['one root',[1],[[]]],['two roots',[1,1],[[],[]]],['two roots at 10',[10,10],[[],[]]],
  ['two chains',[5,1],[chain,chain]],['three chains',[4,5,6],[chain,chain,chain]],
  ['four chains',[4,4,4,4],[chain,chain,chain,chain]],
  ['ten siblings',[1],[Array.from({length:10},(_,i)=>'Sibling '+i+'/')]],
  ['mixed branching',[3],[['a/','a/same/','a/same/end/','b/','b/same/','marker/']]],
  ['single-child chain',[4],[chain]],['files-only folder',[4],[['files/']]],
  ['deeper folder at limit',[1],[chain]],['identical names',[2,2],[['a/','a/same/','b/','b/same/'],['a/','a/same/']]]
];

function menuActions(spec) {
  const paths=new Map();
  return spec.rows.filter(r=>r.origin.provider==='cloudflare').flatMap(row=>{
    const path=[...(paths.get(row.parentId)??[]),row.label];
    paths.set(row.id,path);
    return row.role==='save'?[{row,path}]:[];
  });
}

for(const [name,limits,folders] of fixtures)test('Depth fixture: '+name,()=>{
  const targets=limits.map((_,i)=>root(bucketNames[i]));
  const scopes=targets.map((target,i)=>({target,maxDepth:limits[i]}));
  const inventory={scopes:targets.map((target,i)=>({target,folders:folders[i],complete:true,authorized:true,workerReady:true}))};
  const spec=compileMenuSpec({mode:'composite',product:productState({show:showDepth}),configs:{depth:{scopes}},inventory});
  generateChromePlan(spec);
  const expected=[];
  for(const [i,target] of targets.entries()){
    const visible=['',...folders[i].filter(p=>p.split('/').length-1<=limits[i])];
    for(const prefix of visible){
      const children=visible.some(p=>p!==prefix&&p.startsWith(prefix));
      const path=['Cloudflare',...(targets.length>1?[target.bucketName]:[]),...prefix.split('/').filter(Boolean),...(children?['Save here']:[])];
      expected.push([path.join(' > '),targetKey({...target,prefix})]);
    }
  }
  const actual=menuActions(spec).map(({row,path})=>[path.join(' > '),targetKey(row.target)]);
  assert.deepEqual(actual.sort(),expected.sort());
  for(const row of spec.rows.filter(r=>r.role==='branch')){
    const children=spec.rows.filter(r=>r.parentId===row.id);
    if(children.some(c=>c.label==='Save here'))assert.equal(children[0].label,'Save here');
  }
});

test('Depth bounded discovery paginates, distinguishes file-only folders, and refuses partial listings',async()=>{
  const target=root('redown'),requests=[];
  const fileApi={run:async(_op,{source,cursor})=>{
    requests.push([source.prefix,cursor]);
    const entries=source.prefix===''
      ?cursor?[{key:'second/',folder:true}]:[{key:'files/',folder:true}]
      :source.prefix==='files/'?[{key:'files/example.txt',folder:false}]:[{key:'second/deep/',folder:true}];
    return {state:'completed',data:{entries,cursor:source.prefix===''&&!cursor?'page-two':''}};
  }};
  const result=await discoverDepthScope(fileApi,{target,maxDepth:2});
  assert.deepEqual(result.folders,['files/','second/','second/deep/']);
  assert.equal(result.complete,false);
  assert.equal(result.listedDepth,2);
  assert.deepEqual(requests.map(([p])=>p),['','','files/','second/']);
  await assert.rejects(()=>discoverDepthScope({run:async()=>({state:'failed',code:'HTTP_403'})},{target,maxDepth:2}),{code:'HTTP_403'});
  await assert.rejects(()=>discoverDepthScope({run:async()=>({state:'completed',data:{entries:[],cursor:'repeat'}})},{target,maxDepth:2}),{code:'PAGINATION_STALLED'});
});

test('a fresh Depth tree replaces stale Explorer folders, including a successfully empty bucket',()=>{
  const target=root('redown'),common={target,authorized:true,workerReady:true,complete:true};
  const compile=folders=>compileMenuSpec({mode:'composite',product:productState({show:showDepth}),configs:{depth:{scopes:[{target,maxDepth:2}]}},
    inventory:{scopes:[{...common,folders:['removed/']}],depthScopes:[{...common,folders}]}});
  assert.deepEqual(menuActions(compile(['added/'])).map(x=>x.row.target.prefix),['','added/']);
  assert.deepEqual(menuActions(compile([])).map(x=>x.path),[['Cloudflare']]);
  assert.throws(()=>compileMenuSpec({mode:'depth',configs:{depth:{scopes:[{target,maxDepth:0}]}}}),{code:'INVALID_DEPTH'});
});

test('settings commit distinguishes storage, discovery and Chrome errors and converges through same-key retries',async()=>{
  const redown=root('redown'),archives=root('archives'),localObjects=new Map();
  const inventory={scopes:[redown,archives].map(target=>({target,authorized:true,workerReady:true,complete:true,folders:['a/','a/same/','b/','b/same/']}))};
  const state={product:productState(),configs:{simple:{destinations:[]},nested:{destinations:[]},depth:{scopes:[]}},generation:{desired:0,applied:null}};
  const retries=new Map();
  let storageFailed=true,discoveryFailed=true,nativeFailed=true,releaseDiscovery,discoveryStarted,engine;
  const current={
    read:async()=>structuredClone(state),findRetry:async key=>retries.get(key),
    commitProduct:async ({configs,product,expectedRevision,idempotencyKey,fingerprint})=>{
      if(storageFailed)throw Object.assign(Error(),{code:'STORAGE_UNAVAILABLE'});
      if(retries.has(idempotencyKey))return {...retries.get(idempotencyKey),replayed:true};
      assert.equal(expectedRevision,state.product.revision);
      const receipt={before:expectedRevision,after:expectedRevision+1,fingerprint};
      state.configs=structuredClone(configs);state.product={...product,revision:receipt.after};retries.set(idempotencyKey,receipt);
      return receipt;
    },
    setDesiredGeneration:async g=>{state.generation.desired=g;},acknowledgeGeneration:async g=>{state.generation.applied=g;}
  };
  const chrome={runtime:{},contextMenus:{
    removeAll:callback=>callback(),create:(props,callback)=>{
      if(nativeFailed&&props.title==='same')chrome.runtime.lastError={message:'fixture'};
      callback();delete chrome.runtime.lastError;
    }
  }};
  const registrar=createChromeRegistrar({chrome,getAuthorization:async info=>({authorizedTargets:[registrar.inspect().desired.rows.find(row=>row.id===info.menuItemId).target]}),
    dispatch:(_action,{info})=>engine.save({itemId:info.menuItemId,generation:registrar.inspect().acknowledgedGeneration,context:'link',source:{url:info.linkUrl,filename:'sample.txt'}})});
  engine=createEngine({current,registrar,getAuthorization:async target=>({sessionId:'fixture',authorizedTargets:[target]}),
    remoteSave:async ({authorize,target,source})=>{
      assert(await authorize());
      const key=target.prefix+source.filename;
      localObjects.set(targetKey({...target,prefix:key}),source.url);
      return {state:'verified',receipt:{key,target}};
    }});
  const api=createEngineApi({current,engine,getInventory:async({refreshDepthScopes}={})=>{
    if(refreshDepthScopes?.length){
      if(discoveryFailed)throw Object.assign(Error(),{code:'HTTP_403'});
      if(discoveryStarted){discoveryStarted();await new Promise(resolve=>{releaseDiscovery=resolve;});discoveryStarted=null;}
    }
    return inventory;
  },authorize:async()=>true,confirm:async()=>true,recovery:{writeVerified:async()=>({state:'VERIFIED'})}});
  const invoke=(method,params)=>api.invoke({version:'3+1.1',method,params},'gui');
  const setScopes=(revision,key,targets,depth=2)=>({expectedRevision:revision,idempotencyKey:key,changes:[
    {type:'setDepthDisplayBuckets',scopes:targets.map(target=>({target,maxDepth:depth}))},{type:'setShowInChrome',show:showDepth}
  ]});
  const first=setScopes(0,'first',[redown,archives]);
  assert.equal((await invoke('commitConfigChange',first)).code,'STORAGE_UNAVAILABLE');
  assert.equal(state.product.revision,0);
  storageFailed=false;
  const denied=await invoke('commitConfigChange',first);
  assert.equal(denied.state,'partial');assert.equal(denied.data.native.code,'HTTP_403');assert.equal(state.product.revision,1);
  discoveryFailed=false;
  assert.equal((await invoke('commitConfigChange',first)).data.native.code,'NATIVE_APPLY_INCOMPLETE');
  nativeFailed=false;
  assert.equal((await invoke('commitConfigChange',first)).state,'completed');
  assert.equal(state.product.revision,1);
  for(const {row} of menuActions(registrar.inspect().desired)){
    const receipt=await registrar.handleClick({menuItemId:row.id,linkUrl:'https://example.org/sample.txt'});
    assert.equal(receipt.state,'completed');
    assert.equal(receipt.receipt.key,row.target.prefix+'sample.txt');
    assert.equal(receipt.receipt.target.bucketName,row.target.bucketName);
  }
  assert.equal(localObjects.size,10);

  const started=new Promise(resolve=>{discoveryStarted=resolve;});
  const older=invoke('commitConfigChange',setScopes(1,'lower',[redown],1));
  await started;
  const newer=invoke('commitConfigChange',setScopes(2,'raise',[redown],2));
  releaseDiscovery();
  assert.equal((await older).state,'completed');assert.equal((await newer).state,'completed');
  assert.equal(state.product.revision,3);
  assert.equal((await invoke('commitConfigChange',first)).data.native.code,'CONFIGURATION_SUPERSEDED');
  assert.deepEqual(menuActions(registrar.inspect().desired).map(({row})=>row.target.prefix),['','a/','b/','a/same/','b/same/']);

  for(const [i,mode] of ['simple','nested'].entries()){
    const target={...redown,prefix:'a/same/'};
    const applied=await invoke('commitConfigChange',{expectedRevision:3+i,idempotencyKey:mode,changes:[
      {type:'createDestination',mode,target,label:'Pick'},
      {type:'setShowInChrome',show:{simple:mode==='simple',nested:mode==='nested',depth:false,flat:false}}
    ]});
    assert.equal(applied.state,'completed');
    const [{row,path}]=menuActions(registrar.inspect().desired);
    assert.deepEqual(path,mode==='simple'?['Cloudflare']:['Cloudflare','a','Pick']);
    assert.equal((await registrar.handleClick({menuItemId:row.id,linkUrl:'https://example.org/sample.txt'})).receipt.key,'a/same/sample.txt');
  }
  registrar.close();
});
