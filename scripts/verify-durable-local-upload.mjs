// Chromium File/IndexedDB and worker lifetime fixture. The provider boundary is local.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';

const files=Number(process.env.REDOWN_GUI_FIXTURE_FILES??4000);
const verifyHistory=process.env.REDOWN_GUI_FIXTURE_HISTORY==='1';
const worker=`
import {uploadBatchJournal as journal} from '/src/chrome/local-upload-files.mjs';
import {createLocalUploadBatches} from '/src/chrome/local-upload-batch.mjs';
import {folderUploadReceipts} from '/src/queue/receipts.mjs';
import {createHistoryStore} from '/src/queue/store.mjs';
const source={provider:'cloudflare',connectionId:'cloudflare:account',accountId:'account',bucketName:'bucket',prefix:'destination/'};
const history=createHistoryStore();
const driver=createLocalUploadBatches({journal,version:'fixture',checkDestination:async()=>({}),
  ${verifyHistory?'showUploadHistory:async()=>true,':''}
  async dispatchStored({item,staged,ticket}){
    if(staged.file.name!==item.name||staged.file.size!==item.size||staged.file.lastModified!==staged.lastModified||
       await staged.file.text()!==String(staged.lastModified))throw Error('Stored browser File identity changed');
    return {state:'completed',receipt:{key:item.key,size:item.size,etag:'fixture-etag',version:'fixture-version',operationId:ticket}};
  },reconcile:async()=>null,notify:async()=>({state:'none'}),receiptEnabled:async()=>false});
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
  const data=event.data, port=event.ports[0];
  event.waitUntil((async()=>{
    if(data.action==='read'){
      const answer=await driver.inspect({source,batchId:data.id});
      if(data.history&&answer.batch.phase==='verified'){
        for(const projection of await journal.historyProjections())await history.reconcile(folderUploadReceipts(projection));
        const {items}=await history.page();
        port.postMessage({...answer.batch,history:items.map(item=>({name:item.filename,total:item.folderUpload.total,status:item.status}))});
      }else port.postMessage(answer.batch);
      return;
    }
    const result=await driver.begin({source,batchId:data.id,mode:'folder',items:data.items,selectionId:data.selectionId});
    port.postMessage(result);
    // Hold here until the initiating page has closed to exercise pending children.
    await new Promise(resolve=>setTimeout(resolve,500));
    await driver.driveDurable((await journal.runnable())[0]);
  })().catch(error=>port.postMessage({error:error.message})));
});`;
const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<title>Durable upload fixture</title>');return;}
  res.setHeader('Content-Type','text/javascript');
  if(req.url==='/driver.mjs'){res.end(worker);return;}
  if(!/^\/(src|right2cloud-module)\/[\w/.-]+\.mjs$/.test(req.url)||req.url.includes('..')){res.writeHead(404).end();return;}
  res.end(await readFile('.'+req.url));
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium'});
 const context=await browser.newContext();
 const url='http://127.0.0.1:'+server.address().port;
 const shelf=await context.newPage();
 await shelf.goto(url);
 const begin=await shelf.evaluate(async count=>{
  await navigator.serviceWorker.register('/driver.mjs',{type:'module'});
  const {active}=await navigator.serviceWorker.ready;
  const {persistUploadSelection}=await import('/src/chrome/local-upload-files.mjs');
  const id=crypto.randomUUID(),selectionId=crypto.randomUUID();
  const files=Array.from({length:count},(_,i)=>new File([String(i)],'file-'+i+'.txt',{lastModified:i}));
  const paths=files.map(file=>'Chosen/nested/'+file.name);
  await persistUploadSelection(selectionId,files,paths);
  const result=await new Promise(resolve=>{
   const channel=new MessageChannel();channel.port1.onmessage=event=>resolve(event.data);
   active.postMessage({action:'begin',id,selectionId,items:files.map((file,i)=>({name:file.name,size:file.size,relativePath:paths[i]}))},[channel.port2]);
  });
  return {id,selectionId,result};
 },files);
 assert.equal(begin.result.state,'completed',JSON.stringify(begin.result));
 assert.equal(begin.result.batch.processed,0);
 await shelf.close();
 const observer=await context.newPage();await observer.goto(url);
 let batch;
 const started=performance.now();
 for(let index=0;index<1000;index++){
  batch=await observer.evaluate(async ({id,history})=>{
   const {active}=await navigator.serviceWorker.ready;
   return new Promise(resolve=>{
    const channel=new MessageChannel();channel.port1.onmessage=event=>resolve(event.data);
    active.postMessage({action:'read',id,history},[channel.port2]);
   });
  },{id:begin.id,history:verifyHistory});
  if(batch?.phase==='verified'||batch?.phase==='paused'||batch?.error)break;
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.equal(batch.phase,'verified',JSON.stringify(batch));
 assert.equal(batch.counts.verified,files);
 if(verifyHistory)assert.deepEqual(batch.history,[{name:'Chosen',total:files,status:'verified'}]);
 const after=await observer.evaluate(async ({id,selectionId})=>{
  const {uploadBatchJournal:journal}=await import('/src/chrome/local-upload-files.mjs');
  const result=await journal.detail(id);
  return {rows:result.outcomes.length,remaining:!!await journal.source(selectionId,0)};
 },begin);
 assert.deepEqual(after,{rows:files,remaining:false});
 console.log(JSON.stringify({state:'PASS',evidenceClass:'chromium-indexeddb-worker-local-provider-fixture',
  chromium:browser.version(),files,verified:batch.counts.verified,receiptRows:after.rows,
  shelfClosedBeforeDispatch:true,...(verifyHistory?{history:batch.history}:{}),elapsedAfterCloseMs:Math.round(performance.now()-started)},null,2));
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
