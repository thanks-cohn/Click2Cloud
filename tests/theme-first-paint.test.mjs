import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const script=readFileSync(new URL('../extension/theme-first-paint.js',import.meta.url),'utf8');
function fixture({cached=null,throws=false}={}){
 const events=new Map(),timers=new Map(),root={dataset:{theme:'dark'}};
 let id=0;
 const document={documentElement:root,addEventListener:(name,fn)=>events.set(name,fn),removeEventListener:(name,fn)=>{if(events.get(name)===fn)events.delete(name);}};
 runInNewContext(script,{document,localStorage:{getItem:()=>{if(throws)throw Error('denied');return cached;}},
  setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:key=>timers.delete(key)});
 return {root,events,timers,dispatch:name=>events.get(name)?.(),expire:()=>[...timers.values()].forEach(t=>t.fn())};
}
const pending=f=>Object.hasOwn(f.root.dataset,'aestheticPending');
test('first paint waits for both appearance reads, in either order',()=>{
 for(const order of [['redown-aesthetic-ready','redown-color-mode-ready'],['redown-color-mode-ready','redown-aesthetic-ready']]){
  const f=fixture({cached:'light'});assert.equal(f.root.dataset.theme,'light');assert(pending(f));
  f.dispatch(order[0]);assert(pending(f));
  f.dispatch(order[1]);assert(!pending(f));assert.equal(f.timers.size,0);assert.equal(f.events.size,0);
 }
});
test('first paint fails open after bounded timeout, including unavailable storage',()=>{
 for(const options of [{},{cached:'light'},{cached:'invalid'},{throws:true}]){
  const f=fixture(options);assert(pending(f));assert.equal([...f.timers.values()][0].ms,1200);
  assert.equal(f.root.dataset.theme,options.cached==='light'?'light':'dark');
  f.dispatch('redown-aesthetic-ready');assert(pending(f));
  f.expire();assert(!pending(f));assert.equal(f.events.size,0);
  f.dispatch('redown-color-mode-ready');assert(!pending(f));
 }
});
test('late or repeated ready signals cannot reopen a released guard',()=>{
 const f=fixture();f.expire();f.dispatch('redown-aesthetic-ready');f.dispatch('redown-color-mode-ready');assert(!pending(f));
});
