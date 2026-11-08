import {validateModeConfig} from '../persistence/schema.mjs';
import {normalizeTarget,targetKey,stableId} from '../core/menu-identity.mjs';
export const fail=code=>{throw Object.assign(Error(code),{code});};
export const DEFAULT_PROVIDER_VISIBILITY=Object.freeze({'google-drive':true,dropbox:true,onedrive:true,cloudflare:true});
export function productState(raw={}) {
  if(raw?.configs)return migrateLegacyProduct(raw).product;
  const defaults={schemaVersion:1,revision:0,theme:'dark',show:{simple:true,nested:true,depth:false,flat:false},defaultTarget:null,
    autoOpenAttention:true,menuCustomized:raw?.menuCustomized??(Number(raw?.revision)>0),providerVisibility:{...DEFAULT_PROVIDER_VISIBILITY},cloudflare:{initialized:[],pending:[],selectedAccountId:null,removed:[]},favorites:[],placement:{},suggestionDismissed:null,view:'details',recovery:{cadence:'weekly',simple:true,nested:true,buckets:[],location:'automatic'},wholeCloud:{connections:[],enabled:false}};
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!Object.hasOwn(defaults,k)))fail('INVALID_STATE');
  const s={...defaults,...structuredClone(raw)};s.cloudflare={removed:[],...s.cloudflare};
  if(!s.providerVisibility||typeof s.providerVisibility!=='object'||Array.isArray(s.providerVisibility)||Object.keys(s.providerVisibility).some(k=>!Object.hasOwn(DEFAULT_PROVIDER_VISIBILITY,k))||Object.values(s.providerVisibility).some(v=>typeof v!=='boolean'))fail('INVALID_STATE');
  s.providerVisibility={...DEFAULT_PROVIDER_VISIBILITY,...s.providerVisibility};
  if(s.schemaVersion!==1||!Number.isSafeInteger(s.revision)||s.revision<0||!['dark','light'].includes(s.theme)||!['details','list','grid'].includes(s.view))fail('INVALID_STATE');
  if(!s.show||Object.keys(s.show).sort().join()!=='depth,flat,nested,simple'||Object.values(s.show).some(v=>typeof v!=='boolean'))fail('INVALID_STATE');
  if(typeof s.autoOpenAttention!=='boolean')fail('INVALID_STATE');
  if(typeof s.menuCustomized!=='boolean'||!s.cloudflare||Object.keys(s.cloudflare).sort().join()!=='initialized,pending,removed,selectedAccountId'||!['initialized','pending','removed'].every(k=>Array.isArray(s.cloudflare[k])&&s.cloudflare[k].every(a=>typeof a==='string'&&a))||s.cloudflare.selectedAccountId!==null&&typeof s.cloudflare.selectedAccountId!=='string')fail('INVALID_STATE');
  if(s.defaultTarget)s.defaultTarget=validateModeConfig('simple',{destinations:[{target:s.defaultTarget}]}).destinations[0].target;
  if(!Array.isArray(s.favorites)||s.favorites.some(x=>typeof x!=='string'||x.length>256))fail('INVALID_STATE');
  if(!s.placement||typeof s.placement!=='object'||Array.isArray(s.placement)||Object.entries(s.placement).some(([k,v])=>!k||!['direct','other'].includes(v)))fail('INVALID_STATE');
  if(s.suggestionDismissed!==null&&(typeof s.suggestionDismissed!=='string'||s.suggestionDismissed.length>8192))fail('INVALID_STATE');
  const r=s.recovery,w=s.wholeCloud;
  if(!r||Object.keys(r).sort().join()!=='buckets,cadence,location,nested,simple'||!['weekly','daily'].includes(r.cadence)||!['automatic','documents'].includes(r.location)||typeof r.simple!=='boolean'||typeof r.nested!=='boolean'||!Array.isArray(r.buckets))fail('INVALID_STATE');
  for(const b of r.buckets){if(!b||Object.keys(b).sort().join()!=='depth,enabled,target'||typeof b.enabled!=='boolean'||!Number.isSafeInteger(b.depth)||b.depth<1)fail('INVALID_STATE');validateModeConfig('simple',{destinations:[{target:b.target}]});}
  if(!w||Object.keys(w).sort().join()!=='connections,enabled'||typeof w.enabled!=='boolean'||!Array.isArray(w.connections)||w.connections.some(x=>typeof x!=='string'))fail('INVALID_STATE');
  return s;
}

export function validateProduct(value) {
  if(value?.configs&&!value.product)return migrateLegacyProduct(value);
  if(!value||Object.keys(value).sort().join()!=='configs,product'||Object.keys(value.configs??{}).sort().join()!=='depth,nested,simple')fail('INVALID_STATE');
  return {product:productState(value.product),configs:Object.fromEntries(Object.entries(value.configs).map(([mode,c])=>[mode,validateModeConfig(mode,c)]))};
}

/** Read-only migration from the former main-branch product envelope. No identity
 * guesses, authorization grants, or scans; first normal commit persists V3+1.1. */
export function migrateLegacyProduct(raw) {
  const keys=['schemaVersion','revision','configs','show','previousShow','flatDefault','recoveryPolicy'];
  if(!raw||raw.schemaVersion!==1||Object.keys(raw).some(k=>!keys.includes(k))||!raw.show||Object.keys(raw.show).some(k=>!['simple','narrow','depth','flat'].includes(k))||['simple','narrow','depth','flat'].some(k=>typeof raw.show[k]!=='boolean'))fail('INVALID_STATE');
  if(raw.previousShow&& (Object.keys(raw.previousShow).sort().join()!=='depth,narrow,simple'||Object.values(raw.previousShow).some(v=>typeof v!=='boolean')))fail('INVALID_STATE');
  const r=raw.recoveryPolicy??{cadence:'weekly',simple:true,narrow:true,buckets:[],backupLocation:'automatic'};
  if(Object.keys(r).some(k=>!['cadence','simple','narrow','buckets','backupLocation'].includes(k)))fail('INVALID_STATE');
  const product=productState({revision:raw.revision,show:{simple:raw.show.simple,nested:raw.show.narrow,depth:raw.show.depth,flat:raw.show.flat},defaultTarget:raw.flatDefault??null,
    recovery:{cadence:r.cadence,simple:r.simple,nested:r.narrow,location:r.backupLocation,buckets:validateModeConfig('depth',{scopes:r.buckets}).scopes.map(b=>({target:b.target,enabled:true,depth:b.maxDepth}))}});
  if(Object.keys(raw.configs??{}).sort().join()!=='depth,nested,simple')fail('INVALID_STATE');
  return {product,configs:Object.fromEntries(Object.entries(raw.configs).map(([m,c])=>[m,validateModeConfig(m,c)]))};
}

export const CONFIG_CHANGE_FIELDS={createDestination:['mode','target','label','levels'],updateDestination:['mode','id','label','levels','hidden','quick','order'],deleteDestinationConfig:['mode','id'],setShowInChrome:['show'],setDepthDisplayBuckets:['scopes'],makeDefault:['target'],clearDefault:[],setTheme:['theme'],setView:['view'],setFavorite:['connectionId','favorite'],setProviderPlacement:['provider','placement'],setProviderMenuVisibility:['provider','visible'],setAutoOpenAttention:['visible'],dismissOrganizationSuggestion:['signature'],updateRecoveryPolicy:['policy']};
export function applyConfigChanges(state,changes) {
  if(!changes.length)fail('INVALID_CHANGE');
  const next=structuredClone(state),p=next.product;
  const allowed=CONFIG_CHANGE_FIELDS;
  for(const c of changes) {
    if(!Object.hasOwn(allowed,c.type)||Object.keys(c).some(k=>k!=='type'&&!allowed[c.type].includes(k)))fail('INVALID_CHANGE');
    if(['createDestination','updateDestination','deleteDestinationConfig','setShowInChrome','setDepthDisplayBuckets','setProviderPlacement','setProviderMenuVisibility','makeDefault'].includes(c.type))p.menuCustomized=true;
    const m=c.mode==='narrow'?'nested':c.mode;
    if(c.type.endsWith('Destination')||c.type==='deleteDestinationConfig') {
      if(!['simple','nested'].includes(m))fail('INVALID_MODE');
      const all=next.configs[m].destinations;
      if(c.type==='createDestination') {
        const t=normalizeTarget(c.target),id=stableId('destination',m+targetKey(t));
        if(all.some(d=>targetKey(d.target)===targetKey(t)))fail('DESTINATION_EXISTS');
        all.push({id,target:t,order:all.length,...(c.label?{label:c.label}:{}),...(c.levels?{levels:c.levels}:{})});
      } else {
        const i=all.findIndex(d=>d.id===c.id);if(i<0)fail('DESTINATION_NOT_FOUND');
        if(c.type==='deleteDestinationConfig'){const removed=all.splice(i,1)[0];
          if(p.defaultTarget&&targetKey(p.defaultTarget)===targetKey(removed.target)&&!Object.values(next.configs).some(cfg=>(cfg.destinations??cfg.scopes??[]).some(d=>targetKey(d.target)===targetKey(removed.target)))){
            const survivors=[...new Map(Object.entries(next.configs).filter(([mode])=>p.show[mode]).flatMap(([,cfg])=>(cfg.destinations??cfg.scopes??[]).filter(d=>!d.hidden&&d.target.provider==='cloudflare').map(d=>[targetKey(d.target),d.target]))).values()];
            p.defaultTarget=survivors.length===1?survivors[0]:null;p.cloudflare.removed=[...new Set([...p.cloudflare.removed,removed.target.accountId])];
          }
if(removed.target.provider==='cloudflare'&&!next.product.defaultTarget&&!Object.values(next.configs).some(c=>(c.destinations??c.scopes??[]).some(d=>d.target.provider==='cloudflare'&&d.target.accountId===removed.target.accountId)))p.cloudflare.removed=[...new Set([...p.cloudflare.removed,removed.target.accountId])];}
        else {for(const k of ['label','levels','hidden','quick','order'])if(Object.hasOwn(c,k)){if(k==='label'&&!c[k])delete all[i].label;else all[i][k]=c[k];}}
      }
    } else if(c.type==='setShowInChrome')p.show=c.show;
    else if(c.type==='setDepthDisplayBuckets')next.configs.depth.scopes=c.scopes;
    else if(c.type==='makeDefault'){p.defaultTarget=normalizeTarget(c.target);p.cloudflare.removed=p.cloudflare.removed.filter(a=>a!==c.target.accountId);}
    else if(c.type==='clearDefault'){if(p.defaultTarget?.provider==='cloudflare')p.cloudflare.removed=[...new Set([...p.cloudflare.removed,p.defaultTarget.accountId])];p.defaultTarget=null;}
    else if(c.type==='setAutoOpenAttention')p.autoOpenAttention=c.visible;
    else if(c.type==='setTheme')p.theme=c.theme;
    else if(c.type==='setView')p.view=c.view;
    else if(c.type==='setFavorite'){p.favorites=p.favorites.filter(x=>x!==c.connectionId);if(c.favorite)p.favorites.push(c.connectionId);}
    else if(c.type==='setProviderPlacement')p.placement[c.provider]=c.placement;
    else if(c.type==='setProviderMenuVisibility'){if(!Object.hasOwn(p.providerVisibility,c.provider))fail('INVALID_PROVIDER');p.providerVisibility[c.provider]=c.visible;}
    else if(c.type==='dismissOrganizationSuggestion')p.suggestionDismissed=c.signature;
    else if(c.type==='updateRecoveryPolicy')p.recovery=c.policy;
  }
  next.product=productState(p);
  for(const m of ['simple','nested','depth'])next.configs[m]=validateModeConfig(m,next.configs[m]);
  return next;
}
