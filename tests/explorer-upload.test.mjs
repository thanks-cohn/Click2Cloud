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
