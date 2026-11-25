import {uploadReceiptPreferenceKey} from './debug-preference.mjs';
import {uploadId} from './local-upload-plan.mjs';

export async function uploadReceiptGate(storage){
  const data=await storage.get(['uiDebugMode',uploadReceiptPreferenceKey]);
  const gate=data[uploadReceiptPreferenceKey];
  return data.uiDebugMode===true&&uploadId(gate)?gate:null;
}
export const uploadReceiptFilename=id=>'redown-upload-receipt-'+id+'.json';

async function requestDownload(chrome,url,id,gate){
  if(await uploadReceiptGate(chrome.storage.local)!==gate)return 'disabled';
  const downloadId=await chrome.downloads.download({url,filename:uploadReceiptFilename(id),saveAs:false});
  if(!Number.isInteger(downloadId))throw Error('UPLOAD_RECEIPT_DOWNLOAD_UNACKNOWLEDGED');
  return {state:'download-requested',id:downloadId};
}
export async function downloadUploadReceipt(chrome,receipt,gate,largeReceipt){
  const text=JSON.stringify(receipt)+'\n';
  const bytes=new TextEncoder().encode(text);
  // Chromium's URL IPC caps data URLs around 2 MiB. Use a document-owned blob
  // for larger JSON when a trusted initiating Shelf is still present.
  if(bytes.length>1_500_000){
    if(!largeReceipt)throw Error('UPLOAD_RECEIPT_SHELF_UNAVAILABLE');
    return largeReceipt({text,batchId:receipt.batchId,gate});
  }
  let base64;
  if(typeof bytes.toBase64==='function')base64=bytes.toBase64();
  else{
    const chunks=[];
    for(let offset=0;offset<bytes.length;offset+=8192)
      chunks.push(String.fromCharCode(...bytes.subarray(offset,offset+8192)));
    base64=btoa(chunks.join(''));
  }
  return requestDownload(chrome,'data:application/json;base64,'+base64,receipt.batchId,gate);
}
export async function downloadUploadReceiptBlob(chrome,{text,batchId,gate}){
  if(!uploadId(batchId)||!uploadId(gate)||typeof text!=='string')throw Error('UPLOAD_RECEIPT_INVALID');
  if(await uploadReceiptGate(chrome.storage.local)!==gate)return 'disabled';
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  try{
    const result=await requestDownload(chrome,url,batchId,gate);
    // Chrome takes ownership of the blob when downloads.download resolves.
    setTimeout(()=>URL.revokeObjectURL(url),60_000);
    return result;
  }catch(error){
    URL.revokeObjectURL(url);
    throw error;
  }
}
