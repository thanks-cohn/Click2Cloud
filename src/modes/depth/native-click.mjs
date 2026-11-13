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
export function createDepthNativeClick({current,oauth,transport,lookup,inspect,refreshReady,feedback=async()=>{}}){
 return async function depthClick(row,info,tab,run){
  const operationId='depth-click:'+crypto.randomUUID(),started=Date.now();let stage='native',reason=null,result;
  // Deliberate allowlist: never serialize a plan, token, source URL or Chrome error.
  const trace=()=>{const failed=inspect().acknowledgements?.find(a=>a.state!=='acknowledged');return JSON.stringify({itemId:row.id,parentId:row.parentId,role:row.role,actionKind:row.actionKind,mode:'depth',generation:inspect().desired?.generation,acknowledgedGeneration:inspect().acknowledgedGeneration,nativeCode:inspect().lastOutcome?.code,...(failed?{firstNativeFailure:{itemId:failed.itemId,code:safeCode(failed.code),state:failed.state}}:{}),stage,reason});};
  const record=async(state,code,cause)=>current.recordRemoteResult({kind:'depth-click',operationId,state,code,cause,destination:remoteDestination(row.target),stage:trace(),durationMs:Date.now()-started});
  try{
   await record('pending','DEPTH_CLICK_STARTED');
   // Retain original ACK/recovery semantics; never authorize a partial menu.
   const native=inspect();
   if(native.pending||native.acknowledgedGeneration!==native.desired?.generation){result=await run();}
   else {
    stage='authorization';const auth=await oauth.authority();
    if(!auth.accounts.some(a=>a.id===row.target.accountId))result={state:'blocked',code:'SCOPE_UNAUTHORIZED'};
    else {
     stage='worker';const readiness=await transport.status(row.target);
     if(readiness.state!=='READY'){
      if(readiness.code==='WORKER_SETUP_REQUIRED')reason=workerPlanReason(await lookup(row.target),row.target);
      result={state:'blocked',code:safeCode(readiness.code??(readiness.state==='PREPARED'?'DEPTH_WORKER_UNVERIFIED':'DEPTH_WORKER_UNAVAILABLE'))};
     }else{
      // Fresh scoped capability supersedes a cached negative observation only
      // for this Depth click. Existing engine authorization still runs/rechecks.
      refreshReady(row.target);stage='dispatch';result=await run();
     }
    }
   }
   result??={state:'failed',code:'DEPTH_CLICK_FAILED'};
  }catch(e){result={state:'blocked',code:safeCode(e?.code)};}
  const code=safeCode(result.code??(result.state==='completed'?'DEPTH_CLICK_COMPLETED':'DEPTH_CLICK_FAILED'));
  const outcome={...result,depthClickId:operationId};
  try{await record(result.state,code,result.remoteOperationId??result.operationId);}catch{outcome.depthRecordCode='DEPTH_CLICK_RECORD_FAILED';}
  try{await feedback({state:result.state,code,reason,operationId,recordCode:outcome.depthRecordCode},tab);}catch{/* A failed notification never changes remote truth. */}
  return outcome;
 };
}
