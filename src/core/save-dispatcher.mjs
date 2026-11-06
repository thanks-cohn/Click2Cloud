// One dispatcher for native Chrome and the trusted mirror. No source provenance reaches providers.
import {observe, operationIdentity, errorOutcome} from './boundary-observation.mjs';
export class UnverifiedSaveError extends Error {
  constructor(message = 'Provider upload could not be independently verified', code = 'RECEIPT_UNVERIFIED') {
    super(message); this.name = 'UnverifiedSaveError'; this.code = code; this.uncertain=code!=='VERIFIER_UNAVAILABLE';
  }
}
export class SaveAuthorizationError extends Error {
  constructor() { super('The destination is no longer authorized'); this.name='SaveAuthorizationError'; this.code='AUTH_REVOKED'; }
}
export async function dispatchSave({intent,file}, {providers,authorize,onVerifiedCompletion,diagnostics,context={}}={}) {
  const scope={...context,operationId:operationIdentity(context)};
  let previous=observe(diagnostics,'intent','started','INTENT_VALIDATE',scope);
  const blockedAfter=(stage,signal)=>{
    const order=['intent','auth.check','worker.capability','transfer.upload','transfer.verify','completion.history'];
    for(let i=order.indexOf(stage)+1;i<order.length;i++)signal=observe(diagnostics,order[i],order[i]==='completion.history'?'skipped':'blocked','DEPENDENCY_BLOCKED',scope,[signal]);
  };
  if (!intent?.provider || !file?.filename || !(file.bytes instanceof Uint8Array)&&!(file.body instanceof ReadableStream)) {
    blockedAfter('intent',observe(diagnostics,'intent','failed','INTENT_INVALID',scope,[previous]));
    throw new TypeError('Save requires a provider intent, filename and Uint8Array bytes');
  }
  previous=observe(diagnostics,'intent','ok','INTENT_VALID',scope,[previous]);
  if (typeof authorize !== 'function') {
    blockedAfter('auth.check',observe(diagnostics,'auth.check','blocked','AUTH_REQUIRED',scope,[previous]));
    throw new SaveAuthorizationError();
  }
  if (authorize) {
    let authorized;
    try { authorized=await authorize(intent); }
    catch(error) { blockedAfter('auth.check',observe(diagnostics,'auth.check',errorOutcome(error),'AUTH_CHECK_FAILED',scope,[previous])); throw error; }
    if (authorized !== true) { blockedAfter('auth.check',observe(diagnostics,'auth.check','blocked','AUTH_REVOKED',scope,[previous])); throw new SaveAuthorizationError(); }
    previous=observe(diagnostics,'auth.check','ok','AUTH_VERIFIED',scope,[previous]);
  }
  const adapter=providers?.[intent.provider];
  if (!adapter || typeof adapter.upload !== 'function'&&typeof adapter.uploadStream !== 'function') {
    blockedAfter('worker.capability',observe(diagnostics,'worker.capability','blocked','PROVIDER_UNAVAILABLE',scope,[previous]));
    throw new TypeError('Provider adapter is not connected');
  }
  if (typeof adapter.verifyReceipt !== 'function') {
    blockedAfter('worker.capability',observe(diagnostics,'worker.capability','blocked','VERIFIER_UNAVAILABLE',scope,[previous]));
    throw new UnverifiedSaveError('Provider has no independent receipt verifier','VERIFIER_UNAVAILABLE');
  }
  previous=observe(diagnostics,'worker.capability','ok','PROVIDER_CAPABLE',scope,[previous]);
  const destination={bucket:intent.bucketName ?? intent.bucket ?? intent.container ?? null,path:intent.path ?? intent.prefix ?? '',destinationId:intent.destinationId ?? null,
    accountId:intent.accountId ?? intent.account ?? null,connectionId:intent.connectionId ?? intent.connection ?? null};
  // Exact destination identity is necessary for account/bucket isolation. No URLs/headers/cookies.
  const streamed=file.body instanceof ReadableStream;
  if(streamed&&typeof adapter.uploadStream!=='function')throw Object.assign(Error('STREAMING_PROVIDER_REQUIRED'),{code:'STREAMING_PROVIDER_REQUIRED'});
  const payload={destination,filename:file.filename,contentType:file.contentType ?? 'application/octet-stream',...(streamed?{body:file.body}:{bytes:file.bytes})};
  previous=observe(diagnostics,'transfer.upload','started','UPLOAD_STARTED',scope,[previous]);
  let receipt;
  try { receipt=await (streamed?adapter.uploadStream(payload):adapter.upload(payload)); }
  catch(error) { blockedAfter('transfer.upload',observe(diagnostics,'transfer.upload',errorOutcome(error),error?.uncertain?'UPLOAD_UNCERTAIN':error?.name==='AbortError'?'UPLOAD_CANCELLED':'UPLOAD_FAILED',scope,[previous])); throw error; }
  if (receipt?.confirmed !== true) {
    blockedAfter('transfer.upload',observe(diagnostics,'transfer.upload','uncertain','UPLOAD_UNCONFIRMED',scope,[previous]));
    throw new UnverifiedSaveError('Provider did not confirm the upload','UPLOAD_UNCONFIRMED');
  }
  previous=observe(diagnostics,'transfer.upload','ok','UPLOAD_ACKNOWLEDGED',scope,[previous]);
  previous=observe(diagnostics,'transfer.verify','started','VERIFY_STARTED',scope,[previous]);
  let verification;
  try { verification=await adapter.verifyReceipt({receipt,destination,filename:file.filename,...(streamed?{byteLength:file.byteLength}:{bytes:file.bytes})}); }
  catch(error) {
    blockedAfter('transfer.verify',observe(diagnostics,'transfer.verify','uncertain',error?.uncertain?'VERIFY_UNCERTAIN':'VERIFY_FAILED',scope,[previous]));
    const uncertain=new UnverifiedSaveError('Provider readback is incomplete. Inspect the destination before retrying.','VERIFY_UNCERTAIN');
    uncertain.cause=error;throw uncertain;
  }
  // Verifier must perform an independent provider HEAD/readback; a Boolean echo is insufficient.
  if (verification?.verified !== true || verification?.independent !== true ||
      verification?.byteLength !== (streamed?file.byteLength:file.bytes.byteLength) || streamed&&file.complete!==true || verification?.destinationMatches !== true ||
      !['provider-readback','provider-head-and-hash'].includes(verification?.evidenceClass)) {
    blockedAfter('transfer.verify',observe(diagnostics,'transfer.verify','failed','RECEIPT_MISMATCH',scope,[previous]));
    throw new UnverifiedSaveError();
  }
  previous=observe(diagnostics,'transfer.verify','ok','RECEIPT_VERIFIED',scope,[previous]);
  const result=Object.freeze({provider:intent.provider,filename:file.filename,receiptId:receipt.id ?? null,confirmed:true,
    verification:verification.evidenceClass});
  if(onVerifiedCompletion) {
    try { await onVerifiedCompletion(result); observe(diagnostics,'completion.history','ok','HANDOFF_COMMITTED',scope,[previous]); }
    catch(error) {
      observe(diagnostics,'completion.history','failed','HANDOFF_FAILED',scope,[previous]);
      // Upload remains verified; expose completion failure separately so callers never replay the write.
      return Object.freeze({...result,completion:'pending',completionCode:'HANDOFF_FAILED'});
    }
  } else observe(diagnostics,'completion.history','skipped','HANDOFF_EXTERNAL',scope,[previous]);
  return result;
}
