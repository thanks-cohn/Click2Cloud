import {mkdir,rm,cp,copyFile,readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {WORKER_MODULES} from '../src/cloudflare/deployment.mjs';
import {toolRegistry} from '../src/api/service.mjs';
import {writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),output=new URL('../dist/click2cloud/',import.meta.url);
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
for(const dir of ['src','extension'])await cp(new URL(dir,root),new URL(dir,output),{recursive:true});
await mkdir(new URL('right2cloud-module/',output),{recursive:true});await cp(new URL('right2cloud-module/src/',root),new URL('right2cloud-module/src/',output),{recursive:true});
await copyFile(new URL('extension/manifest.json',root),new URL('manifest.json',output));
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
async function walk(path){const entries=await readdir(new URL(path+'/',root),{withFileTypes:true});return (await Promise.all(entries.map(x=>x.isDirectory()?walk(path+'/'+x.name):path+'/'+x.name))).flat();}
const files=(await Promise.all(['src','extension','right2cloud-module/src'].map(walk))).flat().filter(p=>p!=='src/build-info.mjs').sort();
const hash=createHash('sha256');for(const path of files){hash.update(path);hash.update(await readFile(new URL(path,root)));}
const workerCodeDigest=createHash('sha256').update(JSON.stringify(await Promise.all(WORKER_MODULES.map(async p=>[p,await readFile(new URL(p,root),'utf8')])))).digest('base64url');
const buildInfo={workerCodeDigest,extensionVersion:JSON.parse(await readFile(new URL('extension/manifest.json',root),'utf8')).version,revision,sourceDigest:hash.digest('hex'),apiVersion:'3+1.1',remoteProtocol:'click2cloud-remote-2'};
await writeFile(new URL('src/build-info.mjs',output),'export const BUILD_INFO=Object.freeze('+JSON.stringify(buildInfo)+');\n');
const manifest=JSON.parse(await readFile(new URL('manifest.json',output),'utf8'));
const id=createHash('sha256').update(Buffer.from(manifest.key,'base64')).digest('hex').slice(0,32).replace(/[0-9a-f]/g,x=>String.fromCharCode(97+parseInt(x,16)));
if(id!=='ajppphdiamdobknpamcheohmdbdbeoal')throw Error('OAUTH_EXTENSION_ID_MISMATCH');
await writeFile(new URL('api-tools.json',output),JSON.stringify({version:'3+1.1',tools:toolRegistry},null,2)+'\n');
console.log(JSON.stringify({extension:resolve(output.pathname),extensionId:id,oauthRedirect:'https://'+id+'.chromiumapp.org/cloudflare'}));
