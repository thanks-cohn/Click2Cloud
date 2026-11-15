import test from 'node:test';import assert from 'node:assert/strict';
import {createAestheticHost,validateAesthetic,AESTHETIC_PREFERENCE_KEY} from '../src/aesthetic/host.mjs';import {standard,highPolish} from '../src/aesthetic/packages.mjs';
const setup=(saved)=>{const vars=new Map(),writes=[],root={dataset:{theme:'light'},style:{setProperty:(k,v)=>vars.set(k,v),removeProperty:k=>vars.delete(k)}};const host=createAestheticHost({root,storage:{get:async()=>({[AESTHETIC_PREFERENCE_KEY]:saved}),set:async v=>writes.push(v)}});return {host,vars,writes,root};};
test('aesthetic packages validate; CSS, URLs, code, unknown tokens and incompatible manifests never register',()=>{
 for(const p of [standard,highPolish])assert(validateAesthetic(p).valid);
 for(const patch of [{schemaVersion:2},{compatibleApiVersion:'2.0'},{css:'body{display:none}'},{script:'fetch()'},{assets:['https://evil.test/a']},{tokens:{'color.background':{$type:'color',$value:{light:'url(https://evil)',dark:'#000000'}}}},{tokens:{'geometry.control':{$type:'dimension',$value:'999px'}}},{tokens:{'motion.feedback':{$type:'duration',$value:'10000ms'}}},{tokens:{'z-index':{$type:'number',$value:999}}}])assert.equal(validateAesthetic({...highPolish,...patch}).valid,false);
 const {host}=setup();assert.equal(host.register({...highPolish,id:'bad',compatibleApiVersion:'99'}).valid,false);assert.equal(host.getActive().id,'standard');
});
test('apply/reset are scoped to presentation root and independent preference, without changing light/dark',async()=>{
 const {host,vars,writes,root}=setup();await host.apply({id:'high-polish'});assert.equal(root.dataset.theme,'light');assert(vars.size>20);assert.equal(writes.length,1);assert.deepEqual(Object.keys(writes[0]),[AESTHETIC_PREFERENCE_KEY]);
 for(let i=0;i<50;i++){await host.apply({id:'standard',persist:false});assert.equal(vars.size,0);await host.apply({id:'high-polish',persist:false});}await host.resetToStandard();assert.equal(vars.size,0);assert.equal(root.dataset.aesthetic,'standard');assert.equal(root.dataset.theme,'light');
});
test('restore invalid/future/missing package falls back without overwriting stored preference; partial author tokens have host defaults',async()=>{
 for(const saved of [{schemaVersion:2,id:'high-polish'},{schemaVersion:1,id:'missing'},null]){const {host,writes,vars}=setup(saved);await host.restore();assert.equal(host.getActive().id,'standard');assert.equal(writes.length,0);assert.equal(vars.size,0);}
 const {host,vars}=setup({schemaVersion:1,id:'high-polish'});await host.restore();assert.equal(host.getActive().id,'high-polish');assert(host.register({...standard,id:'example',name:'Example',tokens:{'geometry.control':{$type:'dimension',$value:'3px'}}}).valid);await host.apply({id:'example'});assert.equal(vars.get('--a-geometry-control'),'3px');assert(vars.has('--a-color-text-light'));
});
test('late preference reads cannot replace a newer user choice; write failures leave an honest session choice',async()=>{
 let release;const root={dataset:{},style:{setProperty(){},removeProperty(){}}},host=createAestheticHost({root,storage:{get:()=>new Promise(r=>release=r),set:async()=>{throw Error('quota');}}});const ready=host.restore();await host.apply({id:'high-polish',persist:false});release({[AESTHETIC_PREFERENCE_KEY]:{schemaVersion:1,id:'standard'}});await ready;assert.equal(host.getActive().id,'high-polish');assert.equal((await host.apply({id:'high-polish'})).error,'PREFERENCE_WRITE_FAILED');assert.equal(host.getActive().id,'high-polish');
});
const luminance=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('High Polish text, secondary text and focus colors meet WCAG contrast in light and dark',()=>{for(const mode of ['light','dark']){const v=k=>highPolish.tokens['color.'+k].$value[mode];for(const surface of ['background','surface','raised'])for(const text of ['text','muted'])assert(contrast(v(text),v(surface))>=4.5,mode+' '+text+' on '+surface);assert(contrast(v('focus'),v('surface'))>=3);}});
