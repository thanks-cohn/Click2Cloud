// Chrome supplies sender identity and URL; an optional document UUID is not an
// authorization credential. Shelf documents may omit documentId. Never trust
// identity fields supplied inside the message itself.
export function appSenderDecision(runtime,sender){
 if(!sender||sender.id!==runtime.id)return {accepted:false,reason:'EXTENSION_ID_MISMATCH'};
 if(typeof sender.url!=='string'||sender.url.split('#')[0]!==runtime.getURL('extension/app.html'))return {accepted:false,reason:'APP_URL_MISMATCH'};
 const origin=runtime.getURL('').replace(/\/$/,'');
 if(sender.origin!==undefined&&sender.origin!==origin)return {accepted:false,reason:'APP_ORIGIN_MISMATCH'};
 if(sender.documentId!==undefined&&(typeof sender.documentId!=='string'||!sender.documentId))return {accepted:false,reason:'INVALID_DOCUMENT_METADATA'};
 return {accepted:true};
}
export function trustedAppSender(runtime,sender){return appSenderDecision(runtime,sender).accepted;}
