import {mkdir,readFile,writeFile,rename,readdir,open,lstat} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
/** CLI/native-host adapter. Root is trusted host configuration, never a command parameter. */
export function nodeFiles(root) {
  root=resolve(root);const path=p=>{const v=resolve(root,p);if(!v.startsWith(root+sep))throw Error('PATH_DENIED');return v;};
  async function safe(p){const full=path(p);let part=root;for(const name of full.slice(root.length+1).split(sep)){part=resolve(part,name);try{if((await lstat(part)).isSymbolicLink())throw Error('SYMLINK_DENIED');}catch(e){if(e.code==='ENOENT')break;throw e;}}return full;}
  return Object.freeze({read:async p=>readFile(await safe(p),'utf8'),async replace(p,text){const final=await safe(p);await mkdir(dirname(final),{recursive:true});const tmp=final+'.'+crypto.randomUUID()+'.tmp';const f=await open(tmp,'wx',0o600);try{await f.writeFile(text);await f.sync();}finally{await f.close();}await rename(tmp,final);},async create(p,text){const final=await safe(p);await mkdir(dirname(final),{recursive:true});try{await writeFile(final,text,{flag:'wx',mode:0o600});return true;}catch(e){if(e.code==='EEXIST')return false;throw e;}},async list(p){try{return (await readdir(await safe(p),{withFileTypes:true})).filter(x=>x.isFile()).map(x=>p+'/'+x.name);}catch(e){if(e.code==='ENOENT')return [];throw e;}}});
}
