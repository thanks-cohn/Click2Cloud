// Chrome extension messaging is JSON. Pass only a short-lived ticket there;
// IndexedDB structured-clones the browser's File without reading it into JS.
export const localUploadPort = 'redown-local-upload';
const lifetime = 10 * 60_000;
let opening;

function open() {
  return opening ??= new Promise((resolve,reject)=>{
    const request=indexedDB.open('redown-local-upload-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'ticket'}).createIndex('expiry','expires');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  }).catch(error=>{opening=undefined;throw error;});
}
async function transact(work) {
  const store=(await open()).transaction('files','readwrite');
  return new Promise((resolve,reject)=>{
    let value;
    store.oncomplete=()=>resolve(value);
    store.onabort=()=>reject(store.error??Error('Local upload file storage was interrupted.'));
    work(store.objectStore('files'),next=>{value=next;});
  });
}
export const stageLocalUpload=(ticket,file)=>transact(store=>{
  const stale=store.index('expiry').openKeyCursor(IDBKeyRange.upperBound(Date.now()));
  stale.onsuccess=()=>{
    const cursor=stale.result;
    if(cursor){store.delete(cursor.primaryKey);cursor.continue();}
  };
  store.put({ticket,file,expires:Date.now()+lifetime});
});
export const discardLocalUpload=ticket=>transact(store=>store.delete(ticket));
export const takeLocalUpload=ticket=>transact((store,done)=>{
  const request=store.get(ticket);
  request.onsuccess=()=>{
    const staged=request.result;
    if(!staged)return;
    store.delete(ticket);
    if(staged.expires>Date.now()&&staged.file instanceof File)done(staged.file);
  };
});
