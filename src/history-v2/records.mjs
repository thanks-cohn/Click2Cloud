import {historyRecord,safeHistoryURL} from '../history/model.mjs';
import {hasVerifiedSave,independentlyConfirmedScreenshot} from '../history/verified-save.mjs';

export const sourceCoverage=Object.freeze({current:'Cloudflare save receipts and screenshot outputs retained in CURRENT',
  basic:'Provider placeholders on this build. No Basic save owner or receipt store is present.',
  gaps:'Attempts without durable owner receipts, including some preflight failures, cannot be reconstructed.'});
const text=(value,max=4096)=>typeof value==='string'&&value.length?value.slice(0,max):null;
const safeTime=value=>{
  const time=typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value)?Date.parse(value):value;
  return Number.isSafeInteger(time)&&time>=0&&time<=8640000000000000?time:null;
};
const number=value=>Number.isSafeInteger(value)&&value>=0?value:null;
const code=value=>typeof value==='string'&&/^[A-Z][A-Z0-9_]{1,95}$/.test(value)?value:null;
const pending=['pending','queued','uploading','verifying','running'];
const results={confirmed:'verified',failed:'failed',blocked:'blocked',cancelled:'canceled',canceled:'canceled',uploaded:'uploaded',unknown:'uncertain',uncertain:'uncertain'};
const destination=(target,key)=>target?{
  connectionId:text(target.connectionId),accountId:text(target.accountId),bucket:text(target.bucketName),prefix:typeof target.prefix==='string'?target.prefix.slice(0,4096):null,key:text(key)
}:null;

export function readOwnerAttempt(row) {
  if(!row||!['save','screenshot-to-cloud'].includes(row.kind)||!text(row.operationId,400)||row.operationId.length>400)return [];
  const shot=row.kind==='screenshot-to-cloud';
  const legacy=historyRecord(shot?{...row,screenshot:undefined}:row);
  const requestedAt=safeTime(row.at),observedAt=safeTime(row.updatedAt)??requestedAt??0;
  const common={schemaVersion:1,sourceApi:shot?'screenshot-current':'cloudflare-current',provider:'cloudflare',
    kind:shot?'screenshot-save':'save',attemptId:row.operationId,sourceRecordId:row.operationId,actionId:shot?text(row.screenshot?.plan?.captureId):null,
    requestedAt,recordedAt:observedAt||null,observedAt,saveMode:text(legacy.saveMode),hostTitle:text(legacy.hostPageTitle),
    hostname:text(legacy.hostname),sourceUrl:safeV2Url(legacy.sourceURL),hostUrl:safeV2Url(legacy.hostPageURL),
    originalUrl:null,remoteUrl:null,publicUrl:null,previewUrl:null};
  function make({output,plan,proof,state,receipt,target,key}) {
    const active=pending.includes(state)&&(!shot||(!row.screenshot?.finishedAt||pending.includes(row.state))&&!output?.at);
    const status=active?(state==='queued'?'waiting':'working'):proof?'verified':state==='confirmed'||state==='verified'?'uploaded':results[state]??'uncertain';
    const terminalAt=active?null:safeTime(output?.at)??safeTime(shot?row.screenshot?.finishedAt:null)??safeTime(row.updatedAt)??requestedAt;
    const outputId=text(output?.outputId??plan?.outputId,128);
    const name=text(key?.split('/').at(-1)??legacy.filename);
    const knownProgress=active&&Number.isFinite(row.progress)&&row.progress>=0&&row.progress<=100?row.progress:null;
    return {...common,recordId:JSON.stringify([common.sourceApi,row.operationId,outputId]),outputId,
      objectId:text(receipt?.version??output?.version),filename:name,originalFilename:text(legacy.originalFilename),
      size:number(output?.bytes??receipt?.size??row.bytes),mimeType:text(shot?'image/png':legacy.savedFileMetadata?.httpMetadata?.contentType),
      status,orderAt:terminalAt??requestedAt??-1,terminalAt,startedAt:safeTime(row.startedAt)??safeTime(row.screenshot?.attempts?.[0]?.startedAt),
      verifiedAt:proof?(safeTime(output?.at)??safeTime(row.badgeVerifiedAt)??terminalAt):null,
      verification:proof?{level:proof,checksum:text(output?.checksum??receipt?.checksum),etag:text(output?.etag??receipt?.etag)}:null,
      errorCode:code(output?.code??row.code),destination:destination(target,key),progress:knownProgress,stage:code(row.stage),
      capabilities:{open:shot?!!outputId&&!!target:status==='verified'&&!!key,preview:status==='verified'&&!!key,
        retry:shot&&!!outputId&&output?.recoverable===true&&!!row.screenshot?.cachedAt&&!row.screenshot.originalUnavailable},
      savedFileMetadata:shot?null:legacy.savedFileMetadata,
      sourceResult:text(state,60)};
  }
  if(!shot) {
    const {receipt}=row;
    return [make({proof:hasVerifiedSave(row)?row.proofKind:null,state:row.state,receipt,target:receipt?.destination??row.destination,key:receipt?.key})];
  }
  const job=row.screenshot;
  const outputs=Array.isArray(job?.outputs)?job.outputs:[],plans=Array.isArray(job?.plan?.outputs)?job.plan.outputs:[];
  if(!plans.length)return [make({state:row.state})];
  return plans.filter(plan=>typeof plan?.outputId==='string'&&plan.outputId.length>0&&plan.outputId.length<=128).map(plan=>{
    const output=outputs.find(item=>item?.outputId===plan.outputId);
    const proof=independentlyConfirmedScreenshot(output,plan.outputId)?output.verification:null;
    return make({state:output?.state??row.state,output,plan,proof,target:plan.target,key:plan.key});
  });
}

function safeV2Url(value) {
  const safe=safeHistoryURL(value);
  if(!safe)return null;
  const address=new URL(safe);
  address.search='';
  return address.href;
}

export function exportRecord(record,{privacy=true}={}) {
  // Export a deliberate allowlist. Upload metadata may contain arbitrary user keys/values.
  const {recordId,attemptId,actionId,outputId,sourceApi,sourceRecordId,provider,kind,filename,originalFilename,mimeType,size,
    status,sourceResult,destination,objectId,orderAt,requestedAt,startedAt,terminalAt,verifiedAt,recordedAt,observedAt,
    verification,errorCode,saveMode,hostTitle,hostname}=record;
  const url=value=>privacy?null:safeV2Url(value);
  return {schemaVersion:1,recordId,attemptId,actionId,outputId,sourceApi,sourceRecordId,provider,kind,filename,originalFilename,mimeType,size,
    status,sourceResult,destination,objectId,orderAt,requestedAt,startedAt,terminalAt,verifiedAt,recordedAt,observedAt,
    verification,errorCode,saveMode,hostTitle:privacy?null:hostTitle,hostname:privacy?null:hostname,
    sourceUrl:url(record.sourceUrl),hostUrl:url(record.hostUrl),originalUrl:url(record.originalUrl),remoteUrl:url(record.remoteUrl),publicUrl:url(record.publicUrl),previewUrl:url(record.previewUrl)};
}
