// Depth-specific receipt and feedback around the shared native save path.
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
export function createDepthNativeClick({current,inspect,authorize,feedback=async()=>{}}){
 return async function depthClick(row,info,tab,run){
  const operationId='depth-click:'+crypto.randomUUID(),started=Date.now();
  const native=inspect(),failed=native.acknowledgements?.find(a=>a.state!=='acknowledged');
  const stage=JSON.stringify({itemId:row.id,parentId:row.parentId,role:row.role,actionKind:row.actionKind,mode:'depth',
   generation:native.desired?.generation,acknowledgedGeneration:native.acknowledgedGeneration,nativeCode:native.lastOutcome?.code,
   ...(failed?{firstNativeFailure:{itemId:failed.itemId,code:safeCode(failed.code),state:failed.state}}:{}),stage:'dispatch'});
  let result;
  try{result=await run(authorize);}catch(error){result={state:'blocked',code:safeCode(error?.code)};}
  const code=safeCode(result.code??(result.state==='completed'?'DEPTH_CLICK_COMPLETED':'DEPTH_CLICK_FAILED'));
  const remoteOperationId=result.remoteOperationId??result.operationId;
  // Observation shares neither the authorization nor the transfer boundary.
  void Promise.resolve().then(()=>current.recordRemoteResult({kind:'depth-click',operationId,state:result.state,code,
   cause:remoteOperationId,destination:remoteDestination(row.target),stage,durationMs:Date.now()-started}))
   .then(()=>null,()=>'DEPTH_CLICK_RECORD_FAILED')
   .then(recordCode=>feedback({state:result.state,code,operationId,remoteOperationId,recordCode},tab)).catch(()=>{});
  return {...result,target:row.target,depthClickId:operationId};
 };
}

// Quiet presentation is independent of durable evidence and optional observation writes.
export function createDepthFeedback(chrome,refreshBadge=async()=>{}){return async outcome=>{
 try{await chrome.storage.local.set({lastDepthClick:outcome});}catch{}
 let debug=false;try{debug=(await chrome.storage.local.get('uiDebugMode')).uiDebugMode===true;}catch{}
 const routine=['completed','pending'].includes(outcome.state);
 if(routine&&!debug)return;
 const message=debug?(outcome.state==='completed'?'Depth save completed; inspect its verified remote receipt.':(['pending','partial','uncertain'].includes(outcome.state)?'Depth: save outcome not confirmed (':'Depth: not saved (')+outcome.code+(outcome.reason?' / '+outcome.reason:'')+'). Use Inspect save diagnostics in Help · Diagnose for details.'):(outcome.state==='uncertain'||outcome.state==='partial'?'Save not confirmed. Review History before retrying.':'Not saved. Review History or reconnect in Remotes.');
 if(!routine){
  try{await refreshBadge();}catch{}
 }
 try{await chrome.runtime.sendMessage({channel:'depth-click-outcome',operationId:outcome.operationId,remoteOperationId:outcome.remoteOperationId,message,state:outcome.state,code:safeCode(outcome.code)});}catch{}
};}
