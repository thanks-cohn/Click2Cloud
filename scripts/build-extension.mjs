import {mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
const out=new URL('../dist/chrome-unpacked/',import.meta.url);
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const dir of ['src','extension'])await cp(new URL('../'+dir,import.meta.url),new URL(dir,out),{recursive:true});
await writeFile(new URL('manifest.json',out),await readFile(new URL('../extension/manifest.json',import.meta.url)));
console.log(out.pathname);
