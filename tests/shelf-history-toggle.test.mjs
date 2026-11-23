import test from 'node:test';
import assert from 'node:assert/strict';
import {createShelfHistoryToggle} from '../src/chrome/provider-panel.mjs';
import {createBreadcrumbs} from '../src/glaciaring/breadcrumbs.mjs';
import {shortcutIdentity} from '../src/glaciaring/shortcut-trace.mjs';
import {createRecorderHost} from '../src/recorder/host.mjs';
import {exportComplete} from '../src/recorder/export.mjs';

function fixture(initial={}, {deferOpen=false}={}){
 const values=structuredClone(initial),calls=[],callbacks={};
 const chrome={storage:{session:{get:async()=>structuredClone(values),set:async update=>Object.assign(values,structuredClone(update)),
  remove:async key=>delete values[key]}},runtime:{getURL:path=>'chrome-extension://local/'+path,
   getContexts:async()=>[{contextType:'SIDE_PANEL',windowId:-1,documentId:'panel'}],sendMessage:async message=>calls.push(['message',message.windowId,message.channel])},
  windows:{onRemoved:{addListener:fn=>{callbacks.removed=fn;}}}};
 let release,rejectOpen;
 chrome.sidePanel={open:({windowId})=>{
  calls.push(['open',windowId]);
  return deferOpen?new Promise((resolve,reject)=>{release=resolve;rejectOpen=reject;}):Promise.resolve();
 },close:async({windowId})=>{calls.push(['close',windowId]);callbacks.closed({windowId,path:'/extension/app.html'});},
 onClosed:{addListener:fn=>{callbacks.closed=fn;}}};
 return {chrome,calls,values,callbacks,release:()=>release(),rejectOpen:error=>rejectOpen(error)};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('Shelf trace survives worker restart and a missing message receiver without claiming focus',async()=>{
 const f=fixture(),steps=[],observeShortcut=(identity,phase,outcome,details)=>steps.push({identity,phase,outcome,...details});
 f.chrome.runtime.sendMessage=async()=>{throw Error('Could not establish connection. Receiving end does not exist.');};
 const identity=shortcutIdentity('shelf.explorer.search'),sender={documentId:'panel'};
 let shelf=createShelfHistoryToggle({chrome:f.chrome,observeShortcut});
 shelf.search({windowId:1},identity);
 await settle();
 assert(steps.some(step=>step.phase==='ACTION_DISPATCHED'&&step.code==='SHELF_MESSAGE_UNACKNOWLEDGED'));
 assert(!steps.some(step=>step.phase==='UI_STATE_VERIFIED'));
 shelf=createShelfHistoryToggle({chrome:f.chrome,observeShortcut});
 const getContexts=f.chrome.runtime.getContexts;
 f.chrome.runtime.getContexts=async()=>{throw Error('context lookup failed');};
 assert.equal(await shelf.request('intent',1,null,sender),null);
 assert.equal(steps.at(-1).code,'SHELF_CONTEXT_UNAVAILABLE');
 f.chrome.runtime.getContexts=getContexts;
 const intent=await shelf.request('intent',1,null,sender);
 await shelf.request('search-focus-pending',1,null,sender,intent.sequence);
 assert.equal(steps.at(-1).outcome,'pending');
 await shelf.request('search-complete',1,null,{tab:{id:90},documentId:'other'},intent.sequence);
 await shelf.request('search-complete',1,null,{documentId:'other'},intent.sequence);
 assert.equal(steps.at(-1).outcome,'pending');
 await shelf.request('search-complete',1,null,sender,intent.sequence);
 assert.deepEqual(steps.slice(-2).map(({phase,outcome})=>[phase,outcome]),[['ACTION_ACKNOWLEDGED','ok'],['UI_STATE_VERIFIED','ok']]);
 assert(steps.every(step=>step.identity.correlationId===identity.correlationId));
});

test('History verifies the actual view response and requires the native onClosed event for closure',async()=>{
 const f=fixture(),steps=[],sender={documentId:'panel'};
 f.chrome.sidePanel.close=async()=>{};
 const shelf=createShelfHistoryToggle({chrome:f.chrome,observeShortcut:(identity,phase,outcome)=>steps.push({identity,phase,outcome})});
 const open=shortcutIdentity('shelf.history.toggle');
 shelf.command({windowId:1},'history',open);
 await settle();
 const intent=await shelf.request('intent',1,null,sender);
 await shelf.request('view',1,'history',sender);
 assert(!steps.some(step=>step.phase==='UI_STATE_VERIFIED'));
 await shelf.request('history-complete',1,null,sender,intent.sequence);
 assert.equal(steps.at(-1).phase,'UI_STATE_VERIFIED');
 const close=shortcutIdentity('shelf.history.toggle');
 shelf.command({windowId:1},'history',close);
 await settle();
 assert.equal(steps.at(-1).phase,'ACTION_ACKNOWLEDGED');
 assert(!steps.some(step=>step.identity===close&&step.phase==='UI_STATE_VERIFIED'));
 f.callbacks.closed({windowId:1,path:'/extension/app.html'});
 assert.deepEqual(steps.at(-1),{identity:close,phase:'UI_STATE_VERIFIED',outcome:'ok'});
});

test('Durable shortcut trace merges epochs and ZIP exports gate and redact exact Chrome errors',async()=>{
 const identity=shortcutIdentity('shelf.history.toggle');
 let durable;
 const options={read:async()=>durable,write:async value=>{durable=structuredClone(value);}};
 let breadcrumbs=createBreadcrumbs({...options,epoch:1});
 breadcrumbs.observeShortcut(identity,'COMMAND_RECEIVED','started',{commandTab:false});
 await breadcrumbs.flush();
 breadcrumbs=createBreadcrumbs({...options,epoch:2});
 const exact='`sidePanel.open()` may only be called in response to a user gesture.';
 breadcrumbs.observeShortcut(identity,'FAILED','failed',{code:'SIDE_PANEL_GESTURE_REQUIRED',chromeMessage:exact});
 breadcrumbs.observeShortcut(identity,'FEEDBACK','pending',{chromeMessage:'private URL https://secret.example/?token=secret',token:'secret'});
 await breadcrumbs.flush();
 const safe=await breadcrumbs.inspect();
 assert.deepEqual(safe.events[0].shortcut.map(step=>step.epoch),[1,2,2]);
 assert(!JSON.stringify(safe).includes(exact));
 assert(!JSON.stringify(durable).includes('secret'));
 assert.equal((await breadcrumbs.inspect({raw:true})).events[0].shortcut[1].chromeMessage,exact);
 const chrome={storage:{local:{get:async()=>({uiDebugMode:true})}}};
 const recorder=await createRecorderHost({chrome,recorder:{setDebug:async()=>{},ready:Promise.resolve()},
  readShortcuts:()=>breadcrumbs.inspect({raw:true})});
 const request=(method,params)=>recorder.request({version:2,method,params});
 const snapshot=(await request('snapshot',{scope:'shortcuts'})).data;
 assert.equal(snapshot.shortcuts.count,1);
 assert.equal((await request('page',{snapshotId:snapshot.id,privacy:'RAW'})).code,'RAW_EXPORT_CONSENT_REQUIRED');
 for(const privacy of ['RAW','SECURE']){
  const result=await exportComplete({snapshot,privacy,consent:privacy==='RAW',
   getPage:async params=>(await request('page',{snapshotId:snapshot.id,...params})).data});
  const zip=new TextDecoder().decode(await result.blob.arrayBuffer());
  assert.match(zip,/chrome-shortcuts\.jsonl/);
  assert.equal(zip.includes(exact),privacy==='RAW');
  assert(!zip.includes('secret'));
 }
});

test('Shelf History Chrome command cycles per window and respects manual close and a genuine Shelf sender',async()=>{
 const f=fixture(),toggle=createShelfHistoryToggle({chrome:f.chrome});
 await settle();
 toggle.command({windowId:1});
 await settle();
 assert.deepEqual(await toggle.request('intent',1,null,{documentId:'panel'}),{view:'history'});
 assert.equal(await toggle.request('intent',1,null,{tab:{id:4},documentId:'other'}),null);
 await toggle.request('view',1,'explorer',{});
 assert.equal(await toggle.request('intent',1,null,{documentId:'panel'}),null);
 toggle.command({windowId:2});
 toggle.command({windowId:1});
 await settle();
 assert.deepEqual(f.calls.filter(([op])=>op==='open'),[['open',1],['open',2]]);
 toggle.command({windowId:1});
 await settle();
 assert.deepEqual(f.calls.filter(([op])=>op==='close'),[['close',1]]);
 assert.equal(f.values['shelf-view:2'].open,true);
 f.callbacks.closed({windowId:2,path:'/extension/app.html'});
 toggle.command({windowId:2});
 await settle();
 assert.deepEqual(f.calls.filter(([op])=>op==='open').at(-1),['open',2]);
});

test('A rapid second key waits for Chrome to finish opening before closing the same panel',async()=>{
 const f=fixture({}, {deferOpen:true}),toggle=createShelfHistoryToggle({chrome:f.chrome});
 await settle();
 toggle.command({windowId:1});
 toggle.command({windowId:1});
 await settle();
 assert.equal(f.calls.filter(([op])=>op==='close').length,0);
 f.release();
 await settle();
 assert.deepEqual(f.calls.filter(([op])=>op==='close'),[['close',1]]);
 assert.equal(f.values['shelf-view:1'].open,false);
});

test('Cold Chrome background restores the prior window view and preserves rapid command parity',async()=>{
 const f=fixture({'shelf-view:1':{view:'history',open:true}}),toggle=createShelfHistoryToggle({chrome:f.chrome});
 toggle.command({windowId:1});
 await settle();
 assert.deepEqual(f.calls.filter(([op])=>op==='close'),[['close',1]]);
 const other=fixture(),unavailable=[];
 delete other.chrome.sidePanel.close;
 const partial=createShelfHistoryToggle({chrome:other.chrome,feedback:(_,code)=>unavailable.push(code)});
 await settle();
 partial.command({windowId:1});
 partial.command({windowId:1});
 assert.deepEqual(unavailable,['SHELF_CLOSE_UNAVAILABLE']);
});

test('Chrome Explorer search survives cold startup and stale History messages without closing the Shelf',async()=>{
 const f=fixture({'shelf-view:1':{view:'history',open:true,sequence:7}},{deferOpen:true});
 const shelf=createShelfHistoryToggle({chrome:f.chrome}),sender={documentId:'panel'};
 shelf.search({windowId:1});shelf.search({windowId:1});
 assert.deepEqual(f.calls,[['open',1]],'Chrome received the open call in the command gesture');
 await settle();
 const intent=await shelf.request('intent',1,null,sender);
 assert.deepEqual(intent,{view:'explorer',focusSearch:true,sequence:8});
 await shelf.request('view',1,'history',sender);
 const restarted=createShelfHistoryToggle({chrome:f.chrome});
 assert.deepEqual(await restarted.request('intent',1,null,sender),intent);
 await restarted.request('search-complete',1,null,sender,7);
 assert.deepEqual(await restarted.request('intent',1,null,sender),intent);
 await restarted.request('search-complete',1,null,sender,8);
 assert.equal(await restarted.request('intent',1,null,sender),null);
 f.release();restarted.command({windowId:1});await settle();
 assert.deepEqual(await restarted.request('intent',1,null,sender),{view:'history'});
 assert.equal(f.calls.filter(([kind])=>kind==='close').length,0);
});

test('A tabless Shelf shortcut uses Chrome’s native callback gesture and requires a focused window',async()=>{
 const f=fixture(),feedback=[];
 let gesture=false,focused=true;
 f.chrome.windows.getLastFocused=(options,callback)=>{
  assert.deepEqual(options,{windowTypes:['normal']});
  gesture=true;
  try{callback({id:1,focused});}finally{gesture=false;}
 };
 const open=f.chrome.sidePanel.open;
 f.chrome.sidePanel.open=options=>{assert.equal(gesture,true);return open(options);};
 const shelf=createShelfHistoryToggle({chrome:f.chrome,feedback:(...args)=>feedback.push(args)});
 shelf.search();
 assert.deepEqual(f.calls,[['open',1]]);
 await settle();
 assert.deepEqual(await shelf.request('intent',1,null,{documentId:'panel'}),{view:'explorer',focusSearch:true,sequence:1});
 focused=false;
 shelf.search();
 assert.deepEqual(feedback,[[undefined,'SIDE_PANEL_WINDOW_UNAVAILABLE']]);
 assert.deepEqual(f.calls.filter(([kind])=>kind==='open'),[['open',1]]);
});

test('Chrome open rejections emit only a bounded category and preserve the prior Shelf view',async()=>{
 const cases=[
  ['`sidePanel.open()` may only be called in response to a user gesture.','SIDE_PANEL_GESTURE_REQUIRED'],
  ['No active side panel for windowId: 1123','SIDE_PANEL_DISABLED'],
  ['No browser window for windowId: 1123','SIDE_PANEL_WINDOW_UNAVAILABLE'],
  ['unexpected error https://private.example/?secret=value','SIDE_PANEL_OPEN_FAILED'],
 ];
 for(const [message,code] of cases){
  const f=fixture({'shelf-view:1':{open:true,view:'settings',sequence:5}},{deferOpen:true}),feedback=[];
  const shelf=createShelfHistoryToggle({chrome:f.chrome,feedback:(...args)=>feedback.push(args)});
  await settle();
  shelf.search({windowId:1});
  f.rejectOpen(Error(message));
  await settle();
  assert.deepEqual(feedback,[[1,code]]);
  assert.deepEqual(f.values['shelf-view:1'],{open:true,view:'settings',sequence:6,intent:null});
  assert.equal(f.calls.filter(([kind])=>kind==='message').length,0);
 }
});

test('Overlapping Shelf commands share an open and announce only the latest successful intent',async()=>{
 const f=fixture({}, {deferOpen:true});
 const shelf=createShelfHistoryToggle({chrome:f.chrome});
 await settle();
 shelf.search({windowId:1});
 shelf.command({windowId:1});
 await settle();
 assert.deepEqual(f.calls,[['open',1]]);
 f.release();
 await settle();
 assert.deepEqual(f.calls,[['open',1],['message',1,'shelf-history-show']]);
 assert.deepEqual(await shelf.request('intent',1,null,{documentId:'panel'}),{view:'history'});
});

test('A failed open with overlapping Shelf commands restores the real prior state',async()=>{
 const f=fixture({}, {deferOpen:true}),feedback=[];
 const shelf=createShelfHistoryToggle({chrome:f.chrome,feedback:(...args)=>feedback.push(args)});
 await settle();
 shelf.search({windowId:1});
 shelf.command({windowId:1});
 f.rejectOpen(Error('No active side panel for windowId: 1'));
 await settle();
 assert.deepEqual(f.calls,[['open',1]]);
 assert.deepEqual(feedback,[[1,'SIDE_PANEL_DISABLED']]);
 assert.deepEqual(f.values['shelf-view:1'],{open:false,view:'remotes',sequence:2,intent:null});
});
