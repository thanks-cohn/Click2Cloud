import test from 'node:test';
import assert from 'node:assert/strict';
import {createClick2CloudFileApi,createFileApi,location,prefix,key,name,providerDefaults} from '../src/explorer/index.mjs';

const r2Source={accountId:'account-1',bucketName:'redown',prefix:'pictures'};
function fakeHttp() {
  const calls=[];
  return {
    calls,
    boundedFetch:async()=>{throw new Error('Unexpected direct Worker request');},
    request:async(path,opts)=>{
      calls.push({path,opts});
      if (!path.includes('/r2/buckets/redown/objects')) throw Error('Unexpected bucket');
      return Response.json({success:true,result:{
        objects:[
          {key:'pictures/a.png',size:3},
          {key:'pictures/folder/b.png',size:2}
        ],
        delimited:['pictures/folder/'],
        cursor:''
      }});
    }
  };
}
test('REDOWN core path and destination normalization preserved',()=>{
  assert.deepEqual(location(r2Source),{accountId:'account-1',bucketName:'redown',accountName:'',prefix:'pictures/'});
  assert.equal(prefix('pictures/'),'pictures/');
  assert.equal(key('pictures/a.png'),'pictures/a.png');
  assert.equal(name('a.png'),'a.png');
  assert.throws(()=>key('../outside'),/Invalid object path/);
  assert.throws(()=>location({bucketName:'redown'}),/cloud account/);
  assert.throws(()=>name(' a.png'),/Leading or trailing spaces/);
});
test('no privileged transport defaults are silently allowed into Click2Cloud host',()=>{
  assert.throws(()=>createClick2CloudFileApi(),/authenticated REDOWN/);
  assert.throws(()=>createClick2CloudFileApi({send:async()=>({ok:true}),http:{request:async()=>{}}}),/Cloudflare API transport/);
});
test('Click2Cloud calls the extracted real R2 listing adapter via the universal operation API',async()=>{
  const http=fakeHttp();
  const api=createClick2CloudFileApi({send:async()=>{throw Error('Unexpected Chrome message');},http});
  assert.equal(api.version,1);
  assert.equal(api.capabilities.includes('list'),true);
  assert.equal(api.capabilities.includes('remoteIngest'),true);
  const report=await api.run('list',{source:r2Source});
  assert.equal(report.state,'completed');
  assert.deepEqual(report.data.entries.map(e=>e.key),['pictures/folder/','pictures/a.png']);
  assert.equal(http.calls.length,1);
  assert.match(http.calls[0].path,/prefix=pictures%2F/);
  assert.match(http.calls[0].path,/delimiter=%2F/);
});
test('Unimplemented operation does not fabricate a successful result',async()=>{
  const api=createFileApi({list:async()=>({entries:[]})});
  const out=await api.run('inventedRemoteAction');
  assert.equal(out.state,'failed');
});
test('Ambiguous writes stay uncertain and never auto-replay during a batch',async()=>{
  let called=0;
  const api=createFileApi({copy:async()=>{
    called++;
    throw Object.assign(Error('No final receipt'),{uncertain:true,recoveryKey:'.partial/check'});
  },configuration:{defaults:{batchConcurrency:1},validate:x=>x,resolve:(_op,_prefs,options)=>options}});
  const one=await api.run('copy',{id:1});
  assert.equal(one.state,'uncertain');
  assert.equal(one.recoveryKey,'.partial/check');
  const batch=await api.batch('copy',[{id:2},{id:3},{id:4}]);
  assert.equal(batch.state,'partial');
  assert.equal(batch.processed,1);
  assert.equal(called,2);
});
test('Provider preferences stay configurable but pagination is not exposed as a preference',()=>{
  const api=createClick2CloudFileApi({send:async()=>({ok:true}),http:fakeHttp()});
  assert.ok(providerDefaults.requestTimeoutMs>0);
  assert.deepEqual(api.setPreferences({requestTimeoutMs:2000}),{requestTimeoutMs:2000});
  assert.throws(()=>api.setPreferences({per_page:1000}),/Unsupported option/);
});
test('The API exposes partial responses and dispatch-time progress, not false completion',async()=>{
  const phases=[];
  const api=createFileApi({copy:async()=>({completed:0,conflicts:[{destinationKey:'taken.png'}]})});
  const result=await api.run('copy',{}, {onProgress:x=>phases.push(x.phase)});
  assert.equal(result.state,'partial');
  assert.deepEqual(phases,['started','partial']);
});
