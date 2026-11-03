
/**
 * Pure Depth scoped immediate-child folder diff, not a real network scan.
 * Persistent implementation commits nodes/journal/frontier atomically.
 */
import {folderKey,parentPrefix} from './scope-identity.mjs';
const order=(a,b)=>a<b?-1:a>b?1:0;
export function diffFolderChildren({scope,parent='',known=[],observed=[],
  authorized=false,listingComplete=false,deletionProven=false}={}){
  if(!authorized)throw new Error('Unauthorized Depth scan');
  folderKey(scope,parent);
  for(const p of [...known,...observed]){
    folderKey(scope,p);
    if(parentPrefix(p)!==parent)throw new Error('Out-of-scope child');
  }
  const a=new Set(known),b=new Set(observed);
  const added=[...b].filter(x=>!a.has(x)).sort(order);
  const vanished=[...a].filter(x=>!b.has(x)).sort(order);
  const canRemove=listingComplete&&deletionProven;
  return {added,removed:canRemove?vanished:[],retainedUnknown:canRemove?[]:vanished,
    unchanged:[...b].filter(x=>a.has(x)).sort(order),
    complete:listingComplete,deletionVerified:canRemove};
}
