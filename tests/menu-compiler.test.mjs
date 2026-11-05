import test from 'node:test';
import assert from 'node:assert/strict';
import { compileMenu, normalizePath, MenuConfigurationError } from '../src/core/menu-compiler.mjs';
import { dispatchSave, UnverifiedSaveError } from '../src/core/save-dispatcher.mjs';

const spine = Array.from({length:16}, (_,i) => ['depth-spine', ...Array.from({length:i},(_,n)=>'level-'+String(n+1).padStart(2,'0'))].join('/'));
const base = {
  bucket:'redown',
  folders:[...spine, 'alpha/assets', 'beta/assets', 'unconfigured/child'],
  config: {
    simple:[{id:'a',path:'alpha/assets',label:'Assets A'}],
    narrow:[{path:'alpha/assets'},{path:'beta/assets'}],
    depth:{maxDepth:10}
  },
  flatProviders:[
    {id:'google-drive',label:'Google Drive',destinationId:'redown'},
    {id:'dropbox',label:'Dropbox',destinationId:'redown'},
    {id:'onedrive',label:'OneDrive',destinationId:'redown'}
  ]
};
const compiled = mode => compileMenu({...base,mode});

test('same normalized input generates an identical result independent of folder order',()=>{
  const a=compiled('depth');
  const b=compileMenu({...base,mode:'depth',folders:[...base.folders].reverse(),flatProviders:[...base.flatProviders].reverse()});
  assert.deepEqual(a,b);
});
test('Simple destinations are flat Cloudflare leaf entries',()=>{
  const a=compiled('simple');
  const cloud=a.nodes.find(n=>n.id==='c2c:cloudflare');
  const leaves=a.nodes.filter(n=>n.parentId===cloud.id);
  assert.equal(leaves.length,1);
  assert.equal(leaves[0].kind,'action');
  assert.equal(leaves[0].intent.path,'alpha/assets');
});
test('Other cloud providers are single native leaf siblings, not submenus',()=>{
  const a=compiled('narrow');
  const flat=a.nodes.filter(n=>n.parentId==='c2c:root' && n.label!=='Cloudflare R2');
  assert.equal(flat.length,3);
  assert.ok(flat.every(n=>n.kind==='action'));
});
test('Narrow includes only configured paths and ancestors',()=>{
  const a=compiled('narrow');
  const keys=a.nodes.map(n=>n.key).join(' ');
  assert.match(keys,/narrow:alpha\/assets/);
  assert.match(keys,/narrow:beta\/assets/);
  assert.doesNotMatch(keys,/unconfigured/);
  assert.doesNotMatch(keys,/depth-spine/);
});
test('Depth 10 includes unconfigured folders but hides levels beyond 10',()=>{
  const a=compiled('depth');
  assert.ok(a.nodes.some(n=>n.key==='depth:unconfigured/child'));
  assert.ok(a.nodes.some(n=>n.key==='depth:depth-spine/level-01/level-02/level-03/level-04/level-05/level-06/level-07/level-08/level-09'));
  assert.ok(!a.nodes.some(n=>n.key.endsWith('level-10')));
});
test('Depth 16 reaches the deepest marker path and has an actionable leaf',()=>{
  const a=compileMenu({...base,mode:'depth',config:{...base.config,depth:{maxDepth:16}}});
  const deep=a.nodes.find(n=>n.key==='depth:'+spine.at(-1));
  assert.ok(deep);
  assert.equal(deep.kind,'action');
});
test('Each mode changes only its own projection',()=>{
  const a=compiled('simple');
  const b=compileMenu({...base,mode:'simple',config:{...base.config,depth:{maxDepth:16},narrow:[]}});
  assert.deepEqual(a,b);
});
test('No sibling label collision is silently accepted',()=>{
  assert.throws(()=>compileMenu({...base,mode:'simple',config:{...base.config,simple:[{id:'1',path:'alpha/assets',label:'X'},{id:'2',path:'beta/assets',label:'X'}]}}),MenuConfigurationError);
});
test('Unavailable destination and path traversal are rejected',()=>{
  assert.throws(()=>compileMenu({...base,mode:'simple',config:{...base.config,simple:[{path:'missing/path'}]}}),MenuConfigurationError);
  assert.throws(()=>normalizePath('abc/../def'),MenuConfigurationError);
});
test('Native submenu parents expose explicit Save here leaf',()=>{
  const a=compiled('depth');
  const parent=a.nodes.find(n=>n.key==='depth:depth-spine');
  assert.equal(parent.kind,'menu');
  assert.ok(a.nodes.some(n=>n.parentId===parent.id && n.label==='Save here' && n.kind==='action'));
});
test('Upload is not acknowledged until provider confirms it',async()=>{
  const args={intent:{provider:'cloudflare',bucket:'redown',path:'alpha/assets'},file:{filename:'sample.txt',bytes:new Uint8Array([1,2,3])}};
  const providers={cloudflare:{upload:async()=>({confirmed:false}),verifyReceipt:async()=>({verified:true,independent:true,destinationMatches:true,byteLength:3,evidenceClass:'provider-readback'})}};
  await assert.rejects(dispatchSave(args,{providers,authorize:async()=>true}),UnverifiedSaveError);
  providers.cloudflare.upload=async function(payload){
    assert.equal(payload.filename,'sample.txt');
    assert.ok(!('sourceUrl' in payload));
    assert.ok(!('pageUrl' in payload));
    return {confirmed:true,id:'verified-test-receipt'};
  };
  const result=await dispatchSave(args,{providers,authorize:async()=>true});
  assert.equal(result.confirmed,true);
});
