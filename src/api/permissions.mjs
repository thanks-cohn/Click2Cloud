/** Trusted-host permission owner. Do not expose issue/approve through an untrusted transport. */
export function createPermissions({clock=Date.now}={}) {
 const actors=new Map(),approvals=new Map();
 function issue({actor,methods,accounts,expiresAt}) {
  if(typeof actor!=='string'||!actor||!Array.isArray(methods)||!Array.isArray(accounts)||!accounts.length||!Number.isFinite(expiresAt)||expiresAt<=clock())throw TypeError('Invalid scoped permission');
  actors.set(actor,{methods:new Set(methods),accounts:new Set(accounts),expiresAt});
 }
 function targets(value,result=[]) {
  if(!value||typeof value!=='object')return result;
  if(typeof value.accountId==='string')result.push(value.accountId);
  for(const child of Object.values(value))if(child&&typeof child==='object')targets(child,result);return result;
 }
 const scoped=(grant,value)=>targets(value).every(account=>grant.accounts.has(account));
 return Object.freeze({issue,revoke(actor){actors.delete(actor);approvals.delete(actor);},
  authorize({actor,method,params,result,phase}){const g=actors.get(actor);if(!g||g.expiresAt<=clock()||!g.methods.has(method)||!scoped(g,params))return false;
    if(phase==='response'){if(method==='listAccounts')return false;return scoped(g,result);}return true;},
  approve({actor,previewId,method,params}){const g=actors.get(actor);if(!g||g.expiresAt<=clock())throw Error('PERMISSION_DENIED');const ids=approvals.get(actor)??new Set();if(typeof previewId!=='string'&&(!method||!params))throw Error('APPROVAL_BINDING_REQUIRED');ids.add(previewId??JSON.stringify([method,params]));approvals.set(actor,ids);},
  confirm({actor,method,previewId,configuration,params}){const g=actors.get(actor);if(!g||g.expiresAt<=clock()||!g.methods.has(method)||!scoped(g,configuration??params))return false;return approvals.get(actor)?.delete(previewId??JSON.stringify([method,params]))===true;}
 });
}
