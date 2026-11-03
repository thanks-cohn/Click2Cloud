/**
 * Source-preserved REDOWN V3 mode extraction (2026-11-03).
 * Origin: thanks-cohn/REDOWN/extension/right-click-v3.js
 * Source Git blob: 08ee4f847d776e8488f71fc7a846ecf5835c7a4a
 * This is not a redesign of the mode's algorithms. The only new code is
 * the mode-level entry/resolve adapter below.
 */
  const contexts=['link','image','video','audio','page'];
  const prepared=(d,profiles)=>profiles.find(p=>p.type==='cloudflare-r2'&&p.id===d.profileId&&p.accountId===d.accountId&&p.bucketName===d.bucketName&&p.workerUrl&&p.token);

  function validate(config,profiles){
    if(config?.version!==1||!Number.isSafeInteger(config.revision)||config.revision<0||!Array.isArray(config.destinations)||config.destinations.length>200)throw Error('Invalid V3 destination store.');
    const ids=new Set();
    for(const d of config.destinations){
      if(!/^[a-zA-Z0-9_-]{1,80}$/.test(d.id)||ids.has(d.id))throw Error('Invalid or duplicate destination ID.');
      ids.add(d.id);
      if(typeof d.label!=='string'||!d.label.trim()||d.label.length>60||/[\x00-\x1f\x7f]/.test(d.label))throw Error('Enter a menu label of 1–60 characters.');
      if(typeof d.prefix!=='string'||new TextEncoder().encode(d.prefix).length>900||/[\\\x00-\x1f\x7f]/.test(d.prefix)||d.prefix&&d.prefix.split('/').some(s=>!s||s==='.'||s==='..'))throw Error('Use an exact folder path without empty or dot segments (maximum 900 UTF-8 bytes).');
      if(typeof d.enabled!=='boolean'||!prepared(d,profiles))throw Error('Activate this account and bucket in Explorer before saving.');
    }
    for(const d of config.destinations){
      const seen=new Set([d.id]);let current=d,depth=0;
      while(current.parentId!==null){
        const parent=config.destinations.find(p=>p.id===current.parentId);
        if(!parent||seen.has(parent.id)||++depth>7||parent.profileId!==current.profileId||!current.prefix.startsWith(parent.prefix?parent.prefix+'/':'' )||current.prefix===parent.prefix)throw Error('Invalid destination hierarchy.');
        seen.add(parent.id);current=parent;
      }
    }
    return config;
  }
  function eligible(d,config,profiles){
    const seen=new Set();
    while(d){if(seen.has(d.id)||!d.enabled||!prepared(d,profiles))return false;seen.add(d.id);if(d.parentId===null)return true;d=config.destinations.find(p=>p.id===d.parentId);}
    return false;
  }

  const compare=(a,b)=>a<b?-1:a>b?1:0;

const limits=Object.freeze({entries:300});

  // A Simple provider surface is a projection, never an edit to saved labels/paths.
  function simpleTargets(config,profiles){
    const ready=profiles.filter(p=>p.type==='cloudflare-r2'&&p.bucketName==='redown'&&typeof p.accountId==='string'&&p.accountId&&p.workerUrl&&p.token&&!config.activatedBuckets?.buckets?.some(d=>d.profileId===p.id&&d.enabled===false)).sort((a,b)=>compare(a.id,b.id));
    const chosen=config.defaultBucket;
    const accounts=new Set(ready.map(p=>p.accountId));
    const main=chosen?ready.find(p=>p.id===chosen.profileId&&p.accountId===chosen.accountId&&chosen.bucketName==='redown'):ready.length===1?ready[0]:null;
    const primary=main?{profileId:main.id,accountId:main.accountId,bucketName:'redown',prefix:''}:null;
    const extra=config.destinations.filter(d=>eligible(d,config,profiles)&&!(primary&&d.profileId===primary.profileId&&d.accountId===primary.accountId&&d.bucketName==='redown'&&d.prefix==='')).map(d=>({id:'v3:'+d.id,title:d.label.trim(),target:d}));
    const seen=new Set();
    for(const d of activated(config,profiles)){
      const bucket=JSON.stringify([d.accountId,d.bucketName]);
      if(seen.has(bucket)||primary&&d.accountId===primary.accountId&&d.bucketName==='redown')continue;
      seen.add(bucket);
      if(extra.some(e=>e.target.accountId===d.accountId&&e.target.bucketName===d.bucketName&&e.target.prefix===''))continue;
      extra.push({id:bucketId(d),title:d.bucketName,target:{...d,prefix:''}});
    }
    const originalLabels=extra.map(e=>e.title),used=new Set(primary?['Home']:[]);
    for(const item of extra){
      const base=item.title;let title=base,i=1;
      if(extra.some((e,i)=>e!==item&&originalLabels[i]===base&&e.target.accountId!==item.target.accountId))title=base+' · '+item.target.accountId;
      const seed=title;while(used.has(title))title=seed+' · '+(++i);used.add(title);item.title=title;
    }
    return {primary,extra};
  }
  function simpleProjection(config,profiles,root,budget=limits.entries){
    const {primary,extra}=simpleTargets(config,profiles);
    if(!extra.length)return {entries:[{id:primary?'v3:provider:cloudflare':'v3:provider:cloudflare:setup',parentId:root,title:'Cloudflare',contexts}],complete:true,warnings:primary?[]:['Choose and activate the default redown bucket.']};
    const parentId='v3:provider:cloudflare';
    const entries=[{id:parentId,parentId:root,title:'Cloudflare',contexts}];
    const reserved=primary?3:1;
    const overflow=extra.length>budget-reserved,shown=extra.slice(0,budget-reserved-(overflow?1:0));
    entries.push(...shown.map(({id,title})=>({id,title,parentId,contexts})));
    if(overflow)entries.push({id:parentId+':more',parentId,title:'More destinations…',contexts});
    if(primary)entries.push({id:parentId+':separator',parentId,type:'separator',contexts},
      {id:parentId+':default',parentId,title:'Home',contexts});
    return {entries,complete:!overflow,warnings:[...(!primary?['Choose and activate the default redown bucket.']:[]),...(overflow?['Chrome menu entry limit reached; use More destinations.']:[])]};
  }

  const bucketId=d=>'v3:bucket:'+encodeURIComponent(JSON.stringify([d.profileId,d.accountId,d.bucketName]));
  const activated=(config,profiles)=>(config.activatedBuckets?.buckets||[]).filter(d=>d.enabled&&prepared(d,profiles));


// Preserve the original Simple registration projection and route resolution,
// without importing Depth or Narrow, and without accepting their state.
export function projectSimple(config,profiles,root='redown',budget=limits.entries){
  if(Array.isArray(config.destinations))config={...config,destinations:config.destinations.filter(d=>prepared(d,profiles))};
  validate(config,profiles);
  return simpleProjection(config,profiles,root,budget);
}
export function resolveSimple(id,config,profiles,existingPlan=null){
  try {
    const plan=existingPlan||projectSimple(config,profiles);
    const item=plan.entries.find(n=>n.id===id);
    if(!item||plan.entries.some(n=>n.parentId===id)||item.type==='separator')return null;
    if(id==='v3:provider:cloudflare'||id==='v3:provider:cloudflare:default'){
      const target=simpleTargets(config,profiles).primary,profile=target&&prepared(target,profiles);
      return profile?{profile,owner:profile,prefix:''}:null;
    }
    const bucket=activated(config,profiles).find(d=>bucketId(d)===id);
    if(bucket){const profile=prepared(bucket,profiles);return profile?{profile,owner:profile,prefix:''}:null;}
    const d=config.destinations.find(d=>'v3:'+d.id===id),profile=d&&prepared(d,profiles);
    return profile?{profile,owner:profile,prefix:d.prefix}:null;
  } catch{return null;}
}
export {simpleTargets,simpleProjection,validate as validateSimple,limits as simpleLimits};
