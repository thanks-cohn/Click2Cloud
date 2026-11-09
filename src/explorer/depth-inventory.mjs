import {normalizeTarget,scopeKey} from '../core/menu-identity.mjs';
// Explicit Depth selection: read-only, paginated discovery to the requested depth.
// Passive menu inspection never starts a crawl. Partial/failing discovery is not empty.
export async function discoverDepthScope(fileApi,selection,{signal}={}){
 const target=normalizeTarget({...selection.target,prefix:''}),folders=new Set(),queue=[''];let complete=true;
 for(let at=0;at<queue.length;at++){
  signal?.throwIfAborted();const prefix=queue[at],seen=new Set();let cursor='';
  do{
   const result=await fileApi.run('list',{source:{...target,prefix},...(cursor?{cursor}:{})},{signal});
   if(result.state!=='completed')throw Object.assign(Error('DEPTH_DISCOVERY_FAILED'),{code:result.code??'DEPTH_DISCOVERY_FAILED'});
   for(const entry of result.data.entries??[])if(entry.folder){
    const child=normalizeTarget({...target,prefix:entry.key}).prefix;
    if(!child.startsWith(prefix)||child===prefix)throw Object.assign(Error(),{code:'INVENTORY_INVALID'});
    if(folders.has(child))continue;folders.add(child);
    if(child.split('/').filter(Boolean).length<selection.maxDepth)queue.push(child);else complete=false;
   }
   cursor=result.data.cursor??'';if(cursor&&seen.has(cursor))throw Object.assign(Error(),{code:'PAGINATION_STALLED'});seen.add(cursor);
  }while(cursor);
 }
 return {target,folders:[...folders],complete,scopeKey:scopeKey(target)};
}
