import {historyRecord, safeHistoryURL} from '../history/model.mjs';
import {hasVerifiedSave,independentlyConfirmedScreenshot} from '../history/verified-save.mjs';

const text = value => typeof value === 'string' && value ? value.slice(0,8192) : null;
const number = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const time = value => number(typeof value === 'string' ? Date.parse(value) : value);
const code = value => /^[A-Z][A-Z0-9_]{1,79}$/.test(value ?? '') ? value : null;
const location = (value = {}, key) => ({
  account: text(value.accountId), connection: text(value.connectionId), bucket:text(value.bucketName),
  folder:text(value.prefix), key:text(key), drive:text(value.rootId), namespace:text(value.namespace), path:text(value.path)
});
function base(source, id, fields) {
  const {terminalAt, requestedAt, updatedAt, ...rest} = fields;
  return {schemaVersion:1,recordId:source+':'+id,sourceRecordId:id,sourceApi:source,attemptId:id,
    actionId:null,deliveryId:null,providerObjectId:null,filename:null,originalFilename:null,hostTitle:null,
    hostname:null,sourceUrl:null,hostUrl:null,originalUrl:null,remoteUrl:null,publicUrl:null,previewUrl:null,
    destination:null,bytes:null,mime:null,saveMode:null,proofLevel:null,etag:null,version:null,checksum:null,
    code:null,metadata:null,durationMs:null,verifiedAt:null,kind:'save',terminal:false,
    requestedAt,startedAt:requestedAt,terminalAt,updatedAt,recordedAt:updatedAt,
    sortAt:terminalAt ?? requestedAt ?? 0, ...rest};
}

export function basicReceipt(row) {
  if (!row?.id || !['google','onedrive','dropbox'].includes(row.provider)) return [];
  const verified = row.state === 'SAVED' && row.confirmed === true && !!row.objectId;
  const terminal = ['SAVED','FAILED','UNCERTAIN','CANCELLED'].includes(row.state);
  const waiting = ['AWAITING_AUTH','AWAITING_SOURCE'].includes(row.state);
  const status = verified ? 'verified' : terminal ? row.state==='CANCELLED'?'cancelled':row.state==='FAILED'?'failed':'uncertain' :
    (row.cancelRequested||row.state==='CANCELLING')?'cancelling':row.state==='CONFIRMING'?'verifying':row.state==='UPLOADING'?'uploading':
    row.state==='AWAITING_AUTH'?'needs-login':waiting?'waiting':'working';
  const updatedAt = time(row.updatedAt), requestedAt = time(row.createdAt);
  return [base('basic:'+row.provider,row.id,{
    provider:row.provider,status,terminal,updatedAt,requestedAt,terminalAt:terminal ? updatedAt : null,
    verifiedAt:verified ? time(row.badgeVerifiedAt) ?? updatedAt : null,
    proofLevel:verified?'provider-confirmed-object':null, providerObjectId:text(row.objectId),
    filename:text(row.filename),sourceUrl:safeHistoryURL(row.sourceUrl),hostUrl:safeHistoryURL(row.hostUrl),
    bytes:number(row.bytes),mime:text(row.mime),destination:location(row.destination),code:code(row.code),
    durationMs:number(row.durationMs),parentAttemptId:text(row.parentAttemptId),
    cancellable:!terminal&&!row.cancelRequested&&!['CONFIRMING','CANCELLING'].includes(row.state)&&(row.state!=='UPLOADING'||row.cancellable===true),
    retryable:row.retryable===true&&!row.retryAttemptId,retryExpiresAt:time(row.retryExpiresAt),
    rank:verified||status==='cancelled'?3:waiting?2:terminal?1:0
  })];
}

export function currentReceipt(row, {interrupted = false} = {}) {
  if (!row?.operationId || !['save','depth-click','screenshot-to-cloud'].includes(row.kind ?? 'save') ||
      row.kind==='depth-click'&&(row.cause||row.state==='pending')) return [];
  if (row.kind === 'screenshot-to-cloud' && row.screenshot) return screenshotReceipts(row, interrupted);
  const view = historyRecord(row), receipt = row.receipt;
  const updatedAt = time(row.updatedAt) ?? time(row.at), requestedAt = time(row.at);
  const verified = hasVerifiedSave(row);
  const terminal = row.state !== 'pending';
  const status = verified ? 'verified' : interrupted ? 'uncertain' : !terminal ? (row.code==='CANCELLATION_REQUESTED_INSPECT'?'cancelling':/VERIFY|HEAD/.test(row.code ?? '')?'verifying':'working') :
    ['failed','blocked','cancelled'].includes(row.state)?row.state:row.state==='uploaded'?'uploaded':'uncertain';
  return [base('r2',row.operationId,{
    provider:'cloudflare',status,terminal,updatedAt,requestedAt,terminalAt:terminal?updatedAt:null,
    verifiedAt:verified?time(row.badgeVerifiedAt):null,proofLevel:verified?text(row.proofKind):null,
    filename:view.filename,originalFilename:view.originalFilename,hostTitle:view.hostPageTitle,
    hostname:view.hostname,sourceUrl:safeHistoryURL(row.historyContext?.sourceURL),originalUrl:safeHistoryURL(receipt?.provenance?.sourceUrl),
    hostUrl:view.hostPageURL,bytes:number(receipt?.size ?? row.bytes),
    mime:text(view.savedFileMetadata?.httpMetadata?.contentType), saveMode:view.saveMode,
    metadata:view.savedFileMetadata,metadataAvailability:view.metadataAvailability,
    ...(row.saveMode==='local-upload'?{origin:'manual-local',includeHistory:row.localUpload?.ordinaryHistory?.include!==false}:{}),
    destination:location(receipt?.destination ?? row.destination,receipt?.key),providerObjectId:text(receipt?.key),
    etag:text(receipt?.etag),version:text(receipt?.version),durationMs:number(row.durationMs),
    code:interrupted?'SAVE_OUTCOME_UNCERTAIN':code(row.code),
    ...(row.remotePending?{queueTerminal:false}:{}),
    cancellable:(!terminal||row.remotePending===true)&&status!=='cancelling'&&!!row.destination,
    rank:verified||status==='cancelled'?3:terminal||interrupted?1:0
  })];
}

export function localDownloadReceipt(row){
  const terminal=!['queued','scanning','writing','publishing'].includes(row.state);
  const updatedAt=time(row.updatedAt),requestedAt=time(row.createdAt);
  const status=terminal?row.state:row.state==='publishing'?'verifying':row.state==='queued'?'waiting':'working';
  return [base('r2-download',row.jobId,{
    provider:'cloudflare',kind:'download',status,terminal,updatedAt,requestedAt,terminalAt:terminal?updatedAt:null,
    filename:row.name,bytes:number(row.bytes),destination:location(row.source),includeHistory:false,
    proofLevel:row.state==='verified'?row.proof:null,code:code(row.error),
    cancellable:!terminal&&row.state!=='publishing',rank:row.state==='verified'||status==='cancelled'?3:terminal?1:0
  })];
}

export function folderUploadReceipts(batch){
  const terminal=['verified','failed','cancelled','unconfirmed'].includes(batch.phase);
  return batch.groups.map(group=>{
    const {verified,failed,skipped,cancelled,unconfirmed}=group.counts;
    const allVerified=group.total>0&&group.eligible===group.total&&verified===group.total;
    const status=allVerified?'verified':unconfirmed||batch.inFlightGroupId===group.id&&
      batch.code==='LOCAL_UPLOAD_COMMIT_UNCONFIRMED'?'uncertain':
      terminal?(verified?'partial':batch.phase==='cancelled'?'cancelled':'failed'):batch.phase==='paused'?'waiting':'working';
    return base('r2-folder-upload',group.id,{
      provider:'cloudflare',kind:'folder-upload',origin:'manual-local',status,terminal:terminal||allVerified,
      archivePending:true,filename:group.root,requestedAt:batch.startedAt,updatedAt:batch.updatedAt,
      terminalAt:terminal?batch.finishedAt??batch.updatedAt:null,sortAt:batch.startedAt,
      destination:location({...batch.target,prefix:batch.target.prefix+group.root+'/'}),
      folderUpload:{total:group.total,verified,failed,skipped,cancelled,unconfirmed,candidates:group.candidates??[],representative:null}
    });
  });
}

function screenshotReceipts(row, interrupted) {
  const view = historyRecord(row), record = view.screenshot;
  const requestedAt = time(record.startedAt) ?? time(row.at);
  const updatedAt = time(row.updatedAt) ?? time(record.finishedAt) ?? requestedAt;
  const outputs = record.outputs.filter(output=>output.outputId);
  const observed=new Map(row.screenshot.plan.outputs.map((output,index)=>[output.outputId,row.screenshot.outputs?.[index]]));
  const fields = {provider:'cloudflare',kind:'screenshot',attemptId:row.operationId,actionId:row.operationId,
    requestedAt,updatedAt,hostUrl:view.hostPageURL,hostTitle:view.hostPageTitle,
    filename:'Screenshot',mime:'image/png',bytes:number(record.captured?.bytes),method:record.method ?? null,
    captureId:record.captureId,retryExpiresAt:time(record.retryExpiresAt)};
  const parent = base('screenshot',row.operationId,{
    ...fields,terminalAt:null,status:'working',...(outputs.length?{removeJob:true}:{rank:0})
  });
  if (!outputs.length) {
    if (!record.finishedAt) return [interrupted ? {...parent,status:'uncertain',rank:1,code:'SAVE_OUTCOME_UNCERTAIN'} : parent];
    const status = record.state==='failed'||record.state==='blocked'?record.state:'uncertain';
    return [{...parent,terminal:true,status,terminalAt:time(record.finishedAt)??updatedAt,
      sortAt:time(record.finishedAt)??updatedAt??0,rank:1,code:interrupted?'SAVE_OUTCOME_UNCERTAIN':record.code}];
  }
  return [parent,...outputs.map(output=>{
    const verified=independentlyConfirmedScreenshot(observed.get(output.outputId),output.outputId);
    const terminal = verified || !!record.finishedAt;
    const terminalAt = terminal ? time(output.at) ?? time(record.finishedAt) ?? updatedAt : null;
    const status = verified?'verified':interrupted?'uncertain':!terminal?'uploading':
      ['failed','blocked'].includes(output.state)?output.state:'uncertain';
    return base('screenshot',output.outputId,{
      ...fields,sourceRecordId:row.operationId,deliveryId:output.outputId,status,terminal,terminalAt,
      filename:output.key?.split('/').at(-1) ?? fields.filename,bytes:number(output.bytes)??fields.bytes,
      destination:location(output.destination,output.key),providerObjectId:text(output.key),
      proofLevel:verified?output.verification:null,verifiedAt:verified?terminalAt:null,
      etag:text(output.etag),version:text(output.version),code:code(output.code),
      checksum:/^[0-9a-f]{64}$/.test(output.checksum??record.captured?.sha256??'')?output.checksum??record.captured.sha256:null,
      recoverable:output.recoverable===true,httpStatus:number(output.httpStatus),
      rank:verified?3:terminal||interrupted?1:0
    });
  })];
}
