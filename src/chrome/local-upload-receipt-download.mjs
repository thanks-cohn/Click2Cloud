import {uploadReceiptPreferenceKey} from './debug-preference.mjs';
import {receiptDataURL} from './receipt-delivery.mjs';
import {uploadId} from './local-upload-plan.mjs';

export async function uploadReceiptGate(storage){
  const data=await storage.get(['uiDebugMode',uploadReceiptPreferenceKey]);
  const gate=data[uploadReceiptPreferenceKey];
  return data.uiDebugMode===true&&uploadId(gate)?gate:null;
}
export const uploadReceiptFilename=id=>'redown-upload-receipt-'+id+'.json';

const savedSelection=(gate,id)=>['automatic','manual'].includes(gate?.mode)&&gate.batchId===id&&uploadId(id);
const approved=async(chrome,gate,id)=>savedSelection(gate,id)||typeof gate==='string'&&await uploadReceiptGate(chrome.storage.local)===gate;

async function requestDownload(chrome,url,id,gate){
  if(!await approved(chrome,gate,id))return 'disabled';
  const downloadId=await chrome.downloads.download({url,filename:uploadReceiptFilename(id),saveAs:false});
  if(!Number.isInteger(downloadId))throw Error('UPLOAD_RECEIPT_DOWNLOAD_UNACKNOWLEDGED');
  return {state:'download-requested',id:downloadId};
}
export async function downloadUploadReceipt(chrome,receipt,gate,largeReceipt){
  const text=JSON.stringify(receipt)+'\n';
  const url=receiptDataURL(text);
  // Oversized automatic export can still use the previously registered Shelf
  // blob path. Without a Shelf the durable receipt remains manually exportable.
  if(!url)return largeReceipt?largeReceipt({text,batchId:receipt.batchId,gate}):'manual-required';
  return requestDownload(chrome,url,receipt.batchId,gate);
}
export async function downloadUploadReceiptBlob(chrome,{text,batchId,gate}){
  if(!uploadId(batchId)||(!uploadId(gate)&&!savedSelection(gate,batchId))||typeof text!=='string')throw Error('UPLOAD_RECEIPT_INVALID');
  if(!await approved(chrome,gate,batchId))return 'disabled';
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
