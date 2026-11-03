/**
 * Mode-neutral native menu registry boundary.
 * It cannot see / mutate modes' private settings, folder indexes, or auth.
 * A full operational Portal renderer and Chrome registrar consume these rows.
 */
const CONTEXTS=Object.freeze(['link','image','video','audio','page']);
export class MenuRegistryError extends Error {
  constructor(msg){super(msg);this.name='MenuRegistryError';}
}
function validateRows(rows){
  const byId=new Map();
  for(const row of rows){
    if(typeof row?.id!=='string'||!row.id||byId.has(row.id))throw new MenuRegistryError('Duplicate or invalid menu ID: '+row?.id);
    if(row.parentId!==undefined&&row.parentId!==null&&!byId.has(row.parentId))throw new MenuRegistryError('Missing or unordered parent for '+row.id);
    if(!row.title&&row.type!=='separator')throw new MenuRegistryError('Missing title for '+row.id);
    byId.set(row.id,row);
  }
  return byId;
}
/** Projects exactly ONE active mode; never merges Simple and Depth menus. */
export function composeRegistry({mode,projection,root='redown',providerLeaves=[]}){
  if(!['simple','depth'].includes(mode))throw new MenuRegistryError('Narrow is reserved for the independent rewrite');
  if(!projection||!Array.isArray(projection.entries))throw new MenuRegistryError('Missing mode projection');
  if(!Array.isArray(providerLeaves))throw new MenuRegistryError('Provider leaves must be an array');
  const rows=[{id:root,title:'REDOWN',contexts:CONTEXTS},
    ...projection.entries.map(e=>({...e})),
    ...providerLeaves.map(e=>{
      if(typeof e.id!=='string'||!e.id||e.parentId&&e.parentId!==root||e.type==='separator')throw new MenuRegistryError('Invalid flat provider leaf');
      return {...e,parentId:root,contexts:e.contexts||CONTEXTS};
    })];
  const lookup=validateRows(rows);
  // A leaf provider must remain a direct, actionable row under REDOWN.
  for(const e of providerLeaves)if(rows.some(row=>row.parentId===e.id))throw new MenuRegistryError('Provider leaf cannot acquire children');
  return Object.freeze({mode,entries:rows,complete:!!projection.complete,
    warnings:[...(projection.warnings||[])],has(id){return lookup.has(id);}});
}
export function resolveRegistered({id,registry,mode,modeResolver,providerResolvers={}}){
  if(!registry||registry.mode!==mode||!registry.has(id))return null;
  const node=registry.entries.find(e=>e.id===id);
  if(!node||node.type==='separator'||registry.entries.some(e=>e.parentId===id))return null;
  if(typeof providerResolvers[id]==='function')return providerResolvers[id]();
  return typeof modeResolver==='function'?modeResolver(id):null;
}
