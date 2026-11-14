// Incremental SHA-256 (FIPS 180-4) and store-only ZIP entries. WebCrypto does not
// expose an incremental digest. Verified against Node crypto and browser readback.
// Only one page is encoded at a time; native Blob storage retains encoded chunks.
const K=Uint32Array.from([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const rotate=(v,n)=>(v>>>n)|(v<<(32-n));
export function incrementalSHA256(){
 const h=Uint32Array.from([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),buffer=new Uint8Array(64),w=new Uint32Array(64);
 let used=0,length=0,finished=false;
 function block(bytes){
  const v=new DataView(bytes.buffer,bytes.byteOffset,64);
  for(let i=0;i<16;i++)w[i]=v.getUint32(i*4);
  for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(rotate(a,7)^rotate(a,18)^(a>>>3))+w[i-7]+(rotate(b,17)^rotate(b,19)^(b>>>10)))>>>0;}
  let [a,b,c,d,e,f,g,j]=h;
  for(let i=0;i<64;i++){const t1=(j+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0,t2=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))>>>0;j=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
  for(const [i,v] of [a,b,c,d,e,f,g,j].entries())h[i]=(h[i]+v)>>>0;
 }
 return {update(bytes){if(finished)throw Error('DIGEST_ALREADY_FINISHED');length+=bytes.length;let at=0;while(at<bytes.length){const n=Math.min(64-used,bytes.length-at);buffer.set(bytes.subarray(at,at+n),used);used+=n;at+=n;if(used===64){block(buffer);used=0;}}return this;},digest(){if(finished)throw Error('DIGEST_ALREADY_FINISHED');finished=true;const bits=length*8;buffer[used++]=128;if(used>56){buffer.fill(0,used);block(buffer);used=0;}buffer.fill(0,used,56);const v=new DataView(buffer.buffer);v.setUint32(56,Math.floor(bits/4294967296));v.setUint32(60,bits>>>0);block(buffer);return Array.from(h,v=>v.toString(16).padStart(8,'0')).join('');}};
}
const encoder=new TextEncoder(),crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const header=(n,fields)=>{const b=new Uint8Array(n),v=new DataView(b.buffer);for(const [at,size,value] of fields)v[size===2?'setUint16':'setUint32'](at,value,true);return b;};
export const MAX_EXPORT_BYTES=512*1024*1024;
export function archiveEntries(maxBytes=MAX_EXPORT_BYTES){
 const files=new Map();let total=0;
 function entry(name){if(!/^[a-zA-Z0-9_.-]+$/.test(name))throw Error('UNSAFE_ZIP_NAME');if(!files.has(name))files.set(name,{name,parts:[],size:0,crc:0xffffffff,hash:incrementalSHA256()});return files.get(name);}
 return {write(name,text){const f=entry(name),bytes=encoder.encode(text);if(total+bytes.length>maxBytes)throw Error('EXPORT_SIZE_LIMIT_512_MIB');total+=bytes.length;f.size+=bytes.length;f.hash.update(bytes);for(const b of bytes)f.crc=crcTable[(f.crc^b)&255]^(f.crc>>>8);if(bytes.length)f.parts.push(new Blob([bytes]));},get bytes(){return total;},finish(){
  const hashes={},body=[],directory=[];let offset=0;
  for(const f of files.values()){
   hashes[f.name]=f.digest??=f.hash.digest();const name=encoder.encode(f.name),crc=(f.crc^0xffffffff)>>>0;
   body.push(header(30,[[0,4,0x04034b50],[4,2,20],[14,4,crc],[18,4,f.size],[22,4,f.size],[26,2,name.length]]),name,new Blob(f.parts));
   directory.push(header(46,[[0,4,0x02014b50],[4,2,20],[6,2,20],[16,4,crc],[20,4,f.size],[24,4,f.size],[28,2,name.length],[42,4,offset]]),name);offset+=30+name.length+f.size;f.parts.length=0;
  }
  const size=directory.reduce((n,p)=>n+p.length,0),blob=new Blob([...body,...directory,header(22,[[0,4,0x06054b50],[8,2,files.size],[10,2,files.size],[12,4,size],[16,4,offset]])],{type:'application/zip'});
  return {blob,hashes};
 },hashes(){return Object.fromEntries([...files].map(([name,f])=>[name,f.digest??=f.hash.digest()]));}};
}
export async function hashBlob(blob,signal){const h=incrementalSHA256(),reader=blob.stream().getReader();try{while(true){signal?.throwIfAborted();const {done,value}=await reader.read();if(done)break;h.update(value);}return h.digest();}finally{await reader.cancel();}}
