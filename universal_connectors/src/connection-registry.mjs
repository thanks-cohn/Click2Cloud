/**
 * Universal V3+1 — pure per-connection menu registry reference model.
 * No Chrome, network, credential or storage APIs. Provider contributions are
 * already compiled by the selected mode for THAT connection only.
 */
export const MENU_CONTEXTS=Object.freeze(['link','image','video','audio','page']);
export const MODES=Object.freeze(['simple','narrow','depth']);
const order=['cloudflare-r2','google-drive-native','onedrive-native','dropbox-native','mega-s4','mega-native'];
const rank=kind=>{const n=order.indexOf(kind);return n<0?order.length:n};
const required=(x,name)=>{if(typeof x!=='string'||!x.trim())throw new TypeError('Missing '+name);return x};
export function connectionIdentity({providerKind,connectionId,accountId,endpointId}={}){
  return JSON.stringify([required(providerKind,'providerKind'),required(connectionId,'connectionId'),
    required(accountId,'accountId'),required(endpointId,'endpointId')]);
}
export function inventoryNamespace(connection,bucketId){
  required(bucketId,'bucketId');
  return JSON.stringify([connectionIdentity(connection),bucketId]);
}
const esc=s=>encodeURIComponent(s);
export function nativeConnectionId(connection){
  return 'c2c:conn:'+esc(connection.connectionId);
}
export function nativeActionId(connection,mode,rowId){
  if(mode!==null&&!MODES.includes(mode))throw new TypeError('Unknown mode');
  return nativeConnectionId(connection)+':'+(mode||'native')+':'+esc(required(rowId,'rowId'));
}
/**
 * connection.kind is 's3' or 'native'. S3 has one activeMode (per connection);
 * native providers have null activeMode. Entries are *compiled*, not generated
 * by this registrar; a row is either a branch or an action with exact target.
 *
 * A contribution may be a flat leaf ('leaf') or an expandable provider
 * parent with children ('submenu'). Cloudflare not-ready setup is a leaf.
 */
export function composeConnectionRegistry(connections){
  if(!Array.isArray(connections))throw new TypeError('Connections must be an array');
  const root='c2c:redown:root',entries=[{id:root,parentId:null,title:'REDOWN',type:'branch'}];
  const routes=new Map(),seenConnections=new Set(),seenNodes=new Set([root]);
  const sorted=[...connections].sort((a,b)=>{
    const explicitA=Number.isFinite(a.menuOrder)?a.menuOrder:null,explicitB=Number.isFinite(b.menuOrder)?b.menuOrder:null;
    if(explicitA!==null&&explicitB!==null&&explicitA!==explicitB)return explicitA-explicitB;
    if(explicitA!==null&&explicitB===null)return -1;
    if(explicitB!==null&&explicitA===null)return 1;
    return rank(a.providerKind)-rank(b.providerKind)||a.connectionId.localeCompare(b.connectionId);
  });
  for(const connection of sorted){
    const cid=connectionIdentity(connection);
    if(seenConnections.has(connection.connectionId))throw new Error('Duplicate connection ID');
    seenConnections.add(connection.connectionId);
    if(connection.kind!=='s3'&&connection.kind!=='native')throw new TypeError('Invalid connector kind');
    const mode=connection.kind==='native'?null:connection.activeMode;
    if(connection.kind==='s3'&&!MODES.includes(mode))throw new TypeError('S3 connection requires a valid per-connection mode');
    if(connection.kind==='native'&&connection.activeMode!==null)throw new TypeError('Native connector cannot be an S3 folder mode');
    required(connection.menuLabel,'menuLabel');
    if(!['leaf','submenu'].includes(connection.presentation))throw new TypeError('Invalid provider presentation');
    const local=connection.entries||[];
    if(!Array.isArray(local))throw new TypeError('Entries must be an array');
    const parent=nativeConnectionId(connection);
    if(seenNodes.has(parent))throw new Error('Duplicate native connection ID');
    seenNodes.add(parent);
    if(connection.presentation==='leaf'){
      if(local.length!==1||local[0]?.parentId!=null||local[0]?.type!=='action')throw new Error('Leaf provider must have one actionable root row');
      const child=local[0];
      if(!['save','setup'].includes(child.action?.kind))throw new Error('Leaf needs a save or setup action');
      entries.push({id:parent,parentId:root,title:connection.menuLabel,type:'action',actionKind:child.action.kind});
      routes.set(parent,{connectionId:connection.connectionId,providerKind:connection.providerKind,
        mode,sourceRowId:child.id,action:structuredClone(child.action)});
      continue;
    }
    if(connection.kind==='native')throw new Error('Native provider must be flat');
    if(local.length===0)throw new Error('Submenu needs entries');
    entries.push({id:parent,parentId:root,title:connection.menuLabel,type:'branch'});
    const localNodes=new Set(),localIds=new Map();
    for(const row of local){
      required(row.id,'row.id');required(row.title,'row.title');
      if(localNodes.has(row.id))throw new Error('Duplicate row ID inside connection');
      localNodes.add(row.id);
      if(row.parentId!=null&&!localIds.has(row.parentId))throw new Error('Parent must precede child within connection');
      if(!['branch','action'].includes(row.type))throw new TypeError('Invalid row type');
      const id=nativeActionId(connection,mode,row.id);
      if(seenNodes.has(id))throw new Error('Native ID collision');
      seenNodes.add(id);
      const parentId=row.parentId===null||row.parentId===undefined?parent:localIds.get(row.parentId);
      if(row.type==='action'&&!['save','setup'].includes(row.action?.kind))throw new Error('Action row requires save or setup');
      if(row.type==='branch'&&row.action)throw new Error('Branch cannot be actionable');
      entries.push({id,parentId,title:row.title,type:row.type,actionKind:row.action?.kind||null});
      if(row.type==='action')routes.set(id,{connectionId:connection.connectionId,providerKind:connection.providerKind,
        mode,sourceRowId:row.id,action:structuredClone(row.action)});
      localIds.set(row.id,id);
    }
  }
  // Chrome submenu parents cannot also be save leaves; retain action state
  // only when the final plan has no children.
  for(const row of entries)if(row.type==='action'&&entries.some(other=>other.parentId===row.id))
    throw new Error('Action cannot have native children');
  return Object.freeze({entries,connections:[...seenConnections],resolve(id,activeConnections){
    if(!routes.has(id))return null;
    const route=routes.get(id),live=activeConnections?.find(c=>c.connectionId===route.connectionId);
    if(!live||live.ready!==true)return null;
    if(live.kind==='s3'&&live.activeMode!==route.mode)return null;
    if(live.providerKind!==route.providerKind)return null;
    // This is just a structural routing check. The dispatcher MUST
    // revalidate live credential generation, permissions and exact target.
    return structuredClone(route);
  }});
}
