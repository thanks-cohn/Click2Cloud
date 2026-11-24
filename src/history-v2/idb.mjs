export const read = request => new Promise((resolve,reject)=>{
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
});

export function database(name, schema, indexedDB=globalThis.indexedDB) {
  let opening;
  function open() {
    if(opening)return opening;
    const pending = new Promise((resolve,reject)=>{
      const request=indexedDB.open(name,1);
      let blocked=false;
      request.onblocked=()=>{blocked=true;reject(Error('HISTORY_V2_DATABASE_BLOCKED'));};
      request.onupgradeneeded=()=>{if(blocked)request.transaction.abort();else schema(request.result);};
      request.onsuccess=()=>{
        const db=request.result;
        if(blocked){db.close();return;}
        const close=()=>{db.close();if(opening===pending)opening=null;};
        db.onversionchange=close;
        db.onclose=close;
        resolve(db);
      };
      request.onerror=()=>reject(request.error);
    });
    opening=pending;
    pending.catch(()=>{if(opening===pending)opening=null;});
    return pending;
  }
  return async (names,mode,operation)=>{
    const db=await open();
    const tx=db.transaction(names,mode,mode==='readwrite'?{durability:'strict'}:undefined);
    const finished=new Promise((resolve,reject)=>{
      tx.oncomplete=resolve;
      tx.onabort=()=>reject(tx.error??Error('HISTORY_V2_TRANSACTION_ABORTED'));
    });
    finished.catch(()=>{});
    try {
      const result=await operation(...names.map(name=>tx.objectStore(name)),tx);
      await finished;
      return result;
    } catch(error) {
      try{tx.abort();}catch{}
      await finished.catch(()=>{});
      throw error;
    }
  };
}

export function cursorRows(index, range, direction, skip, limit) {
  return new Promise((resolve,reject)=>{
    const rows=[];
    if(!limit){resolve(rows);return;}
    const request=index.openCursor(range,direction);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const cursor=request.result;
      if(!cursor){resolve(rows);return;}
      if(skip){const step=Math.min(skip,0xffffffff);skip-=step;cursor.advance(step);return;}
      rows.push(cursor.value);
      if(rows.length<limit)cursor.continue();
      else resolve(rows);
    };
  });
}
