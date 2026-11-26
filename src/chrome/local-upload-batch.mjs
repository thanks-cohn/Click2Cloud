import {normalizeTarget,targetKey} from '../core/menu-identity.mjs';
import {planLocalUpload,uploadId,uploadError} from './local-upload-plan.mjs';

const sameTarget=(a,b)=>targetKey(a)===targetKey(b);
const terminal=new Set(['verified','failed','cancelled','unconfirmed']);
const validCode=(value,fallback)=>/^[A-Z][A-Z0-9_]{1,79}$/.test(value??'')?value:fallback;
const fileCodes={verified:'LOCAL_UPLOAD_VERIFIED',failed:'LOCAL_UPLOAD_FAILED',skipped:'LOCAL_UPLOAD_SKIPPED',
  cancelled:'LOCAL_UPLOAD_CANCELLED',unconfirmed:'LOCAL_UPLOAD_UNCONFIRMED'};
const statusOf=result=>({completed:'verified',cancelled:'cancelled',uncertain:'unconfirmed',
  blocked:'failed',failed:'failed',skipped:'skipped'})[result.state]??'unconfirmed';

export function uploadBatchReceipt({batch,items,outcomes},version){
  const byIndex=new Map(outcomes.map(row=>[row.index,row]));
  return {
    schema:'redown.upload-batch',version:1,extensionVersion:version,batchId:batch.id,
    startedAt:batch.startedAt,finishedAt:batch.finishedAt,updatedAt:batch.updatedAt,
    destination:batch.target,mode:batch.mode,status:batch.phase,code:batch.code??null,
    expectedCount:batch.total,observedCount:batch.processed,counts:{...batch.counts,
      unprocessed:batch.total-batch.processed},uploadedCount:batch.uploaded,
    notification:{eligible:batch.phase==='verified',...batch.notification},
    receiptDownload:batch.receiptDownload??'off',
    ...(batch.receiptPolicy?{receiptPolicy:batch.receiptPolicy,observedVerifiedBytes:outcomes.reduce((sum,row)=>sum+(row.receipt?.size??0),0)}:{}),
    files:items.map((item,index)=>{
      const row=byIndex.get(index);
      const proof=row?.receipt;
      return {index,operationId:row?.operationId??null,relativePath:item.relativePath,
        intendedKey:item.key,intendedSize:item.size,observedKey:proof?.key??null,observedSize:proof?.size??null,
        status:row?.status??'unprocessed',code:row?.code??null,
        evidence:proof?{kind:'staging-byte-readback-and-final-r2-head',etag:proof.etag,
          version:proof.version,sha256:null}:null,finishedAt:row?.finishedAt??null};
    })
  };
}

/** Trusted local batch operations over the existing File API and upload claims. */
export function createLocalUploadBatches({journal,checkDestination,validatePlan,dispatch,dispatchStored,reconcile,notify,
    receiptEnabled,selectionReceiptPolicy,downloadReceipt,observe=()=>{},version,clock=Date.now}){
  const leases=new Map();
  const publicState=batch=>{
    if(!batch)return null;
    const {inFlight,...snapshot}=batch;
    return {...snapshot,next:batch.processed,activeIndex:inFlight?.index??null,uploaded:batch.uploaded+Number(inFlight?.uploaded===true)};
  };
  async function save(batch,outcome){
    batch.updatedAt=clock();
    await journal.save(batch,outcome);
  }
  async function effect(batch,field,action){
    try{
      const state=await action();
      batch[field]=state;
      await save(batch);
    }catch{
      batch[field]=field==='notification'?{state:'failed'}:'failed';
      await save(batch).catch(()=>{});
      observe(field==='notification'?'CUSTOM_NOTICE_OUTCOME_UNAVAILABLE':'UPLOAD_RECEIPT_DOWNLOAD_FAILED',batch.id);
    }
  }
  async function finish(batch,phase,code,outcome,publish){
    if(terminal.has(batch.phase))return;
    batch.phase=phase;
    delete batch.durableRunnable;
    batch.code=code;
    batch.finishedAt=clock();
    // Reserve at-most-once effects durably before crossing the Chrome boundary.
    batch.notification={state:phase==='verified'?'dispatching':'ineligible'};
    let receiptGate;
    try{receiptGate=batch.receiptPolicy?.qualifies?{mode:'automatic',batchId:batch.id}:await receiptEnabled();}catch{observe('UPLOAD_RECEIPT_PREFERENCE_UNAVAILABLE',batch.id);}
    batch.receiptDownload=receiptGate?'dispatching':'off';
    await save(batch,outcome);
    publish?.();

    if(phase==='verified'){
      // A failed or absent renderer acknowledgement belongs to this one attempt.
      await effect(batch,'notification',async()=>await notify(batch.id,batch.origin));
    }
    if(receiptGate){
      await effect(batch,'receiptDownload',async()=>{
        if(receiptGate.mode!=='automatic'&&await receiptEnabled()!==receiptGate)return 'disabled';
        const detail=await journal.detail(batch.id);
        return downloadReceipt(uploadBatchReceipt(detail,version),receiptGate);
      });
    }
  }
  async function pause(batch,code){
    if(terminal.has(batch.phase))return;
    batch.phase='paused';
    delete batch.durableRunnable;
    batch.code=code;
    await save(batch);
  }
  async function apply(batch,flight,result,cancelled,publish){
    const status=statusOf(result);
    const outcome={index:flight.index,operationId:flight.ticket,status,
      code:validCode(result.code,fileCodes[status]),
      ...(status==='verified'?{receipt:result.receipt}:{}),finishedAt:clock()};
    batch.processed++;
    batch.counts[status]++;
    if((flight.uploaded||status==='verified'))batch.uploaded++;
    if(result.receipt?.key&&result.receipt.key!==flight.key)batch.renamed++;
    batch.inFlight=null;
    batch.phase='ready';
    if(status==='unconfirmed')await finish(batch,'unconfirmed',outcome.code,outcome,publish);
    else if(cancelled||status==='cancelled')await finish(batch,'cancelled','LOCAL_UPLOAD_BATCH_CANCELLED',outcome,publish);
    else if(batch.counts.verified===batch.total)await finish(batch,'verified','LOCAL_UPLOAD_BATCH_VERIFIED',outcome,publish);
    else if((status!=='verified'&&!result.continue)||batch.processed===batch.total)
      await finish(batch,'failed',outcome.code==='LOCAL_UPLOAD_VERIFIED'?'LOCAL_UPLOAD_BATCH_PARTIAL':outcome.code,outcome,publish);
    else await save(batch,outcome);
    if(batch.selectionId&&status!=='unconfirmed')await journal.releaseSource(batch.selectionId,flight.index).catch(()=>{});
  }
  async function recover(batch){
    if(!batch||batch.durableRunnable==='yes'||terminal.has(batch.phase)||leases.has(batch.id)||batch.phase==='paused')return batch;
    // Recovered manifests persist paths and sizes, never the browser's local handles.
    leases.set(batch.id,{batch,busy:true});
    try{await pause(batch,'LOCAL_UPLOAD_RESELECT_REQUIRED');}
    finally{leases.delete(batch.id);}
    return batch;
  }
  const api=Object.freeze({
    async check(source,signal){
      await checkDestination(source,signal);
      return {state:'completed'};
    },
    async begin({source,batchId,mode,items,origin,selectionId},signal,token){
      if(!uploadId(batchId)||leases.has(batchId)||leases.size>=2)
        throw uploadError('RESOURCE_BUSY','Two upload batches may run at a time.');
      if(selectionId!==undefined&&(!uploadId(selectionId)||!dispatchStored))
        throw uploadError('UPLOAD_BATCH_INVALID','The stored selection is invalid.');
      if(!Array.isArray(items)||!items.length)
        throw uploadError('UPLOAD_SELECTION_EMPTY','Select at least one file. Empty folders cannot be uploaded.');
      const owner={token};
      leases.set(batchId,owner);
      try{
        const plan=await planLocalUpload({source,files:items,mode,signal,isolateInvalid:!!selectionId});
        const batch={id:batchId,target:plan.target,mode,total:plan.total,phase:'preparing',
          ...(Number.isInteger(origin?.windowId)?{origin:{windowId:origin.windowId}}:{}),
          startedAt:clock(),updatedAt:clock(),processed:0,uploaded:0,renamed:0,inFlight:null,
          counts:{verified:0,failed:0,skipped:0,cancelled:0,unconfirmed:0}};
        try{batch.receiptPolicy=await selectionReceiptPolicy?.(mode,plan.items);}
        catch{observe('UPLOAD_RECEIPT_PREFERENCE_UNAVAILABLE',batch.id);}
        await journal.create(batch,plan.items);
        owner.batch=batch;
        owner.busy=true;
        try{
          owner.binding=await checkDestination(plan.target,signal);
          await validatePlan?.(plan.items,owner.binding,signal);
          signal?.throwIfAborted();
          if(owner.detached){
            await pause(batch,'LOCAL_UPLOAD_RESELECT_REQUIRED');
            leases.delete(batchId);
          }else{
            batch.phase='ready';
            if(selectionId){
              batch.selectionId=selectionId;batch.durableRunnable='yes';
              await journal.accept(batch,selectionId,items.length);
            }else await save(batch);
          }
          return {state:'completed',batch:publicState(batch)};
        }catch(error){
          const code=validCode(error.code,'LOCAL_UPLOAD_UNAVAILABLE');
          await finish(batch,signal?.aborted?'cancelled':'failed',code);
          leases.delete(batchId);
          return {state:'blocked',code,error:error.message,batch:publicState(batch)};
        }finally{owner.busy=false;}
      }catch(error){leases.delete(batchId);throw error;}
    },
    async resume({source,batchId,items,origin},signal,token){
      const target=normalizeTarget(source);
      const batch=await journal.get(batchId);
      if(!batch||!sameTarget(batch.target,target)||batch.phase!=='paused'||batch.inFlight||
         leases.has(batchId)||leases.size>=2)
        throw uploadError('UPLOAD_BATCH_INVALID','This upload is not ready for reselection.');
      if(!Array.isArray(items)||!items.length)
        throw uploadError('UPLOAD_SELECTION_EMPTY','Select the original files or folders again.');
      const owner={batch,busy:true,token};
      leases.set(batchId,owner);
      try{
        const selection=await planLocalUpload({source:target,files:items,mode:batch.mode,signal});
        const prior=(await journal.detail(batchId)).items;
        const original=new Map(prior.map(item=>[item.key,item.size]));
        const selected=new Map(selection.items.map((item,index)=>[item.key,index]));
        const order=prior.slice(batch.processed).map(item=>selected.get(item.key));
        if(order.some(index=>index===undefined)||selection.items.some(item=>original.get(item.key)!==item.size))
          throw uploadError('UPLOAD_RESELECT_MISMATCH','Select the same folders or all remaining files with their original paths and sizes.');
        owner.binding=await checkDestination(target,signal);
        await validatePlan?.(prior.slice(batch.processed),owner.binding,signal);
        signal?.throwIfAborted();
        if(owner.detached){leases.delete(batchId);return {state:'completed',batch:publicState(batch)};}
        if(Number.isInteger(origin?.windowId))batch.origin={windowId:origin.windowId};
        batch.phase='ready';
        delete batch.code;
        const stale=batch.selectionId;
        delete batch.selectionId;
        delete batch.durableRunnable;
        await save(batch);
        if(stale)await journal.releaseSource(stale).catch(()=>{});
        return {state:'completed',batch:publicState(batch),order};
      }catch(error){
        leases.delete(batchId);
        throw error;
      }finally{owner.busy=false;}
    },
    async step({source,batchId,index,ticket},controller,onProgress,token){
      const owner=leases.get(batchId),batch=owner?.batch;
      if(!batch||owner.token!==token||owner.busy||batch.phase!=='ready'||!sameTarget(batch.target,normalizeTarget(source))||
         index!==batch.processed||index>=batch.total||!uploadId(ticket))
        throw uploadError('UPLOAD_BATCH_INVALID','Choose the local files again in the intended folder.');
      owner.busy=true;
      const {signal}=controller;
      try{
        const item=await journal.item(batchId,index);
        if(batch.cancelRequested)controller.abort();
        if(!item)throw uploadError('UPLOAD_BATCH_INVALID','The local upload plan is unavailable.');
        const flight={index,ticket,key:item.key,uploaded:false};
        batch.inFlight=flight;
        batch.phase='uploading';
        await save(batch);
        const publish=()=>{try{onProgress?.(publicState(batch));}catch{/* UI is optional. */}};
        publish();
        let result;
        try{
          signal.throwIfAborted();
          if(item.invalidCode)throw uploadError(item.invalidCode,'The selected path cannot be uploaded safely.');
          const staged=batch.selectionId?await journal.source(batch.selectionId,index):null;
          if(batch.selectionId&&!staged)throw uploadError('UPLOAD_FILE_UNAVAILABLE','This local source is unavailable.');
          const method=batch.selectionId?dispatchStored:dispatch;
          result=await method({ticket,batchId,index,source:batch.target,item,mode:batch.mode,staged},owner.binding,controller,event=>{
            if((event.phase==='verifying'||event.phase==='committing')&&!flight.uploaded){
              flight.uploaded=true;
              batch.phase='verifying';
              publish();
            }
          });
        }catch(error){
          result={state:signal.aborted?'cancelled':'failed',code:validCode(error.code,'LOCAL_UPLOAD_UNAVAILABLE'),error:error.message};
        }
        if(batch.selectionId&&result.state==='failed'&&!/AUTH|HTTP_429|QUOTA|RESOURCE_BUSY/.test(result.code??''))result.continue=true;
        if(batch.selectionId&&result.state==='uncertain'){
          await pause(batch,validCode(result.code,'LOCAL_UPLOAD_COMMIT_UNCONFIRMED'));
        }else await apply(batch,flight,result,signal.aborted||batch.cancelRequested,publish);
        if(terminal.has(batch.phase))leases.delete(batchId);
        else if(owner.detached){await pause(batch,'LOCAL_UPLOAD_RESELECT_REQUIRED');leases.delete(batchId);}
        return {state:result.state,code:result.code,error:result.error,batch:publicState(batch)};
      }finally{owner.busy=false;}
    },
    async stop(id,{detached=false,code}={},token){
      const owner=leases.get(id);
      if(!owner||owner.token!==token)return;
      if(!owner.batch||owner.busy){owner.detached ||= detached;return;}
      owner.busy=true;
      try{
        if(detached)await pause(owner.batch,'LOCAL_UPLOAD_RESELECT_REQUIRED');
        else await finish(owner.batch,code?'failed':'cancelled',validCode(code,'LOCAL_UPLOAD_BATCH_CANCELLED'));
        return publicState(owner.batch);
      }finally{leases.delete(id);}
    },
    async inspect({source,batchId,detail=false},signal){
      const target=normalizeTarget(source);
      const batch=batchId?await journal.get(batchId):await journal.latest(row=>sameTarget(row.target,target));
      if(!batch||!sameTarget(batch.target,target))return {state:'completed',batch:null};
      await recover(batch);
      signal?.throwIfAborted();
      const receipt=detail?uploadBatchReceipt(await journal.detail(batch.id),version):undefined;
      return {state:'completed',batch:publicState(leases.get(batch.id)?.batch??batch),...(receipt?{receipt}:{})};
    },
    async reconcile({source,batchId},signal){
      const target=normalizeTarget(source),batch=await journal.get(batchId);
      if(!batch||!sameTarget(batch.target,target)||leases.has(batchId))
        throw uploadError('UPLOAD_BATCH_INVALID','This upload cannot be reconciled right now.');
      const owner={batch,busy:true};
      leases.set(batchId,owner);
      try{
        const flight=batch.inFlight;
        const makeReady=async()=>{
          if(!batch.selectionId)return pause(batch,'LOCAL_UPLOAD_RESELECT_REQUIRED');
          batch.phase='ready';batch.durableRunnable='yes';delete batch.code;await save(batch);
        };
        if(flight&&!terminal.has(batch.phase)){
          const item=await journal.item(batchId,flight.index);
          const result=await reconcile({batch,flight,item,signal});
          if(result?.state==='reselect'){
            batch.inFlight=null;
            await makeReady();
          }else if(result){
            await apply(batch,flight,result,false);
            if(!terminal.has(batch.phase))await makeReady();
          }else await pause(batch,'LOCAL_UPLOAD_COMMIT_UNCONFIRMED');
        }else if(!terminal.has(batch.phase))await makeReady();
        return {state:'completed',batch:publicState(batch)};
      }finally{leases.delete(batchId);}
    },
    async cancelDurable(id){
      const saved=await journal.requestCancel(id);
      if(!saved)return null;
      const owner=leases.get(id);
      if(owner?.batch){owner.batch.cancelRequested=true;owner.controller?.abort();}
      return {state:'cancellation-requested',id};
    },
    async cancelDurableAll(){
      const pending=await journal.runnable(0xffffffff);
      return (await Promise.all(pending.map(batch=>api.cancelDurable(batch.id)))).filter(Boolean);
    },
    async driveDurable(candidate,onProgress){
      const id=candidate.id;
      let owner=leases.get(id);
      if(owner?.driving||owner?.busy||!owner&&leases.size>=2)return;
      if(!owner){
        owner={token:{},batch:candidate};
        leases.set(id,owner);
      }
      const {batch}=owner;
      if(batch?.durableRunnable!=='yes')return;
      owner.driving=true;
      try{
        if(batch.inFlight){
          const flight=batch.inFlight;
          const item=await journal.item(id,flight.index);
          const result=await reconcile({batch,flight,item});
          if(!result){await pause(batch,'LOCAL_UPLOAD_COMMIT_UNCONFIRMED');return;}
          if(result.state==='reselect'){
            batch.inFlight=null;batch.phase='ready';await save(batch);
          }else await apply(batch,flight,result,false);
        }
        if(batch.cancelRequested){
          await finish(batch,'cancelled','LOCAL_UPLOAD_BATCH_CANCELLED');
          return;
        }
        if(batch.durableRunnable!=='yes')return;
        owner.binding??=await checkDestination(batch.target);
        while(batch.phase==='ready'){
          if(batch.cancelRequested){await finish(batch,'cancelled','LOCAL_UPLOAD_BATCH_CANCELLED');break;}
          const controller=new AbortController();owner.controller=controller;
          // A stable ticket lets restart recovery inspect the exact publication
          // intent. A fresh ticket is used only after known precommit recovery.
          await api.step({source:batch.target,batchId:id,index:batch.processed,ticket:crypto.randomUUID()},
            controller,onProgress,owner.token);
          owner.controller=null;
          try{onProgress?.(publicState(batch));}catch{/* Presentation is optional. */}
        }
      }catch(error){
        if(batch.durableRunnable==='yes')await pause(batch,validCode(error.code,'LOCAL_UPLOAD_INTERRUPTED'));
      }finally{
        if(leases.get(id)===owner)leases.delete(id);
        if(terminal.has(batch.phase))await journal.releaseSource(batch.selectionId).catch(()=>{});
      }
    }
  });
  return api;
}
