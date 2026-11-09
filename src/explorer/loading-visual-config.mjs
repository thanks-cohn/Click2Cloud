import {imageType,imageDimensions} from './image-preview.mjs';
export const LOADING_MEDIA_MAX_BYTES=8*1024*1024; // One local visual, not a cloud transfer limit.
const fail=code=>{throw Object.assign(Error(code),{code});};
export function loadingMedia(input){
 if(!input||typeof input.base64!=='string'||input.base64.length>Math.ceil(LOADING_MEDIA_MAX_BYTES/3)*4||!input.base64.length||input.base64.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(input.base64))fail('LOADING_MEDIA_INVALID');
 const bytes=Uint8Array.from(atob(input.base64),c=>c.charCodeAt(0));if(bytes.length>LOADING_MEDIA_MAX_BYTES)fail('LOADING_MEDIA_TOO_LARGE');
 if(typeof input.name!=='string'||!input.name||input.name.length>256||/[\x00-\x1f/\\]/.test(input.name))fail('LOADING_MEDIA_INVALID');
 if(input.type==='video/mp4'){
  const ascii=(start,end)=>String.fromCharCode(...bytes.subarray(start,end));
  if(bytes.length<24||ascii(4,8)!=='ftyp'||!['isom','iso2','mp41','mp42','avc1','M4V '].includes(ascii(8,12)))fail('LOADING_MEDIA_INVALID');
 }else{let type;try{type=imageType(bytes);imageDimensions(bytes,type);}catch{fail('LOADING_MEDIA_INVALID');}if(type!==input.type)fail('LOADING_MEDIA_TYPE_MISMATCH');}
 return {name:input.name,type:input.type,blob:new Blob([bytes],{type:input.type})};
}
export function loadingVisualSummary(value){const revision=Number.isSafeInteger(value?.revision)&&value.revision>=0?value.revision:0,validMode=['math','media','plain'].includes(value?.mode),validMedia=!value?.media||value.media.blob instanceof Blob&&value.media.blob.size<=LOADING_MEDIA_MAX_BYTES&&['image/png','image/jpeg','image/webp','image/gif','video/mp4'].includes(value.media.type);if(!validMode||!validMedia||value.mode==='media'&&!value.media)return {revision,mode:'math',media:null,warning:'LOADING_MEDIA_INVALID'};return {revision,mode:value.mode,media:value.media?{name:value.media.name,type:value.media.type,size:value.media.blob.size}:null};}
export async function loadingVisualWire(value,includeMedia=false){const out=loadingVisualSummary(value);if(includeMedia&&out.media&&value.media){const bytes=new Uint8Array(await value.media.blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));out.media.base64=btoa(binary);}return out;}
