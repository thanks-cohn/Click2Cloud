import {createImageReader} from '../src/explorer/image-preview.mjs';

const maxBytes=8*1024*1024,maxPixels=4*1024*1024;

export function createExplorerImageClipboard(read){
 const reader=createImageReader(read,{maxBytes:0,maxEntries:0});
 let pending=false;
 return async function copyImage(target,entry){
  if(pending)throw Error('IMAGE_CLIPBOARD_BUSY');
  if(!navigator.clipboard?.write||typeof ClipboardItem!=='function')throw Error('IMAGE_CLIPBOARD_UNAVAILABLE');
  pending=true;
  const controller=new AbortController();
  const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]);
  async function png(){
   const {blob:image,width,height}=await reader.load(target,entry,{limit:maxBytes,signal,concurrency:1});
   if(width*height>maxPixels)throw Error('IMAGE_CLIPBOARD_LIMIT');
   if(image.type==='image/png')return image;
   const bitmap=await createImageBitmap(image);
   try{
    signal.throwIfAborted();
    if(bitmap.width*bitmap.height>maxPixels)throw Error('IMAGE_CLIPBOARD_LIMIT');
    const canvas=new OffscreenCanvas(bitmap.width,bitmap.height);
    canvas.getContext('2d').drawImage(bitmap,0,0);
    return await canvas.convertToBlob({type:'image/png'});
   }finally{bitmap.close();}
  }
  const data=png();
  void data.catch(()=>{});
  try{
   // Reserve the browser clipboard write in the initiating key/click gesture.
   await navigator.clipboard.write([new ClipboardItem({'image/png':data})]);
  }finally{controller.abort();await data.catch(()=>{});pending=false;}
 };
}
