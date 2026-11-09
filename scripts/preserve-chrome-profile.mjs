import {nodeFiles} from '../src/persistence/node-files.mjs';
// Explicit local Windows owner tool; never run automatically by the extension.
import {readdir,lstat,mkdir,copyFile,readFile,writeFile,open} from 'node:fs/promises';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {PROFILE_COPY_FORMAT,PROFILE_CHUNK_BYTES,sha256,verifyProfileCopy} from '../src/persistence/profile-preservation.mjs';
const extensionId='ajppphdiamdobknpamcheohmdbdbeoal';
function closed(){if(process.platform!=='win32')throw Error('WINDOWS_PROFILE_COPY_REQUIRED');const result=execFileSync('tasklist',['/FI','IMAGENAME eq chrome.exe','/FO','CSV','/NH'],{encoding:'utf8'});if(/chrome\.exe/i.test(result))throw Error('CLOSE_CHROME_BEFORE_COPY');}
async function enumerate(root,dir=''){const result=[];for(const entry of await readdir(resolve(root,dir),{withFileTypes:true})){const path=dir?dir+'/'+entry.name:entry.name,stat=await lstat(resolve(root,path));if(stat.isSymbolicLink())throw Error('PROFILE_COPY_LINK_REQUIRES_REVIEW');if(entry.isDirectory())result.push(...await enumerate(root,path));else if(entry.isFile())result.push(path);}return result.sort();}
async function hashes(path){const handle=await open(path);try{const stat=await handle.stat(),chunks=[];for(let offset=0;offset<stat.size;offset+=PROFILE_CHUNK_BYTES){const buffer=Buffer.alloc(Math.min(PROFILE_CHUNK_BYTES,stat.size-offset)),r=await handle.read(buffer,0,buffer.length,offset);if(r.bytesRead!==buffer.length)throw Error('SOURCE_CHANGED_DURING_COPY');chunks.push(await sha256(buffer));}return {bytes:stat.size,chunks};}finally{await handle.close();}}
export async function preserveProfile(source,destination){
 closed();source=resolve(source);destination=resolve(destination);if(source===destination||!isAbsolute(relative(source,destination))&&relative(source,destination).split(sep)[0]!=='..')throw Error('PRIVATE_COPY_DESTINATION_MUST_BE_OUTSIDE_SOURCE');
 await mkdir(destination);await mkdir(resolve(destination,'profile'));const paths=await enumerate(source),files=[];
 for(const path of paths){const before=await hashes(resolve(source,path)),target=resolve(destination,'profile',path);await mkdir(resolve(target,'..'),{recursive:true});await copyFile(resolve(source,path),target);const after=await hashes(target),still=await hashes(resolve(source,path));if(JSON.stringify(before)!==JSON.stringify(after)||JSON.stringify(before)!==JSON.stringify(still))throw Error('PROFILE_COPY_READBACK_FAILED');files.push({path,...after});}
 closed();if(JSON.stringify(await enumerate(source))!==JSON.stringify(paths))throw Error('SOURCE_CHANGED_DURING_COPY');
 const manifest={format:PROFILE_COPY_FORMAT,extensionId,sourceClosed:true,closureCheck:'WINDOWS_TASKLIST',chunkBytes:PROFILE_CHUNK_BYTES,files};
 await writeFile(resolve(destination,'click2cloud-profile-copy.json'),JSON.stringify(manifest));if(JSON.stringify(JSON.parse(await readFile(resolve(destination,'click2cloud-profile-copy.json'),'utf8')))!==JSON.stringify(manifest))throw Error('PROFILE_COPY_READBACK_FAILED');const verified=await verifyProfileCopy(nodeFiles(destination),extensionId);return {...verified,private:true};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){if(process.argv.length!==5||process.argv[2]!=='--confirm-private-copy'){console.error('Close Chrome. Usage: node scripts/preserve-chrome-profile.mjs --confirm-private-copy SOURCE_USER_DATA NEW_PRIVATE_DESTINATION');process.exitCode=2;}else try{console.log(JSON.stringify(await preserveProfile(process.argv[3],process.argv[4])));}catch{console.error('PROFILE_COPY_BLOCKED: check closed Chrome, a NEW protected destination outside source, and filesystem access. No recovery was applied.');process.exitCode=1;}}
