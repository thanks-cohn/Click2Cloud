import {freeze,validateRevision,configRevision,normalizedDestinations,findCandidate,availabilityReasons,targetKey,targetLabel,scopeKey,ancestors,compare,stableId,MenuSpecError} from '../../core/menu-identity.mjs';
export function createConfig(input={}) {
  return freeze({schemaVersion:1,mode:'nested',revision:validateRevision(input.revision??0),destinations:normalizedDestinations(input.destinations,{multipleTargets:true})});
}
export const validateConfig=createConfig;
export function updateConfig(current,patch,{expectedRevision}={}) {
  return createConfig({...current,...patch,revision:configRevision(current,expectedRevision)});
}
export function migrateConfig(snapshot={}) {
  if(snapshot.schemaVersion!==undefined&&snapshot.schemaVersion!==1)throw new TypeError('Unsupported Nested schema version.');
  return createConfig(snapshot);
}
// Bulk presentation never erases the user's custom per-level flags.
export function levelHidden(destination,prefix){
  if(prefix===destination.target.prefix)return false;
  return destination.visibilityMode==='hide-all'||destination.visibilityMode!=='all'&&destination.levels?.[prefix]?.hidden===true;
}
export function project({config,inventory}) {
  const own=createConfig(config),selected=new Map(),tree=new Map(),omissions=[];
  for(const destination of own.destinations) {
    if(destination.hidden){omissions.push({target:destination.target,reason:'DESTINATION_HIDDEN',kind:'excluded'});continue;}
    const {target}=destination,key=targetKey(target),{scope,folder}=findCandidate(inventory,target);
    const reasons=availabilityReasons(scope,folder),reason=reasons[0];
    selected.set(key,{...destination,reason});
    let parent=null;
    for(const prefix of ['',...ancestors(target.prefix)]) {
      const t={...target,prefix},k=targetKey(t);
      if(levelHidden(destination,prefix))continue;
      // Include projected parent in identity: two paths may hide different shared
      // levels without moving an independent sibling or corrupting its ancestry.
      const label=destination.levels?.[prefix]?.label??(prefix===target.prefix?destination.label:undefined)??targetLabel(t);
      const placement=stableId('nested-placement',JSON.stringify([k,parent,label]));
      const prior=tree.get(placement);if(prior&&(targetKey(prior.target)!==k||prior.parentPlacement!==parent||prior.label!==label))throw new MenuSpecError('ID_COLLISION','Narrow placement identity collision.');
      if(!tree.has(placement))tree.set(placement,{placement,target:t,parentPlacement:parent,label,explicitLevel:destination.levels?.[prefix]?.label!==undefined});
      parent=placement;
    }
    const final=tree.get(parent);
    if(final){
      if(final.target.prefix===target.prefix)(final.destinations??=[]).push({...destination,reason});
      else tree.set(key+':hidden-save',{placement:key+':hidden-save',target,parentPlacement:parent,destination:{...destination,reason},hiddenSave:true});
    }
    for(const reason of reasons)omissions.push({target,reason,placement:key,kind:'ineligible'});
  }
  const branches=new Set([...tree.values()].map(x=>x.parentPlacement).filter(Boolean));
  const rows=[];
  for(const row of [...tree.values()].sort((a,b)=>(a.target.prefix.split('/').length-b.target.prefix.split('/').length)||compare(scopeKey(a.target),scopeKey(b.target))||compare(a.target.prefix,b.target.prefix))) {
    const destinations=row.destinations??[],hasChildren=branches.has(row.placement);
    if(hasChildren||!destinations.length)rows.push({...row,label:row.label,role:'branch',enabled:true,reason:'NATURAL_ANCESTOR'});
    for(const destination of destinations){
      const quickLabel=destination.label??destination.levels?.[row.target.prefix]?.label??targetLabel(row.target);
      rows.push({...row,placement:row.placement+':route:'+destination.id,parentPlacement:hasChildren?row.placement:row.parentPlacement,presentationId:destination.id,
        label:hasChildren?'Save here':row.label,quick:destination.quick===true,quickLabel,role:'save',enabled:!destination.reason,reason:destination.reason??(hasChildren?'ACTIONABLE_BRANCH':'NESTED_CONFIGURED')});
    }
  }
  const represented=new Set([...tree.values()].map(row=>targetKey(row.target)));
  for(const scope of inventory.scopes)for(const folder of scope.folders)
    if(!represented.has(targetKey(folder.target)))omissions.push({target:folder.target,reason:'NOT_CONFIGURED',kind:'excluded'});
  return {mode:'nested',revision:own.revision,rows,omissions};
}
