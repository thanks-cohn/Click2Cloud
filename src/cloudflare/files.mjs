import {filename,keyFor,equal} from '../../right2cloud-module/src/common.mjs';
import {fail} from './wire.mjs';
const validKey=key=>{if(typeof key!=='string'||!key||new TextEncoder().encode(key).length>1024)fail('FILE_KEY_INVALID');const parts=key.replace(/\/$/,'').split('/');for(const p of parts)filename(p);return key;};
const within=(key,prefix)=>key.startsWith(prefix?prefix+'/':'');
export function validateFileIntent(i,cap){
 if(!['mkdir','copy','move','rename','delete'].includes(i?.action)||!/^[a-zA-Z0-9_-]{16,128}$/.test(i.operationId??'')||!equal(i.destination,cap.destination))fail('FILE_INTENT_INVALID');
 for(const p of [i.sourcePrefix,i.destinationPrefix])if(typeof p!=='string'||(p.endsWith('/')||cap.destination.prefix&&!within(p+'/',cap.destination.prefix)))fail('FILE_SCOPE_MISMATCH');
 for(const p of [i.sourcePrefix,i.destinationPrefix])if(p)validKey(p);
 if(i.action==='mkdir'){filename(i.name);keyFor({prefix:[i.sourcePrefix,i.name].filter(Boolean).join('/')},'.redown');}
 else{validKey(i.entry?.key);if(i.entry.folder!==i.entry.key.endsWith('/'))fail('FILE_KEY_INVALID');if(typeof i.entry.folder!=='boolean'||!within(i.entry.key,i.sourcePrefix)||!within(i.entry.key,cap.destination.prefix))fail('FILE_SCOPE_MISMATCH');if(i.action==='rename')filename(i.name);}
 if(!['keep','skip','replace'].includes(i.conflict))fail('FILE_CONFLICT_POLICY_INVALID');
}
// Same authenticated Durable Object/R2 owner as remote saves. Per-object journal
// rows avoid unbounded folder arrays and R2 listing is completed before deletes.
export async function runFileIntent(i,cap,{journal,readJournal,alive,progress}){
 const s=cap.storage,base=i.entry?.key,folder=i.entry?.folder;let count=0,completed=0,skipped=0,receipt;
 const active=async()=>{if(!await alive())fail('AUTHORIZATION_REVOKED');};
 await active();
 if(i.action==='mkdir'){
  const prefix=[i.sourcePrefix,i.name].filter(Boolean).join('/'),key=keyFor({prefix},'.redown');
  const old=await s.head(key);if(old)return {state:'completed',code:'FOLDER_ALREADY_EXISTS',completed:0,targetPrefix:prefix+'/'};
  const put=await s.put(key,new Uint8Array(),{onlyIf:new Headers({'If-None-Match':'*'}),customMetadata:{operationId:i.operationId,folder:'true'}}),head=await s.head(key);
  if(!put||!head||head.version!==put.version||head.size!==0)fail('FOLDER_CREATE_UNCONFIRMED');
  return {state:'completed',code:'FOLDER_VERIFIED',completed:1,targetPrefix:prefix+'/'};
 }
 if(folder){let cursor;do{await active();const page=await s.list({prefix:base,cursor,limit:1000});for(const o of page.objects)await journal(count++,{key:o.key,version:o.version,etag:o.etag,size:o.size});cursor=page.truncated?page.cursor:undefined;}while(cursor);}
 else{const o=await s.head(base);if(!o)fail('FILE_NOT_FOUND');await journal(count++,{key:base,version:o.version,etag:o.etag,size:o.size});}
 if(!count&&i.action!=='delete')fail('FILE_NOT_FOUND');
 let destinationBase;
 if(i.action!=='delete'){
  const leaf=i.action==='rename'?i.name:base.replace(/\/$/,'').split('/').pop(),parent=i.action==='rename'?base.replace(/\/$/,'').split('/').slice(0,-1).join('/'):i.destinationPrefix;
  destinationBase=[parent,leaf].filter(Boolean).join('/');
  if(folder&&destinationBase!==base.replace(/\/$/,'')&&within(destinationBase+'/',base.replace(/\/$/,'')))fail('FOLDER_DESCENDANT_DESTINATION');
  const same=destinationBase===(folder?base.replace(/\/$/,''):base);
  if(same&&i.action!=='copy')fail('FILE_SAME_DESTINATION');
  if(i.conflict==='keep'&&(same||await s.head(destinationBase)||folder&&(await s.list({prefix:destinationBase+'/',limit:1})).objects.length)){
   const dot=folder?-1:leaf.lastIndexOf('.'),stem=dot>0?leaf.slice(0,dot):leaf,ext=dot>0?leaf.slice(dot):'';destinationBase=[parent,stem+'-'+i.operationId+ext].filter(Boolean).join('/');
  }
 }
 // Copy and independently verify every destination before deleting ANY source.
 for(let n=0;n<count;n++){
  await active();const expected=await readJournal(n),o=await s.get(expected.key);
  if(!o||o.version!==expected.version||o.etag!==expected.etag||o.size!==expected.size)fail('FILE_SOURCE_CHANGED');
  if(i.action==='delete'){await o.body.cancel();continue;}
  const key=validKey(destinationBase+(folder?'/'+expected.key.slice(base.length):'')),existing=await s.head(key);
  if(existing&&i.conflict==='skip'){await o.body.cancel();skipped++;await journal(n,{...expected,skipped:true});continue;}
  const options={onlyIf:new Headers(existing&&i.conflict==='replace'?{'If-Match':existing.httpEtag}:{'If-None-Match':'*'}),httpMetadata:o.httpMetadata,customMetadata:{...o.customMetadata,operationId:i.operationId}};
  const fixed=new FixedLengthStream(expected.size),pipe=o.body.pipeTo(fixed.writable);const writing=s.put(key,fixed.readable,options);const [put]=await Promise.all([writing,pipe]);const head=await s.head(key);
  if(!put)fail('FILE_CONFLICT');if(!head||head.version!==put.version||head.etag!==put.etag||head.size!==expected.size||head.customMetadata?.operationId!==i.operationId)fail('FILE_COPY_UNCONFIRMED');
  await journal(n,{...expected,destinationKey:key,destinationVersion:head.version});completed++;await progress({stage:'file-copy',bytes:completed});
  if(!folder)receipt={operationId:i.operationId,key,size:head.size,etag:head.etag,version:head.version,destination:{...cap.destination,prefix:key.split('/').slice(0,-1).join('/')}};
 }
 if(['move','rename','delete'].includes(i.action))for(let n=0;n<count;n++){
  await active();const expected=await readJournal(n);if(expected.skipped)continue;
  const h=await s.head(expected.key);if(!h||h.version!==expected.version||h.etag!==expected.etag)fail('FILE_SOURCE_CHANGED');
  // R2 has no conditional DELETE: this is checked, verified, non-atomic movement.
  // A different dashboard/client can race this final check; never claim atomicity.
  await s.delete(expected.key);if(await s.head(expected.key))fail('FILE_DELETE_UNCONFIRMED');if(i.action==='delete')completed++;
 }
 return {state:skipped?'partial':'completed',code:skipped?'FILES_SKIPPED':'FILE_ACTION_VERIFIED',completed,skipped,...(receipt?{receipt}:{}),verification:'independent-r2-head-version-size',atomicDelete:false};
}
