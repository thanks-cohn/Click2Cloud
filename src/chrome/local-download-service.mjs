import {normalizeTarget} from '../core/menu-identity.mjs';
import {key,objectETag} from '../explorer/file-api.mjs';
import {canEmbedTags,downloadJob,preflightZip32,prepareTaggedPng,streamDownloadArchive} from '../explorer/download-archive.mjs';
import {assertExportIdentity,exportError,exportModes,listExportInventory,objectTags,safeObjectMetadata} from '../explorer/object-exports.mjs';
import {uploadCode,uploadReadScopes} from './local-upload-service.mjs';
import {retryableTransferCode,transferOutcomeClass,transferRetryDelay} from './transfer-outcome.mjs';
import {uploadId} from './local-upload-plan.mjs';

export const localDownloadChannel='redown-local-download';
export const downloadReceiptPreferenceKey='redownAutomaticDownloadReceiptsV1';
const scopes=Object.freeze(uploadReadScopes.filter(scope=>scope.endsWith('.read')));
const lifetime=60*60_000;
const activeStates=['queued','scanning','writing'];
const status={
 queued:'Queued',scanning:'Scanning',writing:'Writing',publishing:'Confirming local publication',
 verified:'Complete · file size verified',partial:'Partial · file size verified',blocked:'Action required',
 cancelled:'Cancelled',uncertain:'Local publication uncertain',failed:'Failed'
};
const fileError=response=>Object.assign(exportError(uploadCode(response.code,'FILE_READ_FAILED')),{retryAfterMs:response.retryAfterMs});
const fileIdentity=file=>({name:file.name,size:file.size,lastModified:file.lastModified});
const sameFile=(file,identity)=>Object.entries(identity).every(([field,value])=>file[field]===value);
function safeArtifact(job){
 const {authorityId,initialFile,entries,...receipt}=job;
 return {...receipt,status:status[job.state],
  ...(![...activeStates,'publishing'].includes(job.state)?{outcomeClass:transferOutcomeClass(job.state,job.error)}:{})};
}
function abortableDelay(ms,signal){
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);
  const abort=()=>{clearTimeout(timer);reject(signal.reason);};
  signal.addEventListener('abort',abort,{once:true});
 });
}

export function createLocalDownloads({current,authority,makeFileApi,allowExport=async()=>true,receiptEnabled=async()=>false,
 onReceipt=()=>{},onVerified=()=>{},onFailure=()=>{},clock=Date.now}){
 const active=new Map();

 async function authorize(source,expected){
  if(source.provider!=='cloudflare'||source.connectionId!=='cloudflare:'+source.accountId)throw exportError('SCOPE_UNAUTHORIZED');
  const auth=await authority();
  if(expected!==undefined&&auth.sessionId!==expected)throw exportError('AUTH_SESSION_CHANGED');
  if(!auth.accounts.some(account=>account.id===source.accountId))throw exportError('SCOPE_UNAUTHORIZED');
  if(!scopes.every(scope=>auth.scopes?.includes(scope)))throw exportError('INSUFFICIENT_SCOPE');
  return auth.sessionId;
 }
 function changed(job){
  const value=safeArtifact(job);
  try{void Promise.resolve(onReceipt(value)).catch(()=>{});}catch{/* Durable receipt owns transfer outcome. */}
  return value;
 }
 async function checkpoint(job,expected,patch,options){
  const next=await current.updateDownload(job.jobId,expected,patch,options);
  if(!next)throw exportError('DOWNLOAD_CLAIM_LOST');
  Object.assign(job,next);
  changed(job);
 }
 function entryFor(source,input){
  const objectKey=key(input?.key);
  if(input.folder||!objectKey.startsWith(source.prefix)||objectKey.endsWith('/'))throw exportError('SOURCE_SCOPE_MISMATCH');
  const entry={key:objectKey};
  if(Number.isSafeInteger(input.size)&&input.size>=0)entry.size=input.size;
  if(input.etag!=null)entry.etag=objectETag(input.etag);
  if(typeof input.version==='string'&&input.version.length<=256)entry.version=input.version;
  return entry;
 }
 async function admit(input){
  const {jobId,mode,forceCompanion=false}=input;
  if(!uploadId(jobId)||!exportModes.includes(mode))throw exportError('DOWNLOAD_MODE_INVALID');
  const source=normalizeTarget(input.source);
  const selection=input.entries??(input.entry?[input.entry]:null);
  if(selection!==null&&(!Array.isArray(selection)||!selection.length||selection.length>20_000))throw exportError('DOWNLOAD_SELECTION_INVALID');
  const entries=selection?.map(entry=>entryFor(source,entry))??null;
  if(entries&&new Set(entries.map(entry=>entry.key)).size!==entries.length)throw exportError('EXPORT_DUPLICATE_SOURCE');
  if(mode!=='original'&&!await allowExport(mode))throw exportError('EXPORT_METADATA_EXPERIMENT_DISABLED');
  const single=entries?.length===1&&!input.entries;
  const authorityId=await authorize(source);
  const initialFile=input.initialFile;
  if(typeof initialFile?.name!=='string'||!initialFile.name||initialFile.name.length>255||
     !Number.isSafeInteger(initialFile.size)||initialFile.size<0||!Number.isFinite(initialFile.lastModified))
   throw exportError('DOWNLOAD_DESTINATION_INVALID');
  const job={schema:'redown.local-download/1',...downloadJob(clock(),jobId),source,entries,
   mode,layout:single&&mode==='original'?'file':single&&mode==='tags'&&!forceCompanion&&canEmbedTags(entries[0])?'tagged-png':'archive',
   recursive:!entries,forceCompanion,name:initialFile.name,state:'queued',initialFile:{...fileIdentity(initialFile)},authorityId,
   expiresAt:clock()+lifetime,updatedAt:clock(),attempts:0,nextRetryAt:null,
   automaticReceipt:(await receiptEnabled().catch(()=>false))===true};
  return changed(await current.admitDownload(job));
 }
 async function drive(candidate){
  if(!candidate||active.has(candidate.jobId))return;
  const {jobId}=candidate,controller=new AbortController();
  active.set(jobId,controller);
  let job,writer;
  try{
   job=await current.readDownload(jobId);
   if(!job)return;
   if(job.state==='publishing'){
    await checkpoint(job,['publishing'],{state:'uncertain',error:'DOWNLOAD_PUBLICATION_UNCONFIRMED'},{terminal:true});
    return;
   }
   if(!activeStates.includes(job.state))return;
   if(job.cancelRequested){await checkpoint(job,activeStates,{state:'cancelled',error:job.cancelRequested},{terminal:true});return;}
   const remaining=job.expiresAt-clock();
   if(remaining<=0)throw exportError('DOWNLOAD_DEADLINE');
   const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(remaining)]);
   const handle=await current.readDownloadSink(jobId);
   if(!handle||typeof handle.queryPermission==='function'&&await handle.queryPermission({mode:'readwrite'})!=='granted')
    throw exportError('DOWNLOAD_DESTINATION_PERMISSION_REQUIRED');
   if(!sameFile(await handle.getFile(),job.initialFile))throw exportError('DOWNLOAD_DESTINATION_CHANGED');
   await authorize(job.source,job.authorityId);
   signal.throwIfAborted();
   const api=makeFileApi(job.authorityId);
   async function run(operation,params,extra){
    signal.throwIfAborted();
    const response=await api.run(operation,{source:job.source,...params},{signal,...extra});
    signal.throwIfAborted();
    if(response.state!=='completed')throw fileError(response);
    return response.data;
   }
   async function metadata(file){
    const data=await run('stat',{key:file.key});
    if(data.object?.key!==file.key)throw exportError('OBJECT_NOT_FOUND');
    const observed=safeObjectMetadata(data.object,job.source);
    if(job.mode!=='original')Object.assign(observed,objectTags(data.object));
    delete observed.customMetadata;
    delete observed.httpMetadata;
    // The existing explicit metadata archive mode includes sanitized provider metadata.
    if(job.mode==='metadata')Object.assign(observed,safeObjectMetadata(data.object,job.source));
    if(file.etag||file.size!==undefined||file.version){
     if(file.etag)assertExportIdentity({...observed,...file},observed);
     if(file.size!==undefined&&file.size!==observed.size||file.version&&file.version!==observed.version)
      throw exportError('OBJECT_CHANGED');
    }
    return observed;
   }
   async function read(file,onChunk){
    let bytes=0;
    const result=await run('readStream',{key:file.key,etag:file.etag,expectedSize:file.size,representationMetadata:true},
     {onChunk:async data=>{await onChunk(data);bytes+=data.byteLength;}});
    if(result.size!==file.size||bytes!==file.size)throw exportError('RANGE_RESPONSE_INVALID');
    // The GET is conditional. Recheck identity for representation-specific
    // responses and providers whose list exposes an object version.
    const after=await metadata(file);
    if(file.lastModified&&file.lastModified!==after.lastModified)throw exportError('OBJECT_CHANGED');
   }
   const saved=await current.readDownloadInventory(jobId);
   let inventory=saved;
   if(!inventory){
    await checkpoint(job,activeStates,{state:'scanning'});
    if(job.entries){
     const files=[];
     for(const entry of job.entries)files.push(await metadata(entry));
     inventory={files,pages:1,complete:true};
    }else{
     inventory=await listExportInventory(async (_source,cursor)=>{
      const page=await run('listRaw',{cursor,perPage:128});
      return {entries:page.entries.map(object=>{
       const {customMetadata,httpMetadata,...identity}=safeObjectMetadata(object,job.source);
       return identity;
      }),nextCursor:page.cursor};
     },job.source,{signal});
     if(!inventory.complete)throw exportError(inventory.code??'EXPORT_LIST_FAILED');
    }
    if(!inventory.files.length)throw exportError('DOWNLOAD_SELECTION_EMPTY');
    await checkpoint(job,activeStates,{state:'writing',expectedFiles:inventory.files.length},{inventory});
   }
   const file=inventory.files[0];
   if(job.layout==='archive')preflightZip32({source:job.source,inventory,mode:job.mode,recursive:job.recursive});
   let delivery,publicationSummary;
   for(;;){
    if(job.nextRetryAt!==null){
     await abortableDelay(Math.max(0,job.nextRetryAt-clock()),signal);
     const latest=await current.readDownload(jobId);
     if(latest?.cancelRequested)throw exportError(latest.cancelRequested);
    }
    await checkpoint(job,activeStates,{state:'writing',attempts:job.attempts+1,nextRetryAt:null});
    try{
     writer=await handle.createWritable({mode:'exclusive'});
     const write=bytes=>writer.write(bytes);
     if(job.layout==='file'){
      await read(file,write);
      delivery={state:'completed',files:1,bytes:file.size};
     }else if(job.layout==='tagged-png'){
      if(file.availability!=='observed')throw exportError('TAG_METADATA_UNAVAILABLE');
      const bytes=await prepareTaggedPng(file,file.tags,read);
      await write(bytes);
      delivery={state:'completed',files:1,bytes:bytes.length};
     }else{
      delivery=await streamDownloadArchive({source:job.source,inventory,mode:job.mode,recursive:job.recursive,job:{
       jobId:job.jobId,createdAt:job.createdAt,receiptName:job.receiptName
      },outputName:job.name,write,read,metadata,signal,forceCompanion:job.forceCompanion,
      onSummary:value=>{publicationSummary=value;}});
     }
     signal.throwIfAborted();
     await authorize(job.source,job.authorityId);
     if(!sameFile(await handle.getFile(),job.initialFile))throw exportError('DOWNLOAD_DESTINATION_CHANGED');
     break;
    }catch(error){
     try{await writer?.abort();}catch{/* Browser can independently abort its temporary file. */}
     writer=null;
     if(signal.aborted||!retryableTransferCode(error.code)||job.attempts>=3)throw error;
     const delay=transferRetryDelay(job.attempts,error.retryAfterMs);
     if(clock()+delay>=job.expiresAt)throw exportError('DOWNLOAD_RETRY_DEADLINE');
     await checkpoint(job,activeStates,{nextRetryAt:clock()+delay,retryCode:error.code});
     continue;
    }
   }
   // After this point an interrupted background cannot prove the close did
   // not publish. Never automatically rewrite an uncertain final file.
   await checkpoint(job,activeStates,{state:'publishing',files:delivery.files,bytes:delivery.bytes,
    errors:delivery.errors??0},{delivery:publicationSummary});
   signal.throwIfAborted();
   await writer.close();
   writer=null;
   if((await handle.getFile()).size!==delivery.bytes)throw exportError('DOWNLOAD_WRITE_UNCONFIRMED');
   const verified=delivery.state==='completed'&&delivery.files>0;
   await checkpoint(job,['publishing'],{state:verified?'verified':'partial',proof:'FILE_HANDLE_SIZE_REOPENED',
    ...(delivery.receiptName?{receiptName:delivery.receiptName}:{})},{terminal:true});
   if(verified)try{void Promise.resolve(onVerified(jobId,delivery.files)).catch(()=>{});}catch{}
  }catch(error){
   try{await writer?.abort();}catch{}
   if(!job)return;
   try{onFailure(error);}catch{}
   const cause=controller.signal.reason??error;
   const code=uploadCode(cause.code,uploadCode(cause.message,({QuotaExceededError:'LOCAL_DISK_EXHAUSTED',
    NotAllowedError:'DOWNLOAD_DESTINATION_PERMISSION_REQUIRED',TimeoutError:'DOWNLOAD_DEADLINE'})[cause.name]??'DOWNLOAD_FAILED'));
   const publishing=job.state==='publishing';
   const state=publishing?'uncertain':code==='DOWNLOAD_CANCELLED'?'cancelled':
    /AUTH|PERMISSION_REQUIRED|SCOPE/.test(code)?'blocked':'failed';
   await checkpoint(job,[...activeStates,'publishing'],{state,error:code},{terminal:true});
  }finally{active.delete(jobId);}
 }
 async function cancel(jobId,code='DOWNLOAD_CANCELLED'){
  if(!uploadId(jobId))throw exportError('DOWNLOAD_ID_INVALID');
  const saved=await current.updateDownload(jobId,activeStates,{cancelRequested:code});
  if(!saved)return false;
  active.get(jobId)?.abort(exportError(code));
  return true;
 }
 const claim=job=>globalThis.navigator?.locks
  ?navigator.locks.request('redown-local-download:'+job?.jobId,{ifAvailable:true},lock=>lock?drive(job):null)
  :drive(job);
 async function cancelAll(code){
  for(const job of await current.activeDownloads())if(job)await cancel(job.jobId,code);
 }
 return Object.freeze({admit,drive:claim,cancel,cancelAll:()=>cancelAll(),revoke:()=>cancelAll('AUTHORIZATION_REVOKED'),async list(){return (await current.recentDownloads()).map(safeArtifact);},
 async receipt(jobId){
  if(!uploadId(jobId))throw exportError('DOWNLOAD_ID_INVALID');
  const job=await current.readDownload(jobId);
  if(!job)throw exportError('DOWNLOAD_NOT_FOUND');
  return {...safeArtifact(job),inventory:(await current.readDownloadInventory(jobId))??null,
   archive:(await current.readDownloadDelivery(jobId))??null};
 }});
}
