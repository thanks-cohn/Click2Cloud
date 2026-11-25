// Chrome extension messaging is JSON. Pass only a short-lived ticket there;
// IndexedDB structured-clones the browser's File without reading it into JS.
export const localUploadPort = 'redown-local-upload';
const lifetime = 10 * 60_000;
let opening;

function open() {
  return opening ??= new Promise((resolve,reject)=>{
    const request=indexedDB.open('redown-local-upload-v1',2);
    request.onupgradeneeded=event=>{
      if(event.oldVersion<1)request.result.createObjectStore('files',{keyPath:'ticket'}).createIndex('expiry','expires');
      request.result.createObjectStore('claims');
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
