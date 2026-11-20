import {standard,minimal,palettes} from './packages.mjs';

export const AESTHETIC_API_VERSION='1.1';
export const AESTHETIC_PREFERENCE_KEY='aestheticPreferenceV1';
export const PALETTE_PREFERENCE_KEY='aestheticPalettePreferenceV1';
const themes=new Map([minimal,standard].map(theme=>[theme.id,theme]));
const colorNames=['background','surface','raised','text','muted','border','accent','selection','focus'];
const fontRoles=['heading','body','control'];
const plain=value=>!!value&&Object.getPrototypeOf(value)===Object.prototype;
const hex=value=>typeof value==='string'&&/^#[\da-f]{6}$/i.test(value);
const fontFamily=value=>typeof value==='string'&&value.length>0&&value.length<160&&/^[a-zA-Z ,"'-]+$/.test(value);

export function validatePalette(scheme){
 if(!plain(scheme)||Object.keys(scheme).some(key=>!['id','name','colors','fonts'].includes(key))||
   !/^[a-z][a-z0-9-]{0,47}$/.test(scheme.id??'')||typeof scheme.name!=='string'||!scheme.name.trim())return false;
 const {colors,fonts}=scheme;
 if(!plain(colors)||Object.keys(colors).length!==colorNames.length||!plain(fonts)||Object.keys(fonts).length!==fontRoles.length)return false;
 return colorNames.every(name=>Array.isArray(colors[name])&&colors[name].length===2&&colors[name].every(hex))&&
  fontRoles.every(role=>Array.isArray(fonts[role])&&fonts[role].length===2&&fontFamily(fonts[role][0])&&
   Number.isInteger(fonts[role][1])&&fonts[role][1]>=400&&fonts[role][1]<=750);
}
const schemes=new Map(palettes.map(scheme=>{
 if(!validatePalette(scheme))throw Error('BUILT_IN_PALETTE_INVALID');
 return [scheme.id,scheme];
}));

export function createAestheticHost({root,storage}={}){
 const applied=new Set();
 let active=minimal.id,palette=palettes[0].id,lastError=null,sequence=0,writes=Promise.resolve();
 function paint(){
  if(!root)return;
  for(const name of applied)root.style.removeProperty(name);
  applied.clear();
  root.dataset.aesthetic=active;
  if(active!==minimal.id)return;
  const {colors,fonts}=schemes.get(palette);
  const set=(key,value)=>{root.style.setProperty(key,String(value));applied.add(key);};
  for(const [name,[light,dark]] of Object.entries(colors)){
   set('--a-color-'+name+'-light',light);set('--a-color-'+name+'-dark',dark);
  }
  for(const [role,[family,weight]] of Object.entries(fonts)){
   set('--a-font-'+role,family);set('--a-weight-'+role,weight);
  }
 }
 function persistPreference(key,id){
  writes=writes.catch(()=>{}).then(()=>{
   if(!storage?.set)throw Error('PREFERENCE_WRITE_FAILED');
   return storage.set({[key]:{schemaVersion:1,id}});
  });
  return writes;
 }
 const getActive=()=>({apiVersion:AESTHETIC_API_VERSION,id:active,version:themes.get(active).version,error:lastError});
 async function apply({id=minimal.id,persist=true}={}){
  const ticket=++sequence;
  lastError=themes.has(id)?null:'PACKAGE_UNAVAILABLE';
  active=lastError?minimal.id:id;
  paint();
  const result=getActive();
  if(persist&&!lastError)try{await persistPreference(AESTHETIC_PREFERENCE_KEY,id);}
  catch{if(sequence===ticket)lastError='PREFERENCE_WRITE_FAILED';return {...result,error:'PREFERENCE_WRITE_FAILED'};}
  return result;
 }
 async function applyPalette(id){
  if(!schemes.has(id))return {id:palette,error:'PALETTE_UNAVAILABLE'};
  sequence++;palette=id;
  paint();
  try{await persistPreference(PALETTE_PREFERENCE_KEY,id);return {id,error:null};}
  catch{return {id,error:'PREFERENCE_WRITE_FAILED'};}
 }
 const isPreference=value=>plain(value)&&value.schemaVersion===1&&typeof value.id==='string';
 async function restore(){
  const ticket=sequence;
  try{
   const values=await storage?.get([AESTHETIC_PREFERENCE_KEY,PALETTE_PREFERENCE_KEY]);
   if(ticket!==sequence)return getActive();
   const saved=values?.[AESTHETIC_PREFERENCE_KEY],scheme=values?.[PALETTE_PREFERENCE_KEY];
   if(isPreference(scheme)&&schemes.has(scheme.id))palette=scheme.id;
   // Keep the durable IDs for Minimal and Remote V1 and read old Bit o' Polish
   // preferences as Minimal. The independently saved palette stays intact.
   if(saved===undefined||isPreference(saved)&&saved.id==='high-polish')return apply({persist:false});
   if(isPreference(saved)&&themes.has(saved.id))return apply({id:saved.id,persist:false});
   lastError='PREFERENCE_INVALID';
  }catch{if(ticket===sequence)lastError='PREFERENCE_READ_FAILED';}
  if(ticket===sequence)paint();
  return getActive();
 }
 paint();
 return Object.freeze({apply,getActive,list:()=>[...themes.values()].map(({id,name})=>({id,name})),
  listPalettes:()=>palettes.map(({id,name,colors})=>({id,name,preview:{light:colors.accent[0],dark:colors.accent[1]}})),
  getPalette:()=>palette,applyPalette,restore});
}
