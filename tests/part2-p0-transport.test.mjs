import assert from 'node:assert/strict';
import test from 'node:test';
import 'fake-indexeddb/auto';
import {createClick2CloudFileApi} from '../src/explorer/index.mjs';
import {openLabSpool} from '../src/chrome/python-lab/spool.mjs';
import {createCurrentStore} from '../src/persistence/current-store.mjs';

const source={provider:'cloudflare',connectionId:'cloudflare:fixture',accountId:'fixture',bucketName:'fixture',prefix:'qa/'};
const operationId='60a44f4c-c971-5c04-8d05-8c9f1e5d7e60';
const stagingPrefix='qa/.redown-beta-uploads/';
const key='qa/Root A/旅行/0072 界界.txt';
const file=new File(['x'.repeat(997)],'0072 界界.txt');
const staging=stagingPrefix+operationId+'/'+file.name;

test('the exact staged key is fenced when its recorded version or ETag differs',async()=>{
 for(const proof of [undefined,{key:staging,etag:'etag',version:'old'},{key:staging,etag:'old',version:'version'}]){
  const requests=[];
  const api=createClick2CloudFileApi({
   send:async()=>assert.fail('An unowned stage cannot be moved'),
   http:{boundedFetch:fetch,async request(url,options){
    requests.push({url,method:options.method});
    if(options.method)assert.fail('An unowned stage cannot be overwritten or deleted');
    return Response.json({success:true,result:{objects:[{key:staging,size:file.size,etag:'etag',version:'version'}]}});
   }}
  });
  const result=await api.run('upload',{source,file,key,stagingPrefix,retryStage:{proof}},{operationId});
  assert.equal(result.code,'R2_STAGING_OWNERSHIP_UNCONFIRMED');
  assert.equal(result.errorPhase,'staging');
  assert.equal(requests.length,1);
 }
});

test('a reused stage is read by ETag and its version is checked again before the signed move',async()=>{
 let observations=0;
 const api=createClick2CloudFileApi({
  send:async()=>assert.fail('A stage whose version changed cannot be moved'),
  http:{boundedFetch:fetch,async request(path,options){
   if(options.method)assert.fail('Retry must reuse a proven staged object');
   if(path.includes('?')){
    return Response.json({success:true,result:{objects:[{key:staging,size:file.size,etag:'etag',version:++observations===1?'version':'changed'}]}});
   }
   assert.equal(options.headers['If-Match'],'"etag"');
   return new Response(file);
  }}
 });
 const result=await api.run('upload',{source,file,key,stagingPrefix,
  retryStage:{proof:{key:staging,etag:'etag',version:'version'}},recordStage:async()=>assert.fail('Stage changed')},{operationId});
 assert.equal(result.code,'R2_STAGING_IDENTITY_CHANGED');
 assert.equal(observations,2);
});

test('CURRENT retains the original upload hash and commit fence across reopened stores',async()=>{
 const dbName='part2-transport-'+crypto.randomUUID();
 let current=createCurrentStore({dbName});
 const job={id:operationId,batchId:'fixed-batch',index:0,mode:'mixed',source,key,size:997,sourceSha256:'a'.repeat(64)};
 const record=localUpload=>current.recordRemoteResult({
  kind:'save',operationId,state:'pending',code:'LOCAL_UPLOAD_STARTED',destination:source,localUpload
 });
 await record({...job,commitRequested:false});
 await record({...job,commitRequested:true});
 await current.close();
 current=createCurrentStore({dbName});
 try{
  assert.equal((await current.readRemoteResult(operationId)).localUpload.commitRequested,true);
  await assert.rejects(record({...job,sourceSha256:'b'.repeat(64),commitRequested:true}),{code:'OPERATION_BINDING_MISMATCH'});
  await assert.rejects(record({...job,commitRequested:false}),{code:'OPERATION_COMMIT_REGRESSION'});
 }finally{await current.close();}
});

test('browser spool quota failures are typed and close the single owned temporary file',async()=>{
 const removed=[];
 const directory={
  async getFileHandle(name){
   return {async createWritable(){
    return {
     async write(){throw new DOMException('quota', 'QuotaExceededError');},
     async abort(){removed.push(['abort',name]);},
    };
   }};
  },
  async removeEntry(name){removed.push(['remove',name]);},
 };
 const spool=await openLabSpool(directory,1);
 await assert.rejects(spool.append(Uint8Array.of(1)),{code:'OPFS_QUOTA_EXCEEDED'});
 assert.equal(spool.bytes,0);
 await spool.close();
 await spool.close();
 assert.equal(removed.length,2);
 assert.equal(removed[0][1],removed[1][1]);
});
