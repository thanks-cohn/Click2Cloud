import test from 'node:test';
import assert from 'node:assert/strict';
import {newDestinationConfig,addDestination,renameDestination,removeDestination,
 existingDestinationRows,nativeDestinationId,locationEntryCount,managerPanel} from '../src/manager-model.mjs';
const scope={providerKind:'cloudflare-r2',connectionId:'connection',accountId:'account',containerId:'redown'};
const target={scope,prefix:'Photos/Weddings'};
const initial=()=>({simple:newDestinationConfig('simple'),narrow:newDestinationConfig('narrow')});
test('two exactly identical folder paths and identical titles can BOTH be stored and displayed',()=>{
  let cfg=newDestinationConfig('simple');
  cfg=addDestination(cfg,{id:'uid-A',menuTitle:'Wedding',target});
  cfg=addDestination(cfg,{id:'uid-B',menuTitle:'Wedding',target});
  assert.equal(cfg.destinations.length,2);
  assert.notEqual(nativeDestinationId('simple','uid-A'),nativeDestinationId('simple','uid-B'));
  const rows=existingDestinationRows({simple:cfg});
  assert.deepEqual(rows.map(r=>r.menuTitle),['Wedding','Wedding']);
  assert.deepEqual(rows.map(r=>r.target.prefix),['Photos/Weddings','Photos/Weddings']);
});
test('same exact folder may exist under two labels and separately in Narrow',()=>{
  const configs=initial();
  configs.simple=addDestination(configs.simple,{id:'x',menuTitle:'Wedding Archive',target});
  configs.simple=addDestination(configs.simple,{id:'y',menuTitle:'Our Photos',target});
  configs.narrow=addDestination(configs.narrow,{id:'z',menuTitle:'Wedding Archive',target});
  const rows=existingDestinationRows(configs);
  assert.equal(rows.length,3);
  assert.deepEqual(rows.map(r=>r.mode),['simple','simple','narrow']);
  assert.equal(new Set(rows.map(r=>r.nativeId)).size,3);
  assert.notEqual(nativeDestinationId('simple','x'),nativeDestinationId('narrow','x'));
  assert.equal(locationEntryCount(configs,target),3);
});
test('rename one entry by immutable ID changes only its title; identity and target remain unchanged',()=>{
  let cfg=newDestinationConfig('simple');
  cfg=addDestination(cfg,{id:'a',menuTitle:'Photos',target});
  cfg=addDestination(cfg,{id:'b',menuTitle:'Photos',target});
  const before=existingDestinationRows({simple:cfg});
  cfg=renameDestination(cfg,'a','Archive');
  const after=existingDestinationRows({simple:cfg});
  assert.equal(after[0].menuTitle,'Archive');assert.equal(after[1].menuTitle,'Photos');
  assert.equal(after[0].nativeId,before[0].nativeId);
  assert.deepEqual(after.map(r=>r.target),before.map(r=>r.target));
});
test('red X removes only selected ID; no operation on actual cloud target',()=>{
  let cfg=newDestinationConfig('simple');
  cfg=addDestination(cfg,{id:'a',menuTitle:'Photos',target});
  cfg=addDestination(cfg,{id:'b',menuTitle:'Photos',target});
  const prior=cfg;
  cfg=removeDestination(cfg,'a');
  assert.deepEqual(cfg.destinations.map(x=>x.id),['b']);
  assert.equal(prior.destinations.length,2);
  assert.equal(cfg.destinations[0].target.prefix,'Photos/Weddings');
});
test('one mode edit cannot alter other mode config or revision',()=>{
  const c=initial();const unchanged=c.narrow;
  c.simple=addDestination(c.simple,{id:'a',menuTitle:'Photos',target},0);
  assert.equal(c.simple.revision,1);assert.strictEqual(c.narrow,unchanged);
  assert.deepEqual(c.narrow.destinations,[]);
  assert.throws(()=>addDestination(c.simple,{id:'b',menuTitle:'A',target},0),/Stale/);
});
test('left circle is ONLY filled/empty, not a numeric count; same folder accepts many aliases',()=>{
  const c=initial();
  c.simple=addDestination(c.simple,{id:'a',menuTitle:'X',target});
  c.narrow=addDestination(c.narrow,{id:'b',menuTitle:'Y',target});
  const nodes=[{id:'f',name:'Weddings',target}];
  const panel=managerPanel('simple',{browseNodes:nodes,configs:c});
  assert.equal(panel.rows[0].checked,true);
  assert.equal('count' in panel.rows[0],false);
  assert.equal(panel.showTree,true);assert.equal(panel.showExisting,false);
});
test('Existing Destinations shows both modes but owner remains explicit',()=>{
  const c=initial();
  c.simple=addDestination(c.simple,{id:'s',menuTitle:'Flat',target});
  c.narrow=addDestination(c.narrow,{id:'n',menuTitle:'Path',target});
  const panel=managerPanel('simple',{view:'existing',configs:c});
  assert.equal(panel.showTree,false);assert.equal(panel.showExisting,true);
  assert.deepEqual(panel.existing.map(r=>[r.id,r.mode]),[['s','simple'],['n','narrow']]);
  assert.equal(existingDestinationRows(c,'narrow').length,1);
});
test('Depth shows only bucket checkmarks and depth; no tree or existing aliases',()=>{
  const c=initial();
  c.simple=addDestination(c.simple,{id:'a',menuTitle:'Saved',target});
  const panel=managerPanel('depth',{browseNodes:[{id:'x',name:'x',target}],configs:c,
    bucketOptions:[{id:'redown',checked:true}],depth:4,view:'existing'});
  assert.equal(panel.showTree,false);assert.equal(panel.showExisting,false);
  assert.deepEqual(panel.rows,[]);assert.deepEqual(panel.existing,[]);
  assert.deepEqual(panel.buckets,[{id:'redown',checked:true}]);assert.equal(panel.depth,4);
});
test('duplicate destination ID is rejected, not duplicate labels or targets',()=>{
  let cfg=newDestinationConfig('simple');
  cfg=addDestination(cfg,{id:'a',menuTitle:'Same',target});
  assert.throws(()=>addDestination(cfg,{id:'a',menuTitle:'Same',target}),/Duplicate/);
  assert.throws(()=>renameDestination(cfg,'missing','Rename'),/Unknown/);
  assert.throws(()=>removeDestination(cfg,'missing'),/Unknown/);
});
