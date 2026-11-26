// Real Chromium worker, structured clone, and File System API. The provider
// responds through the production File API adapter at the OAuth request edge.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';

const driver=`
import {createLocalDownloads} from '/src/chrome/local-download-service.mjs';
import {createCurrentStore} from '/src/persistence/current-store.mjs';
import {createClick2CloudFileApi} from '/src/explorer/index.mjs';
const store=createCurrentStore(), accountId='test-account';
const source={provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName:'fixture',prefix:'root/'};
const files={'root/empty.txt':'','root/nested/a.txt':'a','root/nested/b.txt':'b'};
let gets=0, failed=false;
const authority=async()=>({sessionId:'fixture-session',accounts:[{id:accountId}],scopes:['workers-r2.read','workers-r2-bucket-item.read']});
const api=()=>createClick2CloudFileApi({send:()=>{throw Error('Fixture writes are disabled');},http:{boundedFetch:fetch,async request(path){
 const url=new URL(path,'http://localhost');
 const object=url.pathname.split('/objects/')[1];
 if(object){
  gets++;
  const name=decodeURIComponent(object);
  if(name==='root/nested/a.txt'&&!failed){failed=true;return new Response(null,{status:502});}
  return new Response(files[name],{headers:{etag:'"'+files[name].length+'"','content-length':files[name].length}});
 }
 const before=url.searchParams.get('prefix')??'';
 return Response.json({success:true,result:{objects:Object.entries(files).filter(([key])=>key.startsWith(before))
  .map(([key,value])=>({key,size:value.length,etag:String(value.length),version:'1'}))}});
}}});
const failures=[];
const service=createLocalDownloads({current:store,authority,makeFileApi:api,onFailure:error=>failures.push([error.name,error.message,error.stack])});
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
 const data=event.data, port=event.ports[0];
 event.waitUntil((async()=>{
  if(data.action==='receipt'){
   port.postMessage({receipt:await service.receipt(data.jobId),gets,failures});
   return;
  }
  const result=await service.admit({...data,source,mode:'original'});
  port.postMessage(result);
  await new Promise(resolve=>setTimeout(resolve,500));
  await service.drive(result);
 })().catch(error=>port.postMessage({error:error.code??error.message})));
});`;

const server=createServer(async(req,res)=>{
 try{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<title>Durable download fixture</title>');return;}
  res.setHeader('Content-Type','text/javascript');
  if(req.url==='/driver.mjs'){res.end(driver);return;}
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
 const evidence=[];
 const cases=[
  {name:'empty.txt',entry:{key:'root/empty.txt',size:0,etag:'0'},files:1},
  {name:'a.txt',entry:{key:'root/nested/a.txt',size:1,etag:'1'},files:1},
  {name:'files.zip',entries:[{key:'root/nested/a.txt'},{key:'root/nested/b.txt'}],files:2},
  {name:'root.zip',files:3},
 ];
 for(const {name,entry,entries,files} of cases){
  const shelf=await context.newPage();await shelf.goto(url);
  const pending=await shelf.evaluate(async ({name,entry,entries})=>{
   await navigator.serviceWorker.register('/driver.mjs',{type:'module'});
   const {active}=await navigator.serviceWorker.ready;
   const {createCurrentStore}=await import('/src/persistence/current-store.mjs');
   const root=await navigator.storage.getDirectory();
   const handle=await root.getFileHandle(name,{create:true});
   const file=await handle.getFile();
   const jobId=crypto.randomUUID();
   await createCurrentStore().stageDownloadHandle(jobId,handle);
   return new Promise(resolve=>{
    const channel=new MessageChannel();channel.port1.onmessage=event=>resolve(event.data);
    active.postMessage({jobId,entry,entries,initialFile:{name:file.name,size:file.size,lastModified:file.lastModified}},[channel.port2]);
   });
  },{name,entry,entries});
  assert.equal(pending.state,'queued',JSON.stringify(pending));
  await shelf.close();
  const observer=await context.newPage();await observer.goto(url);
  let observed;
  for(let wait=0;wait<100;wait++){
   observed=await observer.evaluate(async jobId=>{
    const {active}=await navigator.serviceWorker.ready;
    return new Promise(resolve=>{
     const channel=new MessageChannel();channel.port1.onmessage=event=>resolve(event.data);
     active.postMessage({action:'receipt',jobId},[channel.port2]);
    });
   },pending.jobId);
   if(!['queued','writing','scanning','publishing'].includes(observed.receipt?.state))break;
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  const {receipt}=observed;
  assert.equal(receipt?.state,'verified',JSON.stringify(observed));
  assert.equal(receipt.files,files);
  assert.equal(receipt.proof,'FILE_HANDLE_SIZE_REOPENED');
  const disk=await observer.evaluate(async name=>{
   const root=await navigator.storage.getDirectory(),handle=await root.getFileHandle(name);
   const file=await handle.getFile();
   return {size:file.size,text:await file.text()};
  },name);
  assert.equal(disk.size,receipt.bytes);
  if(name==='a.txt')assert.equal(receipt.attempts,2);
  if(name==='empty.txt')assert.equal(disk.size,0);
  if(name.endsWith('.zip'))assert(disk.text.startsWith('PK'));
  evidence.push({name,files,attempts:receipt.attempts,bytes:receipt.bytes});
  await observer.close();
 }
 console.log(JSON.stringify({state:'PASS',evidenceClass:'chromium-worker-opfs-local-provider-fixture',
  chromium:browser.version(),shelfClosedBeforeDispatch:true,results:evidence},null,2));
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
