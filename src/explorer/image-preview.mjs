import {objectETag} from './file-api.mjs';
// One bounded byte reader/cache shared by thumbnails and the enlarged viewer.
// All bytes come from the existing trusted readFileChunk API, never source URLs.
export const isImage=e=>!e.folder&&/\.(png|jpe?g|gif|webp)$/i.test(e.key);
const fail=code=>{throw Object.assign(Error(code),{code});};
export function imageType(b){
 if(b.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>b[i]===n))return 'image/png';
 if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
 const ascii=(a,n)=>String.fromCharCode(...b.subarray(a,a+n));
 if(b.length>=6&&['GIF87a','GIF89a'].includes(ascii(0,6)))return 'image/gif';
 if(b.length>=12&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP')return 'image/webp';
 fail('IMAGE_BYTES_INVALID');
}
export function galleryStep(rows,key,direction){const images=rows.filter(isImage),index=images.findIndex(e=>e.key===key),next=index+direction;return index>=0&&next>=0&&next<images.length?images[next]:null;}
// Header dimensions bound decoded pixels before passing bytes to a browser decoder.
export function imageDimensions(b,type=imageType(b)){
 const view=new DataView(b.buffer,b.byteOffset,b.byteLength),u16=(i,le=false)=>i+2<=b.length?view.getUint16(i,le):0,u24=i=>b[i]|b[i+1]<<8|b[i+2]<<16;let width=0,height=0;
 if(type==='image/png'&&b.length>=24){width=view.getUint32(16);height=view.getUint32(20);}
 if(type==='image/gif'&&b.length>=10){width=u16(6,true);height=u16(8,true);}
 if(type==='image/webp'&&b.length>=30){const kind=String.fromCharCode(...b.subarray(12,16));if(kind==='VP8X'){width=1+u24(24);height=1+u24(27);}else if(kind==='VP8 '&&b[23]===157&&b[24]===1&&b[25]===42){width=u16(26,true)&16383;height=u16(28,true)&16383;}}
 if(type==='image/webp'&&b.length>=25&&String.fromCharCode(...b.subarray(12,16))==='VP8L'&&b[20]===47){width=1+(b[21]|(b[22]&63)<<8);height=1+((b[22]>>6)|b[23]<<2|(b[24]&15)<<10);}
 if(type==='image/jpeg')for(let i=2;i+8<b.length;){if(b[i++]!==255)break;while(b[i]===255)i++;const marker=b[i++];if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=215)continue;const length=u16(i);if(length<2||i+length>b.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){height=u16(i+3);width=u16(i+5);break;}i+=length;}
 if(!width||!height)fail('IMAGE_HEADER_UNAVAILABLE');if(width*height>64*1024*1024)fail('PREVIEW_DIMENSIONS_LIMIT');return {width,height};
}
export async function readPreviewBytes(read,{source,key,etag:known,size:knownSize},{limit,signal,truncate=false,concurrency=3,onChunk}={}){
 const chunks=[];let offset=0,total,etag=known===undefined?undefined:objectETag(known);
 while(total===undefined||offset<Math.min(total,limit)){
  signal?.throwIfAborted();const positions=Array.from({length:total===undefined?1:Math.max(1,Math.min(3,concurrency))},(_,i)=>offset+i*65536).filter(p=>total===undefined||p<Math.min(total,limit));
  const parts=await Promise.all(positions.map(async position=>{signal?.throwIfAborted();return {position,part:await read({source,key,offset:position,length:Math.min(65536,limit-position),...(etag?{etag}:{})})};}));signal?.throwIfAborted();
  for(const {position,part} of parts){
   if(part?.state!=='completed'){const code=part?.code??part?.error;fail(/^[A-Z][A-Z0-9_]+$/.test(code??'')&&code!=='OK'?code:'FILE_READ_FAILED');}
   const d=part.data&&{...part.data,...(part.data.etag!==undefined?{etag:objectETag(part.data.etag)}:{})};if(etag&&d?.etag&&etag!==d.etag||Number.isSafeInteger(knownSize)&&d?.total!==knownSize)fail('OBJECT_CHANGED');
   if(!d||!Number.isSafeInteger(d.total)||d.total<0||d.offset!==position||!Array.isArray(d.bytes)||d.bytes.some(n=>!Number.isInteger(n)||n<0||n>255)||total!==undefined&&d.total!==total||etag&&etag!==d.etag||d.total>0&&!d.etag)fail('RANGE_RESPONSE_INVALID');
   total=d.total;etag=d.etag;if(total>limit&&!truncate)fail('PREVIEW_SIZE_LIMIT');
   const bytes=new Uint8Array(d.bytes),expected=Math.min(65536,limit-position,total-position);
   if(bytes.length!==expected||d.done!==(position+bytes.length===total))fail('RANGE_RESPONSE_INVALID');
   if(onChunk)await onChunk(bytes);else chunks.push(bytes);offset+=bytes.length;
  }
  if(total===0)break;
 }
 return {blob:new Blob(chunks),total,etag,done:offset===total};
}
export function createImageReader(read,{maxBytes=32*1024*1024,maxEntries=24,ttl=10000,clock=Date.now}={}){
 const cache=new Map();let bytes=0;
 const clear=()=>{cache.clear();bytes=0;};
 return {clear,async load(source,entry,{limit=64*1024*1024,signal,concurrency=3}={}){
  const key=JSON.stringify([source.connectionId,source.accountId,source.bucketName,entry.key,entry.etag??entry.version??entry.uploaded??'',entry.size??null]),old=cache.get(key);
  signal?.throwIfAborted();if(old&&clock()-old.at<ttl){if(old.value.total>limit)fail('PREVIEW_SIZE_LIMIT');cache.delete(key);cache.set(key,old);return old.value;}
  const result=await readPreviewBytes(read,{source,key:entry.key,size:entry.size,...(entry.etag?{etag:entry.etag}:{})},{limit,signal,concurrency});
  const header=new Uint8Array(await result.blob.slice(0,65536).arrayBuffer()),type=imageType(header);let dimensions;
  try{dimensions=imageDimensions(header,type);}catch(error){if(type!=='image/jpeg'||error.code!=='IMAGE_HEADER_UNAVAILABLE'||result.blob.size<=65536)throw error;/* JPEG metadata may precede SOF beyond 64 KiB. Bytes are already bounded and authenticated; no new network read. */dimensions=imageDimensions(new Uint8Array(await result.blob.arrayBuffer()),type);}
  const value={...result,...dimensions,blob:result.blob.slice(0,result.blob.size,type)};signal?.throwIfAborted();
  if(value.total<=maxBytes){if(old){bytes-=old.value.total;cache.delete(key);}cache.set(key,{value,at:clock()});bytes+=value.total;while(bytes>maxBytes||cache.size>maxEntries){const first=cache.keys().next().value;bytes-=cache.get(first).value.total;cache.delete(first);}}
  return value;
 },inspect:()=>({entries:cache.size,bytes})};
}
