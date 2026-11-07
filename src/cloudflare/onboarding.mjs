import {safeWorkerDiagnostic} from './deployment.mjs';
import {applyConfigChanges} from '../api/config.mjs';
const setupLocks=new WeakMap();
const managerTargets=s=>Object.values(s.configs).flatMap(c=>(c.destinations??[]).map(d=>d.target)).filter(t=>t?.provider==='cloudflare');
const savedTargets=s=>[...new Map([s.product.defaultTarget,...Object.values(s.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(t=>t?.provider==='cloudflare').map(t=>[targetKey(t),t])).values()];
import {diagnoseCloudflare,hasWorkerWriteScope} from '../auth/cloudflare-oauth.mjs';
import {readBuckets} from './inventory.mjs';
import {fail} from './wire.mjs';
import {targetKey} from '../core/menu-identity.mjs';
export function createCloudflareOnboarding({current,oauth,provisioner,transport,openShelf=async()=>{},readRequestedTarget=async()=>null,record=async()=>{},history=async()=>[]}){
 const setupApproved=async accountId=>{const a=await current.readSetupOperation?.('approval:'+accountId);return a?.accountId===accountId&&a.approved===true;};
 async function commit(mutator,key=crypto.randomUUID()){
  const s=await current.read(),next=structuredClone(s);mutator(next.product);
  await current.commitProduct({...next,expectedRevision:s.product.revision,idempotencyKey:'cloudflare:'+key,fingerprint:JSON.stringify(next.product)});
 }
 async function account(accountId){const a=await oauth.authority();if(!a.accounts.some(x=>x.id===accountId))fail('WRONG_ACCOUNT');return a;}
 async function r2(accountId){
  try{const a=await account(accountId),missing=['workers-r2.read'].filter(scope=>!a.scopes?.includes(scope));
   if(Array.isArray(a.scopes)&&missing.length)return {state:'INSUFFICIENT_PERMISSION',code:'INSUFFICIENT_SCOPE',accountId,diagnostic:{code:'INSUFFICIENT_SCOPE',evidence:'verified-grants',missingScopes:missing}};
   const result=await readBuckets(oauth,accountId);if(result.buckets)return {state:'ACTIVE',accountId,buckets:result.buckets};
   const diagnostic=diagnoseCloudflare(result.response,result.body,{context:'r2',scopes:a.scopes,requiredScopes:['workers-r2.read']}),code=diagnostic.code;
   return {state:code==='R2_CONFIRMED_INACTIVE'?'NOT_ACTIVATED':code==='INSUFFICIENT_SCOPE'?'INSUFFICIENT_PERMISSION':['TOKEN_EXPIRED','REAUTH_REQUIRED'].includes(code)?'RECONNECT_REQUIRED':code==='TRANSIENT_API_FAILURE'?'NETWORK_UNAVAILABLE':'UNKNOWN',code,accountId,diagnostic};
  }catch(e){const code=e.code??'TRANSIENT_API_FAILURE';return {state:['AUTH_REQUIRED','REAUTH_REQUIRED','TOKEN_EXPIRED','AUTH_SESSION_CHANGED'].includes(code)?'RECONNECT_REQUIRED':code==='WRONG_ACCOUNT'?'ACCOUNT_AMBIGUOUS':code==='INSUFFICIENT_SCOPE'?'INSUFFICIENT_PERMISSION':code==='TRANSIENT_API_FAILURE'?'NETWORK_UNAVAILABLE':'UNKNOWN',code,accountId,...(e.diagnostic?{diagnostic:e.diagnostic}:{})};}
 }
 const readyCache=new Map();
 async function check(accountId,selectedTarget,{force=true}={}){
  const statusStarted=performance.now(),s=await current.read();accountId??=selectedTarget?.accountId??s.product.defaultTarget?.accountId??s.product.cloudflare.selectedAccountId;let a;try{a=await oauth.authority();}catch(e){const code=e.code??'TRANSIENT_API_FAILURE';return {state:['AUTH_REQUIRED','REAUTH_REQUIRED','TOKEN_EXPIRED'].includes(code)?'RECONNECT_REQUIRED':code==='INSUFFICIENT_SCOPE'?'INSUFFICIENT_PERMISSION':code==='TRANSIENT_API_FAILURE'?'NETWORK_UNAVAILABLE':'UNKNOWN',code,...(e.diagnostic?{diagnostic:e.diagnostic}:{})};}if(!accountId&&!selectedTarget&&a.accounts.length===1)accountId=a.accounts[0].id;const key=JSON.stringify([a.sessionId,accountId,selectedTarget??s.product.defaultTarget]),cached=readyCache.get(key);if(!force&&cached&&Date.now()-cached.checkedAt<10000)return {...cached,fromCache:true,statusCheckMs:Math.round(performance.now()-statusStarted)};const result=await checkFresh(accountId,selectedTarget);if(result.state==='READY'){readyCache.set(key,{...result,checkedAt:Date.now()});if(readyCache.size>16)readyCache.delete(readyCache.keys().next().value);}return {...result,fromCache:false,statusCheckMs:Math.round(performance.now()-statusStarted)};
 }
 async function checkFresh(accountId,selectedTarget){
  const a=await oauth.status(),s=await current.read();accountId??=selectedTarget?.accountId??s.product.defaultTarget?.accountId??s.product.cloudflare.selectedAccountId;
  if(a.state!=='CONNECTED')return {state:'RECONNECT_REQUIRED'};
  if(!accountId||!a.accounts.some(x=>x.id===accountId))return {state:'ACCOUNT_AMBIGUOUS',...(accountId?{code:'WRONG_ACCOUNT'}:{}),accounts:a.accounts};
  const readiness=await r2(accountId);if(readiness.state!=='ACTIVE')return readiness;
  const choices=savedTargets(s).filter(t=>t.accountId===accountId),target=selectedTarget??s.product.defaultTarget??(choices.length===1?choices[0]:null);
  if(target){if(target.provider!=='cloudflare'||target.accountId!==accountId)return {state:'CHOOSE_DESTINATION',accountId};
   if(!readiness.buckets.some(b=>b.name===target.bucketName))return {state:'DESTINATION_UNAVAILABLE',accountId,target,code:'SELECTED_BUCKET_MISSING'};
   const worker=await transport.status(target);return {state:worker.state==='READY'?'READY':'REPAIR_REQUIRED',accountId,target,worker};
  }
  return {state:savedTargets(s).some(t=>t.accountId===accountId)?'CHOOSE_DESTINATION':'SETUP_APPROVAL_REQUIRED',accountId};
 }
 // Only explicit login/initialization invokes this path; status and boot stay read-only.
 let initializing;
 function initialize(options={}){return initializing??=(initializeLogin(options).finally(()=>{initializing=null;}));}
 async function initializeLogin(options){
  const auth=await oauth.authority(),s=await current.read();
  const configured=savedTargets(s),preferred=s.product.cloudflare.selectedAccountId??s.product.defaultTarget?.accountId;
  const accountId=preferred??(new Set(configured.map(t=>t.accountId)).size===1?configured[0]?.accountId:null)??(auth.accounts.length===1?auth.accounts[0].id:null);
  if(!accountId)return {state:'blocked',code:'ACCOUNT_AMBIGUOUS'};
  if(!auth.accounts.some(a=>a.id===accountId))return {state:'blocked',code:'WRONG_ACCOUNT'};
  return withSetupLock(accountId,()=>initializeAccount(accountId,options));
 }
 async function initializeAccount(accountId,{resume=false}={}){
  await account(accountId);const s=await current.read(),configured=savedTargets(s);
  if(s.product.defaultTarget&&(s.product.defaultTarget.provider!=='cloudflare'||s.product.defaultTarget.accountId!==accountId))return {state:'blocked',code:'DEFAULT_ACCOUNT_MISMATCH'};
  const targets=configured.filter(t=>t.accountId===accountId),manager=managerTargets(s).filter(t=>t.accountId===accountId);
  // Link a legacy default-only target locally, without requiring cloud mutations.
  if(s.product.defaultTarget&&!manager.length){const next=applyConfigChanges(s,[{type:'createDestination',mode:'simple',target:s.product.defaultTarget}]);await current.commitProduct({...next,expectedRevision:s.product.revision,idempotencyKey:'link-default:'+s.product.revision,fingerprint:targetKey(s.product.defaultTarget)});}
  const target=s.product.defaultTarget??(targets.length===1?targets[0]:null);
  if(!target&&targets.length)return {state:'blocked',code:'CHOOSE_DESTINATION',accountId};
  const readiness=await check(accountId,target);
  if(readiness.state==='READY')return {state:'completed',code:'CLOUDFLARE_READY',target:readiness.target};
  if(!['SETUP_APPROVAL_REQUIRED','REPAIR_REQUIRED','CHOOSE_DESTINATION'].includes(readiness.state))return {state:'blocked',code:readiness.code??readiness.state,accountId};
  if(!await setupApproved(accountId))return {state:'blocked',code:'SETUP_APPROVAL_REQUIRED',accountId};
  const chosen=target??{provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName:'redown',prefix:''};
  const pointer=await current.readSetupOperation?.('initialization:'+accountId),pending=pointer&&await current.readSetupOperation?.(accountId+':'+pointer.idempotencyKey);
  const failure=safeWorkerDiagnostic(pending?.failure);if(failure&&!resume)return {state:'blocked',code:failure.code,accountId,diagnostic:failure};
  const idempotencyKey=pending&&!pending.result&&targetKey(pending.target)===targetKey(chosen)?pointer.idempotencyKey:'v1:'+crypto.randomUUID();
  await current.writeSetupOperation?.('initialization:'+accountId,{idempotencyKey});
  return setupLocked({accountId,target,repair:!!target,automatic:true,resume,expectedRevision:(await current.read()).product.revision,idempotencyKey});
 }
 function setup(params){return withSetupLock(params.accountId,()=>setupLocked(params));}
 function withSetupLock(accountId,run){
  const key='click2cloud-cloudflare-setup:'+accountId;
  if(globalThis.navigator?.locks?.request)return navigator.locks.request(key,run);
  const preceding=setupLocks.get(current)??Promise.resolve(),task=preceding.then(run,run);setupLocks.set(current,task.catch(()=>{}));return task;
 }
 async function setupLocked({accountId,expectedRevision,idempotencyKey,repair=false,target:repairTarget,automatic=false,resume=false}){
  const started=performance.now(),auth=await account(accountId);let s=await current.read();
  const setupId=accountId+':'+idempotencyKey,prior=await current.readSetupOperation?.(setupId);
  if(prior?.result){if(prior.accountId!==accountId||repairTarget&&targetKey(prior.target)!==targetKey(repairTarget))fail('IDEMPOTENCY_CONFLICT');if(!savedTargets(s).some(t=>targetKey(t)===targetKey(prior.target)))return {state:'blocked',code:'SETUP_RESULT_STALE'};return prior.result;}
  if(s.product.revision!==expectedRevision)fail('REVISION_CONFLICT');
  const selected=s.product.defaultTarget,configured=savedTargets(s).filter(t=>t.accountId===accountId);
  if(selected&&(selected.provider!=='cloudflare'||selected.accountId!==accountId))fail('WRONG_ACCOUNT');
  if(repairTarget&&(!repair||!configured.some(t=>targetKey(t)===targetKey(repairTarget))))fail('TARGET_NOT_CONFIGURED');
  const original=repairTarget??selected??(configured.length===1?configured[0]:null);
  if(!original&&configured.length)return {state:'blocked',code:'CHOOSE_DESTINATION',accountId};
  const target=original??{provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName:'redown',prefix:''},initial=!original;
  if(prior&&targetKey(prior.target)!==targetKey(target))fail('IDEMPOTENCY_CONFLICT');
  const status=await r2(accountId);if(status.state!=='ACTIVE')return {state:'blocked',code:status.code??status.state,diagnostic:status.diagnostic};
  const missing=['workers-r2.write'].filter(scope=>!auth.scopes?.includes(scope));if(!hasWorkerWriteScope(auth.scopes))missing.push('workers-scripts.write');
  if(!Array.isArray(auth.scopes)||missing.length)return {state:'blocked',code:'INSUFFICIENT_SCOPE',diagnostic:{code:'INSUFFICIENT_SCOPE',missingScopes:missing}};
  if(automatic&&!await setupApproved(accountId))return {state:'blocked',code:'SETUP_APPROVAL_REQUIRED',accountId};
  const exists=status.buckets.some(b=>b.name===target.bucketName);
  if(!exists&&!initial)return {state:'blocked',code:'DESTINATION_UNAVAILABLE'};
  if(!exists&&prior&&prior.stage!=='approved')return {state:'uncertain',code:'BUCKET_CREATE_UNCONFIRMED'};
  const active=await current.readSetupOperation?.('initialization:'+accountId),activeRecord=active&&await current.readSetupOperation?.(accountId+':'+active.idempotencyKey);
  if(!prior&&activeRecord&&!activeRecord.result&&targetKey(activeRecord.target)===targetKey(target)&&active.idempotencyKey!==idempotencyKey)return {state:'blocked',code:'SETUP_IN_PROGRESS',operationId:activeRecord.operationId};
  await current.writeSetupOperation?.('initialization:'+accountId,{idempotencyKey});
  let progressRecord=prior??{};
  const progress=async(stage,extra={})=>{progressRecord={...progressRecord,accountId,target,stage,...extra};await current.writeSetupOperation?.(setupId,progressRecord);};
  const stillSelected=async()=>{if((await oauth.authority()).sessionId!==auth.sessionId)fail('AUTHORIZATION_REVOKED');const now=await current.read();if(initial){if(now.product.defaultTarget||savedTargets(now).some(t=>t.accountId===accountId))fail('DESTINATIONS_CHANGED_DURING_SETUP');}else if(!savedTargets(now).some(t=>targetKey(t)===targetKey(target))||targetKey(now.product.defaultTarget??{})!==targetKey(selected??{}))fail('DESTINATIONS_CHANGED_DURING_SETUP');return now;};
  // Consent is persisted only by this explicitly approved API transition. Login
  // alone cannot add it; automatic callers must already have account approval.
  if(typeof current.writeSetupOperation!=='function'||typeof current.readSetupOperation!=='function')fail('SETUP_LEDGER_UNAVAILABLE');
  if(!automatic&&!await setupApproved(accountId))await current.writeSetupOperation('approval:'+accountId,{accountId,approved:true});
  const recovered=prior?.stage==='probe-dispatched'?await transport.probeStatus(target,prior.operationId):null;
  if(recovered&&recovered.state!=='verified')return {state:'uncertain',code:'SETUP_PROBE_REQUIRES_INSPECTION',operationId:prior.operationId};
  if(!prior)await progress('approved');
  await stillSelected();
  if(!exists){await progress('bucket-create-dispatched');try{const r=await oauth.request('/accounts/'+encodeURIComponent(accountId)+'/r2/buckets',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'redown'})});const creation=await r.json();if(!r.ok||creation.success!==true)throw Error('BUCKET_CREATE_UNCONFIRMED');}catch{const again=await r2(accountId);if(again.state!=='ACTIVE'||!again.buckets.some(b=>b.name==='redown'))return {state:'uncertain',code:'BUCKET_CREATE_UNCONFIRMED'};}}
  if(!recovered)await progress('bucket-confirmed');
  await stillSelected();const provisioningStarted=performance.now();
  if(!recovered)try{await provisioner.prepare(target,{approved:true,rebuild:repair&&!automatic,retryDenied:resume||repair&&!automatic});}catch(error){const diagnostic=safeWorkerDiagnostic(error.diagnostic);if(!diagnostic)throw error;await progress('worker-preparation-blocked',{failure:diagnostic});return {state:'blocked',code:diagnostic.code,accountId,target,diagnostic};}const provisionMs=Math.round(performance.now()-provisioningStarted);
  if(!recovered){delete progressRecord.failure;await progress('worker-prepared');}
  await stillSelected();
  const operationId=prior?.operationId??crypto.randomUUID();if(!recovered)await progress('probe-dispatched',{operationId});
  const probe=recovered??await transport.probe({target,operationId,authorize:async()=>{try{await stillSelected();return true;}catch{return false;}}});
  try{await record({...probe,kind:'readiness',timings:{...probe.timings,provisionMs}});if(probe.state!=='verified')return {state:probe.state==='uncertain'?'uncertain':'blocked',code:probe.code??'READINESS_WRITE_UNVERIFIED'};
   await stillSelected();await provisioner.markVerified(target,auth.sessionId);
   const latest=await stillSelected(),changes=[];
   if(initial){changes.push({type:'createDestination',mode:'simple',target,label:'redown'},{type:'makeDefault',target});}
   else if(selected&&!managerTargets(latest).some(t=>t.accountId===accountId))changes.push({type:'createDestination',mode:'simple',target:selected});
   const next=changes.length?applyConfigChanges(latest,changes):structuredClone(latest);
   next.product.cloudflare.selectedAccountId=accountId;next.product.cloudflare.initialized=[...new Set([...next.product.cloudflare.initialized,accountId])];next.product.cloudflare.pending=next.product.cloudflare.pending.filter(x=>x!==accountId);
   await current.commitProduct({...next,expectedRevision:latest.product.revision,idempotencyKey:'setup-complete:'+setupId,fingerprint:JSON.stringify({target,changes})});
   readyCache.clear();const result={state:'completed',code:'CLOUDFLARE_READY',accountId,target,provisionMs,probe:probe.receipt,durationMs:Math.round(performance.now()-started)};await progress('complete',{operationId,result});return result;
  }catch(e){return {state:'uncertain',code:'SETUP_COMPLETION_PENDING',cause:/^[A-Z_]+$/.test(e.code??'')?e.code:'LOCAL_COMPLETION_UNCONFIRMED',operationId};}
 }
 async function invoke({provider,source,signal,authorize=async()=>true,requestedTarget,setupOnly=false,emptyAssignment=false,dispatchPreparationMs,attentionContext}){
  if(provider!=='cloudflare'){await openShelf(provider,undefined,{code:'PROVIDER_NOT_IMPLEMENTED',context:attentionContext});return {state:'blocked',code:'PROVIDER_NOT_IMPLEMENTED',provider};}
  const status=await oauth.status();
  if(status.state==='DISCONNECTED'){await openShelf('cloudflare',requestedTarget,{code:'LOGIN_REQUIRED',context:attentionContext});return {state:'blocked',code:'LOGIN_REQUIRED'};}
  if(status.state==='CONNECTING'){await openShelf('cloudflare',requestedTarget,{code:'LOGIN_IN_PROGRESS',context:attentionContext});return {state:'blocked',code:'LOGIN_IN_PROGRESS'};}
  if(emptyAssignment){const s=await current.read(),known=s.product.defaultTarget||s.product.cloudflare.initialized.length||s.product.cloudflare.removed?.length||Object.values(s.configs??{}).some(c=>(c.destinations??c.scopes??[]).some(d=>d.target.provider==='cloudflare'));if(known){await openShelf('manage-destinations',undefined,{code:'CHOOSE_DESTINATION',context:attentionContext});return {state:'blocked',code:'CHOOSE_DESTINATION'};}}
  const readiness=await check(requestedTarget?.accountId,requestedTarget,{force:false});
  if(readiness.state!=='READY'){if(readiness.state==='CHOOSE_DESTINATION')await openShelf('manage-destinations',undefined,{code:'CHOOSE_DESTINATION',context:attentionContext});else if(['SETUP_APPROVAL_REQUIRED','REPAIR_REQUIRED','DESTINATION_UNAVAILABLE','ACCOUNT_AMBIGUOUS','NOT_ACTIVATED','RECONNECT_REQUIRED','INSUFFICIENT_PERMISSION','UNKNOWN','NETWORK_UNAVAILABLE'].includes(readiness.state))await openShelf('cloudflare',requestedTarget,{code:readiness.code??readiness.worker?.code??readiness.state,context:attentionContext});return {state:'blocked',code:readiness.code??readiness.worker?.code??readiness.state,requiredAction:readiness.state,accountId:readiness.accountId,target:requestedTarget};}
  if(setupOnly)return {state:'blocked',code:'FRESH_CLICK_REQUIRED',target:requestedTarget};
  if(!source?.url||source.bytes)return {state:'blocked',code:'REMOTE_SOURCE_REQUIRED'};
  const target=readiness.target,out=await transport.save({target,source,signal,dispatchPreparationMs,readinessMs:readiness.statusCheckMs,authorize:async()=>await authorize()&&savedTargets(await current.read()).some(t=>targetKey(t)===targetKey(target))});
  try{await record(out);}catch{return {...out,state:out.state==='verified'?'partial':out.state,code:'COMPLETION_PENDING'};}return out.state==='verified'?{...out,state:'completed',completion:'verified'}:out;
 }
 return Object.freeze({check,setup,initialize,invoke,history,async manage(){await openShelf('manage-destinations');return {state:'completed'};},cancel:({target,operationId})=>transport.cancel(target,operationId),setupStatus:({accountId,idempotencyKey})=>current.readSetupOperation?.(accountId+':'+idempotencyKey),
  async select(accountId){await account(accountId);if((await current.read()).product.cloudflare.selectedAccountId===accountId)return check(accountId);await commit(p=>{p.cloudflare.selectedAccountId=accountId;});return check(accountId);},
  async activation(accountId){await account(accountId);const result=await r2(accountId);return {state:'blocked',code:result.state==='ACTIVE'?'R2_ALREADY_ACTIVE':'R2_MANUAL_ACTION_REQUIRED',readiness:result};},
  async inspect(){const s=await current.read(),candidate=await readRequestedTarget(),valid=[s.product.defaultTarget,...Object.values(s.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(Boolean).find(t=>candidate&&targetKey(t)===targetKey(candidate));const status=await check(valid?.accountId,valid),pointer=status.accountId&&await current.readSetupOperation?.('initialization:'+status.accountId),pending=pointer&&await current.readSetupOperation?.(status.accountId+':'+pointer.idempotencyKey),failure=!pending?.result&&safeWorkerDiagnostic(pending?.failure);return {onboarding:{...s.product.cloudflare,setupAuthorized:status.accountId?await setupApproved(status.accountId):false},status:failure?{...status,state:'PROVISIONING_BLOCKED',code:failure.code,diagnostic:failure}:status,limits:{totalFilePolicy:null,buffering:'bounded spool; final R2 conditional PUT service limits apply'},sourcePolicy:{kind:'public-https-pinned-tls',privateNetworks:false,browserCredentials:false,platformBlocker:'Cloudflare TCP cannot connect to Cloudflare-owned IP ranges'}};},
  async receipt({operationId,target:explicitTarget}){
   const saved=await current.readRemoteResult?.(operationId)??(await history()).find(x=>x.operationId===operationId);const d=saved?.destination;
   const target=explicitTarget??(d?{provider:'cloudflare',connectionId:d.connectionId,accountId:d.accountId,bucketName:d.bucketName,prefix:d.prefix?d.prefix+'/':''}:null);
   if(!target)return {state:'blocked',code:'OPERATION_UNKNOWN'};
   const reconciliation=saved?.kind==='readiness'?await transport.inspect(target,saved.receipt):await transport.inspectOperation(target,operationId);
   if(reconciliation.state==='verified'&&saved?.state!=='verified'){const resolved={...saved,...reconciliation,operationId,destination:reconciliation.receipt?.destination??d};await record(resolved);return {...resolved,reconciliation};}
   return {...saved,reconciliation};
  }

 });
}
