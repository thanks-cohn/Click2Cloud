// Scoped observations of the actual native dispatcher. No provider request,
// registration, recovery, or source material is captured by this reader.
import {targetKey} from '../../core/menu-identity.mjs';
import {preparedDestination} from '../../cloudflare/transport.mjs';

const codes=/^[A-Z][A-Z0-9_]{0,79}$/;
const stages=new Set(['native.identity','dispatch.enter','auth.check','resolver','intent','worker.health',
 'worker.readiness','worker.capability','transfer.upload','transfer.submitted','transfer.verify','provider.verification']);
const condition=(observed,reason,source)=>({observed,reason,source});
const outcomeCode=(value,fallback)=>codes.test(value??'')?value:fallback;

export function createRightClickObservation({readCurrent,inspectNative,readPlan,readResult,readLastOperation,readConnection}){
 const attempts=[];
 function observe(row){
  if(row?.role!=='save'||row.target?.provider!=='cloudflare')return null;
  const attempt={id:crypto.randomUUID(),target:row.target,mode:row.origin?.mode,at:Date.now(),events:[]};
  if(attempts.length>=64)attempts.shift();
  attempts.push(attempt);
  return {
   event(value){
    if(stages.has(value.stage)&&attempt.events.length<32)
     attempt.events.push({stage:value.stage,outcome:value.outcome??null,code:outcomeCode(value.code,null)});
   },
   finish(value){
    attempt.outcome={state:value?.state??'unknown',code:outcomeCode(value?.code,'SAVE_OUTCOME_UNAVAILABLE'),
     operationId:value?.remoteOperationId??value?.operationId??null,
     manualIntervention:value?.requiredAction?true:value?.state==='completed'?false:null};
   }
  };
 }
 async function inspect(target,{mode,operationId}){
  const [state,plan,connection]=await Promise.all([readCurrent(),readPlan(target),readConnection()]);
  const native=inspectNative(),spec=native.desired,equivalent=t=>t&&targetKey(t)===targetKey(target);
  const currentSpec=spec?.generation===state.generation.desired&&spec.modeRevision===state.product.revision;
  const row=currentSpec&&spec.rows.find(item=>item.role==='save'&&item.origin?.mode===mode&&equivalent(item.target));
  const acknowledged=!!(row&&!native.pending&&native.acknowledgedGeneration===spec.generation&&state.generation.applied===spec.generation);
  const attempt=attempts.findLast(item=>item.mode===mode&&equivalent(item.target)&&(!operationId||item.outcome?.operationId===operationId));
  const remoteId=operationId??attempt?.outcome?.operationId??await readLastOperation?.();
  const result=remoteId&&await readResult(remoteId);
  const prefix=result?.destination?.prefix;
  const receipt=result?.receipt;
  const matches=result?.kind==='save'&&(result.saveMode===(mode==='nested'?'narrow':mode)||result.saveMode==='quick'&&!!attempt)&&result.destination?.provider==='cloudflare-r2'&&
   result.destination?.accountId===target.accountId&&result.destination?.bucketName===target.bucketName&&
   typeof prefix==='string'&&(prefix&& !prefix.endsWith('/')?prefix+'/':prefix)===target.prefix;
  const verified=matches&&result.state==='verified'&&receipt?.operationId===remoteId&&typeof receipt.key==='string'&&
   receipt.key.startsWith(target.prefix)&&!receipt.key.slice(target.prefix.length).includes('/')&&!!receipt.version&&!!receipt.etag;
  const local=preparedDestination(plan,target);
  const event=(stage,success)=>attempt?.events.some(item=>item.stage===stage&&success.includes(item.outcome));
  const failed=attempt?.events.find(item=>['blocked','failed','uncertain'].includes(item.outcome));
  const health=attempt?.events.findLast(item=>item.stage==='worker.readiness'&&['ok','blocked','failed','uncertain'].includes(item.outcome));
  return {schema:'redown.right-click-observation/1',mode,prefix:target.prefix,revision:state.product.revision,
   generation:spec?.generation??null,menuItemId:row?.id??null,observedAt:new Date().toISOString(),
   observations:{
    compiled:condition(currentSpec?!!row:null,currentSpec?(row?'ROUTE_COMPILED':'ROUTE_ABSENT'):'CURRENT_MENU_UNOBSERVED','canonical-compiler'),
    registrationAcknowledged:condition(row?acknowledged:null,row?(acknowledged?'CHROME_ACK':'ACK_MISSING'):'ROUTE_UNOBSERVED','chrome-registrar'),
    nativeInput:condition(null,'NATIVE_INPUT_REQUIRES_EXTERNAL_OBSERVATION','chrome-os-ui'),
    accountAuthorized:condition(connection.state==='CONNECTED'?connection.accounts.some(account=>account.id===target.accountId):
     connection.state==='DISCONNECTED'?false:null,'LOCAL_OAUTH_STATE','oauth-status'),
    localWorkerProof:condition(local.state==='READY',local.code??'RECORDED_WRITE_PROOF','retained-worker-plan'),
    workerResponsive:condition(health?health.outcome==='ok':null,health?.code??'NO_DISPATCH_HEALTH_EVIDENCE','save-worker-readiness'),
    sourceAdmitted:condition(attempt?.events.some(item=>item.stage==='intent'&&item.outcome==='ok')?true:
     attempt?.events.some(item=>item.stage==='intent'&&['failed','blocked'].includes(item.outcome))?false:null,'SAVE_INTENT_AUTHORIZATION','production-save'),
    dispatched:condition(event('transfer.submitted',['ok'])?true:attempt?.outcome?false:null,'PRODUCTION_SUBMISSION','production-save'),
    publicationVerified:condition(verified?true:matches&&result.state==='failed'?false:null,verified?'EXACT_RECEIPT':'VERIFIED_RECEIPT_UNAVAILABLE','current-provider-receipt'),
    contentVerified:condition(null,'INDEPENDENT_READBACK_REQUIRED','provider-object-readback'),
    manualIntervention:condition(attempt?.outcome?.manualIntervention??null,'SAVE_OUTCOME','production-save')
   },
   ...(attempt?{attempt:{id:attempt.id,observedAt:attempt.at,events:attempt.events.map(item=>({...item})),
    firstFailedBoundary:failed?.stage??null,outcome:attempt.outcome??null}}:{}),
   ...(verified?{receipt:{operationId:remoteId,key:receipt.key,size:receipt.size,version:receipt.version,etag:receipt.etag}}:{})};
 }
 return Object.freeze({observe,inspect});
}
