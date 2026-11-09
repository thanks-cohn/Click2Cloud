export const permissionPolicy=Object.freeze({maxGrantTtlMs:3600000,fullConfigurationMethods:Object.freeze(['enterExplorer','initializeCloudflare','inspectCloudflare','inspectRemoteHistory','getConfiguration','inspectMenuTree','previewContextMenu','previewNativeMenu','inspectNativeACK','listDestinations','getEngineHealth','requestRestorePreview','restoreRightClickMenu','chooseBackupLocation']),interactiveAuthMethods:Object.freeze(['loginBegin','loginCancel','disconnect']),confirmation:'HOST_OWNED_ONE_OPERATION_APPROVAL',accountScope:'ALL_AFFECTED_PRIOR_AND_NEW_ACCOUNTS'});
/** Host-owned expiring grants and one-operation approvals. Never client-asserted. */
export function createPermissions({clock=Date.now}={}) {
  const grants=new Map(),approvals=new Map();
  function accountsIn(value){
    const accounts=[],pending=[[value,false]],seen=new WeakSet(),active=new WeakSet();let nodes=0;
    while(pending.length){const [v,exit]=pending.pop();if(!v||typeof v!=='object')continue;if(exit){active.delete(v);continue;}if(active.has(v)||++nodes>1000000)return null;if(seen.has(v))continue;seen.add(v);active.add(v);pending.push([v,true]);
      if(typeof v.accountId==='string')accounts.push(v.accountId);if(Array.isArray(v.accounts))for(const a of v.accounts)if(typeof a?.id==='string')accounts.push(a.id);
      for(const child of Object.values(v))if(child&&typeof child==='object')pending.push([child,false]);
    }return accounts;
  }
  const fullConfig=new Set(permissionPolicy.fullConfigurationMethods);
  function authorize(r) {
    const g=grants.get(r.actor);
    if(!g||g.expiresAt<=clock()||!g.methods.includes(r.method))return false;
    if(fullConfig.has(r.method)&&!g.allConfiguration)return false;
    if(['loginBegin','loginCancel','disconnect'].includes(r.method)&&g.interactiveAuth!==true)return false;
    const accounts=accountsIn([r.params,r.bindings,r.result]);return accounts!==null&&accounts.every(a=>g.accounts.includes(a));
  }
  return Object.freeze({authorize,
    issue(g){
      if(!g||typeof g.actor!=='string'||!g.actor||g.actor==='gui'||!Array.isArray(g.methods)||!g.methods.length||g.methods.some(m=>typeof m!=='string')||!Array.isArray(g.accounts)||!g.accounts.length||g.accounts.some(a=>typeof a!=='string'||!a)||!Number.isFinite(g.expiresAt)||g.expiresAt<=clock()||g.expiresAt>clock()+3600000)throw Error('INVALID_GRANT');
      if(g.interactiveAuth!==undefined&&typeof g.interactiveAuth!=='boolean')throw Error('INVALID_GRANT');
      grants.set(g.actor,structuredClone(g));
    },revoke(actor){grants.delete(actor);approvals.delete(actor);},
    approve(actor,method,params){if(!authorize({actor,method,params}))throw Error('PERMISSION_DENIED');const set=approvals.get(actor)??new Set();set.add(JSON.stringify([method,params]));approvals.set(actor,set);},
    confirm(r){return authorize(r)&&approvals.get(r.actor)?.delete(JSON.stringify([r.method,r.params]))===true;}
  });
}
