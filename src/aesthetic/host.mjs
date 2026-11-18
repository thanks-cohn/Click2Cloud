import {standard,highPolish,minimal} from './packages.mjs';
export const AESTHETIC_API_VERSION='1.1';
export const AESTHETIC_PREFERENCE_KEY='aestheticPreferenceV1';
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
 const registry=new Map(),applied=new Set();let active=standard.id,lastError=null,sequence=0,writes=Promise.resolve();
 function register(manifest){const result=validateAesthetic(manifest);if(!result.valid)return result;if(registry.has(manifest.id))return {valid:false,errors:['PACKAGE_ALREADY_REGISTERED']};registry.set(manifest.id,structuredClone(manifest));return result;}
 register(highPolish);register(standard);register(minimal);
 function paint(id){const m=registry.get(id);for(const name of applied)root?.style.removeProperty(name);applied.clear();for(const [name,t] of Object.entries(id==='standard'?{}:{...registry.get('high-polish').tokens,...m.tokens})){if(t.$type==='color')for(const mode of ['light','dark']){const key=variable(name)+'-'+mode;root?.style.setProperty(key,t.$value[mode]);applied.add(key);}else{const key=variable(name);root?.style.setProperty(key,String(t.$value));applied.add(key);}}active=id;
  if(root){
   root.dataset.aesthetic=id;
   const hidden=Object.entries(m.visibility??{}).filter(([,value])=>value==='hide').map(([role])=>role);
   if(hidden.length)root.dataset.aestheticHide=hidden.join(' ');
   else delete root.dataset.aestheticHide;
  }}
 async function apply({id='standard',persist=true}={}){sequence++;lastError=registry.has(id)?null:'PACKAGE_UNAVAILABLE';paint(lastError?'standard':id);const result=getActive();if(persist){const selected=active;writes=writes.catch(()=>{}).then(()=>{if(!storage?.set)throw Error('PREFERENCE_WRITE_FAILED');return storage.set({[AESTHETIC_PREFERENCE_KEY]:{schemaVersion:1,id:selected}});});try{await writes;}catch{lastError='PREFERENCE_WRITE_FAILED';}}return {...result,error:lastError};}
 function getActive(){return {apiVersion:AESTHETIC_API_VERSION,id:active,version:registry.get(active).version,error:lastError};}
 async function restore(){const ticket=sequence;try{const saved=(await storage?.get(AESTHETIC_PREFERENCE_KEY))?.[AESTHETIC_PREFERENCE_KEY];if(ticket!==sequence)return getActive();if(saved===undefined)return apply({id:'high-polish',persist:false});if(!plain(saved)||!keys(saved,['schemaVersion','id'])||saved.schemaVersion!==1){paint('standard');lastError='PREFERENCE_INVALID';return getActive();}return apply({id:saved.id,persist:false});}catch{if(ticket===sequence){paint('standard');lastError='PREFERENCE_READ_FAILED';}return getActive();}}
 return Object.freeze({register,validate:validateAesthetic,apply,getActive,list:()=>[...registry.values()].map(({id,name})=>({id,name})),resetToStandard:()=>apply({id:'standard'}),restore});
}
