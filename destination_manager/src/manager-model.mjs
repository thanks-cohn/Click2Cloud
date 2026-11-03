/**
 * Neutral V3+1 Destination Manager data model. No imports of private
 * Simple, Narrow, Depth, or Time Machine engines; no Chrome or provider calls.
 */
export const MODES=Object.freeze(['simple','narrow','depth']);
export const DESTINATION_MODES=Object.freeze(['simple','narrow']);
export const VIEWS=Object.freeze(['browse','existing']);
const cleanString=(s)=>typeof s==='string'&&s.trim().length>0;
const assertMode=m=>{if(!MODES.includes(m))throw new TypeError('Unknown editor mode');};
const assertDestMode=m=>{if(!DESTINATION_MODES.includes(m))throw new TypeError('Only Simple/Narrow own named destinations');};
function scopeIdentity(scope){
  const keys=['providerKind','connectionId','accountId','containerId'];
  if(!scope||keys.some(k=>!cleanString(scope[k])))throw new TypeError('Incomplete provider identity');
  return JSON.stringify(keys.map(k=>scope[k]));
}
function checkPrefix(prefix){
  if(typeof prefix!=='string'||prefix.startsWith('/')||prefix.endsWith('/')||prefix.includes('//')||
      prefix.split('/').some(s=>s==='.'||s==='..'))throw new TypeError('Invalid folder prefix');
  return prefix;
}
export function locationKey(target){
  if(!target||!target.scope)throw new TypeError('Missing exact target');
  return JSON.stringify([scopeIdentity(target.scope),checkPrefix(target.prefix)]);
}
export function nativeDestinationId(mode,id){
  assertDestMode(mode);
  if(!cleanString(id))throw new TypeError('Missing immutable destination ID');
  return 'v3p1:destination:'+mode+':'+encodeURIComponent(id);
}
export function newDestinationConfig(mode){
  assertDestMode(mode);
  return {mode,revision:0,destinations:[]};
}
function validateConfig(config){
  if(!config)throw new TypeError('Missing mode config');
  assertDestMode(config.mode);
  if(!Number.isSafeInteger(config.revision)||config.revision<0||!Array.isArray(config.destinations))
    throw new TypeError('Invalid mode config');
}
function checkRevision(config,expectedRevision){
  if(expectedRevision!==undefined&&config.revision!==expectedRevision)throw new Error('Stale mode revision');
}
export function addDestination(config,{id,menuTitle,target},expectedRevision){
  validateConfig(config);checkRevision(config,expectedRevision);
  if(!cleanString(id)||config.destinations.some(e=>e.id===id))throw new Error('Duplicate or missing destination ID');
  if(!cleanString(menuTitle)||menuTitle.length>60)throw new TypeError('Invalid menu title');
  locationKey(target);
  // No de-duplication by path, menu title or mode. Those are NOT IDs.
  const entry=Object.freeze({id,mode:config.mode,menuTitle, target:structuredClone(target)});
  return {...config,revision:config.revision+1,
    destinations:[...config.destinations,entry]};
}
export function renameDestination(config,id,newTitle,expectedRevision){
  validateConfig(config);checkRevision(config,expectedRevision);
  if(!cleanString(newTitle)||newTitle.length>60)throw new TypeError('Invalid menu title');
  if(!config.destinations.some(e=>e.id===id))throw new Error('Unknown destination ID');
  return {...config,revision:config.revision+1,
    destinations:config.destinations.map(e=>e.id===id?{...e,menuTitle:newTitle}:e)};
}
export function removeDestination(config,id,expectedRevision){
  validateConfig(config);checkRevision(config,expectedRevision);
  if(!config.destinations.some(e=>e.id===id))throw new Error('Unknown destination ID');
  return {...config,revision:config.revision+1,
    destinations:config.destinations.filter(e=>e.id!==id)};
}
/** An aggregate READ-ONLY UI view; mutators are always owner-specific. */
export function existingDestinationRows(configs,filter='all'){
  if(!['all','simple','narrow'].includes(filter))throw new TypeError('Invalid filter');
  const rows=[];
  for(const mode of DESTINATION_MODES){
    const cfg=configs?.[mode];
    if(!cfg)continue;
    validateConfig(cfg);
    if(cfg.mode!==mode)throw new Error('Cross-mode config leak');
    if(filter!=='all'&&filter!==mode)continue;
    for(const entry of cfg.destinations){
      rows.push({id:entry.id,mode,menuTitle:entry.menuTitle,
        target:structuredClone(entry.target),
        locationKey:locationKey(entry.target),
        nativeId:nativeDestinationId(mode,entry.id)});
    }
  }
  return rows;
}
/** Count aliases for one exact cloud directory, not a boolean checkbox. */
export function locationEntryCount(configs,target){
  const location=locationKey(target);
  return existingDestinationRows(configs).filter(e=>e.locationKey===location).length;
}
/** The directory manager shows a hierarchy ONLY for Simple/Narrow. */
export function managerPanel(mode,{browseNodes=[],expanded=new Set(),bucketOptions=[],depth=1,view='browse',configs={}}={}){
  assertMode(mode);
  if(mode==='depth'){
    if(!Number.isInteger(depth)||depth<1||depth>10)throw new RangeError('Depth must be 1–10');
    return {mode,showTree:false,showExisting:false,showDepth:true,
      rows:[],existing:[],buckets:[...bucketOptions],depth};
  }
  if(!VIEWS.includes(view))throw new TypeError('Unknown manager view');
  const rows=[];
  function walk(nodes,indent){
    for(const node of nodes){
      if(!cleanString(node?.id)||!cleanString(node?.name))throw new TypeError('Invalid folder node');
      rows.push({id:node.id,name:node.name,level:indent,
        target:structuredClone(node.target),count:node.target?locationEntryCount(configs,node.target):0,
        hasChildren:!!(node.children?.length||node.hasChildren)});
      if(expanded.has(node.id))walk(node.children||[],indent+1);
    }
  }
  if(view==='browse')walk(browseNodes,0);
  return {mode,showTree:view==='browse',showExisting:view==='existing',showDepth:false,
    rows,existing:view==='existing'?existingDestinationRows(configs):[],buckets:[],depth:null};
}
