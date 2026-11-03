import test from 'node:test';
import assert from 'node:assert/strict';
import {newDestinationConfig,addDestination,renameDestination,removeDestination} from '../src/manager-model.mjs';
import {beginAddPopup,setPopupMode,setPopupTitle,popupPreview,circleChecked,
 addFromPopup,cancelAddPopup} from '../src/popup-flow.mjs';
const target={scope:{providerKind:'cloudflare-r2',connectionId:'c',accountId:'a',containerId:'redown'},prefix:'Photos/Weddings'};
const make=()=>({simple:newDestinationConfig('simple'),narrow:newDestinationConfig('narrow')});
test('empty circle opens popup, temporarily shows a check, cancel restores empty',()=>{
 const c=make(),p=beginAddPopup(target,'simple');
 assert.equal(circleChecked({configs:c,target}),false);
 assert.equal(circleChecked({configs:c,target,pendingPopup:p}),true);
 assert.equal(p.menuTitle,'');
 assert.equal(cancelAddPopup(),null);
 assert.equal(circleChecked({configs:c,target}),false);
});
test('popup has a Simple / Narrow choice, blank title defaults to lowest folder name',()=>{
 let p=beginAddPopup(target,'simple');
 assert.deepEqual(popupPreview(p).branch,['Weddings']);
 p=setPopupMode(p,'narrow');
 assert.deepEqual(popupPreview(p).branch,['redown','Photos','Weddings']);
});
test('typed title overrides default and targets exact same folder in either mode',()=>{
 let p=beginAddPopup(target,'simple');
 p=setPopupTitle(p,'Wedding Archive');
 assert.deepEqual(popupPreview(p).branch,['Wedding Archive']);
 p=setPopupMode(p,'narrow');
 assert.deepEqual(popupPreview(p).branch,['redown','Photos','Wedding Archive']);
 assert.equal(popupPreview(p).target.prefix,'Photos/Weddings');
});
test('popup can save Narrow while Simple editor is active without modifying Simple config',()=>{
 const c=make();
 let p=setPopupMode(beginAddPopup(target,'simple'),'narrow');
 let r=addFromPopup({popup:p,configByMode:c,destinationId:'unique-1',expectedRevision:0});
 assert.equal(r.mode,'narrow');assert.equal(r.config.destinations[0].menuTitle,'Weddings');
 assert.equal(c.simple.revision,0);assert.equal(c.narrow.revision,0);
});
test('click checked circle again and save two identical title/path aliases with distinct IDs',()=>{
 const c=make();
 const p=beginAddPopup(target,'simple');
 const first=addFromPopup({popup:p,configByMode:c,destinationId:'alias-1',expectedRevision:0});
 c.simple=first.config;
 assert.equal(circleChecked({configs:c,target}),true);
 const second=addFromPopup({popup:beginAddPopup(target,'simple'),configByMode:c,destinationId:'alias-2',expectedRevision:1});
 c.simple=second.config;
 assert.deepEqual(c.simple.destinations.map(x=>x.menuTitle),['Weddings','Weddings']);
 assert.deepEqual(c.simple.destinations.map(x=>x.id),['alias-1','alias-2']);
});
test('Existing Destinations rename/delete one entry only; circle clears after last entry',()=>{
 const c=make();let p=beginAddPopup(target,'simple');
 c.simple=addFromPopup({popup:p,configByMode:c,destinationId:'A',expectedRevision:0}).config;
 c.simple=addFromPopup({popup:p,configByMode:c,destinationId:'B',expectedRevision:1}).config;
 c.simple=renameDestination(c.simple,'A','Holiday Photos',2);
 c.simple=removeDestination(c.simple,'A',3);
 assert.equal(circleChecked({configs:c,target}),true);
 assert.equal(c.simple.destinations[0].id,'B');
 c.simple=removeDestination(c.simple,'B',4);
 assert.equal(circleChecked({configs:c,target}),false);
});
test('stale expected revision fails rather than silently overwriting another editor',()=>{
 const c=make(),p=beginAddPopup(target,'simple');
 c.simple=addFromPopup({popup:p,configByMode:c,destinationId:'first',expectedRevision:0}).config;
 assert.throws(()=>addFromPopup({popup:p,configByMode:c,destinationId:'second',expectedRevision:0}),/Stale/);
});
test('bucket root blank title defaults to bucket name; Depth is excluded from popup',()=>{
 const root={...target,prefix:''};
 assert.equal(popupPreview(beginAddPopup(root)).title,'redown');
 assert.throws(()=>setPopupMode(beginAddPopup(target),'depth'),/Simple or Narrow/);
});
