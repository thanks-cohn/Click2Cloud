import test from 'node:test';
import assert from 'node:assert/strict';
import {createAestheticHost,validatePalette,AESTHETIC_PREFERENCE_KEY,PALETTE_PREFERENCE_KEY} from '../src/aesthetic/host.mjs';
import {palettes} from '../src/aesthetic/packages.mjs';

const pref=id=>({schemaVersion:1,id});
function fixture(values={}){
 const vars=new Map(),writes=[],root={dataset:{theme:'light'},style:{setProperty:(key,value)=>vars.set(key,value),removeProperty:key=>vars.delete(key)}};
 const storage={get:async()=>structuredClone(values),set:async update=>{writes.push(update);Object.assign(values,update);}};
 return {host:createAestheticHost({root,storage}),vars,writes,root};
}
test('Built-in palettes are complete and reject geometry, visibility, remote fonts, code and invalid colors',()=>{
 assert.equal(palettes.length,5);
 for(const scheme of palettes)assert(validatePalette(scheme),scheme.id);
 const original=palettes[0];
 for(const patch of [{geometry:{radius:20}},{visibility:{hide:['connection']}},{script:'fetch()'},{colors:{...original.colors,background:['url(https://example.org)','#000000']}},
  {fonts:{...original.fonts,heading:['url(https://example.org)',700]}},{fonts:{...original.fonts,heading:['Georgia',1000]}}])assert.equal(validatePalette({...original,...patch}),false);
});
test('Minimal is the default, old choices restore deterministically and unrelated preferences survive',async()=>{
 for(const [saved,expected] of [[undefined,'minimal'],[pref('high-polish'),'minimal'],[pref('minimal'),'minimal'],[pref('standard'),'standard'],[pref('missing'),'minimal'],[{schemaVersion:2,id:'standard'},'minimal']]){
  const values={[AESTHETIC_PREFERENCE_KEY]:saved,[PALETTE_PREFERENCE_KEY]:pref('emerald-forest'),fontPreference:'ignored',screenshotRules:{fixtures:true}};
  const {host,writes,root}=fixture(values);
  await host.restore();
  assert.deepEqual(host.list().map(theme=>theme.name),['Minimal','Remote V1']);
  assert.equal(root.dataset.aesthetic,expected);
  assert.equal(root.dataset.aestheticHide,undefined);
  assert.equal(host.getPalette(),'emerald-forest');
  assert.equal(writes.length,0);
  assert.deepEqual(values.screenshotRules,{fixtures:true});
  assert.equal((await host.apply({id:'high-polish'})).error,'PACKAGE_UNAVAILABLE');
 }
});
test('Each palette is one stored choice that applies all colors, type stacks and weights',async()=>{
 const values={};const {host,vars,writes,root}=fixture(values);
 const baseline=Object.keys(root.dataset);
 for(const scheme of palettes){
  assert.equal((await host.applyPalette(scheme.id)).error,null);
  assert.deepEqual(writes.at(-1),{[PALETTE_PREFERENCE_KEY]:pref(scheme.id)});
  for(const [color,[light,dark]] of Object.entries(scheme.colors)){
   assert.equal(vars.get(`--a-color-${color}-light`),light);
   assert.equal(vars.get(`--a-color-${color}-dark`),dark);
  }
  for(const [role,[family,weight]] of Object.entries(scheme.fonts)){
   assert.equal(vars.get(`--a-font-${role}`),family);
   assert.equal(vars.get(`--a-weight-${role}`),String(weight));
  }
  const restored=fixture(values);await restored.host.restore();assert.deepEqual(restored.vars,vars);
  assert.deepEqual(Object.keys(root.dataset),baseline);
  assert.equal(root.dataset.theme,'light');
 }
 assert([...vars.keys()].every(name=>/^--a-(?:color|font|weight)-/.test(name)));
 await host.apply({id:'standard'});assert.equal(vars.size,0);
 await host.apply({id:'minimal'});assert.equal(host.getPalette(),'sunset-amber');
});
test('Late preference reads and failed writes preserve a newer session choice',async()=>{
 let release;
 const host=createAestheticHost({storage:{get:()=>new Promise(resolve=>{release=resolve;}),set:async()=>{throw Error('quota');}}});
 const restoring=host.restore();
 assert.equal((await host.apply({id:'standard'})).error,'PREFERENCE_WRITE_FAILED');
 release({[AESTHETIC_PREFERENCE_KEY]:pref('high-polish')});
 await restoring;
 assert.equal(host.getActive().id,'standard');
});
const luminance=hex=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('Palette text, controls and focus colors stay readable in light and dark',()=>{
 for(const {id,colors} of palettes)for(let mode=0;mode<2;mode++){
  for(const [foreground,background,minimum] of [['text','background',4.5],['text','selection',4.5],['muted','surface',4.5],['accent','surface',4.5],['focus','surface',3]]){
   assert(contrast(colors[foreground][mode],colors[background][mode])>=minimum,`${id} ${foreground}/${background} ${mode}`);
  }
 }
});
