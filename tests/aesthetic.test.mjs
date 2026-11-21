import test from 'node:test';
import assert from 'node:assert/strict';
import {createAestheticHost,validatePalette,AESTHETIC_PREFERENCE_KEY,PALETTE_PREFERENCE_KEY,BUSY_CURSOR_PREFERENCE_KEY} from '../src/aesthetic/host.mjs';
import {palettes,themePackages,busyCursorPackages} from '../src/aesthetic/packages.mjs';

const pref=id=>({schemaVersion:1,id});
function fixture(values={},options={}){
 const vars=new Map(),writes=[],root={dataset:{theme:'light'},style:{setProperty:(key,value)=>vars.set(key,value),removeProperty:key=>vars.delete(key)}};
 const storage={get:async()=>structuredClone(values),set:async update=>{writes.push(update);Object.assign(values,update);}};
 return {host:createAestheticHost({root,storage,...options}),vars,writes,root};
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
  assert.deepEqual(host.list().map(theme=>theme.name),['Minimal','Remote V1','Golden Age','Oceania','Nostalgia','Frames']);
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
test('Busy cursors persist independently and removed or disabled packages fall back to System Default',async()=>{
 const values={[AESTHETIC_PREFERENCE_KEY]:pref('standard'),[PALETTE_PREFERENCE_KEY]:pref('emerald-forest')};
 const {host}=fixture(values);
 await host.restore();
 for(const {id} of busyCursorPackages){
  assert.deepEqual(await host.applyBusyCursor(id),{id,error:null});
  const restored=fixture(values);
  await restored.host.restore();
  assert.equal(restored.root.dataset.busyCursor,id);
  assert.equal(restored.host.getActive().id,'standard');
  assert.equal(restored.host.getPalette(),'emerald-forest');
 }
 const reduced=fixture(values,{busyPackages:busyCursorPackages.map(item=>({...item,enabled:item.id!=='redown-pulse'}))});
 await reduced.host.restore();
 assert.equal(reduced.host.getBusyCursor(),'system');
 assert.deepEqual(values[BUSY_CURSOR_PREFERENCE_KEY],pref('redown-pulse'));
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

test('Nostalgia variants persist with the theme while the Minimal palette survives theme changes',async()=>{
 const values={}, {host,root,vars}=fixture(values);
 assert.deepEqual(host.listNostalgiaStyles(),[
  {id:'kawaii',name:'Kawaii (Neon Pink)'},{id:'dungeon-master',name:'Dungeon Master'},{id:'heroine',name:'Heroine'}
 ]);
 await host.applyPalette('emerald-forest');
 for(const id of ['golden-age','oceania','nostalgia']){
  assert.equal((await host.apply({id})).error,null);
  assert.equal(root.dataset.aesthetic,id);
  assert.equal(root.dataset.nostalgiaStyle,id==='nostalgia'?'kawaii':undefined);
  assert.equal(vars.size,0);
 }
 await host.applyNostalgiaStyle('heroine');
 await host.apply({id:'standard'});
 assert.equal(root.dataset.nostalgiaStyle,undefined);
 const reopened=fixture(values);
 await reopened.host.restore();
 assert.equal(reopened.host.getActive().id,'standard');
 await reopened.host.apply({id:'nostalgia'});
 assert.equal(reopened.root.dataset.nostalgiaStyle,'heroine');
 await reopened.host.apply({id:'minimal'});
 assert.equal(reopened.host.getPalette(),'emerald-forest');
 assert.equal(reopened.vars.get('--a-color-accent-light'),'#166c56');
});

test('Removed themes and removed or corrupt Nostalgia variants restore Minimal without preference writes',async()=>{
 const check=async(id,nostalgiaStyle,packages)=>{
  const values={
   [AESTHETIC_PREFERENCE_KEY]:{...pref(id),nostalgiaStyle},
   [PALETTE_PREFERENCE_KEY]:pref('amethyst'),
   destinations:[{bucketName:'saved'}],history:[{operationId:'saved'}],credentials:{fixture:true}
  };
  const snapshot=structuredClone(values);
  const {host,root,writes,vars}=fixture(values,{packages});
  assert.equal((await host.restore()).id,'minimal');
  assert.equal(root.dataset.nostalgiaStyle,undefined);
  assert.equal(vars.get('--a-color-accent-light'),'#7542ad');
  assert.equal(writes.length,0);
  assert.deepEqual(values,snapshot);
 };
 for(const {id} of themePackages)await check(id,undefined,themePackages.filter(theme=>theme.id!==id));
 const nostalgia=themePackages.find(theme=>theme.id==='nostalgia');
 for(const {id} of nostalgia.styles){
  await check('nostalgia',id,themePackages.map(theme=>theme===nostalgia?
   {...theme,styles:theme.styles.filter(style=>style.id!==id)}:theme));
 }
 await check('nostalgia',{id:'heroine'},themePackages);
});

test('Frames persists the selected palette and falls back when the stylesheet is absent', async () => {
 const values={};const {host,vars}=fixture(values);
 for(const palette of palettes){
  await host.applyPalette(palette.id);
  await host.apply({id:'frames'});
  const restored=fixture(values);
  await restored.host.restore();
  assert.equal(restored.host.getActive().id,'frames');
  assert.deepEqual(restored.vars,vars);
  assert.equal(vars.get('--a-color-accent-light'),palette.colors.accent[0]);
  assert.equal(vars.get('--a-color-accent-dark'),palette.colors.accent[1]);
 }
 const unavailable=fixture(values);
 unavailable.root.ownerDocument={defaultView:{getComputedStyle:()=>({getPropertyValue:()=>''})}};
 assert.equal((await unavailable.host.restore()).error,'PACKAGE_UNAVAILABLE');
 assert.equal(unavailable.host.getActive().id,'minimal');
 assert.equal(values[AESTHETIC_PREFERENCE_KEY].id,'frames');
});
