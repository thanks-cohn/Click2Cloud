import {fail} from './wire.mjs';
import {targetKey} from '../core/menu-identity.mjs';
export const ACTIVATION_URL='https://dash.cloudflare.com/?to=%2F%3Aaccount%2Fr2%2Foverview';
export function createCloudflareOnboarding({current,oauth,provisioner,transport,openShelf=async()=>{},openActivation=async()=>{},readRequestedTarget=async()=>null,record=async()=>{},history=async()=>[]}){
 async function commit(mutator,key=crypto.randomUUID()){
  const s=await current.read(),next=structuredClone(s);mutator(next.product);
  await current.commitProduct({...next,expectedRevision:s.product.revision,idempotencyKey:'cloudflare:'+key,fingerprint:JSON.stringify(next.product)});
 }
 async function account(accountId){const a=await oauth.authority();if(!a.accounts.some(x=>x.id===accountId))fail('SCOPE_UNAUTHORIZED');return a;}
 async function r2(accountId){
  try{await account(accountId);const r=await oauth.request('/accounts/'+encodeURIComponent(accountId)+'/r2/buckets?per_page=1000');
   const b=await r.json();if(!r.ok&&b.errors?.some(e=>/\bR2\b.*\bnot (enabled|activated)\b/i.test(e.message??'')))return {state:'NOT_ACTIVATED',accountId};if(r.status===403)return {state:'INSUFFICIENT_PERMISSION',accountId};
   if(r.status===401)return {state:'RECONNECT_REQUIRED',accountId};
   if(!r.ok||b.success!==true){const inactive=b.errors?.some(e=>/\bR2\b.*\bnot (enabled|activated)\b/i.test(e.message??''));return {state:inactive?'NOT_ACTIVATED':r.status>=500?'NETWORK_UNAVAILABLE':'UNKNOWN',accountId};}
   if(!Array.isArray(b.result?.buckets)||(b.result_info?.total_pages??1)>1||b.result?.cursor||b.result_info?.cursor||b.result?.truncated)return {state:'UNKNOWN',accountId};return {state:'ACTIVE',accountId,buckets:b.result.buckets.map(x=>({name:x.name}))};
  }catch(e){return {state:['AUTH_REQUIRED','PROVIDER_AUTH_REJECTED','AUTH_SESSION_CHANGED'].includes(e.code)?'RECONNECT_REQUIRED':'NETWORK_UNAVAILABLE',accountId};}
 }
 const readyCache=new Map();
 async function check(accountId,selectedTarget,{force=true}={}){
  const statusStarted=performance.now(),s=await current.read();accountId??=s.product.cloudflare.selectedAccountId;let a;try{a=await oauth.authority();}catch{return {state:'RECONNECT_REQUIRED'};}if(!accountId&&!selectedTarget&&a.accounts.length===1)accountId=a.accounts[0].id;const key=JSON.stringify([a.sessionId,accountId,selectedTarget??s.product.defaultTarget]),cached=readyCache.get(key);if(!force&&cached&&Date.now()-cached.checkedAt<10000)return {...cached,fromCache:true,statusCheckMs:Math.round(performance.now()-statusStarted)};const result=await checkFresh(accountId,selectedTarget);if(result.state==='READY'){readyCache.set(key,{...result,checkedAt:Date.now()});if(readyCache.size>16)readyCache.delete(readyCache.keys().next().value);}return {...result,fromCache:false,statusCheckMs:Math.round(performance.now()-statusStarted)};
 }
 async function checkFresh(accountId,selectedTarget){
  const a=await oauth.status(),s=await current.read();accountId??=s.product.cloudflare.selectedAccountId;
  if(a.state!=='CONNECTED')return {state:'RECONNECT_REQUIRED'};
  if(!accountId||!a.accounts.some(x=>x.id===accountId))return {state:'ACCOUNT_AMBIGUOUS',accounts:a.accounts};
  const readiness=await r2(accountId);if(readiness.state!=='ACTIVE')return readiness;
  const target=selectedTarget??s.product.defaultTarget;
  if(target){if(target.provider!=='cloudflare'||target.accountId!==accountId)return {state:'CHOOSE_DESTINATION',accountId};
   if(!readiness.buckets.some(b=>b.name===target.bucketName))return {state:'DESTINATION_UNAVAILABLE',accountId,target,code:'SELECTED_BUCKET_MISSING'};
   const worker=await transport.status(target);return {state:worker.state==='READY'?'READY':'REPAIR_REQUIRED',accountId,target,worker};
  }
  return {state:s.product.cloudflare.initialized.includes(accountId)||s.product.menuCustomized?'CHOOSE_DESTINATION':'SETUP_APPROVAL_REQUIRED',accountId};
 }
 async function setup({accountId,expectedRevision,idempotencyKey,repair=false,target:repairTarget}){
  const started=performance.now(),auth=await account(accountId),s=await current.read();if(s.product.revision!==expectedRevision)fail('REVISION_CONFLICT');
  const status=await r2(accountId);if(status.state!=='ACTIVE')return {state:'blocked',code:status.state};
  const configured=[s.product.defaultTarget,...Object.values(s.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(Boolean);
  if(repairTarget&&(!repair||!configured.some(t=>targetKey(t)===targetKey(repairTarget))))fail('TARGET_NOT_CONFIGURED');
  const original=repairTarget??s.product.defaultTarget;
  if(original&&(original.provider!=='cloudflare'||original.accountId!==accountId))fail('SCOPE_UNAUTHORIZED');
  const initialized=s.product.cloudflare.initialized.includes(accountId);
  if(!original&&(initialized||s.product.menuCustomized))return {state:'blocked',code:'CHOOSE_DESTINATION'};
  const target=original??{provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName:'redown',prefix:''};
  const exists=status.buckets.some(b=>b.name===target.bucketName);
  if(!exists&&(original||initialized||repair))return {state:'blocked',code:'DESTINATION_UNAVAILABLE'};
  if(!await current.reserveOperation('cloudflare-setup:'+idempotencyKey,JSON.stringify({accountId,target})))return {state:'blocked',code:'SETUP_RETRY_REQUIRES_INSPECTION'};
  await commit(p=>{p.cloudflare.selectedAccountId=accountId;p.cloudflare.pending=[...new Set([...p.cloudflare.pending,accountId])];});
  if(!exists){const r=await oauth.request('/accounts/'+encodeURIComponent(accountId)+'/r2/buckets',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'redown'})});
   if(!r.ok){const again=await r2(accountId);if(again.state!=='ACTIVE'||!again.buckets.some(b=>b.name==='redown'))fail('BUCKET_CREATE_UNCONFIRMED');}}
  if((await oauth.authority()).sessionId!==auth.sessionId)fail('AUTHORIZATION_REVOKED');
  const provisioningStarted=performance.now();await provisioner.prepare(target,{approved:true,rebuild:repair});const provisionMs=Math.round(performance.now()-provisioningStarted);
  const operationId=crypto.randomUUID(),probeTarget={...target,prefix:target.prefix+'.click2cloud-readiness/'+operationId+'/'};
  const probe=await transport.save({target:probeTarget,operationId,source:{url:'https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore',filename:'readiness.txt'},authorize:async()=>{if((await oauth.authority()).sessionId!==auth.sessionId)return false;const now=await current.read();return repairTarget?[now.product.defaultTarget,...Object.values(now.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(Boolean).some(t=>targetKey(t)===targetKey(target)):targetKey(now.product.defaultTarget??target)===targetKey(target);}});
  await record({...probe,kind:'readiness',timings:{...probe.timings,provisionMs}});if(probe.state!=='verified')return {state:probe.state==='uncertain'?'uncertain':'blocked',code:probe.code??'READINESS_WRITE_UNVERIFIED'};
  await provisioner.markVerified(target);
  const latest=await current.read();if(!repairTarget&&targetKey(latest.product.defaultTarget??target)!==targetKey(target))fail('DEFAULT_CHANGED_DURING_SETUP');
  await commit(p=>{if(!p.defaultTarget&&!repairTarget)p.defaultTarget=target;p.cloudflare.initialized=[...new Set([...p.cloudflare.initialized,accountId])];p.cloudflare.pending=p.cloudflare.pending.filter(x=>x!==accountId);});
  return {state:'completed',code:'CLOUDFLARE_READY',target,provisionMs,probe:probe.receipt,durationMs:Math.round(performance.now()-started),probeRetention:'Small verified readiness object retained; delete explicitly in provider dashboard if desired.'};
 }
 async function invoke({provider,source,signal,authorize=async()=>true,requestedTarget,setupOnly=false,dispatchPreparationMs}){
  if(provider!=='cloudflare'){await openShelf(provider);return {state:'blocked',code:'PROVIDER_NOT_IMPLEMENTED',provider};}
  const status=await oauth.status();
  if(status.state!=='CONNECTED'){await openShelf(undefined,requestedTarget);try{await oauth.connect();return {state:'blocked',code:'FRESH_CLICK_REQUIRED'};}catch(e){return {state:'blocked',code:e.code??'LOGIN_REQUIRED'};}}
  const readiness=await check(requestedTarget?.accountId,requestedTarget,{force:false});
  if(readiness.state!=='READY'){await openShelf(undefined,requestedTarget);return {state:'blocked',code:readiness.state,accountId:readiness.accountId,target:requestedTarget};}
  if(setupOnly)return {state:'blocked',code:'FRESH_CLICK_REQUIRED',target:requestedTarget};
  if(!source?.url||source.bytes)return {state:'blocked',code:'REMOTE_SOURCE_REQUIRED'};
  const target=readiness.target,out=await transport.save({target,source,signal,dispatchPreparationMs,readinessMs:readiness.statusCheckMs,authorize:async()=>await authorize()&&targetKey((await current.read()).product.defaultTarget??{})===targetKey(target)});
  try{await record(out);}catch{return {...out,state:out.state==='verified'?'partial':out.state,code:'COMPLETION_PENDING'};}return out.state==='verified'?{...out,state:'completed',completion:'verified'}:out;
 }
 return Object.freeze({check,setup,invoke,history,
  async select(accountId){await account(accountId);if((await current.read()).product.cloudflare.selectedAccountId===accountId)return check(accountId);await commit(p=>{p.cloudflare.selectedAccountId=accountId;});return check(accountId);},
  async activation(accountId){await account(accountId);const state=await r2(accountId);if(state.state!=='NOT_ACTIVATED')return {state:'blocked',code:state.state==='ACTIVE'?'R2_ALREADY_ACTIVE':state.state};await commit(p=>{p.cloudflare.pending=[...new Set([...p.cloudflare.pending,accountId])];});await openActivation(ACTIVATION_URL);return {state:'completed',url:ACTIVATION_URL,setupPending:true,accountId};},
  async inspect(){const s=await current.read(),candidate=await readRequestedTarget(),valid=[s.product.defaultTarget,...Object.values(s.configs).flatMap(c=>(c.destinations??c.scopes??[]).map(d=>d.target))].filter(Boolean).find(t=>candidate&&targetKey(t)===targetKey(candidate));return {onboarding:s.product.cloudflare,status:await check(valid?.accountId,valid),limits:{knownLength:67108864,unknownLength:8388608},sourcePolicy:['raw.githubusercontent.com','upload.wikimedia.org']};},
  async receipt({operationId}){const saved=(await history()).find(x=>x.operationId===operationId);if(!saved)return {state:'blocked',code:'OPERATION_UNKNOWN'};const d=saved.destination;if(!d)return saved;const target={provider:'cloudflare',connectionId:d.connectionId,accountId:d.accountId,bucketName:d.bucketName,prefix:d.prefix?d.prefix+'/':''};return {...saved,reconciliation:await transport.inspectOperation(target,operationId)};}
 });
}
