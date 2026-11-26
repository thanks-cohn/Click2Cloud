// Owner-runnable native protocol and local workerd/R2 integration. No Cloudflare access.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {openAsBlob} from 'node:fs';
import {mkdir,mkdtemp,open,readFile,rm,writeFile} from 'node:fs/promises';
import {createConnection} from 'node:net';
import {join,resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {build} from 'esbuild';
import 'fake-indexeddb/auto';
import {Miniflare} from 'miniflare';
import {createPythonLab,extensionId,limits} from '../src/chrome/python-lab/session.mjs';
import {campaignDefaults} from '../src/chrome/python-lab/campaign-policy.mjs';
import {appSenderDecision} from '../src/chrome/trusted-sender.mjs';
import {createLocalUploadService,uploadReadScopes} from '../src/chrome/local-upload-service.mjs';
import {createRemoteTransport,preparedDestination} from '../src/cloudflare/transport.mjs';
import {createFileTransport} from '../src/cloudflare/file-transport.mjs';
import {PROTOCOL} from '../src/cloudflare/wire.mjs';
import {createClick2CloudFileApi} from '../src/explorer/index.mjs';
import {createCurrentStore} from '../src/persistence/current-store.mjs';
import {createHistoryStore} from '../src/queue/store.mjs';
import {currentReceipt} from '../src/queue/receipts.mjs';
import {BUILD_INFO} from '../src/build-info.mjs';

const repository=resolve('.');
const pythonRoot=resolve('11.25.2026/live-python-lab/python');
const python=process.env.REDOWN_LAB_PYTHON??(process.platform==='win32'?'py':'python3');
const pythonArguments=process.platform==='win32'&&python==='py'?['-3']:[];
const accountId='0'.repeat(32),bucketName='native-fixture',sessionId='fixture-session';
const origin='chrome-extension://'+extensionId+'/';
const evidenceRoot=resolve('lab-local','verification');
await mkdir(evidenceRoot,{recursive:true});
const temp=await mkdtemp(join(evidenceRoot,'native-'));
const stateRoot=join(temp,'state'),spoolRoot=join(temp,'opfs');
const childEnv={...process.env,REDOWN_LAB_STATE_DIR:stateRoot};
const report={evidenceClass:'python-native-loopback-workerd-r2-fixture',sourceRevision:BUILD_INFO.revision,
 extensionVersion:BUILD_INFO.extensionVersion,remoteCloudflareWrites:0,checks:[]};
const evidence=join(temp,'fixture-summary.json');
const ownerCount=Number(process.env.REDOWN_OWNER_FIXTURE_FILES??0);
const children=new Set();
let worker,lab,executeFault=null,r2Puts=0,workerWrites=0,providerReads=0,current,history;
await mkdir(stateRoot,{mode:0o700});
await mkdir(spoolRoot);

function receipt(name,data={}){report.checks.push({name,state:'PASS',...data});}
function pythonCommand(module,argv,stdio='pipe') {
 const setup='import runpy,sys; sys.path.insert(0, sys.argv.pop(1)); runpy.run_module(sys.argv.pop(1),run_name="__main__")';
 const child=spawn(python,[...pythonArguments,'-c',setup,pythonRoot,module,...argv],
  {env:childEnv,cwd:temp,stdio,windowsHide:true});
 children.add(child);
 child.once('close',()=>children.delete(child));
 return child;
}
function childResult(child) {
 return new Promise((resolve,reject)=>{
  const out=[],err=[];
  child.stdout.on('data',data=>out.push(data));child.stderr.on('data',data=>err.push(data));
  child.once('error',reject);
  child.once('close',code=>resolve({code,stdout:Buffer.concat(out).toString(),stderr:Buffer.concat(err).toString()}));
 });
}
async function cli(args,expected=0) {
 const value=await childResult(pythonCommand('redown_live_lab',args));
 assert.equal(value.code,expected,value.stdout+'\n'+value.stderr);
 return JSON.parse(value.stdout);
}
function frame(value){
 const data=Buffer.from(JSON.stringify(value)),head=Buffer.alloc(4);
 head.writeUInt32LE(data.length);
 return Buffer.concat([head,data]);
}
function parseFrames(stream,onMessage) {
 let pending=Buffer.alloc(0);
 stream.on('data',data=>{
  pending=Buffer.concat([pending,data]);
  while(pending.length>=4){
   const size=pending.readUInt32LE();
   assert(size>0&&size<=512*1024);
   if(pending.length<4+size)return;
   const message=JSON.parse(pending.subarray(4,4+size));
   pending=pending.subarray(4+size);onMessage(message);
  }
 });
}
const runtime={id:extensionId,getURL:path=>origin+path,connectNative(){
 const child=pythonCommand('redown_live_lab.native_host',[origin]);
 const events=new Set(),disconnect=new Set();
 parseFrames(child.stdout,message=>events.forEach(listener=>listener(message)));
 child.stderr.on('data',()=>{});
 child.on('error',()=>disconnect.forEach(listener=>listener()));
 child.on('close',()=>disconnect.forEach(listener=>listener()));
 return {onMessage:{addListener:listener=>events.add(listener),removeListener:listener=>events.delete(listener)},
  onDisconnect:{addListener:listener=>disconnect.add(listener),removeListener:listener=>disconnect.delete(listener)},
  postMessage(message){child.stdin.write(frame(message));},disconnect(){child.stdin.end();}};
}};
const memory={};const storage={async get(keys){return Object.fromEntries([keys].flat().map(key=>[key,memory[key]]));},
 async getKeys(){return Object.keys(memory);},async set(data){Object.assign(memory,data);}};
const opfs=()=>({
 async getFileHandle(name){
  const path=join(spoolRoot,name);
  return {
   async createWritable(){
    const file=await open(path,'wx');let closed=false;
    const close=async()=>{if(!closed){closed=true;await file.close();}};
    return {write:bytes=>file.writeFile(bytes),close,abort:close};
   },
   getFile:()=>openAsBlob(path)
  };
 },
 removeEntry:name=>rm(join(spoolRoot,name),{force:true})
});
const waitFor=async f=>{
 for(let attempt=0;attempt<120;attempt++){const value=await f();if(value)return value;await delay(30);}
 throw Error('Fixture wait timed out');
};
async function bind(mode='read-write',scopeId=null,extra={}){
 await lab.ui('start',{accountId,bucketName,mode,scopeId,minutes:15,...extra});
 return waitFor(async()=>{const state=await lab.ui('status');return state.state==='PAIRING'&&state;});
}
async function rawHandshake(endpoint,key) {
 const socket=createConnection({host:'127.0.0.1',port:endpoint.port});
 const received=[];
 parseFrames(socket,value=>received.push(value));
 socket.on('error',()=>{});
 await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('error',reject);});
 socket.write(frame({key}));
 return {socket,async next(){return waitFor(()=>received.shift());},send(value){socket.write(frame(value));}};
}
async function getEndpoint(){return JSON.parse(await readFile(join(stateRoot,'connection.json'),'utf8'));}
const sha=data=>createHash('sha256').update(data).digest('hex');

try{
 const wrongOrigin=await childResult(pythonCommand('redown_live_lab.native_host',['chrome-extension://'+'b'.repeat(32)+'/']));
 assert.equal(wrongOrigin.code,2);
 assert.equal(appSenderDecision(runtime,{id:extensionId,url:'https://untrusted.invalid/'}).accepted,false);
 assert.equal(appSenderDecision(runtime,{id:'b'.repeat(32),url:origin+'extension/app.html'}).accepted,false);
 receipt('native invocation and extension sender fences');
 const compiled=await build({entryPoints:[join(repository,'src/cloudflare/worker.mjs')],bundle:true,
  write:false,format:'esm',platform:'browser'});
 const secret='fixture-only-signed-worker-credential';
 const plan={state:'ready',protocol:PROTOCOL,accountId,bucketName,prefixScope:'permitted',
  url:'https://python-lab-fixture.workers.dev',secret};
 worker=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-01-01',r2Buckets:['STORAGE'],
  durableObjects:{CLAIMS:{className:'RemoteClaims',useSQLite:true}},
  bindings:{SIGNING_KEY:secret,ACCOUNT_ID:accountId,BUCKET_NAME:bucketName,PREFIX_SCOPE:'permitted'}});
 const bucket=await worker.getR2Bucket('STORAGE');
 await bucket.put('unrelated/private.txt','out of scope');
 const oauth={
  async authority(){return {sessionId,accounts:[{id:accountId,name:'QA fixture'}],scopes:uploadReadScopes};},
  async request(path,options={}){
   options.signal?.throwIfAborted();
   assert.equal(options.expectedSession,sessionId);
   const url=new URL(path,'https://fixture.invalid');
   const encoded=url.pathname.split('/objects/')[1];
   if(options.method==='PUT'){
    const key=decodeURIComponent(encoded);
    assert.match(key,/^permitted\/\.redown-python-lab\/[0-9a-f-]+\/[0-9a-f-]+\/\.redown-beta-uploads\//);
    r2Puts++;
    await bucket.put(key,await options.body.arrayBuffer());
    return Response.json({success:true});
   }
   if(encoded){
    const item=await bucket.get(decodeURIComponent(encoded));
    if(!item)return new Response(null,{status:404});
    if(options.headers?.['If-Match']){
     assert.equal(options.headers['If-Match'],item.httpEtag);
     if(!encoded.includes('.redown-beta-uploads'))providerReads++;
    }
    return new Response(item.body,{headers:{etag:item.httpEtag,'content-length':String(item.size)}});
   }
   const result=await bucket.list({prefix:url.searchParams.get('prefix')??'',
    cursor:url.searchParams.get('cursor')||undefined,delimiter:url.searchParams.get('delimiter')||undefined,
    limit:Number(url.searchParams.get('per_page')||1000)});
   return Response.json({success:true,result:{objects:result.objects.map((item)=>({
    key:item.key,size:item.size,etag:item.etag,version:item.version
   })),delimited:result.delimitedPrefixes,cursor:result.cursor??'',truncated:result.truncated}});
  }
 };
 const lookup=async()=>plan;
 const remote=createRemoteTransport({oauth,lookup,pollIntervalMs:5,
  fetch:(url,options)=>{if(new URL(url).pathname==='/files')workerWrites++;return worker.dispatchFetch(url,options);}});
 const execute=createFileTransport({remote});
 current=createCurrentStore();history=createHistoryStore();
 const accounting=[];
 const service=createLocalUploadService({assertConnected:()=>{},oauth,lookup,checkPrepared:preparedDestination,remote,current,
  onVerified:()=>{},onAccounted:row=>{const job=history.reconcile(currentReceipt(row));accounting.push(job);return job;},
  runFileUpload:(input,options)=>service.run(input,options),
  executeFileMessage:async(...args)=>{
   const value=await execute(...args);
   if(executeFault==='lost-ack')throw Error('Fixture dropped signed Worker response after commit');
   return value;
  }
 });
 const revision=(await childResult(spawn('git',['rev-parse','HEAD'],{cwd:repository}))).stdout.trim();
 report.sourceRevision=revision;
 lab=createPythonLab({runtime,storage,build:{...BUILD_INFO,revision,labEvidenceClass:report.evidenceClass},
  permission:async()=>true,opfsCapability:()=>true,
  authority:oauth.authority,buckets:async()=>({buckets:[{name:bucketName}],cursor:''}),
  checkBucket:async()=>true,workerPrefix:async()=>plan.prefixScope,checkUpload:service.checkDestination,
  upload:service.dispatchLabFile,readUploadOutcome:id=>current.readRemoteResult(id),reconcileUpload:service.reconcileFile,
  fileApi:(expectedSession,beforeRequest)=>createClick2CloudFileApi({send:async()=>{throw Error('Fixture write denied');},
   http:{boundedFetch:fetch,request(path,options){beforeRequest();return oauth.request(path,{...options,expectedSession});}}}),
  spoolDirectory:async()=>opfs()
 });
 if(ownerCount){
  assert(Number.isSafeInteger(ownerCount)&&ownerCount>0);
  const initial=await bind('read-write',null,{ceilings:campaignDefaults,minutes:75});
  await cli(['pair','--code',initial.pairCode]);
  const local=await cli(['init']);
  const profiles=[['Root A','旅行','txt'],['Root B','Long paths','unknown'],['Root C','café notes','bin']];
  const sizes=[0,11,997,4096,16384,131072,131073];
  let bytes=0;
  for(let i=0;i<ownerCount;i++){
   const [top,nested,ext]=profiles[i%profiles.length];
   const parent=i%31===0?local.input:join(local.input,top,nested);
   await mkdir(parent,{recursive:true});
   const name=`${String(i).padStart(4,'0')} ${'界'.repeat(i%29===0?74:2)}.${ext}`;
   const content=Buffer.alloc(sizes[i%sizes.length],i%256);
   if(content.length>=4)content.writeUInt32LE(i);
   bytes+=content.length;
   await writeFile(join(parent,name),content);
  }
  const start=performance.now();
  const budget=ownerCount===600?['--file-budget','600','--provider-requests','160000','--traffic-bytes','536870912',
   '--temp-disk-bytes','268435456','--operation-budget','750','--audit-requests','24',
   '--audit-operations','56','--audit-traffic-bytes','8388608']:[];
  const run=await cli(['campaign','--input',local.input,'--output','owner-fixture','--operations','upload',
   '--execution','completion','--benchmark-seconds','2400','--execution-seconds','3600',
   '--inventory-seconds','1800','--transfer-seconds','300','--inactivity-seconds','120','--request-seconds','30',
   '--upload-seconds','300','--verification-seconds','300','--authorization-minutes','75',
   '--audit-seconds','300','--concurrency','1','--verification','production','--expect-files',String(ownerCount),
   '--live','--approve-cost-usd',ownerCount===600?'2':'7',...budget]);
  assert.equal(run.status,'PASS');assert.equal(run.productionConfirmedFiles,ownerCount);
  assert.equal(run.productionConfirmedBytes,bytes);assert.equal(run.locationAudit.matchedCount,ownerCount);
  assert.equal(run.locationAudit.observedUniqueCount,ownerCount);assert.equal(run.locationAudit.stagingBytes,0);
  assert.equal(run.locationAudit.completeScopedListing,true);
  assert.equal(r2Puts,ownerCount);assert.equal(workerWrites,ownerCount);assert.equal(providerReads,0);
  const check=await cli(['check-location','--run',run.receiptBundle]);
  assert.equal(check.status,'PASS');assert.equal(check.matchedFiles,ownerCount);
  const ops=(await readFile(join(run.receiptBundle,'operations.ndjson'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(ops.filter(row=>row.event==='uploadAcknowledged').length,ownerCount);
  assert.equal(ops.filter(row=>row.event==='result'&&row.state==='PASS'&&row.readback===null).length,ownerCount);
  await Promise.all(accounting);
  const queue=await history.jobs({limit:ownerCount});
  assert.equal(queue.finished,ownerCount);
  assert(queue.items.every(row=>row.status==='verified'));
  assert.equal((await bucket.head('unrelated/private.txt')).size,12);
  receipt('Owner campaign uses native framing, production Worker/R2, independent location audit and durable queue',{
   files:ownerCount,bytes,elapsedMs:Math.round(performance.now()-start),receiptSummary:run.benchmark,
   publicationWrites:workerWrites,stagingPuts:r2Puts,independentContentGets:providerReads,
   audit:run.locationAudit,usage:run.usage,receiptBundle:run.receiptBundle});
  if(ownerCount<=24){
   const download=await cli(['download-campaign','--run',run.receiptBundle,'--retain-downloads','--live','--approve-cost-usd','1']);
   assert.equal(download.downloadStatesInWindow.PASS,ownerCount);
   assert.equal(download.benchmark.independentSha256WithinWindow,ownerCount);
   assert.equal(r2Puts,ownerCount);assert.equal(workerWrites,ownerCount);assert.equal(providerReads,ownerCount);
   assert.equal((await cli(['check-location','--run',run.receiptBundle])).status,'PASS');
   assert(download.share.every(path=>!path.includes('/downloads/')));
   receipt('Download-only under a read-write grant verifies original keys with zero new PUT or publication calls',
    {files:ownerCount,bytes,reads:providerReads,verified:download.benchmark.independentSha256WithinWindow});
   const nextInput=join(temp,'deadline-input');
   await mkdir(nextInput);
   for(let i=0;i<12;i++)await writeFile(join(nextInput,`${i}.txt`),String(i));
   const incomplete=await cli(['campaign','--input',nextInput,'--execution','timed','--benchmark-seconds','2',
    '--execution-seconds','90','--audit-seconds','30','--live','--approve-cost-usd','1'],3);
   const initialWrites=incomplete.productionConfirmedFiles;
   assert(initialWrites<12);assert(incomplete.continuationCommand.includes('continue-campaign'));
   const final=await cli(['continue-campaign','--input',nextInput,'--run',incomplete.receiptBundle,
    '--execution','completion','--execution-seconds','90','--audit-seconds','30','--live','--approve-cost-usd','1']);
   assert.equal(final.productionConfirmedFiles,12);assert.equal(final.target.prefix,incomplete.target.prefix);
   assert.equal(workerWrites,ownerCount+12);
   assert.equal(final.locationAudit.matchedCount,12);
   receipt('Timed cutoff preserves pending work; read-write continuation keeps exact keys and does not replay publications',
    {before:initialWrites,final:12,additionalPublicationWrites:12-initialWrites});
   const lostInput=join(temp,'lost-ack-input');
   await mkdir(lostInput);await writeFile(join(lostInput,'lost.txt'),'lost acknowledgement');
   executeFault='lost-ack';
   const lost=await cli(['campaign','--input',lostInput,'--execution-seconds','90','--audit-seconds','30',
    '--live','--approve-cost-usd','1'],3);
   executeFault=null;
   assert.equal(lost.productionConfirmedFiles,0);
   assert.equal(lost.statusCounts.UNCERTAIN,1);
   const reconciled=await cli(['continue-campaign','--input',lostInput,'--run',lost.receiptBundle,
    '--execution-seconds','90','--audit-seconds','30','--live','--approve-cost-usd','1']);
   assert.equal(reconciled.productionConfirmedFiles,1);
   assert.equal(reconciled.locationAudit.matchedCount,1);
   assert.equal(workerWrites,ownerCount+13);
   receipt('A lost production acknowledgement is reconciled against the same Worker operation without replay',
    {initialUncertain:1,recovered:1,additionalPublicationWrites:0});
   await lab.ui('end');
   const restored=await bind('read-only',run.target.scopeId,{campaignId:run.campaignId,ceilings:campaignDefaults,minutes:75});
   await cli(['pair','--code',restored.pairCode]);
   const audit=await cli(['audit-location','--run',run.receiptBundle,'--live','--approve-cost-usd','1']);
   assert.equal(audit.locationAudit.matchedCount,ownerCount);assert.equal(workerWrites,ownerCount+13);
   assert.equal((await cli(['check-location','--run',run.receiptBundle])).status,'PASS');
   receipt('A freshly authorized read-only grant can independently audit the exact original campaign',
    {matched:ownerCount,additionalPublicationWrites:0});
  }
  report.state='PASS';
 }else{
 const initial=await bind();
 const endpoint=await getEndpoint();
 assert.equal(endpoint.host,'127.0.0.1');
 const stranger=await rawHandshake(endpoint,'incorrect-key');
 assert.equal((await stranger.next()).error.code,'LOCAL_AUTH_DENIED');stranger.socket.destroy();
 const unpaired=await rawHandshake(endpoint,endpoint.key);
 await unpaired.next();unpaired.send({method:'describe',input:{}});
 assert.equal((await unpaired.next()).error.code,'PAIRING_REQUIRED');unpaired.socket.destroy();
 assert.equal((await cli(['pair','--code','a'.repeat(16)],2)).code,'PAIRING_CODE_REJECTED');
 assert.equal((await cli(['pair','--code',initial.pairCode])).status,'PAIRED');
 assert.equal((await cli(['pair','--code',initial.pairCode],2)).code,'PAIRING_CODE_REJECTED');
 const doctor=await cli(['doctor','--session']);
 assert.deepEqual(doctor.limits,limits);
 assert.deepEqual((await cli(['doctor'])).limits,limits);
 assert.equal(doctor.providerRoundTrip,'NOT_TESTED_BY_DOCTOR');
 const diagnostic=await cli(['doctor','--session','--diagnostics']);
 assert.equal(diagnostic.startup.firstFailure.code,'PAIRING_CODE_REJECTED');
 assert.equal(diagnostic.startup.stages.find(row=>row.stage==='pairing').outcome,'PASS');
 assert.equal(diagnostic.providerRoundTrip,'NOT_TESTED_BY_DIAGNOSTICS');
 for(const privateValue of [accountId,bucketName,initial.pairCode,doctor.scopeId,doctor.prefix])
  assert(!JSON.stringify(diagnostic).includes(privateValue));
 receipt('paired native socket, single use code, and capability negotiation',{protocol:doctor.protocol});
 receipt('paired CLI exports the shared sanitized startup stages and retains the first failure');

 const saved=JSON.parse(await readFile(join(stateRoot,'ticket.json'),'utf8'));
 const paired=await rawHandshake(endpoint,endpoint.key);
 await paired.next();paired.send({method:'pair',input:{ticket:saved.ticket,code:null}});
 assert.equal((await paired.next()).state,'available');
 const budget={files:1,trafficBytes:20,diskBytes:4,providerRequests:20,operations:3,seconds:60};
 paired.send({method:'admit',input:{runId:randomUUID(),mode:'write',budget:{...budget,files:99999}}});
 assert.equal((await paired.next()).error.code,'LAB_BUDGET_EXCEEDED');
 paired.send({method:'admit',input:{runId:randomUUID(),mode:'write',budget}});
 assert.equal((await paired.next()).state,'available');
 paired.send({method:'metadata',input:{path:'../../unrelated/private.txt'}});
 assert.equal((await paired.next()).error.code,'INVALID_OBJECT_PATH');
 paired.send({method:'metadata',input:{path:'private.txt',bucketName:'unrelated'}});
 assert.equal((await paired.next()).error.code,'INVALID_INPUT');
 const uploadId=randomUUID(),upload={id:uploadId,path:'file.txt',size:5,sha256:'0'.repeat(64),timeout:30,contentType:'text/plain'};
 paired.send({method:'uploadOpen',input:upload});
 assert.equal((await paired.next()).error.code,'LAB_SPOOL_UNAVAILABLE');
 paired.send({method:'uploadOpen',input:{...upload,size:0}});
 assert.equal((await paired.next()).state,'available');
 paired.send({method:'cancel',input:{id:uploadId}});
 assert.equal((await paired.next()).data.cancellationRequested,true);
 paired.send({method:'closeTransfer',input:{id:uploadId}});
 assert.equal((await paired.next()).data.closed,true);
 paired.send({method:'uploadOpen',input:{...upload,size:0}});
 assert.equal((await paired.next()).error.code,'TRANSFER_ID_REUSED');
 paired.socket.destroy();
 await waitFor(async()=>(await lab.ui('status')).state==='PAIRED');
 assert.equal(r2Puts+workerWrites,0);
 receipt('scope escape, foreign bucket, budgets, pre-dispatch cancellation and transfer ID reuse');

 const local=await cli(['init']);
 await mkdir(join(local.input,'Root A','旅行'),{recursive:true});
 await mkdir(join(local.input,'Root B','Empty'),{recursive:true});
 const ordinary=Buffer.alloc(310_000,0x61);
 await writeFile(join(local.input,'Root A','旅行','notes.txt'),ordinary);
 await writeFile(join(local.input,'Root B','empty.txt'),Buffer.alloc(0));
 await writeFile(join(local.input,'Root B','payload.unknown'),Buffer.from([0,1,2,255]));
 const dry=await cli(['corpus','--operations','upload','--manifest','review.json','--dry-run']);
 assert.equal(dry.status,'READY');
 assert.equal(dry.inventory.length,3);
 assert.equal(dry.inventory.find(row=>row.path.endsWith('payload.unknown')).format,'unknown');
 assert.deepEqual(JSON.parse(await readFile(dry.manifestPath,'utf8')).emptyFolders,['Root B/Empty']);
 assert.equal(r2Puts+workerWrites,0);
 const changed=join(local.input,'Root A','旅行','notes.txt');
 await writeFile(changed,Buffer.alloc(ordinary.length,0x62));
 assert.equal((await cli(['run','--manifest',dry.manifestPath,'--dry-run'],2)).code,'SOURCE_CHANGED');
 await writeFile(changed,ordinary);
 if(process.platform!=='win32'){
  await writeFile(join(local.input,'Root B','EMPTY.txt'),'collision');
  assert.equal((await cli(['corpus','--dry-run'],2)).code,'CORPUS_PATH_COLLISION');
  await rm(join(local.input,'Root B','EMPTY.txt'));
  receipt('case-folded collision and changed source blocked');
 }else receipt('changed source blocked (case-folding exercised by the Python contract tests)');
 const uploadOnly=await cli(['run','--manifest',dry.manifestPath,'--live','--approve-cost-usd','0.10']);
 assert.equal(uploadOnly.state,'PASS');assert.equal(uploadOnly.verifiedBytes,ordinary.length+4);
 const notes=JSON.parse((await readFile(join(uploadOnly.evidencePath,'operations.ndjson'),'utf8')).split('\n')
  .find(line=>line.includes('"state":"PASS"')&&line.includes('notes.txt')));
 assert.equal(notes.readback.clientSha256,sha(ordinary));
 assert.equal(notes.readback.savedCopy,null);
 assert.equal(notes.readback.key,notes.intendedKey);
 assert.equal(notes.upload.acknowledged,true);
 const roundtrip=await cli(['corpus','--operations','round-trip','--live','--approve-cost-usd','0.10']);
 assert.equal(roundtrip.state,'PASS');
 const roundNotes=JSON.parse((await readFile(join(roundtrip.evidencePath,'operations.ndjson'),'utf8')).split('\n')
  .find(line=>line.includes('"state":"PASS"')&&line.includes('notes.txt')));
 assert.equal(sha(await readFile(roundNotes.readback.savedCopy)),sha(ordinary));
 const comparison=await cli(['compare','--before',uploadOnly.evidencePath,'--after',roundtrip.evidencePath]);
 assert.equal(comparison.counts.WORKLOAD_CHANGED,3);
 const repeat=await cli(['run','--manifest',dry.manifestPath,'--live','--approve-cost-usd','0.10']);
 const identityCompare=await cli(['compare','--before',uploadOnly.evidencePath,'--after',repeat.evidencePath]);
 assert.equal(identityCompare.counts.UNCHANGED_OUTCOME,3);
 await Promise.all(accounting);
 const historyRows=await history.batch({limit:100});
 assert.equal(historyRows.length,9);
 assert(historyRows.every(row=>row.saveMode==="local-upload"));
 assert.equal(r2Puts,9);assert.equal(workerWrites,9);assert.equal(providerReads,9);
 receipt('three mixed nested corpus objects per run, including zero bytes, and one R2 read per verified upload',
  {upstreamWrites:workerWrites,independentReads:providerReads,verifiedBytes:roundtrip.verifiedBytes,
   example:{fixtureId:notes.fixtureId,sha256:notes.readback.clientSha256,
    uploadOnlySavedCopy:notes.readback.savedCopy,roundTripHash:roundNotes.readback.clientSha256}});
 receipt('same manifest replay and changed retention compared by stable scenario',{same:identityCompare.counts,changed:comparison.counts});

 const comprehensivePath=join(repository,'11.25.2026','live-python-lab','manifests','comprehensive.json');
 const comprehensive=await cli(['run','--manifest',comprehensivePath,'--live','--approve-cost-usd','0.10']);
 assert.equal(comprehensive.state,'PASS');
 const comprehensiveEvents=(await readFile(join(comprehensive.evidencePath,'operations.ndjson'),'utf8')).split('\n')
  .filter(Boolean).map(line=>JSON.parse(line)).filter(row=>row.event==='result');
 const outcomes=Object.groupBy(comprehensiveEvents,row=>row.code);
 assert.equal(outcomes.CONFLICT_PRESERVED.length,2);
 assert.equal(outcomes.METADATA_MATCH.length,19);
 assert.equal(outcomes.LIST_EXPECTATIONS_PRESENT.length,1);
 assert.equal(outcomes.UPLOAD_SHA256_VERIFIED.length,19);
 assert.equal(outcomes.REMOTE_BYTES_OBSERVED.length,19);
 receipt('Comprehensive executes the same interpreter for 19 fixtures plus two preserved conflicts',
  {verifiedUploads:outcomes.UPLOAD_SHA256_VERIFIED.length,conflicts:outcomes.CONFLICT_PRESERVED.length,
   metadata:outcomes.METADATA_MATCH.length,listing:outcomes.LIST_EXPECTATIONS_PRESENT.length,
   independentDownloads:outcomes.REMOTE_BYTES_OBSERVED.length,receiptDirectory:comprehensive.evidencePath});


 // ACK lost after the real signed fixture Worker committed. Revoke then pair a new
 // read-only grant for the recorded scope; reconciliation cannot submit a write.
 const lostSource=join(temp,'lost');await mkdir(lostSource);
 await writeFile(join(lostSource,'lost.txt'),'worker committed before the browser got its receipt');
 executeFault='lost-ack';
 const lost=await cli(['corpus','--input',lostSource,'--live','--approve-cost-usd','0.10'],3);
 assert.equal(lost.state,'UNCERTAIN');
 executeFault=null;
 const previous=await lab.ui('status');
 const oldChild=[...children].find(child=>child.stdin);
 await lab.ui('end');
 if(oldChild)await new Promise(resolve=>{if(oldChild.exitCode!==null)resolve();else oldChild.once('close',resolve);});
 const restore=await bind('read-only',previous.scopeId);
 await cli(['pair','--code',restore.pairCode]);
 const beforeRecovery=workerWrites;
 const rejected=await cli(['resume','--run',lost.evidencePath,'--expected-digest','0'.repeat(64)],2);
 assert.equal(rejected.code,'FROZEN_MANIFEST_DIGEST_MISMATCH');
 const recovered=await cli(['reconcile','--run',lost.evidencePath,'--expected-digest',lost.resolvedDigest]);
 assert.equal(recovered.state,'PASS');
 assert.equal(workerWrites,beforeRecovery);
 assert.equal((await cli(['run','--manifest',dry.manifestPath,'--live','--approve-cost-usd','0.10'],2)).blockers[0].code,
  'OPERATION_UNSUPPORTED');
 receipt('lost ACK recovered by a separate read-only grant without replay or overwrite',
  {before:lost.state,after:recovered.state,digestMismatch:rejected.code,additionalWorkerWrites:workerWrites-beforeRecovery});
 const restoredChild=[...children].find(child=>child.stdin);
 await lab.ui('end');
 if(restoredChild)await new Promise(resolve=>{if(restoredChild.exitCode!==null)resolve();else restoredChild.once('close',resolve);});
 assert.equal((await cli(['doctor','--session'],2)).code,'EXTENSION_UNAVAILABLE');
 assert.equal(await (await bucket.get('unrelated/private.txt')).text(),'out of scope');
 receipt('revocation removed native endpoint; unrelated object remained intact');
 report.state='PASS';
 }
}catch(error){
 report.state='FAIL';report.error=String(error.stack??error);
 process.exitCode=1;
}finally{
 lab?.revoke();
 for(const child of children)child.kill();
 await current?.close();
 await history?.close();
 await worker?.dispose();
 await rm(stateRoot,{recursive:true,force:true});
 await rm(spoolRoot,{recursive:true,force:true});
 await writeFile(evidence,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({...report,evidence},null,2));
}
