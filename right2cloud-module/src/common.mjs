export const fields=['provider','connectionId','accountId','bucketName','prefix','conflictPolicy'];
export const equal=(a,b)=>fields.every(k=>a?.[k]===b?.[k]);
export function fail(code){throw Object.assign(new Error(code),{code});}
export function destination(d){
 if(d?.provider!=='cloudflare-r2'||d.conflictPolicy!=='keep-both'||!['connectionId','accountId','bucketName'].every(k=>typeof d[k]==='string'&&d[k]))fail('DESTINATION_INVALID');
 if(typeof d.prefix!=='string'||d.prefix.startsWith('/')||d.prefix.endsWith('/')||d.prefix.includes('\\')||/[\x00-\x1f\x7f]/.test(d.prefix)||d.prefix.split('/').some(x=>x==='.'||x==='..'||(x===''&&d.prefix!=='')))fail('PREFIX_INVALID');
 return Object.fromEntries(fields.map(k=>[k,d[k]]));
}
export function filename(name){if(typeof name!=='string'||!name||/[\\/\x00-\x1f\x7f]/.test(name)||name==='.'||name==='..')fail('FILENAME_INVALID');return name;}
export function validateIntent(i){destination(i.destination);if(!/^[a-zA-Z0-9_-]{16,128}$/.test(i.operationId||''))fail('OPERATION_INVALID');filename(i.source?.filename);keyFor(i.destination,i.source.filename);if(i.source.responseFilename!==undefined&&typeof i.source.responseFilename!=='boolean')fail('SOURCE_INVALID');}
export function keyFor(d,name){const key=(d.prefix?d.prefix+'/':'')+filename(name);if(new TextEncoder().encode(key).length>1024)fail('KEY_TOO_LONG');return key;}
export function wait(p,signal){return new Promise((resolve,reject)=>{const abort=()=>{cleanup();reject(Object.assign(Error('INTERRUPTED'),{code:'INTERRUPTED'}));};const cleanup=()=>signal?.removeEventListener('abort',abort);Promise.resolve(p).then(v=>{cleanup();resolve(v);},e=>{cleanup();reject(e);});if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});});}

export function canonicalSource(s){return {url:s?.url,filename:s?.filename,...(s?.responseFilename===true?{responseFilename:true}:{})};}
