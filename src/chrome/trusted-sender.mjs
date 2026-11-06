// Fragment-only navigation within the same trusted app is not a new principal.
// Query/path/origin changes and absent document identities remain rejected.
export function trustedAppSender(runtime,sender){
 return !!sender&&sender.id===runtime.id&&typeof sender.documentId==='string'&&!!sender.documentId&&typeof sender.url==='string'&&sender.url.split('#')[0]===runtime.getURL('extension/app.html');
}
