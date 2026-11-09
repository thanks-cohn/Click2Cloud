// Real OPFS bytes; SYNTHETIC manifest producer, never Windows preservation proof.
import {directoryFiles} from '../src/persistence/external-recovery.mjs';
import {PROFILE_COPY_FORMAT,PROFILE_CHUNK_BYTES,sha256} from '../src/persistence/profile-preservation.mjs';
export async function profileCopyFixture(name,extensionId='ajppphdiamdobknpamcheohmdbdbeoal'){
 const root=await (await navigator.storage.getDirectory()).getDirectoryHandle(name,{create:true}),files=directoryFiles(root),paths=['Local State','Default/IndexedDB/chrome-extension_'+extensionId+'_0.indexeddb.leveldb/CURRENT','Default/Local Extension Settings/'+extensionId+'/CURRENT'],rows=[];
 for(const path of paths){const text='DISPOSABLE_SYNTHETIC_PROFILE_COPY_NOT_WINDOWS_EVIDENCE',bytes=new TextEncoder().encode(text);await files.replace('profile/'+path,text);rows.push({path,bytes:bytes.length,chunks:[await sha256(bytes)]});}
 await files.replace('click2cloud-profile-copy.json',JSON.stringify({format:PROFILE_COPY_FORMAT,extensionId,sourceClosed:true,closureCheck:'WINDOWS_TASKLIST',chunkBytes:PROFILE_CHUNK_BYTES,files:rows}));return {root,files};
}
