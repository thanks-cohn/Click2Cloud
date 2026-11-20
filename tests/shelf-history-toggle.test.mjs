import test from 'node:test';
import assert from 'node:assert/strict';
import {createShelfHistoryToggle} from '../src/chrome/provider-panel.mjs';

function fixture(initial={}, {deferOpen=false}={}){
 const values=structuredClone(initial),calls=[],callbacks={};
 const chrome={storage:{session:{get:async()=>structuredClone(values),set:async update=>Object.assign(values,structuredClone(update)),
  remove:async key=>delete values[key]}},runtime:{getURL:path=>'chrome-extension://local/'+path,
   getContexts:async()=>[{contextType:'SIDE_PANEL',windowId:-1,documentId:'panel'}],sendMessage:async message=>calls.push(['message',message.windowId])},
  windows:{onRemoved:{addListener:fn=>{callbacks.removed=fn;}}}};
 let release;
 chrome.sidePanel={open:({windowId})=>{
  calls.push(['open',windowId]);
  return deferOpen?new Promise(resolve=>{release=resolve;}):Promise.resolve();
 },close:async({windowId})=>{calls.push(['close',windowId]);callbacks.closed({windowId,path:'extension/app.html'});},
 onClosed:{addListener:fn=>{callbacks.closed=fn;}}};
 return {chrome,calls,values,callbacks,release:()=>release()};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

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
 f.callbacks.closed({windowId:2,path:'extension/app.html'});
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
