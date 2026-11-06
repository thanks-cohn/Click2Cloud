/** Local adapter for future CLI/MCP clients. Authority stays with trusted host. */
export function createAgentClient({gateway,handle,authenticatedActor}={}) {
  if(typeof gateway?.request!=='function'||typeof handle!=='string'||typeof authenticatedActor!=='string')throw TypeError('Host-issued local capability required');
  return Object.freeze({invoke:(method,params={})=>gateway.request(handle,{version:'3+1.1',method,params},authenticatedActor)});
}
