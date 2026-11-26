import assert from 'node:assert/strict';
import test from 'node:test';
import {createClick2CloudFileApi} from '../src/explorer/index.mjs';
import {createFileTransport} from '../src/cloudflare/file-transport.mjs';

const source={provider:'cloudflare',connectionId:'cloudflare:account',accountId:'account',bucketName:'bucket',prefix:'projects/'};
const key='projects/Quarter 1.txt';
function fixture(){
  const objects=new Map(), requests=[];
  const request=async(path,options={})=>{
    const url=new URL(path,'https://fixture.invalid');
    const objectKey=decodeURIComponent(url.pathname.split('/objects/')[1]??'');
    if(options.method==='PUT'){
      requests.push(['put',objectKey]);
      objects.set(objectKey,options.body);
      return Response.json({success:true});
    }
    if(objectKey){
      requests.push(['verify',objectKey]);
      return new Response(objects.get(objectKey));
    }
    const prefix=url.searchParams.get('prefix')??'';
    return Response.json({success:true,result:{objects:[...objects].filter(([name])=>name.startsWith(prefix))
      .map(([name,blob])=>({key:name,size:blob.size}))}});
  };
  const send=createFileTransport({remote:{async files({target,intent}){
    requests.push(['move',intent.entry.key]);
    assert.equal(target.prefix,'projects/');
    assert.equal(intent.destinationPrefix,'projects');
    assert(intent.entry.key.startsWith(intent.sourcePrefix+'/'));
    assert.equal(intent.entry.key.split('/').at(-1),'Quarter 1.txt');
    const file=objects.get(intent.entry.key);
    assert.equal(await file.text(),'fixture upload bytes');
    assert.equal(intent.conflict,'keep');
    const finalKey=objects.has(key)?'projects/Quarter 1-'+intent.operationId+'.txt':key;
    objects.set(finalKey,file);
    objects.delete(intent.entry.key);
    return {state:'completed',code:'FILE_ACTION_VERIFIED',completed:1,operationId:intent.operationId,
      receipt:{key:finalKey,size:file.size,etag:'verified-etag',version:'verified-version',operationId:intent.operationId}};
  }}});
  return {objects,requests,api:createClick2CloudFileApi({send,http:{request,boundedFetch:fetch}})};
}

test('Universal File API uploads the selected File with readback and the existing signed move receipt',async()=>{
  const {api,objects,requests}=fixture();
  const file=new File(['fixture upload bytes'],'Quarter 1.txt',{type:'text/plain'});
  const upload=()=>api.run('upload',{source,file,key,stagingPrefix:'projects/.redown-beta-uploads/'});
  const result=await upload();
  assert.equal(result.state,'completed');
  assert.equal(result.data.key,key);
  assert.deepEqual(requests.map(([phase])=>phase),['put','verify','move']);
  assert.equal(await objects.get(key).text(),'fixture upload bytes');
  assert.deepEqual([...objects.keys()],[key]);
  const copy=await upload();
  assert.equal(copy.data.key,'projects/Quarter 1-'+copy.data.operationId+'.txt');
  assert.equal(objects.size,2);
});

test('skipped conflicts and pre-dispatch cancellation perform no write',async()=>{
  const {api,objects,requests}=fixture(),file=new File(['different'],'Quarter 1.txt');
  objects.set(key,new Blob(['original']));
  assert.equal((await api.run('upload',{source,file,key,conflict:'skip'})).state,'partial');
  assert.equal((await api.run('upload',{source,file,key},{signal:AbortSignal.abort()})).state,'cancelled');
  assert.equal(await objects.get(key).text(),'original');
  assert.deepEqual(requests,[]);
});

test('local selection planning preserves Unicode paths, duplicate basenames, zero-byte files and bounds',async()=>{
  const {localUploadKey,planLocalUpload,maximumUploadFiles}=await import('../src/chrome/local-upload-plan.mjs');
  const file=(path,value='')=>Object.defineProperty(new File([value],path.split('/').at(-1)),'webkitRelativePath',{value:path});
  const files=[file('旅行 2026/one/report.txt','one'),file('旅行 2026/two/report.txt')];
  const plan=await planLocalUpload({source,files,mode:'folder'});
  assert.equal(plan.total,2);
  assert.deepEqual(files.map(item=>localUploadKey(source,item,item.webkitRelativePath,'folder')),
    ['projects/旅行 2026/one/report.txt','projects/旅行 2026/two/report.txt']);
  assert.equal(localUploadKey(source,new File([],'one file.txt')),'projects/one file.txt');
  for(const path of ['../outside.txt','chosen//name.txt','/absolute.txt','chosen/.redown/../bad.txt','root/back\\slash.txt','root/'+ '旅'.repeat(343)+'.bin'])
    await assert.rejects(planLocalUpload({source,files:[file(path)],mode:'folder'}),{code:'UPLOAD_PATH_INVALID'});
  await assert.rejects(planLocalUpload({source,files:[files[0],files[0]],mode:'folder'}),{code:'UPLOAD_DUPLICATE_PATH'});
  await assert.rejects(planLocalUpload({source,files:{length:maximumUploadFiles+1},mode:'folder'}),{code:'UPLOAD_BATCH_LIMIT'});
  const many=Array.from({length:400},(_,index)=>file('chosen/sub/'+index));
  let yields=0;
  await planLocalUpload({source,files:many,mode:'folder',yieldBatch:async()=>{yields++;}});
  assert.equal(yields,3);
  await assert.rejects(planLocalUpload({source,files:many,mode:'folder',signal:AbortSignal.abort()}),{name:'AbortError'});
  assert.equal((await planLocalUpload({source,files:[],mode:'folder'})).total,0);
});

test('an interrupted local claim fences the exact path across requests and can only be released by its owner',async()=>{
  await import('fake-indexeddb/auto');
  const {claimLocalUpload,releaseLocalUpload}=await import('../src/chrome/local-upload-files.mjs');
  const [first,second]=await Promise.all([claimLocalUpload('path',{id:'owner'}),claimLocalUpload('path',{id:'other'})]);
  assert.equal(first,undefined);
  assert.deepEqual(second,{id:'owner'});
  await releaseLocalUpload('path','other');
  assert.deepEqual(await claimLocalUpload('path',{id:'other'}),{id:'owner'});
  await releaseLocalUpload('path','owner');
  assert.equal(await claimLocalUpload('path',{id:'other'}),undefined);
  await releaseLocalUpload('path','other');
});

test('durable batch emits one success after the last verified file and resumes only remaining paths',async()=>{
  await import('fake-indexeddb/auto');
  const {uploadBatchJournal}=await import('../src/chrome/local-upload-files.mjs');
  const {createLocalUploadBatches}=await import('../src/chrome/local-upload-batch.mjs');
  const seen=[], downloads=[], batchId=crypto.randomUUID(), firstTicket=crypto.randomUUID(), owner={};
  const items=['Folder A/same.txt','Folder B/nested/same.txt'].map(relativePath=>({name:'same.txt',size:3,relativePath}));
  const dependency={
    journal:uploadBatchJournal,checkDestination:async()=>({}),version:'0.3.32',
    async dispatch({item,ticket},_binding,_abort,progress){
      seen.push(['upload',item.key]);
      progress({phase:'verifying'});
      return {state:'completed',receipt:{key:item.key,size:item.size,etag:'etag',version:'version',operationId:ticket}};
    },
    reconcile:async()=>null,
    async notify(id){
      assert.equal((await uploadBatchJournal.get(id)).phase,'verified');
      seen.push(['notice',id]);
      return {state:'rendered'};
    },
    receiptEnabled:async()=>true,
    async downloadReceipt(receipt){downloads.push(receipt);return 'download-requested';}
  };
  const first=createLocalUploadBatches(dependency);
  await first.begin({source,batchId,mode:'folder',items},undefined,owner);
  await first.step({source,batchId,index:0,ticket:firstTicket},new AbortController(),undefined,owner);
  assert.equal(await first.stop(batchId,{},{}),undefined,'foreign port cannot stop the batch');
  await first.stop(batchId,{detached:true},owner);
  const second=createLocalUploadBatches(dependency);
  assert.equal((await second.inspect({source,batchId})).batch.phase,'paused');
  assert.equal(seen.length,1);
  assert.equal(downloads.length,0);
  await assert.rejects(second.resume({source,batchId,items:[items[0]]}),{code:'UPLOAD_RESELECT_MISMATCH'});
  const resumed=await second.resume({source,batchId,items:items.toReversed()},undefined,owner);
  assert.deepEqual(resumed.order,[0]);
  assert.equal(resumed.batch.next,1);
  await second.step({source,batchId,index:1,ticket:crypto.randomUUID()},new AbortController(),undefined,owner);
  const third=createLocalUploadBatches(dependency);
  const {receipt}=await third.inspect({source,batchId,detail:true});
  assert.equal(receipt.status,'verified');
  assert.deepEqual(seen,[['upload','projects/Folder A/same.txt'],['upload','projects/Folder B/nested/same.txt'],['notice',batchId]]);
  assert.equal(downloads.length,1);
  assert.equal(downloads[0].counts.verified,2);
  assert.equal(receipt.files[0].operationId,firstTicket);
  assert.equal(receipt.files[1].evidence.sha256,null);
  assert.equal(receipt.notification.state,'rendered');
});

test('receipt downloads are gated by the same active Debug opt-in and retain one JSON filename',async()=>{
  const {uploadReceiptPreferenceKey}=await import('../src/chrome/debug-preference.mjs');
  const {downloadUploadReceipt,uploadReceiptGate}=await import('../src/chrome/local-upload-receipt-download.mjs');
  const batchId=crypto.randomUUID(),gate=crypto.randomUUID(),writes=[];
  const preferences={[uploadReceiptPreferenceKey]:gate,uiDebugMode:true};
  const chrome={storage:{local:{get:async()=>preferences}},downloads:{download:async options=>{writes.push(options);return 3;}}};
  assert.equal(await uploadReceiptGate(chrome.storage.local),gate);
  assert.deepEqual(await downloadUploadReceipt(chrome,{batchId,path:'旅行'},gate),{state:'download-requested',id:3});
  assert.equal(writes[0].filename,'redown-upload-receipt-'+batchId+'.json');
  assert.deepEqual(JSON.parse(Buffer.from(writes[0].url.split(',')[1],'base64').toString()),{batchId,path:'旅行'});
  preferences.uiDebugMode=false;
  assert.equal(await downloadUploadReceipt(chrome,{batchId},gate),'disabled');
  preferences.uiDebugMode=true;
  preferences[uploadReceiptPreferenceKey]=crypto.randomUUID();
  assert.equal(await downloadUploadReceipt(chrome,{batchId},gate),'disabled');
  assert.equal(writes.length,1);
});

test('text preview streams through the read-only API, caps ignored Range responses and cancels the source',async()=>{
  const {createEngineApi}=await import('../src/api/service.mjs');
  const {isTextPreview}=await import('../src/explorer/r2-adapter.mjs');
  const limit=512*1024,bodySize=limit*4;
  let cancelled=false,pulls=0;
  const provider=createClick2CloudFileApi({send:()=>assert.fail('Preview does not write'),http:{boundedFetch:fetch,request:async(path,options)=>{
    assert.equal(options.headers['If-Match'],'"source-tag"');
    const stream=new ReadableStream({
      pull(control){
        pulls++;
        if(pulls<=bodySize/65536)control.enqueue(new Uint8Array(65536).fill(65));
        else control.close();
      },
      cancel(){cancelled=true;}
    });
    return new Response(stream,{headers:{etag:'"source-tag"','content-length':String(bodySize)}});
  }}});
  const api=createEngineApi({engine:{},oauth:{status:async()=>({state:'CONNECTED',accounts:[{id:source.accountId}]})},
    current:{read:async()=>assert.fail('Text read should not depend on menu configuration')},
    fileApi:provider,authorize:async()=>true});
  assert.equal(isTextPreview('projects/sub/info.YAML'),true);
  assert.equal(isTextPreview('projects/.editorconfig'),true);
  assert.equal(isTextPreview('projects/video.mp4'),false);
  const result=await api.invoke({version:'3+1.1',method:'readFile',params:{source,
    entry:{key:'projects/config.yaml',folder:false},textPreview:{etag:'source-tag',size:bodySize}}},'gui');
  assert.equal(result.state,'completed',JSON.stringify(result).slice(0,180));
  assert.equal(result.data.state,'completed',JSON.stringify(result).slice(0,180));
  assert.equal(result.data.data.bytes.length,limit);
  assert.equal(result.data.data.truncated,true);
  assert.equal(cancelled,true);
  assert(pulls<bodySize/65536);
});


test('ordinary upload receipt qualification is opt-in and uses strict independent thresholds',async()=>{
  const {qualifyUploadReceipt}=await import('../src/chrome/upload-receipt-policy.mjs');
  const selection=(count,bytes)=>[...Array.from({length:count-1},()=>({size:0})),{size:bytes}];
  const policy={files:true,largeOnly:true};
  assert.equal(qualifyUploadReceipt({},'files',selection(51,200_000_001)).qualifies,false);
  assert.equal(qualifyUploadReceipt(policy,'files',selection(50,200_000_000)).qualifies,false);
  assert.equal(qualifyUploadReceipt(policy,'files',selection(50,200_000_001)).reason,'size');
  assert.equal(qualifyUploadReceipt(policy,'files',selection(51,200_000_000)).reason,'count');
  assert.equal(qualifyUploadReceipt({...policy,combine:'and'},'files',selection(51,200_000_000)).qualifies,false);
  assert.equal(qualifyUploadReceipt({...policy,combine:'and'},'files',selection(51,200_000_001)).reason,'size+count');
  assert.equal(qualifyUploadReceipt({...policy,sizeEnabled:false,count:2},'files',selection(3,0)).reason,'count');
  assert.equal(qualifyUploadReceipt({...policy,countEnabled:false,sizeBytes:9},'files',selection(1,10)).reason,'size');
  assert.equal(qualifyUploadReceipt(policy,'folder',selection(51,200_000_001)).qualifies,false);
  assert.equal(qualifyUploadReceipt({folders:true},'folder',selection(4_000,0)).reason,'category-enabled');
  assert.throws(()=>qualifyUploadReceipt({...policy,countEnabled:false,sizeEnabled:false},'files',selection(3,10)));
});
