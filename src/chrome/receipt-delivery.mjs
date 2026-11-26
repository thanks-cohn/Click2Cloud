// Transfers and optional disk export have independent outcomes. This observer
// records the Chrome download ID and asks Chrome for terminal delivery evidence.
const safeError=value=>typeof value==='string'&&/^[A-Z][A-Z_]{1,63}$/.test(value)?value:null;

export function receiptDataURL(text){
 const bytes=new TextEncoder().encode(text);
 if(bytes.length>1_500_000)return null;
 let encoded;
 if(typeof bytes.toBase64==='function')encoded=bytes.toBase64();
 else{
  const chunks=[];
  for(let offset=0;offset<bytes.length;offset+=8192)
   chunks.push(String.fromCharCode(...bytes.subarray(offset,offset+8192)));
  encoded=btoa(chunks.join(''));
 }
 return 'data:application/json;base64,'+encoded;
}

export function observeReceiptDelivery({chrome,current,changed=()=>{},clock=Date.now}){
 const dispatching=new Set();
 async function record(scope,operationId,patch){
  const value=await current.updateReceiptDelivery(scope,operationId,{...patch,updatedAt:clock()});
  if(value)try{void Promise.resolve(changed(value)).catch(()=>{});}catch{}
  return value;
 }
 async function lookup(scope,operationId,id){
  const [item]=await chrome.downloads.search({id});
  if(item?.state==='complete'||item?.state==='interrupted')
   return record(scope,operationId,{state:item.state,downloadId:id,error:safeError(item.error)});
  if(!item)return record(scope,operationId,{state:'unconfirmed',downloadId:id,error:'CHROME_DOWNLOAD_ITEM_UNAVAILABLE'});
  return current.readReceiptDelivery(scope,operationId);
 }
 async function reconcile(){
  for(const delivery of await current.pendingReceiptDeliveries()){
   if(!delivery||dispatching.has(delivery.scope+':'+delivery.operationId))continue;
   if(delivery.state==='dispatching'){
    await record(delivery.scope,delivery.operationId,{state:'unconfirmed',error:'CHROME_DOWNLOAD_ID_UNAVAILABLE'});
   }else{
    await lookup(delivery.scope,delivery.operationId,delivery.downloadId).catch(()=>{});
   }
  }
 }
 async function download(scope,operationId,dispatch){
  const key=scope+':'+operationId;
  if(dispatching.has(key))return current.readReceiptDelivery(scope,operationId);
  dispatching.add(key);
  try{
   const starting=await current.createReceiptDelivery(scope,operationId,clock());
   if(!starting)return current.readReceiptDelivery(scope,operationId);
   const result=await dispatch();
   if(result?.state!=='download-requested'||!Number.isInteger(result.id))
    return record(scope,operationId,{state:result==='manual-required'?'manual-required':'disabled'});
   await record(scope,operationId,{state:'download-requested',downloadId:result.id});
   return await lookup(scope,operationId,result.id).catch(()=>current.readReceiptDelivery(scope,operationId));
  }catch(error){
   return record(scope,operationId,{state:'failed',error:safeError(error.code??error.message)??'CHROME_RECEIPT_DOWNLOAD_FAILED'});
  }finally{dispatching.delete(key);}
 }
 chrome.downloads?.onChanged?.addListener(delta=>{
  if(!['complete','interrupted'].includes(delta.state?.current))return;
  void current.receiptDeliveryForDownload(delta.id).then(delivery=>delivery&&record(delivery.scope,delivery.operationId,
   {state:delta.state.current,downloadId:delta.id,error:safeError(delta.error?.current)})).catch(()=>{});
 });
 return Object.freeze({download,reconcile,read:(scope,id)=>current.readReceiptDelivery(scope,id)});
}
