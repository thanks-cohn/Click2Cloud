import {freeze,validateRevision,configRevision,normalizeTarget,scopeKey,targetKey,targetLabel,availabilityReasons,ancestors,compare,MenuSpecError} from '../../core/menu-identity.mjs';
export function createConfig(input={}) {
  if(!Array.isArray(input.scopes??[]))throw new MenuSpecError('INVALID_CONFIG','Depth scopes must be an array.');
  const seen=new Set();
  const scopes=(input.scopes??[]).map(item=>{
    const target=normalizeTarget({...item.target,prefix:''}),key=scopeKey(target),maxDepth=item.maxDepth??10;
    if(seen.has(key))throw new MenuSpecError('DUPLICATE_SCOPE','Depth scope occurs twice.');
    if(!Number.isSafeInteger(maxDepth)||maxDepth<1)throw new MenuSpecError('INVALID_DEPTH','Depth must be a positive safe integer.');
    seen.add(key);return {target,maxDepth};
  });
  return freeze({schemaVersion:1,mode:'depth',revision:validateRevision(input.revision??0),scopes});
}
export const validateConfig=createConfig;
export function updateConfig(current,patch,{expectedRevision}={}) {
  return createConfig({...current,...patch,revision:configRevision(current,expectedRevision)});
}
export function migrateConfig(snapshot={}) {
  if(snapshot.schemaVersion!==undefined&&snapshot.schemaVersion!==1)throw new TypeError('Unsupported Depth schema version.');
  return createConfig(snapshot);
}
export function project({config,inventory}) {
  const own=createConfig(config),rows=[],omissions=[],selected=new Map(own.scopes.map(s=>[scopeKey(s.target),s]));
  const scopes=[...inventory.scopes];
  for(const wanted of own.scopes)if(!scopes.some(s=>scopeKey(s.target)===scopeKey(wanted.target)))
    scopes.push({target:wanted.target,folders:[{target:wanted.target}],authorized:false,complete:false});
  for(const scope of scopes.sort((a,b)=>compare(scopeKey(a.target),scopeKey(b.target)))) {
    const selection=selected.get(scopeKey(scope.target));
    const included=[];
    for(const folder of scope.folders) {
      const reason=!selection?'UNSELECTED_SCOPE':folder.target.prefix.split('/').filter(Boolean).length>selection.maxDepth?'DEPTH_LIMIT':null;
      if(reason){omissions.push({target:folder.target,reason,kind:'excluded'});continue;}
      included.push(folder);
    }
    const branches=new Set(included.filter(f=>f.target.prefix).map(f=>targetKey({...f.target,prefix:ancestors(f.target.prefix).at(-2)??''})));
    for(const folder of included.sort((a,b)=>(a.target.prefix.split('/').length-b.target.prefix.split('/').length)||compare(a.target.prefix,b.target.prefix))) {
      const target=folder.target,key=targetKey(target),reasons=availabilityReasons(scope,folder),reason=reasons[0],branch=branches.has(key);
      rows.push({placement:key,parentPlacement:target.prefix?targetKey({...target,prefix:ancestors(target.prefix).at(-2)??''}):null,label:targetLabel(target),target,role:branch?'branch':'save',enabled:branch||!reason,reason:reason??'DEPTH_DISCOVERED'});
      if(branch)rows.push({placement:key+':save-here',parentPlacement:key,label:'Save here',target,role:'save',enabled:!reason,reason:reason??'ACTIONABLE_BRANCH'});
      for(const reason of reasons)omissions.push({target,reason,placement:key,kind:'ineligible'});
    }
    if(selection&&scope.complete!==true)omissions.push({target:scope.target,reason:'INVENTORY_INCOMPLETE',kind:'unknown-descendants'});
  }
  return {mode:'depth',revision:own.revision,rows,omissions};
}
