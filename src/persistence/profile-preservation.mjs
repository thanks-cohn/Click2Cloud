// Explicit private-copy verification, shared by Shelf and the trusted recovery
// owner. No storage/cloud writes; paths never enter exported diagnostics.
const fail=code=>{throw Object.assign(Error(code),{code});};
export const PROFILE_COPY_FORMAT='click2cloud-private-profile-copy-v1';
export const PROFILE_CHUNK_BYTES=1048576;
export const sha256=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export async function verifyProfileCopy(files,extensionId){
 if(await files.size('click2cloud-profile-copy.json')>16777216)fail('PROFILE_COPY_MANIFEST_LIMIT');
 const manifest=JSON.parse(await files.read('click2cloud-profile-copy.json'));
 if(manifest?.format!==PROFILE_COPY_FORMAT||manifest.extensionId!==extensionId||manifest.sourceClosed!==true||manifest.closureCheck!=='WINDOWS_TASKLIST'||manifest.chunkBytes!==PROFILE_CHUNK_BYTES||!Array.isArray(manifest.files)||!manifest.files.length)fail('PROFILE_COPY_INVALID');
 const ids=new Set();let bytes=0,indexed=false,local=false,localState=false;
 for(const row of manifest.files){
  if(!row||typeof row.path!=='string'||!row.path||row.path.startsWith('/')||row.path.includes('\\')||row.path.split('/').some(p=>!p||p==='.'||p==='..'||p.includes(':'))||ids.has(row.path)||!Number.isSafeInteger(row.bytes)||row.bytes<0||!Array.isArray(row.chunks)||row.chunks.length!==Math.ceil(row.bytes/PROFILE_CHUNK_BYTES)||row.chunks.some(h=>! /^[a-f0-9]{64}$/.test(h)))fail('PROFILE_COPY_INVALID');
  ids.add(row.path);indexed||=row.path.includes('/IndexedDB/chrome-extension_'+extensionId+'_');local||=row.path.includes('/Local Extension Settings/'+extensionId+'/');localState||=row.path==='Local State';
  if(await files.size('profile/'+row.path)!==row.bytes)fail('PROFILE_COPY_MISMATCH');
  for(let i=0;i<row.chunks.length;i++){const chunk=await files.readChunk('profile/'+row.path,i*PROFILE_CHUNK_BYTES,Math.min(PROFILE_CHUNK_BYTES,row.bytes-i*PROFILE_CHUNK_BYTES));if(await sha256(chunk)!==row.chunks[i])fail('PROFILE_COPY_MISMATCH');}
  bytes+=row.bytes;
 }
 if(!indexed||!local||!localState)fail('PROFILE_COPY_INCOMPLETE');
 // This proves readback against the local copy manifest, not historical cause,
 // cloud readiness or an absolute OS snapshot. The trusted Windows producer
 // compares the source and copy with Chrome closed before writing this manifest.
 return {state:'VERIFIED',proofClass:'PRIVATE_PROFILE_COPY_FILE_READBACK',checksum:await sha256(new TextEncoder().encode(JSON.stringify(manifest))),files:manifest.files.length,bytes,extensionId};
}
