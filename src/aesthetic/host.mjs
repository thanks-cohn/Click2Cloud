import {standard,highPolish,minimal,bitOPolishPalettes} from './packages.mjs';
export const AESTHETIC_API_VERSION='1.1';
export const AESTHETIC_PREFERENCE_KEY='aestheticPreferenceV1';
export const PALETTE_PREFERENCE_KEY='aestheticPalettePreferenceV1';
// Only wrappers marked by the trusted app/stylesheet may use these roles.
export const textRoles=Object.freeze([
 'explorer.debug-caption','remotes.intro-copy','remotes.connection-explanation','remotes.provider-description',
 'remotes.connected-caption','remotes.previous-result-detail','destinations.worker-explanation',
 'destinations.availability-hint','status.verbose-technical-detail','settings.help-copy'
]);
export const tokenTypes=Object.freeze({
 ...Object.fromEntries(['background','surface','raised','text','muted','border','accent','selection','focus'].map(k=>['color.'+k,'color'])),
 'typography.family':'fontFamily','typography.size':'dimension','spacing.unit':'dimension','spacing.page':'dimension','spacing.card':'dimension','spacing.navGap':'dimension','spacing.navInline':'dimension',
 'geometry.control':'dimension','geometry.surface':'dimension','geometry.overlay':'dimension','elevation.overlay':'shadow','motion.feedback':'duration','state.disabled':'number'
});
const plain=x=>!!x&&Object.getPrototypeOf(x)===Object.prototype;
const keys=(x,allowed)=>Object.keys(x).every(k=>allowed.includes(k));
const hex=x=>typeof x==='string'&&/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(x);
const dimension=x=>typeof x==='string'&&/^\d+(?:\.\d+)?px$/.test(x)&&parseFloat(x)<=48;
const variable=name=>'--a-'+name.replaceAll('.','-');
export function validateAesthetic(manifest){
 const errors=[];
 if(!plain(manifest)||!keys(manifest,['schemaVersion','id','name','version','compatibleApiVersion','tokens','visibility']))return {valid:false,errors:['MANIFEST_INVALID']};
 if(manifest.schemaVersion!==1||!['1.0',AESTHETIC_API_VERSION].includes(manifest.compatibleApiVersion))errors.push('API_INCOMPATIBLE');
 if(!/^[a-z][a-z0-9-]{0,47}$/.test(manifest.id??'')||typeof manifest.name!=='string'||!manifest.name.trim()||manifest.name.length>80||!/^\d+\.\d+\.\d+$/.test(manifest.version??''))errors.push('IDENTITY_INVALID');
 if(!plain(manifest.tokens)||Object.keys(manifest.tokens).length>32)return {valid:false,errors:[...errors,'TOKENS_INVALID']};
 if(Object.hasOwn(manifest,'visibility')){
  if(manifest.compatibleApiVersion!=='1.1'||!plain(manifest.visibility)||!keys(manifest.visibility,textRoles)||
   Object.values(manifest.visibility).some(value=>!['show','hide'].includes(value)))errors.push('VISIBILITY_INVALID');
 }
 for(const [name,t] of Object.entries(manifest.tokens)){
  const type=tokenTypes[name];if(!type||!plain(t)||!keys(t,['$type','$value'])||t.$type!==type){errors.push('TOKEN_INVALID:'+name);continue;}
  const v=t.$value,ok=type==='color'?plain(v)&&keys(v,['light','dark'])&&hex(v.light)&&hex(v.dark):type==='dimension'?dimension(v)&&(!name.startsWith('typography')||parseFloat(v)>=12):type==='fontFamily'?typeof v==='string'&&v.length<160&&/^[a-zA-Z ,"'-]+$/.test(v):type==='duration'?typeof v==='string'&&/^\d+ms$/.test(v)&&parseInt(v)<=200:type==='number'?Number.isFinite(v)&&v>=0.4&&v<=1:type==='shadow'?typeof v==='string'&&/^0 \d{1,2}px \d{1,2}px #[\da-f]{8}$/i.test(v):false;
  if(!ok)errors.push('VALUE_INVALID:'+name);
 }
 return {valid:!errors.length,errors};
}
// Only the trusted host receives root/storage. Packages remain inert data.
export function createAestheticHost({root,storage}={}){
 const registry=new Map(),palettes=new Map(),applied=new Set();
 let active=standard.id,palette='original-rose',lastError=null,sequence=0,writes=Promise.resolve();
 function register(manifest){
  const result=validateAesthetic(manifest);
  if(!result.valid)return result;
  if(registry.has(manifest.id))return {valid:false,errors:['PACKAGE_ALREADY_REGISTERED']};
  registry.set(manifest.id,structuredClone(manifest));
  return result;
 }
 register(highPolish);register(standard);register(minimal);
 const colors=Object.keys(tokenTypes).filter(name=>tokenTypes[name]==='color');
 for(const scheme of bitOPolishPalettes){
  if(Object.keys(scheme.tokens).length!==colors.length||!colors.every(name=>scheme.tokens[name])||
    !validateAesthetic({...highPolish,...scheme}).valid)throw Error('BUILT_IN_PALETTE_INVALID');
  palettes.set(scheme.id,structuredClone(scheme));
 }
 function paint(id){
  const manifest=registry.get(id);
  const tokens=id===standard.id?{}:{...registry.get(highPolish.id).tokens,...manifest.tokens,
    ...(id===highPolish.id?palettes.get(palette).tokens:{})};
  for(const name of applied)root?.style.removeProperty(name);
  applied.clear();
  for(const [name,token] of Object.entries(tokens)){
   const vars=token.$type==='color'?['light','dark'].map(mode=>[variable(name)+'-'+mode,token.$value[mode]]):[[variable(name),String(token.$value)]];
   for(const [key,value] of vars){root?.style.setProperty(key,value);applied.add(key);}
  }
  active=id;
  if(!root)return;
  root.dataset.aesthetic=id;
  const hidden=Object.entries(manifest.visibility??{}).filter(([,value])=>value==='hide').map(([role])=>role);
  if(hidden.length)root.dataset.aestheticHide=hidden.join(' ');
  else delete root.dataset.aestheticHide;
 }
 function persistPreference(key,id){
  writes=writes.catch(()=>{}).then(()=>{
   if(!storage?.set)throw Error('PREFERENCE_WRITE_FAILED');
   return storage.set({[key]:{schemaVersion:1,id}});
  });
  return writes;
 }
 async function apply({id=standard.id,persist=true}={}){
  const ticket=++sequence;
  const error=registry.has(id)?null:'PACKAGE_UNAVAILABLE';
  paint(error?standard.id:id);
  lastError=error;
  const result=getActive();
  if(persist)try{await persistPreference(AESTHETIC_PREFERENCE_KEY,active);}
  catch{if(sequence===ticket)lastError='PREFERENCE_WRITE_FAILED';return {...result,error:'PREFERENCE_WRITE_FAILED'};}
  return result;
 }
 async function applyPalette(id){
  if(!palettes.has(id))return {id:palette,error:'PALETTE_UNAVAILABLE'};
  sequence++;
  palette=id;
  if(active===highPolish.id)paint(active);
  try{await persistPreference(PALETTE_PREFERENCE_KEY,id);return {id,error:null};}
  catch{return {id,error:'PREFERENCE_WRITE_FAILED'};}
 }
 const getActive=()=>({apiVersion:AESTHETIC_API_VERSION,id:active,version:registry.get(active).version,error:lastError});
 const isPreference=saved=>plain(saved)&&keys(saved,['schemaVersion','id'])&&saved.schemaVersion===1;
 async function restore(){
  const ticket=sequence;
  try{
   const values=await storage?.get([AESTHETIC_PREFERENCE_KEY,PALETTE_PREFERENCE_KEY]);
   if(ticket!==sequence)return getActive();
   const saved=values?.[AESTHETIC_PREFERENCE_KEY],scheme=values?.[PALETTE_PREFERENCE_KEY];
   palette=isPreference(scheme)&&palettes.has(scheme.id)?scheme.id:'original-rose';
   if(saved===undefined)return apply({id:highPolish.id,persist:false});
   if(isPreference(saved))return apply({id:saved.id,persist:false});
   paint(standard.id);lastError='PREFERENCE_INVALID';
  }catch{if(ticket===sequence){paint(standard.id);lastError='PREFERENCE_READ_FAILED';}}
  return getActive();
 }
 return Object.freeze({register,validate:validateAesthetic,apply,getActive,list:()=>[...registry.values()].map(({id,name})=>({id,name})),
  listPalettes:()=>[...palettes.values()].map(({id,name,tokens})=>({id,name,preview:structuredClone(tokens['color.accent'].$value)})),
  getPalette:()=>palette,applyPalette,resetToStandard:()=>apply({id:standard.id}),restore});
}
