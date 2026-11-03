import test from 'node:test';
import assert from 'node:assert/strict';
import {projectSimple,resolveSimple} from '../src/modes/simple-v3.mjs';
import {projectDepth,resolveDepth,discoverDepth,depthInventoryKey,depthLimits} from '../src/modes/depth-v3.mjs';
import {composeRegistry,resolveRegistered,MenuRegistryError} from '../src/registry/mode-registry.mjs';

const profile={id:'p',type:'cloudflare-r2',accountId:'a',bucketName:'redown',workerUrl:'https://fixture.invalid',token:'synthetic'};
const target=(id,prefix,label=id)=>({id,profileId:'p',accountId:'a',bucketName:'redown',prefix,label,enabled:true,parentId:null});
const simpleConfig=()=>({version:1,revision:0,destinations:[target('one','images/portraits','Portraits'),target('two','files/reports','Reports')]});
const depthConfig=()=>({version:1,revision:0,destinations:[],levelScopes:{version:1,revision:0,buckets:[{id:'s1',profileId:'p',accountId:'a',bucketName:'redown',enabled:true}]}});
const now=100000;
const opts={style:'nested',nested:'level',depth:2};
const listing=async (account,bucket,prefix)=>{
  assert.equal(account,'a');assert.equal(bucket,'redown');
  const delimited=prefix===''?['images/','misc/']:prefix==='images/'?['images/portraits/']:[];
  return {objects:[],delimited,cursor:'',truncated:false};
};

test('Simple original V3 direct root when only primary exists',()=>{
  const cfg={version:1,revision:0,destinations:[]},p=projectSimple(cfg,[profile]);
  assert.deepEqual(p.entries.map(e=>e.id),['v3:provider:cloudflare']);
  assert.equal(resolveSimple('v3:provider:cloudflare',cfg,[profile],p).prefix,'');
});
test('Simple original V3 extra order, Home last and exact leaf routes',()=>{
  const cfg=simpleConfig(),plan=projectSimple(cfg,[profile]);
  assert.deepEqual(plan.entries.map(e=>e.id),[
    'v3:provider:cloudflare','v3:one','v3:two','v3:provider:cloudflare:separator','v3:provider:cloudflare:default']);
  assert.equal(resolveSimple('v3:two',cfg,[profile],plan).prefix,'files/reports');
  assert.equal(resolveSimple('v3:provider:cloudflare',cfg,[profile],plan),null);
  assert.equal(resolveSimple('v3:provider:cloudflare:default',cfg,[profile],plan).prefix,'');
});
test('Simple absent prepared default shows setup, not a false save',()=>{
  const cfg={version:1,revision:0,destinations:[]};
  const plan=projectSimple(cfg,[]);
  assert.equal(plan.entries[0].id,'v3:provider:cloudflare:setup');
  assert.equal(resolveSimple(plan.entries[0].id,cfg,[],plan),null);
});
test('Simple is byte-for-byte invariant under Depth scope and depth changes',()=>{
  const cfg=simpleConfig(),expected=projectSimple(cfg,[profile]);
  const mutated={...cfg,levelScopes:{version:1,revision:999,buckets:[{id:'s',profileId:'p',accountId:'a',bucketName:'redown',enabled:false}]}};
  assert.deepEqual(projectSimple(mutated,[profile]),expected);
});
test('Depth original discovery retains depth 0 root and unconfigured paths',async()=>{
  const cfg=depthConfig();
  const inventory=await discoverDepth(cfg,[profile],opts,listing,()=>now);
  const plan=projectDepth(cfg,[profile],opts,inventory,'redown',now);
  assert.ok(plan.entries.some(x=>x.title==='redown'));
  assert.ok(plan.entries.some(x=>x.title==='misc'));
  assert.ok(plan.entries.some(x=>x.title==='portraits'));
  const root=plan.entries.find(x=>x.id.startsWith('v3:cloud:')&&x.title==='redown');
  assert.ok(plan.entries.some(x=>x.parentId===root.id&&x.title==='Save here'));
  const leaf=plan.entries.find(x=>x.title==='portraits');
  assert.equal(resolveDepth(leaf.id,cfg,[profile],opts,inventory,now,plan).prefix,'images/portraits');
  assert.equal(plan.entries.some(x=>x.title==='Home'),false,'global Home is registered independently, never borrowed from Simple');
});
test('Depth projection has no dependency on Simple destinations or aliases',async()=>{
  const cfg=depthConfig(),inventory=await discoverDepth(cfg,[profile],opts,listing,()=>now);
  const expected=projectDepth(cfg,[profile],opts,inventory,'redown',now);
  assert.deepEqual(projectDepth({...cfg,destinations:[target('x','foo','Renamed')]},[profile],opts,inventory,'redown',now),expected);
});
test('Depth revocation fails closed on previously visible menu action',async()=>{
  const cfg=depthConfig(),inventory=await discoverDepth(cfg,[profile],opts,listing,()=>now);
  const plan=projectDepth(cfg,[profile],opts,inventory,'redown',now);
  const item=plan.entries.find(x=>x.title==='misc');
  const revoked={...cfg,levelScopes:{...cfg.levelScopes,revision:1,buckets:[]}};
  assert.equal(resolveDepth(item.id,revoked,[profile],opts,inventory,now),null);
});
test('Depth actual boundary preserves 10 and excludes level 11',async()=>{
  const cfg=depthConfig(),settings={...opts,depth:10};
  const scan=async (_a,_b,prefix)=>{
    const depth=prefix?prefix.split('/').filter(Boolean).length:0;
    return {objects:[],delimited:depth<12?[prefix+'level-'+String(depth+1).padStart(2,'0')+'/']:[],cursor:'',truncated:false};
  };
  const inventory=await discoverDepth(cfg,[profile],settings,scan,()=>now);
  const menu=projectDepth(cfg,[profile],settings,inventory,'redown',now);
  assert.equal(depthLimits.depth,10);
  assert.ok(menu.entries.some(x=>x.title==='level-10'));
  assert.ok(!menu.entries.some(x=>x.title==='level-11'));
});
test('Registry is the only assembly boundary, enforces unique IDs and flat providers',()=>{
  const cfg=simpleConfig(),plan=projectSimple(cfg,[profile]);
  const reg=composeRegistry({mode:'simple',projection:plan,providerLeaves:[{id:'provider:drive',title:'Google Drive'}]});
  assert.equal(reg.entries.find(x=>x.id==='provider:drive').parentId,'redown');
  assert.equal(resolveRegistered({id:'v3:one',registry:reg,mode:'simple',modeResolver:id=>resolveSimple(id,cfg,[profile],plan)}).prefix,'images/portraits');
  assert.equal(resolveRegistered({id:'v3:one',registry:reg,mode:'depth',modeResolver:()=>({})}),null);
  assert.throws(()=>composeRegistry({mode:'narrow',projection:plan}),MenuRegistryError);
  assert.throws(()=>composeRegistry({mode:'simple',projection:plan,providerLeaves:[{id:'v3:one',title:'Collision'}]}),MenuRegistryError);
});
