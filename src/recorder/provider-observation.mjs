// Observation adapters translate existing authoritative outcomes; they never verify
// a provider, fetch, authorize, or retry. Adding a provider changes this registry only.
const adapters=new Map();
export function registerObservationAdapter(provider,adapter){if(typeof provider!=='string'||typeof adapter!=='function')throw TypeError('Typed provider and adapter required');adapters.set(provider,adapter);}
registerObservationAdapter('cloudflare',out=>({independent:out?.completion==='verified'&&out?.proofKind==='independent-head-version-size',bytes:out?.receipt?.size,evidenceClass:'authoritative-receipt'}));
export function providerObservation(provider,result){try{return adapters.get(provider)?.(result)??{independent:false,availability:'unsupported'};}catch{return {independent:false,availability:'unavailable'};}}
