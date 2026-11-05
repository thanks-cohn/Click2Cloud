import {freeze,validateRevision,configRevision,normalizedDestinations,findCandidate,availabilityReasons,targetKey,targetLabel,scopeKey,ancestors,compare} from '../../core/menu-identity.mjs';
export function createConfig(input={}) {
  return freeze({schemaVersion:1,mode:'nested',revision:validateRevision(input.revision??0),destinations:normalizedDestinations(input.destinations)});
}
export const validateConfig=createConfig;
export function updateConfig(current,patch,{expectedRevision}={}) {
  return createConfig({...current,...patch,revision:configRevision(current,expectedRevision)});
}
export function migrateConfig(snapshot={}) {
  if(snapshot.schemaVersion!==undefined&&snapshot.schemaVersion!==1)throw new TypeError('Unsupported Nested schema version.');
  return createConfig(snapshot);
}
export function project({config,inventory}) {
  const own=createConfig(config),selected=new Map(),tree=new Map(),aliases=new Map(),omissions=[];
  for(const destination of own.destinations) {
    const {target}=destination,key=targetKey(target),{scope,folder}=findCandidate(inventory,target);
    const reasons=availabilityReasons(scope,folder),reason=reasons[0];
    selected.set(key,{...destination,reason});
    for(const prefix of ['',...ancestors(target.prefix)]) {
      const t={...target,prefix},k=targetKey(t);
      const level=prefix.split('/').filter(Boolean).length,alias=destination.aliases?.[level];
      if(alias){if(aliases.has(k)&&aliases.get(k)!==alias)throw new TypeError('Conflicting ancestor aliases');aliases.set(k,alias);}
      tree.set(k,{placement:k,target:t,parentPlacement:prefix?targetKey({...t,prefix:ancestors(prefix).at(-2)??''}):null});
    }
    for(const reason of reasons)omissions.push({target,reason,placement:key,kind:'ineligible'});
  }
  const branches=new Set([...tree.values()].map(x=>x.parentPlacement).filter(Boolean));
  const rows=[];
  for(const row of [...tree.values()].sort((a,b)=>(a.target.prefix.split('/').length-b.target.prefix.split('/').length)||compare(scopeKey(a.target),scopeKey(b.target))||compare(a.target.prefix,b.target.prefix))) {
    const destination=selected.get(row.placement),hasChildren=branches.has(row.placement);
    const label=destination?.label??aliases.get(row.placement)??targetLabel(row.target);
    rows.push({...row,label,role:destination&&!hasChildren?'save':'branch',enabled:hasChildren||!destination?.reason,reason:destination?.reason??(destination?'NESTED_CONFIGURED':'NATURAL_ANCESTOR')});
    if(destination&&hasChildren)rows.push({placement:row.placement+':save-here',parentPlacement:row.placement,label:'Save here',target:row.target,role:'save',enabled:!destination.reason,reason:destination.reason??'ACTIONABLE_BRANCH'});
  }
  for(const scope of inventory.scopes)for(const folder of scope.folders)
    if(!tree.has(targetKey(folder.target)))omissions.push({target:folder.target,reason:'NOT_CONFIGURED',kind:'excluded'});
  return {mode:'nested',revision:own.revision,rows,omissions};
}
