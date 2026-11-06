/** Host-owned expiring grants and one-operation approvals. Never client-asserted. */
export function createPermissions({clock=Date.now}={}) {
  const grants=new Map(),approvals=new Map();
  function accountsIn(value,result=[]) {
    if(!value||typeof value!=='object')return result;
    if(typeof value.accountId==='string')result.push(value.accountId);
    if(Array.isArray(value.accounts))for(const a of value.accounts)if(typeof a?.id==='string')result.push(a.id);
    for(const child of Object.values(value))if(child&&typeof child==='object')accountsIn(child,result);
    return result;
  }
  const fullConfig=new Set(['getConfiguration','inspectMenuTree','previewContextMenu','previewNativeMenu','inspectNativeACK','listDestinations','getEngineHealth','requestRestorePreview']);
  function authorize(r) {
    const g=grants.get(r.actor);
    if(!g||g.expiresAt<=clock()||!g.methods.includes(r.method))return false;
    if(fullConfig.has(r.method)&&!g.allConfiguration)return false;
    if(['loginBegin','loginCancel','disconnect'].includes(r.method))return false;
    return accountsIn([r.params,r.bindings,r.result]).every(a=>g.accounts.includes(a));
  }
  return Object.freeze({authorize,
    issue(g){
      if(!g||typeof g.actor!=='string'||!g.actor||g.actor==='gui'||!Array.isArray(g.methods)||!g.methods.length||g.methods.some(m=>typeof m!=='string')||!Array.isArray(g.accounts)||!g.accounts.length||g.accounts.some(a=>typeof a!=='string'||!a)||!Number.isFinite(g.expiresAt)||g.expiresAt<=clock()||g.expiresAt>clock()+3600000)throw Error('INVALID_GRANT');
      grants.set(g.actor,structuredClone(g));
    },revoke(actor){grants.delete(actor);approvals.delete(actor);},
    approve(actor,method,params){if(!authorize({actor,method,params}))throw Error('PERMISSION_DENIED');const set=approvals.get(actor)??new Set();set.add(JSON.stringify([method,params]));approvals.set(actor,set);},
    confirm(r){return authorize(r)&&approvals.get(r.actor)?.delete(JSON.stringify([r.method,r.params]))===true;}
  });
}
