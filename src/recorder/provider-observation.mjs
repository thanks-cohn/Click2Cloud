import {acceptProof} from '../../right2cloud-module/src/verification.mjs';
import {remoteDestination} from '../cloudflare/wire.mjs';
// Observation adapters translate existing authoritative outcomes; they never verify
// a provider, fetch, authorize, or retry. Adding a provider changes this registry only.
const adapters=new Map();
export function registerObservationAdapter(provider,adapter){if(typeof provider!=='string'||typeof adapter!=='function')throw TypeError('Typed provider and adapter required');adapters.set(provider,adapter);}
registerObservationAdapter('cloudflare',(out,context)=>{
 const verification=context?.verification,target=context?.target,operationId=out?.remoteOperationId??out?.operationId;
 const independent=!!(out?.state==='completed'&&out.completion==='verified'&&out.proofKind==='independent-head-version-size'&&target&&verification&&verification.providerOperationId===operationId&&acceptProof({operationId,destination:remoteDestination(target)},out.receipt,verification.proof)&&acceptProof({operationId,destination:remoteDestination(target)},verification.receipt,verification.proof));
 return {independent,bytes:Number.isSafeInteger(out?.receipt?.size)?out.receipt.size:Number.isSafeInteger(verification?.receipt?.size)?verification.receipt.size:null,evidenceClass:'authoritative-receipt',availability:independent?'observed':verification?'invalid_measurement':'not_observed'};
});
export function providerObservation(provider,result,context){try{return adapters.get(provider)?.(result,context)??{independent:false,availability:'unsupported'};}catch{return {independent:false,availability:'unavailable'};}}
