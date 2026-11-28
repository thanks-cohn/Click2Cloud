import {normalizeTarget,targetKey,scopeKey} from '../core/menu-identity.mjs';
import {digest,remoteDestination,fail} from './wire.mjs';
import {hasWorkerCreateScope,hasWorkerWriteScope} from '../auth/cloudflare-oauth.mjs';
import {readinessProbeRejected,readWorkerStatus,reconcileReadinessProbe,withCloudflareSetupLock} from './onboarding.mjs';
const safeCode=e=>/^[A-Z][A-Z0-9_]+$/.test(e?.code??'')?e.code:'LOCATION_CHECK_UNKNOWN';
// Canonical provider owner for manifest read-only binding and reviewed creation.
// Never derives account authority from a file. No redown/default/config changes.
export function createManifestLocations({oauth,provisioner,transport,current}){
 async function identity(){return oauth.authority();}
 async function bucket(t){
  const r=await oauth.request('/accounts/'+encodeURIComponent(t.accountId)+'/r2/buckets/'+encodeURIComponent(t.bucketName)),b=await r.json();
  if(r.ok&&b.success===true&&b.result?.name===t.bucketName)return {state:'EXISTS'};
  // Auth/transport/unknown 404s must not manufacture a create instruction.
  if(r.status===404&&b.success===false&&b.errors?.some(e=>[10006,10007,1001].includes(Number(e.code))&&/bucket.*(not found|does not exist)|specified bucket does not exist/i.test(e.message??'')))return {state:'MISSING'};
  return {state:r.status===401?'NEEDS_LOGIN':r.status===403?'NO_PERMISSION':'UNKNOWN',code:r.status===403?'BUCKET_PERMISSION_DENIED':'BUCKET_LOOKUP_UNCONFIRMED'};
 }
 async function inspect(targets){
  let a;try{a=await identity();}catch(e){return targets.map(target=>({target,state:'NEEDS_LOGIN',code:safeCode(e),ready:false}));}
  const buckets=new Map(),results=new Array(targets.length);let at=0;
  await Promise.all(Array.from({length:Math.min(4,targets.length)},async()=>{while(at<targets.length){const i=at++,target=normalizeTarget(targets[i]);let result={target,ready:false};try{
   if(target.provider!=='cloudflare')result.state='NOT_SUPPORTED';
   else if(target.connectionId!=='cloudflare:'+target.accountId||!a.accounts?.some(x=>x.id===target.accountId))result.state='NEEDS_LOGIN';
   else if(!a.scopes?.includes('workers-r2.read')||!a.scopes?.includes('workers-r2.write'))result={...result,state:'NO_PERMISSION',code:'INSUFFICIENT_SCOPE'};
   else {const key=scopeKey(target);if(!buckets.has(key))buckets.set(key,bucket(target));const b=await buckets.get(key);
    if(b.state!=='EXISTS')result={...result,state:b.state==='MISSING'?'BUCKET_MISSING':b.state,code:b.code};
    else {const s=await transport.status(target);result={...result,state:s.state==='READY'?'EXISTING_READY':'NEEDS_WORKER',ready:s.state==='READY',code:s.code??(s.state==='PREPARED'?'WRITE_PROOF_REQUIRED':s.state),materialization:target.prefix?'NOT_CHECKED':'BUCKET_ROOT'};
     // One bounded page, no bucket crawl. Absence of objects is a valid prefix.
     if(target.prefix&&result.ready)try{const r=await oauth.request('/accounts/'+encodeURIComponent(target.accountId)+'/r2/buckets/'+encodeURIComponent(target.bucketName)+'/objects?per_page=1&prefix='+encodeURIComponent(target.prefix)),b=await r.json();if(r.ok&&b.success===true){const objects=b.result?.objects??(Array.isArray(b.result)?b.result:null);if(objects)result.materialization=objects.length?'OBSERVED':'VIRTUAL_NOT_MATERIALIZED';}}catch{}
    }
   }
  }catch(e){result={...result,state:'UNKNOWN',code:safeCode(e)};}results[i]=result;}}));
  // A switch during the read invalidates the batch rather than relinking it.
  try{if((await identity()).sessionId!==a.sessionId)return targets.map(target=>({target,state:'NEEDS_LOGIN',code:'AUTH_SESSION_CHANGED',ready:false}));}catch{return targets.map(target=>({target,state:'NEEDS_LOGIN',ready:false}));}
  return results;
 }
 async function plan(targets,results,prior=[]){
  let a;try{a=await identity();}catch{return [];}
  const groups=new Map();for(const target of targets){const k=scopeKey(target);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(target);}
  const actions=[];
  for(const [key,group] of groups){const observations=results.filter(r=>scopeKey(r.target)===key);if(observations.every(r=>r.ready)||observations.some(r=>!['BUCKET_MISSING','NEEDS_WORKER','EXISTING_READY'].includes(r.state)))continue;
   const target=group[0],lookup=await provisioner.lookup(target),missing=observations.some(r=>r.state==='BUCKET_MISSING');
   // No implicit upgrade, signing renewal, or existing scope expansion.
   if(observations.some(r=>r.state==='NEEDS_WORKER'&&!['WORKER_SETUP_REQUIRED','WRITE_PROOF_REQUIRED'].includes(r.code)))continue;
   const canWrite=a.scopes?.includes('workers-r2.write')&&a.scopes?.includes('workers-r2.read'),workerNeeded=!lookup||lookup.state!=='ready';
   if(!canWrite||workerNeeded&&(!hasWorkerWriteScope(a.scopes)||!lookup&&!hasWorkerCreateScope(a.scopes)))continue;
   const prefixScope=lookup?.prefixScope??'';
   const previous=prior.find(p=>scopeKey(p.target)===key);
   const workerName=lookup?.name??previous?.workerName??'click2cloud-r2-'+crypto.randomUUID().replace(/-/g,'').slice(0,20);
   actions.push({target:{...target,prefix:prefixScope?prefixScope+'/':''},bucket:missing?'create-if-absent':'reuse',worker:workerNeeded?'prepare':'reuse',workerName,prefixScope,probe:true,markerObjects:false,prefixes:group.map(t=>t.prefix),effects:'May create the named R2 bucket and private bucket-wide Worker/Durable Object; retain a small readiness probe object. Cloudflare storage/operations/Workers may incur charges. No folder markers or deletions. Provider grants remain required.'});
  }
  return actions;
 }
 function create(action,planId,{stillAuthorized=async()=>true}={}){
  const t=normalizeTarget(action.target);
  return withCloudflareSetupLock(current,scopeKey(t),()=>createLocked(action,planId,t,stillAuthorized));
 }
 async function createLocked(action,planId,t,stillAuthorized){
  const a=await identity();
  const check=async()=>{const now=await identity();if(now.sessionId!==a.sessionId||!now.accounts?.some(x=>x.id===t.accountId)||t.connectionId!=='cloudflare:'+t.accountId||!now.scopes?.includes('workers-r2.write')||!await stillAuthorized())fail('AUTHORIZATION_REVOKED');};
  await check();const id='manifest-resource:'+await digest([planId,scopeKey(t)]);let progress=await current.readSetupOperation(id)??{};
  const save=async extra=>{progress={...progress,...extra};await current.writeSetupOperation(id,progress);};
  try{
  const before=await bucket(t);await check();
  if(before.state==='MISSING'){
   if(action.bucket!=='create-if-absent')return {state:'blocked',code:'CREATION_PLAN_CHANGED',target:t};
   if(progress.bucketDispatched)return {state:'uncertain',code:'BUCKET_CREATE_REQUIRES_INSPECTION',target:t,progress};
   if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(t.bucketName))fail('INVALID_BUCKET_NAME');
   await save({bucketDispatched:true});
   try{const response=await oauth.request('/accounts/'+encodeURIComponent(t.accountId)+'/r2/buckets',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:t.bucketName})});const body=await response.json();if(!response.ok&&body.success===false&&response.status>=400&&response.status<500){await save({bucketDispatched:false,bucketRejected:true});return {state:'blocked',code:response.status===403?'BUCKET_CREATE_PERMISSION_DENIED':'BUCKET_CREATE_REJECTED',target:t,progress};}}catch{/* Reconcile independently; never blindly repeat POST. */}
   const verified=await bucket(t);if(verified.state!=='EXISTS')return {state:'uncertain',code:'BUCKET_CREATE_REQUIRES_INSPECTION',target:t,progress};
   await save({bucketExists:true});
  }else if(before.state!=='EXISTS')return {state:'blocked',code:before.code??'BUCKET_LOOKUP_UNCONFIRMED',target:t,progress};
  else await save({bucketExists:true});
  await check();let status=await readWorkerStatus(transport,t,check);
  const resumingProbe=progress.probeDispatched;
  const unresolvedProbe=resumingProbe&&progress.probeOutcome!=='verified';
  if(status.state!=='READY'||unresolvedProbe){
   if(action.worker==='prepare'&&!resumingProbe){
    if(!hasWorkerWriteScope(a.scopes))fail('INSUFFICIENT_SCOPE');
    // Existing canonical deployment owner retains generated signing material and
    // reconciles its pending identity/settings. Never deploy arbitrary file code.
    await provisioner.prepare(t,{approved:true,inspect:true,retryDenied:true,prefixScope:action.prefixScope,workerName:action.workerName});await save({workerPrepared:true});
   }
   await check();
   const operationId=progress.operationId??crypto.randomUUID();let initial;
   if(!resumingProbe){
    status=await readWorkerStatus(transport,t,check,{afterDeploy:true});
    if(!['READY','PREPARED'].includes(status.state))return {state:'blocked',code:status.code??'WORKER_NOT_READY',target:t,progress};
    if(status.state!=='READY'){
     await save({operationId,probeDispatched:true,probeOutcome:'uncertain'});
     initial=await transport.probe({target:t,operationId,authorize:async()=>{try{await check();return true;}catch{return false;}}});
     if(readinessProbeRejected(initial)){await save({probeDispatched:false,probeOutcome:'not-written'});return {state:'blocked',code:initial.code,target:t,progress};}
    }
   }
   if(status.state!=='READY'||unresolvedProbe){
    if(!await reconcileReadinessProbe(transport,t,operationId,check,{initial}))
     return {state:'uncertain',code:'SETUP_PROBE_REQUIRES_INSPECTION',target:t,progress};
    await check();await provisioner.markVerified(t,a.sessionId);await save({probeOutcome:'verified'});
    status=await readWorkerStatus(transport,t,check);
   }
  }
  await check();await save({ready:status.state==='READY'});return {state:status.state==='READY'?'completed':'blocked',code:status.state==='READY'?'LOCATION_READY':status.code??'WORKER_NOT_READY',target:t,progress};
  }catch(e){return {state:'blocked',code:safeCode(e),target:t,progress};}
 }
 return Object.freeze({inspect,plan,create});
}
