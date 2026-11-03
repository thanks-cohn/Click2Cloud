import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureRedownDefault,SimpleSetupError} from '../src/simple-redown-bootstrap.mjs';
const auth={session:{state:'verified',accountId:'acct'},r2:{state:'active'},accountId:'acct'};
function factory(existing=['bucket-1','bucket-2'],preserve=false){
  const bucketNames=[...existing],calls={created:[],prepared:[],committed:[],lock:[]};
  const services={
    withAccountLock:async(key,fn)=>{calls.lock.push(key);return fn()},
    listBuckets:async()=>bucketNames.map(name=>({name})),
    createBucket:async(_id,name)=>{calls.created.push(name);bucketNames.push(name)},
    prepareRoot:async x=>{calls.prepared.push(x);return {...x,verified:true}},
    commitSimpleDefaultIfUnset:async x=>{calls.committed.push(x);return {ok:true,assigned:!preserve,preserved:preserve}}
  };
  return {bucketNames,calls,services};
}
test('first run creates exact lowercase redown even if unrelated buckets already exist',async()=>{
  const f=factory();
  const r=await ensureRedownDefault({...auth,services:f.services});
  assert.deepEqual(f.calls.created,['redown']);assert.equal(r.state,'ready');
  assert.equal(r.target.bucketName,'redown');assert.equal(r.target.prefix,'');
  assert.equal(f.calls.committed[0].onlyIfUnset,true);
});
test('existing redown root is reused; no duplicate create',async()=>{
  const f=factory(['bucket-1','redown'],true);
  const r=await ensureRedownDefault({...auth,services:f.services});
  assert.deepEqual(f.calls.created,[]);assert.equal(r.created,false);
  assert.equal(r.defaultAssigned,false);
});
test('not logged in / R2 inactive causes no remote listing or create',async()=>{
  const f=factory();
  assert.equal((await ensureRedownDefault({...auth,session:{state:'missing'},services:f.services})).state,'needs-cloudflare-login');
  assert.equal((await ensureRedownDefault({...auth,r2:{state:'inactive'},services:f.services})).state,'needs-r2-activation');
  assert.deepEqual(f.calls.created,[]);assert.deepEqual(f.calls.prepared,[]);
});
test('unknown create outcome requires listing readback and never retries blindly',async()=>{
  const f=factory();
  f.services.createBucket=async(_id,name)=>{f.calls.created.push(name);f.bucketNames.push(name);throw Error('lost response')};
  const r=await ensureRedownDefault({...auth,services:f.services});
  assert.equal(r.state,'ready');assert.deepEqual(f.calls.created,['redown']);
});
test('failed create or write verification does not publish a false default',async()=>{
  const f=factory();
  f.services.createBucket=async()=>{throw Error('permission denied')};
  await assert.rejects(ensureRedownDefault({...auth,services:f.services}),SimpleSetupError);
  assert.equal(f.calls.committed.length,0);
  const g=factory(['redown']);g.services.prepareRoot=async()=>({...auth,verified:false});
  await assert.rejects(ensureRedownDefault({...auth,services:g.services}),SimpleSetupError);
});
