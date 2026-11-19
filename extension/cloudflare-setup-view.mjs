import {targetKey} from '../src/core/menu-identity.mjs';

// Presentation gate for recoverCloudflareDestination/checkCloudflareR2. The
// transport owns capability/code/session/probe verification; a completed setup
// response by itself is never enough to paint the selected save as ready.
export function selectedSetupReady(target,readiness,native){
 if(!target||readiness?.state!=='READY'||readiness.fromCache!==false||!readiness.target||targetKey(readiness.target)!==targetKey(target))return false;
 const worker=readiness.worker;
 if(worker?.state!=='READY'||!worker.proof||!Number.isFinite(worker.checkedAt)||!worker.destination||targetKey(worker.destination)!==targetKey(target))return false;
 if(native?.pending||!Number.isSafeInteger(native?.acknowledgedGeneration)||native.acknowledgedGeneration!==native.desired?.generation)return false;
 return !!native.desired.rows?.some(row=>row.role==='save'&&row.enabled&&row.visible!==false&&row.actionKind==='save'&&row.target&&targetKey(row.target)===targetKey(target));
}

export function selectedSetupLabel(target,accounts=[]){
 if(!target)return '';
 const account=accounts.find(item=>item.id===target.accountId);
 return (account?.name??target.accountId)+' · '+target.bucketName+'/'+(target.prefix??'');
}

// A read-only status may only see the missing plan; retain the recovery action
// already bound to this same clicked target, rather than hiding its approval.
export function selectedSetupCode(readiness,requestedCode){
 if(readiness?.state==='READY')return 'NATIVE_APPLY_INCOMPLETE';
 if(['SETUP_APPROVAL_REQUIRED','SETUP_APPROVAL_RECORD_MISSING','WORKER_UPGRADE_APPROVAL_REQUIRED','WORKER_BUILD_MISMATCH','CAPABILITY_DENIED','WORKER_SIGNING_RENEWAL_APPROVAL_REQUIRED','WORKER_DESTINATION_SCOPE_REQUIRED','SETUP_PROBE_REQUIRES_INSPECTION','WORKER_PREPARATION_UNCERTAIN','SETUP_IN_PROGRESS'].includes(requestedCode))return requestedCode;
 return readiness?.code??readiness?.worker?.code??requestedCode??readiness?.state;
}
