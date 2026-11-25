// Test-only transport adapter. Uses the real batch controller, Cloudflare
// upload service, CURRENT store, File API, signed Worker, and R2 emulator.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openAsBlob} from 'node:fs';
import {appendFile,readFile,rename,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import 'fake-indexeddb/auto';
import {Miniflare} from 'miniflare';
import {BUILD_INFO} from '../../../src/build-info.mjs';
import {createLocalUploadBatches} from '../../../src/chrome/local-upload-batch.mjs';
import {createLocalUploadService,uploadReadScopes} from '../../../src/chrome/local-upload-service.mjs';
import {uploadBatchJournal} from '../../../src/chrome/local-upload-files.mjs';
import {createClosedShelfSaveNotice} from '../../../src/chrome/save-notice.mjs';
import {createRemoteTransport,preparedDestination} from '../../../src/cloudflare/transport.mjs';
import {PROTOCOL} from '../../../src/cloudflare/wire.mjs';
import {createFileTransport} from '../../../src/cloudflare/file-transport.mjs';
import {createCurrentStore} from '../../../src/persistence/current-store.mjs';
import {currentReceipt} from '../../../src/queue/receipts.mjs';
import {createHistoryStore} from '../../../src/queue/store.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const expectedPath=resolve(process.argv[2]);
const runDirectory=resolve(process.argv[3]);
const scenario=process.argv[4]??'success';
const expected=JSON.parse(await readFile(expectedPath,'utf8'));
const report={schema:'redown.upload-lab.integration',version:1,extensionVersion:BUILD_INFO.extensionVersion,
  scenario,seed:expected.seed,runId:expected.runId,layer:'local-workerd-r2',startedAt:Date.now(),checks:[],batches:[],
  notifications:[],downloads:[],inventory:[],verdict:'FAIL'};
let worker,peakStagedBytes=0,peakRss=0,stagingPuts=0,signedCommits=0,nativeCreates=0,session='session-1',online=true;
const check=(name,expected,actual)=>report.checks.push({name,expected,actual,verdict:
  JSON.stringify(expected)===JSON.stringify(actual)?'PASS':'FAIL'});
const save=async(name,value)=>{
  const output=join(runDirectory,name);
  await writeFile(output+'.tmp',JSON.stringify(value,null,2)+'\n');
  await rename(output+'.tmp',output);
};
const event=value=>appendFile(join(runDirectory,'events.ndjson'),JSON.stringify({at:Date.now(),...value})+'\n');
const hash=async stream=>{
  const digest=createHash('sha256');
  for await(const bytes of stream)digest.update(bytes);
  return digest.digest('hex');
};

try{
  assert(expected.schema==='redown.upload-lab.expected'&&expected.version===1&&expected.files.length>=1&&expected.files.length<=10000);
  const compiled=await build({entryPoints:[join(root,'src/cloudflare/worker.mjs')],bundle:true,write:false,format:'esm',platform:'browser'});
  const secret='local-synthetic-signed-operations';
  const source={provider:'cloudflare',connectionId:'cloudflare:fixture',accountId:'fixture',bucketName:'fixture',prefix:'isolated/run/'};
  const plan={state:'ready',protocol:PROTOCOL,accountId:'fixture',bucketName:'fixture',prefixScope:'isolated',
    url:'https://upload-fixture.workers.dev',secret};
  worker=new Miniflare({modules:true,script:compiled.outputFiles[0].text,compatibilityDate:'2026-01-01',r2Buckets:['STORAGE'],
    durableObjects:{CLAIMS:{className:'RemoteClaims',useSQLite:true}},
    bindings:{SIGNING_KEY:secret,ACCOUNT_ID:source.accountId,BUCKET_NAME:source.bucketName,PREFIX_SCOPE:'isolated'}});
  await worker.ready;
  const bucket=await worker.getR2Bucket('STORAGE');
  const oauth={
    authority:async()=>{
      if(!online)throw Object.assign(Error('Fixture OAuth is unavailable'),{code:'AUTH_REQUIRED'});
      return {sessionId:session,accounts:[{id:source.accountId}],scopes:uploadReadScopes};
    },
    request:async(path,options={})=>{
      options.signal?.throwIfAborted();
      if(options.expectedSession!==session)throw Object.assign(Error(),{code:'AUTH_SESSION_CHANGED'});
      const url=new URL(path,'https://local-r2.invalid');
      const encoded=url.pathname.split('/objects/')[1];
      if(options.method==='PUT'){
        assert(encoded,'Fixture staging path');
        stagingPuts++;
        await bucket.put(decodeURIComponent(encoded),await options.body.arrayBuffer());
        return Response.json({success:true});
      }
      if(encoded){
        const item=await bucket.get(decodeURIComponent(encoded));
        return new Response(item?.body??null,{status:item?200:404});
      }
      const result=await bucket.list({prefix:url.searchParams.get('prefix')??'',cursor:url.searchParams.get('cursor')??undefined});
      return Response.json({success:true,result:{objects:result.objects,cursor:result.cursor,truncated:result.truncated}});
    }
  };
  const lookup=async()=>plan;
  const remote=createRemoteTransport({oauth,lookup,fetch:(url,options)=>{if(new URL(url).pathname==='/files')signedCommits++;return worker.dispatchFetch(url,options);},pollIntervalMs:5});
  const execute=createFileTransport({remote});
  let interruptCommit=false,crashAfterCommit=false,crashed=false;
  const current=createCurrentStore(),queue=createHistoryStore(),staged=new Map(),recording=new Set();
  const record=row=>{
    const work=queue.reconcile(currentReceipt(row));
    recording.add(work);
    void work.finally(()=>recording.delete(work)).catch(()=>{});
    return work;
  };
  const service=createLocalUploadService({assertConnected:()=>{},oauth,lookup,
    checkPrepared:preparedDestination,remote,current,onAccounted:record,onVerified:()=>{},
    takeFile:async ticket=>{
      const value=staged.get(ticket);
      staged.delete(ticket);
      return value;
    },
    runFileUpload:(input,options)=>service.run(input,options),
    executeFileMessage:async(...args)=>{
      const result=await execute(...args);
      if(interruptCommit)throw Error('Fixture lost the final acknowledgement.');
      if(scenario==='delayed-verify')await new Promise(resolve=>setTimeout(resolve,100));
      if(crashAfterCommit)crashed=true;
      return result;
    }
  });
  const listeners=[];
  const chrome={runtime:{id:'fixture-chrome',getURL:path=>'chrome-extension://fixture-chrome/'+path,
    onMessage:{addListener:listener=>listeners.push(listener)},
    sendMessage:async message=>{
      if(message.stop)return;
      const claim={channel:message.channel,claim:true,windowId:message.windowId,token:message.token};
      const sender={id:'fixture-chrome',url:'chrome-extension://fixture-chrome/extension/app.html',tab:{id:message.tabId}};
      const accepted=await new Promise(response=>listeners.forEach(listener=>listener(claim,sender,response)));
      if(accepted)report.notifications.push({id:message.id,claimedAt:Date.now(),surface:message.surface});
      return accepted;
    }},
    tabs:{query:async query=>[{id:query.windowId??1,windowId:query.windowId??1}]},
    notifications:{clear:async()=>{},create:async()=>{nativeCreates++;}}
  };
  const preferences={value:{notifications:scenario!=='notification-off'},ready:Promise.resolve(),subscribe:()=>{}};
  const notice=createClosedShelfSaveNotice({chrome,preferences,isClosed:async()=>true});
  let receiptEnabled=scenario!=='receipt-off';
  const journal={...uploadBatchJournal,save:async(batch,outcome)=>{
    if(crashed&&outcome)throw Error('Fixture terminated the upload owner after commit.');
    return uploadBatchJournal.save(batch,outcome);
  }};
  const services={journal,checkDestination:service.checkDestination,validatePlan:service.validatePlan,dispatch:service.dispatch,
    reconcile:service.reconcile,notify:notice.savedBatch,version:BUILD_INFO.extensionVersion,
    receiptEnabled:async()=>receiptEnabled,downloadReceipt:async receipt=>{
      report.downloads.push({id:receipt.batchId,at:Date.now(),status:receipt.status});
      await save('auto-'+receipt.batchId+'.json',receipt);
      return 'download-requested';
    }};
  let controller=createLocalUploadBatches(services);
  const files=expected.files.map(file=>({...file,name:file.path.split('/').at(-1),relativePath:file.path,size:file.bytes}));
  const selected=files.length;
  if(['last-conflict','keep-both','expired','restart','lost-ack','cancel','detach','quota','resume'].includes(scenario))
    assert(selected>=2,'This case requires at least two fixtures');
  const existing=new Map();
  if(scenario==='last-conflict'||scenario==='keep-both'){
    const file=scenario==='keep-both'?files[0]:files.at(-1);
    const key=source.prefix+file.path,bytes=Buffer.from('fixture pre-existing object');
    await bucket.put(key,bytes);
    existing.set(key,{key,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  const runs=scenario==='concurrent'?[files.slice(0,Math.ceil(selected/2)),files.slice(Math.ceil(selected/2))]:[files];
  if(scenario==='concurrent')assert(runs[1].length,'Two groups require at least two fixtures');
  const uploaded=new Map(existing);
  async function run(items,windowId){
    if(scenario==='duplicate-path'){
      await assert.rejects(controller.begin({source,batchId:crypto.randomUUID(),mode:expected.mode,items:[items[0],items[0]]}),{code:'UPLOAD_DUPLICATE_PATH'});
      check('duplicate path rejected before writes',0,stagingPuts);
      return;
    }
    const batchId=crypto.randomUUID();
    const state=await controller.begin({source,batchId,mode:expected.mode,items,origin:{windowId}});
    assert.equal(state.state,'completed',JSON.stringify(state));
    await event({type:'begin',batchId,expected:items.length,source});
    let batch=state.batch, verifiedProgress=0, premature=false;
    for(let index=0;index<items.length;index++){
      if(index===items.length-1){
        if(scenario==='expired')session='session-2';
        if(scenario==='cancel'){batch=await controller.stop(batchId);break;}
        if(scenario==='quota'){batch=await controller.stop(batchId,{code:'LOCAL_UPLOAD_STAGING_QUOTA'});break;}
        if(scenario==='detach'){await controller.stop(batchId,{detached:true});break;}
        if(scenario==='lost-ack')interruptCommit=true;
        if(scenario==='restart')crashAfterCommit=true;
        if(scenario==='resume'){
          await controller.stop(batchId,{detached:true});
          controller=createLocalUploadBatches(services);
          const resumed=await controller.resume({source,batchId,items:items.toReversed(),origin:{windowId}});
          check('resume requests remaining file only',[0],resumed.order);
          check('previous verified files remain checkpointed',index,resumed.batch.next);
          batch=resumed.batch;
        }
      }
      const fixture=items[index],ticket=crypto.randomUUID();
      const path=resolve(expectedPath,'..','corpus',fixture.path);
      assert(path.startsWith(resolve(expectedPath,'..','corpus')+ (process.platform==='win32'?'\\':'/')));
      const handle=await openAsBlob(path);
      assert.equal(handle.size,fixture.bytes);
      const file=new File([handle],fixture.name);
      staged.set(ticket,{file,binding:{source,batchId,index,mode:expected.mode,relativePath:fixture.path}});
      peakStagedBytes=Math.max(peakStagedBytes,[...staged.values()].reduce((size,item)=>size+item.file.size,0));
      peakRss=Math.max(peakRss,process.memoryUsage().rss);
      await event({type:'file-dispatch',batchId,index,ticket,path:fixture.path});
      const abort=new AbortController();
      const observer=progress=>{
        if(progress.phase==='verifying'&&progress.uploaded>progress.counts.verified)verifiedProgress++;
        premature ||= report.notifications.some(n=>n.id==='cloudflare-upload:'+batchId);
      };
      const last=index===items.length-1;
      const shouldCommit=!last||!['last-conflict','expired'].includes(scenario);
      let observedKey=source.prefix+fixture.path;
      if(shouldCommit&&existing.has(observedKey)){
        const dot=fixture.name.lastIndexOf('.');
        const stem=dot>0?observedKey.slice(0,observedKey.length-fixture.name.length+dot):observedKey;
        const extension=dot>0?fixture.name.slice(dot):'';
        observedKey=stem+'-'+ticket+extension;
      }
      if(shouldCommit)uploaded.set(observedKey,{key:observedKey,bytes:fixture.bytes,sha256:fixture.sha256});
      let result;
      try{result=await controller.step({source,batchId,index,ticket},abort,observer);}
      catch(error){
        if(!crashed)throw error;
        const before=stagingPuts;
        crashed=crashAfterCommit=false;
        controller=createLocalUploadBatches(services);
        const paused=await controller.inspect({source,batchId});
        check('worker restart exposes interrupted batch','paused',paused.batch?.phase);
        result=await controller.reconcile({source,batchId});
        check('read-only restart reconciliation writes no objects',before,stagingPuts);
      }
      batch=result.batch;
      if(scenario==='lost-ack'&&interruptCommit){
        const before=stagingPuts,stored=await current.readRemoteResult(ticket);
        const proof=await service.reconcileFile(stored.localUpload);
        check('lost ACK reconciles exact committed key',observedKey,proof?.key);
        check('reconciliation never replays write',before,stagingPuts);
      }
      await event({type:'file-result',batchId,index,ticket,phase:batch.phase,code:result.code??null});
      if(batch.phase!=='ready')break;
    }
    const final=await controller.inspect({source,batchId,detail:true});
    report.batches.push(final.receipt);
    const expectedPhase={['last-conflict']:'failed',expired:'failed',cancel:'cancelled',quota:'failed',
      detach:'paused',['lost-ack']:'unconfirmed'}[scenario]??'verified';
    check('batch '+windowId+' phase',expectedPhase,final.batch.phase);
    const eligible=expectedPhase==='verified'&&scenario!=='notification-off';
    const notices=report.notifications.filter(n=>n.id==='cloudflare-upload:'+batchId);
    check('custom notification count '+windowId,Number(eligible),notices.length);
    check('custom notification after durable final verification '+windowId,true,
      !eligible||notices[0].claimedAt>=final.receipt.finishedAt&&final.receipt.counts.verified===items.length);
    const exports=report.downloads.filter(n=>n.id===batchId);
    check('automatic aggregate receipt count '+windowId,Number(expectedPhase!=='paused'&&receiptEnabled),exports.length);
    check('uploaded and verified progress are distinct '+windowId,true,verifiedProgress>0);
    check('no custom notification during file progress '+windowId,false,premature);
    const later=createLocalUploadBatches(services);
    const after=await later.inspect({source,batchId,detail:true});
    check('restart has same batch result '+windowId,final.receipt.status,after.receipt.status);
    check('restart does not repeat custom notification '+windowId,notices.length,
      report.notifications.filter(n=>n.id==='cloudflare-upload:'+batchId).length);
    check('restart does not repeat automatic download '+windowId,exports.length,report.downloads.filter(n=>n.id===batchId).length);
    await Promise.all(recording);
    const rows=[];
    for(const item of final.receipt.files.filter(file=>file.operationId&&file.status==='verified')){
      const row=await current.readRemoteResult(item.operationId);
      const projected=currentReceipt(row);
      rows.push({operationId:item.operationId,currentState:row?.state,historyState:projected[0]?.status});
    }
    check('per-file CURRENT and History projections '+windowId,true,
      rows.length===final.receipt.counts.verified&&rows.every(row=>row.currentState==='verified'&&row.historyState==='verified'));
  }
  if(scenario==='readiness'){
    const denied=await controller.check({...source,accountId:'other'},undefined).catch(error=>error.code);
    check('wrong account denied','SCOPE_UNAUTHORIZED',denied);
    online=false;
    const blocked=await controller.check(source).catch(error=>error.code);
    check('expired authority blocks readiness','AUTH_REQUIRED',blocked);
    online=true;
    check('readiness recovers after reconnect','completed',(await controller.check(source)).state);
  }
  await Promise.all(runs.map((items,index)=>run(items,index+1)));
  let cursor;
  do{
    const page=await bucket.list({prefix:'isolated/',cursor});
    for(const object of page.objects){
      const readback=await bucket.get(object.key);
      report.inventory.push({key:object.key,bytes:readback.size,sha256:await hash(readback.body)});
    }
    cursor=page.truncated?page.cursor:undefined;
  }while(cursor);
  check('exact independent R2 inventory and SHA-256',[...uploaded.values()].sort((a,b)=>a.key.localeCompare(b.key)),
    report.inventory.sort((a,b)=>a.key.localeCompare(b.key)));
  check('one staging PUT per committed test object',uploaded.size-existing.size,stagingPuts);
  check('one signed commit per committed test object',uploaded.size-existing.size,signedCommits);
  check('native success creation',0,nativeCreates);
  report.verdict=report.checks.every(check=>check.verdict==='PASS')?'PASS':'FAIL';
}catch(error){
  report.error={name:error.name,code:error.code??null,message:error.message};
}finally{
  report.resources={stagingPuts,signedCommits,peakStagedBytes,peakNodeRss:peakRss};
  report.elapsedMs=Date.now()-report.startedAt;
  await save('integration.json',report);
  // Notice expiry is intentionally still live. Tear down the isolated runtime.
  await worker?.dispose();
}
process.exit(report.verdict==='PASS'?0:1);
