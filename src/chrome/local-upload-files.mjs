// Chrome extension messaging is JSON. Pass only a short-lived ticket there;
// IndexedDB structured-clones the browser's File without reading it into JS.
export const localUploadPort = 'redown-local-upload';
const lifetime = 10 * 60_000;
let opening;

function open() {
  return opening ??= new Promise((resolve,reject)=>{
    const request=indexedDB.open('redown-local-upload-v1',3);
    request.onupgradeneeded=event=>{
      if(event.oldVersion<1)request.result.createObjectStore('files',{keyPath:'ticket'}).createIndex('expiry','expires');
      if(event.oldVersion<2)request.result.createObjectStore('claims');
      const batches=request.result.createObjectStore('batches',{keyPath:'id'});
      batches.createIndex('updatedAt','updatedAt');
      request.result.createObjectStore('manifests');
      request.result.createObjectStore('outcomes');
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
  const tx=(await open()).transaction(tables,mode);
  return new Promise((resolve,reject)=>{
    let value, cause;
    const done=result=>{value=result;};
    tx.oncomplete=()=>resolve(value);
    tx.onabort=()=>reject(cause??tx.error??Error('Local upload journal was interrupted.'));
    const guard=fn=>event=>{try{fn(event);}catch(error){cause=error;tx.abort();}};
    guard(()=>work(tx,done,guard))();
  });
}
export const uploadBatchJournal=Object.freeze({
  create(batch,items){
    return batchTransaction(['batches','manifests','outcomes'],'readwrite',(tx,done,guard)=>{
      const batches=tx.objectStore('batches'), manifests=tx.objectStore('manifests'), outcomes=tx.objectStore('outcomes');
      batches.add(batch);
      for(let index=0;index<items.length;index++)manifests.add(items[index],[batch.id,index]);
      const stale=batches.index('updatedAt').openCursor(IDBKeyRange.upperBound(Date.now()-7*86400_000));
      let removed=0,scanned=0;
      stale.onsuccess=guard(()=>{
        const cursor=stale.result;
        if(!cursor||removed>=24||scanned++>=100)return;
        const old=cursor.value;
        if(!['preparing','ready','uploading','verifying'].includes(old.phase)){
          cursor.delete();
          manifests.delete(IDBKeyRange.bound([old.id,0],[old.id,10000]));
          outcomes.delete(IDBKeyRange.bound([old.id,0],[old.id,10000]));
          removed++;
        }
        cursor.continue();
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
      let scanned=0;
      read.onsuccess=guard(()=>{
        const cursor=read.result;
        if(!cursor||scanned++>=100)return;
        if(matches(cursor.value))done(cursor.value);
        else cursor.continue();
      });
    });
  },
  save(batch,outcome){
    return batchTransaction(['batches','outcomes'],'readwrite',tx=>{
      tx.objectStore('batches').put(batch);
      if(outcome)tx.objectStore('outcomes').put(outcome,[batch.id,outcome.index]);
    });
  },
  detail(id){
    return batchTransaction(['batches','manifests','outcomes'],'readonly',(tx,done,guard)=>{
      const batch=tx.objectStore('batches').get(id);
      const items=tx.objectStore('manifests').getAll(IDBKeyRange.bound([id,0],[id,10000]));
      const outcomes=tx.objectStore('outcomes').getAll(IDBKeyRange.bound([id,0],[id,10000]));
      outcomes.onsuccess=guard(()=>done(batch.result&&{batch:batch.result,items:items.result,outcomes:outcomes.result}));
    });
  }
});
