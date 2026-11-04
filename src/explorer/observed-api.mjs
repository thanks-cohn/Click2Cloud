import {classifyProviderFailure} from './failure-classification.mjs';
// Optional wrappers over the authoritative REDOWN API/transport. No retries or mutations.
import {observe,operationIdentity,errorOutcome} from '../core/boundary-observation.mjs';
const resultCodes={completed:'FILE_API_COMPLETED',started:'FILE_API_STARTED',failed:'FILE_API_FAILED',partial:'FILE_API_PARTIAL',uncertain:'FILE_API_UNCERTAIN',cancelled:'FILE_API_CANCELLED'};
const outcomes={completed:'ok',started:'started',failed:'failed',partial:'partial',uncertain:'uncertain',cancelled:'cancelled'};
const operations=new Set(['listRaw','readStream','connectionStatus','connect','disconnect','accounts','buckets','list','stat','upload','download','mkdir','copy','move','rename','delete','remoteIngest','preview','publicUrls','createBucket','profiles','prepareBucket','transferHistory','archiveEntries','archiveEntryUrl','extractArchiveEntry','inspect']);
function workerReason(data) {
  if(data?.ready===true)return 'WORKER_READY';
  if(data?.reason==='This bucket can be browsed, but file changes need its REDOWN Worker. Use Set up right-click destination.')return 'WORKER_NOT_PREPARED';
  if(data?.reason==='The bucket Worker rejected its saved authorization. Explicit destination setup is required.')return 'WORKER_AUTH_REJECTED';
  if(data?.reason==='Bucket Worker configuration needs an explicit update. Use Set up right-click destination.')return 'WORKER_CAPABILITY_MISMATCH';
  return 'WORKER_UNVERIFIED';
}
const progressCodes={started:'FILE_STARTED',uploading:'FILE_UPLOADING',verifying:'FILE_VERIFYING',committing:'FILE_COMMITTING',completed:'FILE_COMPLETED',partial:'FILE_PARTIAL',failed:'FILE_FAILED',uncertain:'FILE_UNCERTAIN',cancelled:'FILE_CANCELLED'};
export function observeFileApi(fileApi,{diagnostics,context={}}={}) {
  if(typeof fileApi?.run!=='function')throw TypeError('File API required');
  return Object.freeze({...fileApi,
    async run(operation,input={},options={}) {
      const {diagnosticContext,...businessOptions}=options;
      const scope={...context,...diagnosticContext};scope.operationId=operationIdentity(scope);
      let previous=observe(diagnostics,'fileApi.run','started',operations.has(operation)?'FILE_API_STARTED':'UNSUPPORTED_OPERATION',scope);
      const onProgress=businessOptions.onProgress;
      const forwarded={...businessOptions,onProgress:event=>{
        previous=observe(diagnostics,'fileApi.run',outcomes[event?.phase]||'started',progressCodes[event?.phase]||'FILE_PROGRESS',scope,[previous]);
        try{onProgress?.(event);}catch{/* Preserve REDOWN's presentation-isolation rule. */}
      }};
      try {
        const result=await fileApi.run(operation,input,forwarded);
        previous=observe(diagnostics,'fileApi.run',outcomes[result?.state]||'uncertain',operations.has(operation)?(resultCodes[result?.state]||'FILE_API_UNKNOWN'):'UNSUPPORTED_OPERATION',scope,[previous]);
        if(['failed','partial','uncertain','cancelled'].includes(result?.state))
          observe(diagnostics,'fileApi.run',outcomes[result.state],classifyProviderFailure(result),scope,[previous]);
        if(operation==='connectionStatus')observe(diagnostics,'worker.capability',result?.data?.ready===true?'ok':'blocked',workerReason(result?.data),scope,[previous]);
        if(operation==='remoteIngest')observe(diagnostics,'fileApi.run','partial','PROVENANCE_SHARED_LEGACY',scope,[previous]);
        if(['list','listRaw','accounts','buckets'].includes(operation))
          observe(diagnostics,'inventory.page',result?.state==='completed'?(result.data?.cursor?'partial':'ok'):outcomes[result?.state]||'uncertain',
            result?.state==='completed'?(result.data?.cursor?'INVENTORY_PARTIAL':'INVENTORY_PAGE_COMPLETE'):'INVENTORY_PAGE_FAILED',scope,[previous],result.data?.entries?.length||0);
        return result;
      } catch(error){observe(diagnostics,'fileApi.run',errorOutcome(error),'FILE_API_THROWN',scope,[previous]);throw error;}
    },
    async batch(operation,items,options={}) {
      const {diagnosticContext,...businessOptions}=options;
      const scope={...context,...diagnosticContext};scope.operationId=operationIdentity(scope);
      const signal=observe(diagnostics,'fileApi.batch','started','BATCH_STARTED',scope,[],items.length);
      try {
        // Keep authoritative scheduler, ambiguity halt and policy semantics intact.
        const result=await fileApi.batch(operation,items,businessOptions);
        for(const item of result.results||[]){if(item)observe(diagnostics,'fileApi.run',outcomes[item.state]||'uncertain',resultCodes[item.state]||'FILE_API_UNKNOWN',{...scope,operationId:operationIdentity(),parentOperation:scope.operationId},[signal]);}
        observe(diagnostics,'fileApi.batch',outcomes[result?.state]||'uncertain',result?.processed<result?.total?'BATCH_HALTED':'BATCH_COMPLETED',scope,[signal],result?.processed||0);
        return result;
      }catch(error){observe(diagnostics,'fileApi.batch',errorOutcome(error),'BATCH_FAILED',scope,[signal]);throw error;}
    }
  });
}
export function observeTransports({send,http},{diagnostics,context={}}={}) {
  const wrap=(stage,fn)=>async(...args)=>{
    const scope={...context,operationId:operationIdentity(context)};
    const signal=observe(diagnostics,stage,'started','TRANSPORT_STARTED',scope);
    try {
      const result=await fn(...args);
      const failed=result?.ok===false;
      observe(diagnostics,stage,failed?'failed':'ok',failed?'TRANSPORT_REJECTED':'TRANSPORT_RETURNED',scope,[signal]);
      return result;
    }catch(error){observe(diagnostics,stage,errorOutcome(error),error?.uncertain?'TRANSPORT_UNCERTAIN':error?.name==='AbortError'?'TRANSPORT_CANCELLED':'TRANSPORT_FAILED',scope,[signal]);throw error;}
  };
  return {send:wrap('transport.send',send),http:{...http,request:wrap('transport.http',http.request.bind(http)),boundedFetch:wrap('transport.http',http.boundedFetch.bind(http))}};
}
