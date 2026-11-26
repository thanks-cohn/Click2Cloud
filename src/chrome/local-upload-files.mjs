// Chrome extension messaging is JSON. Pass only a short-lived ticket there;
// IndexedDB structured-clones the browser's File without reading it into JS.
export const localUploadPort = 'redown-local-upload';
const lifetime = 10 * 60_000;
let opening;

function open() {
  return opening ??= new Promise((resolve,reject)=>{
    const request=indexedDB.open('redown-local-upload-v1',4);
    request.onupgradeneeded=event=>{
      if(event.oldVersion<1)request.result.createObjectStore('files',{keyPath:'ticket'}).createIndex('expiry','expires');
      if(event.oldVersion<2)request.result.createObjectStore('claims');
      if(event.oldVersion<3){
        const batches=request.result.createObjectStore('batches',{keyPath:'id'});
        batches.createIndex('updatedAt','updatedAt');
        request.result.createObjectStore('manifests');
        request.result.createObjectStore('outcomes');
      }
      if(event.oldVersion<4){
        request.result.createObjectStore('selections',{keyPath:'id'}).createIndex('expiry','expires');
        request.result.createObjectStore('sources');
        request.transaction.objectStore('batches').createIndex('durableRunnable','durableRunnable');
      }
    };
    request.onblocked=()=>reject(Error('Reload other open REDOWN Shelves before uploading.'));
    request.onsuccess=()=>{
      request.result.onversionchange=()=>{request.result.close();opening=undefined;};
      resolve(request.result);
    };
    request.onerror=()=>reject(request.error);
  }).catch(error=>{opening=undefined;throw error;});
}
async function transact(work, table='files') {
  const store=(await open()).transaction(table,'readwrite');
  return new Promise((resolve,reject)=>{
    let value;
    store.oncomplete=()=>resolve(value);
    store.onabort=()=>reject(store.error??Error('Local upload file storage was interrupted.'));
    work(store.objectStore(table),next=>{value=next;});
  });
}
export const stageLocalUpload=(ticket,file,binding)=>transact(store=>{
  const stale=store.index('expiry').openKeyCursor(IDBKeyRange.upperBound(Date.now()));
  stale.onsuccess=()=>{
    const cursor=stale.result;
    if(cursor){store.delete(cursor.primaryKey);cursor.continue();}
  };
  store.put({ticket,file,binding,expires:Date.now()+lifetime});
});
export const discardLocalUpload=ticket=>transact(store=>store.delete(ticket));
export const takeLocalUpload=ticket=>transact((store,done)=>{
  const request=store.get(ticket);
  request.onsuccess=()=>{
    const staged=request.result;
    if(!staged)return;
    store.delete(ticket);
    if(staged.expires>Date.now()&&staged.file instanceof File)done(staged);
  };
});

// One durable owner per exact destination. Interrupted writes keep their
// claim until read-only reconciliation can prove a terminal outcome.
export const claimLocalUpload=(key,claim)=>transact((store,done)=>{
  const read=store.get(key);
  read.onsuccess=()=>{
    if(read.result)done(read.result);
    else store.add(claim,key);
  };
},'claims');
export const releaseLocalUpload=(key,id)=>transact(store=>{
  const read=store.get(key);
  read.onsuccess=()=>{if(read.result?.id===id)store.delete(key);};
},'claims');

// One transaction publishes a file outcome and advances its batch checkpoint.
// Manifests and outcomes are separate from the hot, fixed-size progress record.
async function batchTransaction(tables,mode,work) {
  const tx=(await open()).transaction(tables,mode,mode==='readwrite'?{durability:'strict'}:undefined);
  return new Promise((resolve,reject)=>{
    let value, cause;
    const done=result=>{value=result;};
    tx.oncomplete=()=>resolve(value);
    tx.onabort=()=>reject(cause??tx.error??Error('Local upload journal was interrupted.'));
    const guard=fn=>event=>{try{fn(event);}catch(error){cause=error;tx.abort();}};
    guard(()=>work(tx,done,guard))();
  });
}
const jobRange=id=>IDBKeyRange.bound([id],[id,[]]);

// A regular file picker yields File objects rather than reloadable handles.
// Structured clone stores each file in the extension origin's durable quota
// without reading the bytes into a JS array. The job owns the stored sources
// only after provider preflight and a successful acceptance transaction.
export async function persistUploadSelection(id,files,paths,signal){
  const estimate=await globalThis.navigator?.storage?.estimate?.();
  const bytes=files.reduce((sum,file)=>sum+file.size,0);
  if(Number.isFinite(estimate?.quota)&&Number.isFinite(estimate?.usage)&&bytes>estimate.quota-estimate.usage)
    throw Object.assign(Error('Chrome lacks storage to keep the selected files available after closing REDOWN.'),
      {code:'LOCAL_UPLOAD_STAGING_QUOTA'});
  await batchTransaction(['selections','sources'],'readwrite',tx=>{
    const selections=tx.objectStore('selections'),sources=tx.objectStore('sources');
    const expired=selections.index('expiry').openCursor(IDBKeyRange.upperBound(Date.now()));
    let removed=0;
    expired.onsuccess=()=>{
      const cursor=expired.result;
      if(!cursor||removed++>=24)return;
      sources.delete(jobRange(cursor.primaryKey));cursor.delete();cursor.continue();
    };
    selections.add({id,count:0,bytes,expires:Date.now()+lifetime});
  });
  try{
    for(let start=0;start<files.length;start+=32){
      signal?.throwIfAborted();
      const end=Math.min(files.length,start+32);
      await batchTransaction(['selections','sources'],'readwrite',tx=>{
        const sources=tx.objectStore('sources');
        for(let index=start;index<end;index++){
          const file=files[index];
          sources.add({file,relativePath:paths[index],name:file.name,size:file.size,lastModified:file.lastModified},[id,index]);
        }
        tx.objectStore('selections').put({id,count:end,bytes,expires:Date.now()+lifetime});
      });
    }
  }catch(error){await discardUploadSelection(id).catch(()=>{});throw error;}
}
export const discardUploadSelection=id=>batchTransaction(['selections','sources'],'readwrite',(tx,_done,guard)=>{
  const selections=tx.objectStore('selections');
  const request=selections.get(id);
  request.onsuccess=guard(()=>{
    if(!request.result||request.result.accepted)return;
    tx.objectStore('sources').delete(jobRange(id));selections.delete(id);
  });
});

const historyOutboxPrefix='history-projection:';
function putHistoryProjection(tx,batch){
  if(!batch.historyGroups)return;
  tx.objectStore('outcomes').put({id:batch.id,projectionId:crypto.randomUUID(),updatedAt:batch.updatedAt,startedAt:batch.startedAt,
    finishedAt:batch.finishedAt,phase:batch.phase,target:batch.target,code:batch.code,inFlightGroupId:batch.inFlight?.historyGroupId,groups:batch.historyGroups},
  historyOutboxPrefix+batch.id);
}

export const uploadBatchJournal=Object.freeze({
  create(batch,items){
    return batchTransaction(['batches','manifests','outcomes'],'readwrite',(tx,done,guard)=>{
      const batches=tx.objectStore('batches'), manifests=tx.objectStore('manifests');
      batches.add(batch);
      for(let index=0;index<items.length;index++)manifests.add(items[index],[batch.id,index]);
    });
  },
  accept(batch,id,count){
    return batchTransaction(['batches','selections','outcomes'],'readwrite',(tx,done,guard)=>{
      const selections=tx.objectStore('selections'),request=selections.get(id);
      request.onsuccess=guard(()=>{
        const row=request.result;
        if(!row||row.accepted||row.count!==count||row.expires<=Date.now())
          throw Object.assign(Error('Select the original files again.'),{code:'UPLOAD_FILE_UNAVAILABLE'});
        selections.put({id,count,rowBytes:row.bytes,accepted:true});
        tx.objectStore('batches').put(batch);
        putHistoryProjection(tx,batch);
        done(batch);
      });
    });
  },
  source(selectionId,index){
    return batchTransaction(['sources'],'readonly',(tx,done,guard)=>{
      const request=tx.objectStore('sources').get([selectionId,index]);
      request.onsuccess=guard(()=>done(request.result));
    });
  },
  releaseSource(selectionId,index){
    return batchTransaction(['selections','sources'],'readwrite',tx=>{
      const sources=tx.objectStore('sources');
      if(index===undefined){sources.delete(jobRange(selectionId));tx.objectStore('selections').delete(selectionId);}
      else sources.delete([selectionId,index]);
    });
  },
  runnable(limit=16){
    return batchTransaction(['batches'],'readonly',(tx,done,guard)=>{
      const request=tx.objectStore('batches').index('durableRunnable').getAll('yes',limit);
      request.onsuccess=guard(()=>done(request.result));
    });
  },
  requestCancel(id){
    return batchTransaction(['batches'],'readwrite',(tx,done,guard)=>{
      const batches=tx.objectStore('batches'),request=batches.get(id);
      request.onsuccess=guard(()=>{
        const batch=request.result;
        if(batch?.durableRunnable!=='yes')return;
        batch.cancelRequested=true;
        batches.put(batch);done(batch);
      });
    });
  },
  get(id){
    return batchTransaction(['batches'],'readonly',(tx,done,guard)=>{
      const request=tx.objectStore('batches').get(id);
      request.onsuccess=guard(()=>done(request.result));
    });
  },
  item(id,index){
    return batchTransaction(['manifests'],'readonly',(tx,done,guard)=>{
      const request=tx.objectStore('manifests').get([id,index]);
      request.onsuccess=guard(()=>done(request.result));
    });
  },
  latest(matches){
    return batchTransaction(['batches'],'readonly',(tx,done,guard)=>{
      const read=tx.objectStore('batches').index('updatedAt').openCursor(null,'prev');
      read.onsuccess=guard(()=>{
        const cursor=read.result;
        if(!cursor)return;
        if(matches(cursor.value))done(cursor.value);
        else cursor.continue();
      });
    });
  },
  save(batch,outcome){
    return batchTransaction(['batches','outcomes'],'readwrite',(tx,_done,guard)=>{
      const batches=tx.objectStore('batches'),outcomes=tx.objectStore('outcomes');
      const current=batches.get(batch.id);
      current.onsuccess=guard(()=>{
        const old=current.result;
        if(old?.processed>batch.processed)return;
        if(old?.cancelRequested)batch.cancelRequested=true;
        if(!outcome){batches.put(batch);putHistoryProjection(tx,batch);return;}
        const key=[batch.id,outcome.index],existing=outcomes.get(key);
        existing.onsuccess=guard(()=>{
          if(existing.result)return;
          outcomes.add(outcome,key);
          batches.put(batch);
          putHistoryProjection(tx,batch);
        });
      });
    });
  },
  historyProjections(limit=32){
    return batchTransaction(['outcomes'],'readonly',(tx,done,guard)=>{
      const read=tx.objectStore('outcomes').getAll(IDBKeyRange.bound(historyOutboxPrefix,historyOutboxPrefix+'\uffff'),limit);
      read.onsuccess=guard(()=>done(read.result));
    });
  },
  acknowledgeHistory(projection){
    return batchTransaction(['outcomes'],'readwrite',(tx,_done,guard)=>{
      const store=tx.objectStore('outcomes'),key=historyOutboxPrefix+projection.id,read=store.get(key);
      read.onsuccess=guard(()=>{
        if(read.result?.projectionId===projection.projectionId)store.delete(key);
      });
    });
  },
  detail(id){
    return batchTransaction(['batches','manifests','outcomes'],'readonly',(tx,done,guard)=>{
      const batch=tx.objectStore('batches').get(id);
      const items=tx.objectStore('manifests').getAll(jobRange(id));
      const outcomes=tx.objectStore('outcomes').getAll(jobRange(id));
      outcomes.onsuccess=guard(()=>done(batch.result&&{batch:batch.result,items:items.result,outcomes:outcomes.result}));
    });
  }
});
