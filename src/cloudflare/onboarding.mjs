import {diagnoseCloudflare} from '../auth/cloudflare-oauth.mjs';
import {readBuckets} from './inventory.mjs';
import {fail} from './wire.mjs';
import {targetKey} from '../core/menu-identity.mjs';
export function createCloudflareOnboarding({current,oauth,provisioner,transport,openShelf=async()=>{},readRequestedTarget=async()=>null,record=async()=>{},history=async()=>[]}){
 async function commit(mutator,key=crypto.randomUUID()){
  const s=await current.read(),next=structuredClone(s);mutator(next.product);
  await current.commitProduct({...next,expectedRevision:s.product.revision,idempotencyKey:'cloudflare:'+key,fingerprint:JSON.stringify(next.product)});
 }
 async function account(accountId){const a=await oauth.authority();if(!a.accounts.some(x=>x.id===accountId))fail('SCOPE_UNAUTHORIZED');return a;}
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
  const target=selectedTarget??s.product.defaultTarget;
  if(target){if(target.provider!=='cloudflare'||target.accountId!==accountId)return {state:'CHOOSE_DESTINATION',accountId};
   if(!readiness.buckets.some(b=>b.name===target.bucketName))return {state:'DESTINATION_UNAVAILABLE',accountId,target,code:'SELECTED_BUCKET_MISSING'};
   const worker=await transport.status(target);return {state:worker.state==='READY'?'READY':'REPAIR_REQUIRED',accountId,target,worker};
  }
  return {state:s.product.cloudflare.initialized.includes(accountId)||s.product.cloudflare.removed?.includes(accountId)?'CHOOSE_DESTINATION':'SETUP_APPROVAL_REQUIRED',accountId};
 }
 async function setup({accountId,expectedRevision,idempotencyKey,repair=false,target:repairTarget}){
  const started=performance.now(),auth=await account(accountId),s=await current.read(),setupId=accountId+':'+idempotencyKey,prior=await current.readSetupOperation?.(setupId);if(prior?.result)return prior.result;if(s.product.revision!==expectedRevision)fail('REVISION_CONFLICT');
  const status=await r2(accountId);if(status.state!=='ACTIVE')return {state:'blocked',code:status.code??status.state,diagnostic:status.diagnostic};
  if(Array.isArray(auth.scopes)&&!auth.scopes.includes('workers-r2.write'))return {state:'blocked',code:'INSUFFICIENT_SCOPE',diagnostic:{code:'INSUFFICIENT_SCOPE',evidence:'verified-grants',missingScopes:['workers-r2.write']}};
  const configured=[s.product.defaultTarget,...Object.values(s.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(Boolean);
  if(repairTarget&&(!repair||!configured.some(t=>targetKey(t)===targetKey(repairTarget))))fail('TARGET_NOT_CONFIGURED');
  const original=repairTarget??s.product.defaultTarget;
  if(original&&(original.provider!=='cloudflare'||original.accountId!==accountId))fail('SCOPE_UNAUTHORIZED');
  const initialized=s.product.cloudflare.initialized.includes(accountId);
  if(!original&&(initialized||s.product.cloudflare.removed?.includes(accountId)))return {state:'blocked',code:'CHOOSE_DESTINATION'};
  const target=original??{provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName:'redown',prefix:''};
  const exists=status.buckets.some(b=>b.name===target.bucketName);
  if(!exists&&(original||initialized||repair||prior&&prior.stage!=='approved'))return {state:'blocked',code:'DESTINATION_UNAVAILABLE'};
  if(!prior&&!await current.reserveOperation('cloudflare-setup:'+idempotencyKey,JSON.stringify({accountId,target})))return {state:'blocked',code:'SETUP_RETRY_REQUIRES_INSPECTION'};
  if(prior&&targetKey(prior.target)!==targetKey(target))fail('IDEMPOTENCY_CONFLICT');
  const progress=async(stage,extra={})=>current.writeSetupOperation?.(setupId,{...prior,accountId,target,stage,...extra});
  const recovered=prior?.stage==='probe-dispatched'?await transport.probeStatus(target,prior.operationId):null;
  if(recovered&&recovered.state!=='verified')return {state:'uncertain',code:'SETUP_PROBE_REQUIRES_INSPECTION',operationId:prior.operationId};
  if(!recovered)await progress('approved');
  await commit(p=>{p.cloudflare.selectedAccountId=accountId;p.cloudflare.pending=[...new Set([...p.cloudflare.pending,accountId])];});
  if(!exists){await progress('bucket-create-dispatched');const r=await oauth.request('/accounts/'+encodeURIComponent(accountId)+'/r2/buckets',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'redown'})});
   const creation=await r.json();if(!r.ok||creation.success!==true){const again=await r2(accountId);if(again.state!=='ACTIVE'||!again.buckets.some(b=>b.name==='redown'))fail('BUCKET_CREATE_UNCONFIRMED');}}
  if(!recovered)await progress('bucket-confirmed');
  if((await oauth.authority()).sessionId!==auth.sessionId)fail('AUTHORIZATION_REVOKED');
  const provisioningStarted=performance.now();if(!recovered)await provisioner.prepare(target,{approved:true,rebuild:repair});const provisionMs=Math.round(performance.now()-provisioningStarted);
  if(!recovered)await progress('worker-prepared');
  const operationId=prior?.operationId??crypto.randomUUID();if(!recovered)await progress('probe-dispatched',{operationId});
  const probe=recovered??await transport.probe({target,operationId,authorize:async()=>{if((await oauth.authority()).sessionId!==auth.sessionId)return false;const now=await current.read();return repairTarget?[now.product.defaultTarget,...Object.values(now.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(Boolean).some(t=>targetKey(t)===targetKey(target)):targetKey(now.product.defaultTarget??target)===targetKey(target);}});
  try{await record({...probe,kind:'readiness',timings:{...probe.timings,provisionMs}});if(probe.state!=='verified')return {state:probe.state==='uncertain'?'uncertain':'blocked',code:probe.code??'READINESS_WRITE_UNVERIFIED'};
  await provisioner.markVerified(target,auth.sessionId);
  const latest=await current.read();if(!repairTarget&&targetKey(latest.product.defaultTarget??target)!==targetKey(target))fail('DEFAULT_CHANGED_DURING_SETUP');
  await commit(p=>{if(!p.defaultTarget&&!repairTarget)p.defaultTarget=target;p.cloudflare.initialized=[...new Set([...p.cloudflare.initialized,accountId])];p.cloudflare.pending=p.cloudflare.pending.filter(x=>x!==accountId);});
  const result={state:'completed',code:'CLOUDFLARE_READY',target,provisionMs,probe:probe.receipt,durationMs:Math.round(performance.now()-started),probeRetention:'Small verified readiness object retained; delete explicitly in provider dashboard if desired.'};await progress('complete',{operationId,result});return result;}catch(e){return {state:'uncertain',code:'SETUP_COMPLETION_PENDING',cause:/^[A-Z_]+$/.test(e.code??'')?e.code:'LOCAL_COMPLETION_UNCONFIRMED',operationId};}
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
  const target=readiness.target,out=await transport.save({target,source,signal,dispatchPreparationMs,readinessMs:readiness.statusCheckMs,authorize:async()=>await authorize()&&targetKey((await current.read()).product.defaultTarget??{})===targetKey(target)});
  try{await record(out);}catch{return {...out,state:out.state==='verified'?'partial':out.state,code:'COMPLETION_PENDING'};}return out.state==='verified'?{...out,state:'completed',completion:'verified'}:out;
 }
 return Object.freeze({check,setup,invoke,history,async manage(){await openShelf('manage-destinations');return {state:'completed'};},cancel:({target,operationId})=>transport.cancel(target,operationId),setupStatus:({accountId,idempotencyKey})=>current.readSetupOperation?.(accountId+':'+idempotencyKey),
  async select(accountId){await account(accountId);if((await current.read()).product.cloudflare.selectedAccountId===accountId)return check(accountId);await commit(p=>{p.cloudflare.selectedAccountId=accountId;});return check(accountId);},
  async activation(accountId){await account(accountId);const result=await r2(accountId);return {state:'blocked',code:result.state==='ACTIVE'?'R2_ALREADY_ACTIVE':'R2_MANUAL_ACTION_REQUIRED',readiness:result};},
  async inspect(){const s=await current.read(),candidate=await readRequestedTarget(),valid=[s.product.defaultTarget,...Object.values(s.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(Boolean).find(t=>candidate&&targetKey(t)===targetKey(candidate));return {onboarding:s.product.cloudflare,status:await check(valid?.accountId,valid),limits:{totalFilePolicy:null,buffering:'bounded spool; final R2 conditional PUT service limits apply'},sourcePolicy:{kind:'public-https-pinned-tls',privateNetworks:false,browserCredentials:false,platformBlocker:'Cloudflare TCP cannot connect to Cloudflare-owned IP ranges'}};},
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
