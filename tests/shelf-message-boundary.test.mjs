import test from 'node:test';import assert from 'node:assert/strict';
import {appSenderDecision,trustedAppSender} from '../src/chrome/trusted-sender.mjs';
const runtime={id:'own-extension',getURL:path=>'chrome-extension://own-extension/'+path},sender={id:runtime.id,url:runtime.getURL('extension/app.html')};
test('Chrome-authenticated Shelf identity does not depend on optional documentId',()=>{
 for(const metadata of [{},{documentId:'document'},{origin:'chrome-extension://own-extension'},{documentId:'document',origin:'chrome-extension://own-extension'}])for(const hash of ['','#cloudflare','#manage-destinations'])assert(trustedAppSender(runtime,{...sender,...metadata,url:sender.url+hash}));
});
test('optional metadata never overrides extension/page provenance; malformed or conflicting metadata is denied',()=>{
 for(const [patch,reason] of [[{id:'other'},'EXTENSION_ID_MISMATCH'],[{url:'https://example.com/extension/app.html'},'APP_URL_MISMATCH'],[{url:sender.url+'?untrusted=1'},'APP_URL_MISMATCH'],[{url:sender.url+'/../app.html'},'APP_URL_MISMATCH'],[{url:runtime.getURL('extension/connect.html')},'APP_URL_MISMATCH'],[{origin:'null'},'APP_ORIGIN_MISMATCH'],[{origin:'https://example.com'},'APP_ORIGIN_MISMATCH'],[{documentId:''},'INVALID_DOCUMENT_METADATA'],[{documentId:123},'INVALID_DOCUMENT_METADATA']])assert.deepEqual(appSenderDecision(runtime,{...sender,documentId:'plausible-but-not-authority',...patch}),{accepted:false,reason});
 assert.equal(trustedAppSender(runtime,undefined),false);assert.equal(trustedAppSender(runtime,{...sender,id:undefined}),false);
});
