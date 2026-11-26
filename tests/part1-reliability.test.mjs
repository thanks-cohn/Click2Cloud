import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {createLocalUploadBatches} from '../src/chrome/local-upload-batch.mjs';
import {persistUploadSelection,uploadBatchJournal as journal,claimLocalUpload,releaseLocalUpload} from '../src/chrome/local-upload-files.mjs';
import {createCurrentStore} from '../src/persistence/current-store.mjs';
import {observeReceiptDelivery} from '../src/chrome/receipt-delivery.mjs';
import {currentReceipt,folderUploadReceipts} from '../src/queue/receipts.mjs';
import {createHistoryStore} from '../src/queue/store.mjs';
import {preflightZip32,streamDownloadArchive} from '../src/explorer/download-archive.mjs';

const source={provider:'cloudflare',connectionId:'cloudflare:part1-account',accountId:'part1-account',bucketName:'fixture',prefix:'published/'};

test('ordinary folder admission freezes visibility and retry resumes the stable child ID',async()=>{
 let now=Date.now(),include=true;
 const observed=[], batchId=crypto.randomUUID(), selectionId=crypto.randomUUID();
 const files=[new File(['x'],'first.png'),new File(['y'],'last.jpg')];
 const paths=['Root/nested/first.png','Root/last.jpg'];
 await persistUploadSelection(selectionId,files,paths);
 const deps={journal,version:'fixture',clock:()=>now,checkDestination:async()=>({sessionId:'admission'}),
  showUploadHistory:async()=>include,receiptEnabled:async()=>false,notify:async()=>({state:'none'}),
  reconcile:async()=>null,
  async dispatchStored({ticket,item,ordinaryHistory},binding){
   observed.push({ticket,key:item.key,ordinaryHistory,retry:binding.retryPrecommit});
   if(observed.length===1)return {state:'failed',code:'HTTP_502',precommitRetrySafe:true,retryAfterMs:900};
   return {state:'completed',receipt:{operationId:ticket,key:item.key,size:item.size,etag:'etag',version:'version'}};
  }};
 const first=createLocalUploadBatches(deps);
 await first.begin({source,batchId,selectionId,mode:'folder',items:files.map((file,index)=>({
  name:file.name,size:file.size,relativePath:paths[index]
 }))});
 include=false;
 const due=await first.driveDurable(await journal.get(batchId));
 assert.equal(due,now+900);
 const second=createLocalUploadBatches(deps);
 assert.equal(await second.driveDurable(await journal.get(batchId)),due);
 assert.equal(observed.length,1);
 now=due;
 await second.driveDurable(await journal.get(batchId));
 const data=await journal.detail(batchId);
 assert.equal(data.batch.phase,'verified');
 assert.equal(data.outcomes.length,2);
 assert.equal(data.outcomes[0].attempts,2);
 assert.equal(observed[0].ticket,observed[1].ticket);
 assert.equal(observed[1].retry,true);
 assert(observed.every(row=>row.ordinaryHistory.include===false));
 const pending=(await journal.historyProjections()).find(row=>row.id===batchId);
 const records=folderUploadReceipts(pending);
 assert.equal(records.length,1);
 assert.equal(records[0].filename,'Root');
 assert.equal(records[0].status,'verified');
 assert.equal(records[0].folderUpload.total,2);
 const store=createHistoryStore({database:'part1-folder-history'});
 await store.reconcile(records);
 const [a,b]=records[0].folderUpload.candidates;
 const [winner,concurrent]=await Promise.all([
  store.selectFolderRepresentative(records[0].recordId,a.operationId),
  store.selectFolderRepresentative(records[0].recordId,b.operationId)
 ]);
 assert.equal(winner.operationId,a.operationId);
 assert.equal(concurrent.operationId,a.operationId);
 await store.reconcile(records);
 assert.equal((await store.page()).items[0].folderUpload.representative.operationId,a.operationId);
 const child=currentReceipt({kind:'save',operationId:a.operationId,saveMode:'local-upload',state:'verified',at:now,updatedAt:now,
  proofKind:'r2',destination:source,receipt:{key:a.key,size:1},localUpload:{ordinaryHistory:{include:false}}});
 await store.reconcile(child);
 assert.equal(await store.count(),1);
 assert.equal((await store.jobs()).finished,1);
 await journal.acknowledgeHistory(pending);
 assert(!(await journal.historyProjections()).some(row=>row.id===batchId));
});

test('the same exact upload path has only one durable publication owner',async()=>{
 const key=crypto.randomUUID(),a={id:crypto.randomUUID()},b={id:crypto.randomUUID()};
 const claim=await Promise.all([claimLocalUpload(key,a),claimLocalUpload(key,b)]);
 assert.equal(claim[0],undefined);
 assert.equal(claim[1].id,a.id);
 await releaseLocalUpload(key,b.id);
 assert.equal((await claimLocalUpload(key,b)).id,a.id);
 await releaseLocalUpload(key,a.id);
});

test('an accepted receipt download survives worker restart and records interruption',async()=>{
 const current=createCurrentStore({dbName:'part1-receipt-delivery'});
 const listeners=[];
 let item={state:'in_progress'},requests=0;
 const chrome={downloads:{search:async()=>[item],onChanged:{addListener:listener=>listeners.push(listener)}}};
 const first=observeReceiptDelivery({chrome,current});
 const operationId=crypto.randomUUID();
 const dispatch=async()=>{requests++;return {state:'download-requested',id:181};};
 assert.equal((await first.download('upload',operationId,dispatch)).state,'download-requested');
 assert.equal((await first.download('upload',operationId,dispatch)).state,'download-requested');
 assert.equal(requests,1);
 item={state:'interrupted',error:'FILE_NO_SPACE'};
 const restarted=observeReceiptDelivery({chrome,current});
 await restarted.reconcile();
 const receipt=await restarted.read('upload',operationId);
 assert.equal(receipt.state,'interrupted');
 assert.equal(receipt.error,'FILE_NO_SPACE');
 assert.equal((await current.pendingReceiptDeliveries()).length,0);
});

test('ZIP32 preflight rejects size and entry overhead before reading source bytes',async()=>{
 const huge=[{key:'published/huge.bin',size:0xffffffff-50,etag:'digest'}];
 assert.throws(()=>preflightZip32({source,inventory:{files:huge},mode:'original',recursive:true}),{code:'ZIP32_LIMIT'});
 const tooMany=Array.from({length:32768},(_,i)=>({key:'published/'+i,size:0,etag:'digest'}));
 assert.throws(()=>preflightZip32({source,inventory:{files:tooMany},mode:'metadata',recursive:true}),{code:'ZIP32_ENTRY_LIMIT'});
 const files=['CON.txt','com¹.gif','valid.txt'].map(name=>({key:'published/'+name,size:0,etag:'digest'}));
 let summary,reads=0;
 const result=await streamDownloadArchive({source,inventory:{files,complete:true,pages:1},mode:'original',recursive:true,
  job:{receiptName:'receipt.json'},write:async()=>{},read:async()=>{reads++;},onSummary:value=>{summary=value;}});
 assert.equal(result.state,'partial');
 assert.equal(reads,1);
 assert.equal(summary.errors.length,2);
});
