import {freeze,validateRevision,configRevision,normalizedDestinations,findCandidate,availabilityReasons,targetKey,targetLabel,compare} from '../../core/menu-identity.mjs';
export function createConfig(input={}) {
  return freeze({schemaVersion:1,mode:'simple',revision:validateRevision(input.revision??0),destinations:normalizedDestinations(input.destinations)});
}
export const validateConfig=createConfig;
export function updateConfig(current,patch,{expectedRevision}={}) {
  return createConfig({...current,...patch,revision:configRevision(current,expectedRevision)});
}
export function migrateConfig(snapshot={}) {
  if(snapshot.schemaVersion!==undefined&&snapshot.schemaVersion!==1)throw new TypeError('Unsupported Simple schema version.');
  return createConfig(snapshot);
}
export function project({config,inventory}) {
  const own=createConfig(config), rows=[],omissions=[],selected=new Set();
  for(const destination of own.destinations) {
    if(destination.hidden){omissions.push({target:destination.target,reason:'DESTINATION_HIDDEN',kind:'excluded'});continue;}
    const {target}=destination,key=targetKey(target),{scope,folder}=findCandidate(inventory,target);
    const reasons=availabilityReasons(scope,folder),reason=reasons[0];
    selected.add(key);
    rows.push({placement:key,parentPlacement:null,label:destination.label??targetLabel(target),target,role:'save',enabled:!reason,reason:reason??'SIMPLE_CONFIGURED',quick:destination.quick===true,order:destination.order??own.destinations.indexOf(destination)});
    for(const reason of reasons)omissions.push({target,reason,placement:key,kind:'ineligible'});
  }
  rows.sort((a,b)=>a.order-b.order||compare(a.placement,b.placement));
  for(const scope of inventory.scopes)for(const folder of scope.folders)
    if(!selected.has(targetKey(folder.target)))omissions.push({target:folder.target,reason:'NOT_CONFIGURED',kind:'excluded'});
  return {mode:'simple',revision:own.revision,rows,omissions};
}
