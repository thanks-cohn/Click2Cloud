// Adapted from the included REDOWN streaming reference's OPFS spool.
// One disk-backed slot per session. Frames contain only a bounded window.
import {sha256} from './vendor/sha256.mjs';

export const chunkBytes=128*1024;
const encoder=new TextEncoder();
export const utf8Length=value=>encoder.encode(value).length;
export const labError=code=>Object.assign(Error(code),{code});
export const validHash=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);

export function decodeFrame(value) {
 if(typeof value!=='string'||!value||value.length>4*Math.ceil(chunkBytes/3))throw labError('INVALID_FRAME_BYTES');
 if(!/^[A-Za-z0-9+/]*={0,2}$/.test(value)||value.length%4)throw labError('INVALID_FRAME_BYTES');
 const bytes=Uint8Array.from(atob(value),character=>character.charCodeAt(0));
 if(!bytes.length||bytes.length>chunkBytes)throw labError('INVALID_FRAME_BYTES');
 return bytes;
}

export function encodeFrame(bytes) {
 let text='';
 for(let at=0;at<bytes.length;at+=8192)text+=String.fromCharCode(...bytes.subarray(at,at+8192));
 return btoa(text);
}

export async function labSpoolDirectory(signal) {
 const root=await navigator.storage.getDirectory();
 signal?.throwIfAborted();
 const directory=await root.getDirectoryHandle('redown-python-lab-v1',{create:true});
 // The session owns this directory exclusively. Recover abandoned files
 // left by a worker or Chrome crash before opening another grant.
 for await(const [name,handle] of directory.entries()){
  signal?.throwIfAborted();
  if(handle.kind==='file'&&/^transfer-[0-9a-f-]{36}$/.test(name))await directory.removeEntry(name);
 }
 return directory;
}

export async function openLabSpool(directory,size) {
 const name='transfer-'+crypto.randomUUID();
 const handle=await directory.getFileHandle(name,{create:true});
 let writer;
 try{writer=await handle.createWritable();}
 catch(error){await directory.removeEntry(name).catch(()=>{});throw error;}
 const digest=sha256.create();
 let bytes=0,sealed=false,closing;
 return {
  get bytes(){return bytes;},
  size,
  async append(chunk,offset=bytes){
   if(!writer||offset!==bytes||bytes+chunk.length>size)throw labError('STREAM_SIZE_MISMATCH');
   await writer.write(chunk);
   digest.update(chunk);bytes+=chunk.length;
  },
  async seal(expected){
   if(!writer||bytes!==size)throw labError('STREAM_SIZE_MISMATCH');
   const hash=Array.from(digest.digest(),byte=>byte.toString(16).padStart(2,'0')).join('');
   if(expected!==undefined&&hash!==expected)throw labError('SOURCE_CHANGED');
   await writer.close();
   writer=null;sealed=true;
   return hash;
  },
  async file(){
   if(!sealed||closing)throw labError('STREAM_NOT_SEALED');
   return handle.getFile();
  },
  close(){
   return closing??=(async()=>{
    const current=writer;writer=null;
    await current?.abort().catch(()=>{});
    await directory.removeEntry(name).catch(()=>{});
   })();
  }
 };
}
