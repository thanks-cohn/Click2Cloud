import {remoteDestination} from './wire.mjs';
// Existing Universal File API provider wire; not an additional public API.
export function createFileTransport({remote}){
return async function executeFileMessage(message){
 const action={cfCreateFolder:'mkdir',cfTransferObjects:message.operation,cfRenameEntry:'rename',cfDeleteObjects:'delete'}[message.type];
 const source=message.source??message,destination=message.destination??source,target=fileOperationTarget(source,destination),sourcePrefix=(source.prefix??'').replace(/\/$/,''),destinationPrefix=(destination.prefix??'').replace(/\/$/,'');
 const intent={operationId:message.operationId??crypto.randomUUID(),action,destination:remoteDestination(target),sourcePrefix,destinationPrefix,conflict:message.conflict??'keep',...(message.name||message.newName?{name:message.name??message.newName}:{}),...(message.entry?{entry:message.entry}:message.entries?.length===1?{entry:message.entries[0]}:{})};
 const r=await remote.files({target,intent});
 return {...r,state:r.state==='verified'?'completed':r.state,ok:['completed','verified','partial'].includes(r.state),...(r.state==='partial'?{errors:[{code:r.code}]}:{}),...(!['completed','verified','partial'].includes(r.state)?{error:r.code}:{})};
};
}

export function fileOperationTarget(source,destination=source){
 if(source.accountId!==destination.accountId||source.bucketName!==destination.bucketName)throw Object.assign(Error('CROSS_BUCKET_TRANSFER_UNAVAILABLE'),{code:'CROSS_BUCKET_TRANSFER_UNAVAILABLE'});
 const a=(source.prefix??'').split('/').filter(Boolean),b=(destination.prefix??'').split('/').filter(Boolean);let n=0;while(n<a.length&&a[n]===b[n])n++;
 return {provider:'cloudflare',connectionId:'cloudflare:'+source.accountId,accountId:source.accountId,bucketName:source.bucketName,prefix:n?a.slice(0,n).join('/')+'/':''};
}
