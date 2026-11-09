import {validateSelection} from './provenance.mjs';
export const fields=['provider','connectionId','accountId','bucketName','prefix','conflictPolicy'];
export const equal=(a,b)=>fields.every(k=>a?.[k]===b?.[k]);
export function fail(code){throw Object.assign(new Error(code),{code});}
export function destination(d){
 if(d?.provider!=='cloudflare-r2'||d.conflictPolicy!=='keep-both'||!['connectionId','accountId','bucketName'].every(k=>typeof d[k]==='string'&&d[k]))fail('DESTINATION_INVALID');
 if(typeof d.prefix!=='string'||d.prefix.startsWith('/')||d.prefix.endsWith('/')||d.prefix.includes('\\')||/[\x00-\x1f\x7f]/.test(d.prefix)||d.prefix.split('/').some(x=>x==='.'||x==='..'||(x===''&&d.prefix!=='')))fail('PREFIX_INVALID');
 return Object.fromEntries(fields.map(k=>[k,d[k]]));
}
export function filename(name){if(typeof name!=='string'||!name||/[\\/\x00-\x1f\x7f]/.test(name)||name==='.'||name==='..')fail('FILENAME_INVALID');return name;}
export function validateIntent(i){destination(i.destination);if(i.provenance!==undefined)validateSelection(i.provenance,i.destination);if(!/^[a-zA-Z0-9_-]{16,128}$/.test(i.operationId||''))fail('OPERATION_INVALID');filename(i.source?.filename);keyFor(i.destination,i.source.filename);if(i.source.responseFilename!==undefined&&typeof i.source.responseFilename!=='boolean')fail('SOURCE_INVALID');}
export function keyFor(d,name){const key=(d.prefix?d.prefix+'/':'')+filename(name);if(new TextEncoder().encode(key).length>1024)fail('KEY_TOO_LONG');return key;}
export function wait(p,signal){return new Promise((resolve,reject)=>{const abort=()=>{cleanup();reject(Object.assign(Error('INTERRUPTED'),{code:'INTERRUPTED'}));};const cleanup=()=>signal?.removeEventListener('abort',abort);Promise.resolve(p).then(v=>{cleanup();resolve(v);},e=>{cleanup();reject(e);});if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});});}

export function canonicalSource(s){return {url:s?.url,filename:s?.filename,...(s?.responseFilename===true?{responseFilename:true}:{})};}

// Fixed vocabulary only: no exception messages, stacks, URLs, headers or provider bodies.
export const remoteStages=['request','authenticate','claim','writer','source.fetch','destination.prepare','authorization.recheck','destination.record','destination.write'];
export function safeRemoteDiagnostic(value){
 if(value?.kind!=='remote-save-stage'||!remoteStages.includes(value.stage))return null;
 return {kind:'remote-save-stage',stage:value.stage,errorKind:['TypeError','RangeError','SyntaxError','AbortError','Error'].includes(value.errorKind)?value.errorKind:'Error',...(['http-empty-response','http2-response','http-truncated','http-status-line','http-header-framing','hostname-mismatch','certificate-rejected','outbound-address-blocked','outbound-connect-rejected','runtime-unsupported','socket-closed','network-error'].includes(value.sourceReason)?{sourceReason:value.sourceReason}:{}),...(['ERR_OPTION_NOT_IMPLEMENTED','ERR_METHOD_NOT_IMPLEMENTED','ETIMEDOUT','ECONNRESET','ECONNREFUSED','ENOTFOUND','ERR_TLS_CERT_ALTNAME_INVALID','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(value.runtimeCode)?{runtimeCode:value.runtimeCode}:{}),...(typeof value.causeCode==='string'&&/^[A-Z][A-Z0-9_]{0,63}$/.test(value.causeCode)?{causeCode:value.causeCode}:{}),...(Number.isInteger(value.httpStatus)&&value.httpStatus>=100&&value.httpStatus<=599?{httpStatus:value.httpStatus}:{}),...(['dns','connect','tls','headers','body'].includes(value.sourceStage)?{sourceStage:value.sourceStage}:{})};
}
