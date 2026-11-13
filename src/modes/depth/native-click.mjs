// Depth-only native click lifecycle. No provisioning, menu mutation or retry.
import {remoteDestination,PROTOCOL} from '../../cloudflare/wire.mjs';
const safeCode=value=>typeof value==='string'&&/^[A-Z][A-Z0-9_]{0,95}$/.test(value)?value:'DEPTH_CLICK_FAILED';
export function workerPlanReason(plan,target){
 if(!plan)return 'PLAN_MISSING';
 if(plan.state!=='ready')return 'PLAN_NOT_READY';
 if(plan.accountId!==target.accountId)return 'PLAN_ACCOUNT_MISMATCH';
 if(plan.bucketName!==target.bucketName)return 'PLAN_BUCKET_MISMATCH';
 if(plan.protocol!==PROTOCOL)return 'PLAN_PROTOCOL_MISMATCH';
 return 'PLAN_MATCHES';
}
export function createDepthNativeClick({current,oauth,transport,lookup,inspect,authorize,feedback=async()=>{}}){
 return async function depthClick(row,info,tab,run){
  const operationId='depth-click:'+crypto.randomUUID(),started=Date.now();let stage='native',reason=null,result,recordFailed=false;
  // Deliberate allowlist: never serialize a plan, token, source URL or Chrome error.
  const trace=()=>{const failed=inspect().acknowledgements?.find(a=>a.state!=='acknowledged');return JSON.stringify({itemId:row.id,parentId:row.parentId,role:row.role,actionKind:row.actionKind,mode:'depth',generation:inspect().desired?.generation,acknowledgedGeneration:inspect().acknowledgedGeneration,nativeCode:inspect().lastOutcome?.code,...(failed?{firstNativeFailure:{itemId:failed.itemId,code:safeCode(failed.code),state:failed.state}}:{}),stage,reason});};
  const record=async(state,code,cause)=>current.recordRemoteResult({kind:'depth-click',operationId,state,code,cause,destination:remoteDestination(row.target),stage:trace(),durationMs:Date.now()-started});
  try{
   try{await record('pending','DEPTH_CLICK_STARTED');}catch{recordFailed=true;}
   // Retain original ACK/recovery semantics; never authorize a partial menu.
   const native=inspect();
   if(native.pending||native.acknowledgedGeneration!==native.desired?.generation){result=await run(authorize);}
   else {
    stage='authorization';const auth=await oauth.authority();
    if(!auth.accounts.some(a=>a.id===row.target.accountId))result={state:'blocked',code:'SCOPE_UNAUTHORIZED'};
    else {
     stage='worker';const readiness=await transport.status(row.target);
     if(readiness.state!=='READY'){
      if(readiness.code==='WORKER_SETUP_REQUIRED'){const observed=workerPlanReason(await lookup(row.target),row.target);reason='FOLLOWUP_'+observed;}
      result={state:'blocked',code:safeCode(readiness.code??(readiness.state==='PREPARED'?'DEPTH_WORKER_UNVERIFIED':'DEPTH_WORKER_UNAVAILABLE'))};
     }else{
      // Authorization stays invocation-local; never warm the shared mode cache.
      stage='dispatch';result=await run(authorize);
     }
    }
   }
   result??={state:'failed',code:'DEPTH_CLICK_FAILED'};
  }catch(e){result={state:'blocked',code:safeCode(e?.code)};}
  const code=safeCode(result.code??(result.state==='completed'?'DEPTH_CLICK_COMPLETED':'DEPTH_CLICK_FAILED'));
  const outcome={...result,depthClickId:operationId};
  try{await record(result.state,code,result.remoteOperationId??result.operationId);}catch{recordFailed=true;}
  if(recordFailed)outcome.depthRecordCode='DEPTH_CLICK_RECORD_FAILED';
  try{await feedback({state:result.state,code,reason,operationId,recordCode:outcome.depthRecordCode},tab);}catch{/* A failed notification never changes remote truth. */}
  return outcome;
 };
}

// Existing Depth feedback channels remain independent of optional observation writes.
export function createDepthFeedback(chrome){return async outcome=>{
 try{await chrome.storage.local.set({lastDepthClick:outcome});}catch{}
 const message=outcome.state==='completed'?'Depth save completed; inspect its verified remote receipt.':(['pending','partial','uncertain'].includes(outcome.state)?'Depth: save outcome not confirmed (':'Depth: not saved (')+outcome.code+(outcome.reason?' / '+outcome.reason:'')+'). Open Save results for details.';
 if(outcome.state!=='completed'){
  try{await chrome.notifications.create('click2cloud-depth-'+outcome.operationId,{type:'basic',iconUrl:chrome.runtime.getURL('extension/icon.png'),title:'Click2Cloud Depth',message});}catch{}
  try{await chrome.action.setBadgeText({text:'!'});}catch{}
 }
 try{await chrome.runtime.sendMessage({channel:'depth-click-outcome',message});}catch{}
};}
