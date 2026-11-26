import {labError} from './spool.mjs';

const stageCodes=Object.freeze({
 'trusted-storage':'LAB_TRUSTED_STORAGE_UNAVAILABLE',
 'extension-identity':'LAB_EXTENSION_ID_MISMATCH',
 'input-validation':'INVALID_INPUT',
 'native-permission':'NATIVE_PERMISSION_CHECK_FAILED',
 'native-api':'NATIVE_API_UNAVAILABLE',
 'account-discovery':'LAB_ACCOUNT_DISCOVERY_FAILED',
 'bucket-listing':'PROVIDER_READ_FAILED',
 authorization:'LAB_AUTHORIZATION_CHECK_FAILED',
 'selected-bucket':'LAB_BUCKET_CHECK_FAILED',
 'recovery-scope':'LAB_RECOVERY_SCOPE_NOT_FOUND',
 'worker-prefix':'LAB_WORKER_PREFIX_FAILED',
 'upload-readiness':'LAB_UPLOAD_READINESS_FAILED',
 'opfs-capability':'LAB_OPFS_UNAVAILABLE',
 'spool-init-cleanup':'LAB_SPOOL_INITIALIZATION_FAILED',
 'storage-estimate':'LAB_STORAGE_ESTIMATE_FAILED',
 'auth-recheck':'LAB_AUTHORIZATION_CHECK_FAILED',
 'native-port-launch':'NATIVE_HOST_LAUNCH_FAILED',
 'native-handshake':'NATIVE_HANDSHAKE_INVALID',
 pairing:'PAIRING_FAILED',
 lifecycle:'LAB_REQUEST_FAILED'
});
const causeNames=new Set(['Error','TypeError','RangeError','SyntaxError','AbortError','TimeoutError',
 'SecurityError','NotAllowedError','NotFoundError','NotSupportedError','InvalidStateError',
 'QuotaExceededError','UnknownError','NetworkError']);
const unavailable=new Set(['NATIVE_PERMISSION_DENIED','NATIVE_API_UNAVAILABLE','NATIVE_HOST_NOT_REGISTERED',
 'LAB_OPFS_UNAVAILABLE','LAB_STORAGE_ESTIMATE_UNAVAILABLE','AUTH_REQUIRED','LAB_TARGET_REQUIRED']);
const guidance=Object.freeze({
 NATIVE_PERMISSION_DENIED:'Use Start session to grant the optional native messaging permission.',
 NATIVE_PERMISSION_REVOKED:'Start a new session and grant native messaging again.',
 NATIVE_API_UNAVAILABLE:'Once REDOWN work is idle, reload REDOWN once from chrome://extensions, reopen Settings and retry.',
 NATIVE_HOST_NOT_REGISTERED:'Run install-host from the REDOWN CLI virtual environment for this Chrome user.',
 NATIVE_HOST_FORBIDDEN:'Check the Chrome profile policy and the registered extension ID.',
 NATIVE_HOST_LAUNCH_FAILED:'Check the native helper installation from CMD and retry.',
 NATIVE_HOST_EXITED:'Check the native helper installation and start a new session.',
 NATIVE_HOST_DISCONNECTED:'Start a new session and use its new pairing command.',
 NATIVE_HANDSHAKE_TIMEOUT:'Check that the helper can start, then start a new session.',
 NATIVE_HANDSHAKE_INVALID:'Reinstall the helper from the matching REDOWN checkout and retry.',
 LAB_AUTHORIZATION_EXPIRED:'Start a new session and use its new pairing command.',
 AUTH_REQUIRED:'Connect Cloudflare in Remotes.',
 REAUTH_REQUIRED:'Reconnect Cloudflare in Remotes.',
 AUTH_SESSION_CHANGED:'Start a new session with the current Cloudflare authorization.',
 LAB_TARGET_REQUIRED:'Choose an existing QA bucket to check its authorization and readiness.',
 WORKER_SETUP_REQUIRED:'Choose an existing QA bucket with a prepared REDOWN Worker.',
 WORKER_UPGRADE_APPROVAL_REQUIRED:'Use the normal REDOWN Worker update flow if approved.',
 LAB_OPFS_UNAVAILABLE:'Check extension storage access in this Chrome profile and retry.',
 LAB_STORAGE_ESTIMATE_UNAVAILABLE:'Chrome did not provide a storage estimate.',
 LAB_WORKER_RESTARTED:'Reopen Settings and start a new laboratory session.',
 PAIRING_CODE_UNAVAILABLE:'Request a new pairing code in Settings.',
 PAIRING_CODE_REJECTED:'Copy the current pairing command from Settings.'
});
const stableMessages=new Set(['SCOPE_UNAUTHORIZED','PROVIDER_PAGINATION_UNAVAILABLE']);
const safeRevision=value=>typeof value==='string'&&/^[a-f0-9]{7,64}$/.test(value)?value:null;

export function diagnosticCode(error,fallback='LAB_REQUEST_FAILED'){
 const code=error?.code;
 if(typeof code==='string'&&/^[A-Z][A-Z0-9_]{1,79}$/.test(code))return code;
 if(stableMessages.has(error?.message))return error.message;
 return fallback;
}

export function describeLabFailure(error,fallback){
 const code=diagnosticCode(error,fallback);
 return {code,causeName:causeNames.has(error?.name)?error.name:'UnknownError',
  recovery:guidance[code]??'Review the failed stage and retry from Python Laboratory Settings.'};
}

// Each wait also aborts consumers that accept a signal. Promises from APIs
// that cannot be interrupted may settle later without advancing the attempt.
export async function boundedLabStep(work, parent, timeoutMs, timeoutCode='LAB_STAGE_TIMEOUT'){
 const controller=new AbortController();
 const signal=controller.signal;
 const cancel=()=>controller.abort(parent.reason);
 if(parent?.aborted)cancel();
 else parent?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>controller.abort(labError(timeoutCode)),timeoutMs);
 let rejectAbort;
 const aborted=new Promise((_,reject)=>{
  rejectAbort=()=>reject(signal.reason);
  signal.addEventListener('abort',rejectAbort,{once:true});
 });
 try{
  signal.throwIfAborted();
  return await Promise.race([aborted,Promise.resolve().then(()=>{
   signal.throwIfAborted();
   return work(signal);
  })]);
 }finally{
  clearTimeout(timer);
  parent?.removeEventListener('abort',cancel);
  signal.removeEventListener('abort',rejectAbort);
 }
}

export function createLabReport(kind,build){
 const started=performance.now(),correlationId=crypto.randomUUID();
 const stages=Object.fromEntries(Object.keys(stageCodes).map(stage=>[stage,{stage,outcome:'NOT_REACHED'}]));
 let firstFailure=null,outcome='CHECKING',finishedAt=null;
 function mark(stage,status,{error,elapsedMs=0,optional=false}={}){
  const row={stage,outcome:status,elapsedMs:Math.round(elapsedMs),
   ...(error?describeLabFailure(error,stageCodes[stage]):{})};
  stages[stage]=row;
  if(error&&!optional&&firstFailure===null)firstFailure=row;
  return row;
 }
 return {
  mark,
  finish(value){outcome=value;finishedAt=performance.now();},
  snapshot(){return {
   schema:'redown.python-lab.diagnostics/1',kind,correlationId,outcome,
   build:{version:build.extensionVersion,revision:safeRevision(build.revision),
    sourceDigest:safeRevision(build.sourceDigest),engineVersion:build.apiVersion},
   elapsedMs:Math.round((finishedAt??performance.now())-started),firstFailure,stages:Object.values(stages),
   providerRoundTrip:'NOT_TESTED_BY_DIAGNOSTICS'
  };},
  async run(stage,work,{signal,timeoutMs=10_000,timeoutCode}={}){
   const at=performance.now();
   mark(stage,'RUNNING');
   try{
    const result=await boundedLabStep(work,signal,timeoutMs,timeoutCode);
    mark(stage,'PASS',{elapsedMs:performance.now()-at});
    return result;
   }catch(error){
    const code=diagnosticCode(error,stageCodes[stage]);
    mark(stage,unavailable.has(code)?'UNAVAILABLE':'FAIL',{error,elapsedMs:performance.now()-at});
    throw labError(code);
   }
  }
 };
}
