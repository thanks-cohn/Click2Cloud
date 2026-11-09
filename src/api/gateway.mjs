/** Grants are trusted-host objects, never client-asserted scopes or debug tokens. */
export function createAgentGateway({api,clock=Date.now}={}) {
  const grants=new Map();
  function grant({actor,methods,expiresAt,approve}) {
    if(typeof actor!=='string'||!actor||actor==='gui'||!Array.isArray(methods)||methods.some(m=>!api.tools.some(t=>t.name===m))||!Number.isFinite(expiresAt)||expiresAt<=clock()||expiresAt>clock()+3600000)throw TypeError('Invalid grant');
    const handle=crypto.randomUUID();grants.set(handle,{actor,methods:new Set(methods),expiresAt,approve});return handle;
  }
  return Object.freeze({grant,revoke:handle=>grants.delete(handle),async request(handle,request,authenticatedActor) {
    const g=grants.get(handle);
    if(!g||g.actor!==authenticatedActor||g.expiresAt<=clock()||!g.methods.has(request?.method))throw Object.assign(Error('PERMISSION_DENIED'),{code:'PERMISSION_DENIED'});
    // API independently applies namespace/account policy; gateway cannot elevate it.
    return api.invoke(request,authenticatedActor);
  }});
}
