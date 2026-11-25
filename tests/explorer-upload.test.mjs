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
