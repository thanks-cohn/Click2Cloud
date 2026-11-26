import assert from 'node:assert/strict';
import {test} from 'node:test';
import {setTimeout as delay} from 'node:timers/promises';
import {createPythonLab,extensionId,labHostName} from '../src/chrome/python-lab/session.mjs';

const accountId='a'.repeat(32);
const input={accountId,bucketName:'fixture-bucket',mode:'read-write',minutes:15,scopeId:null};
const build={extensionVersion:'0.3.32.3',revision:'c'.repeat(40),sourceDigest:'b'.repeat(64),apiVersion:'3+1.1'};
const providerError=Object.assign(Error('https://private.invalid/token=DO_NOT_EXPORT'),{code:'REAUTH_REQUIRED'});
const secretError=()=>new DOMException('C:\\private\\owner.txt?token=DO_NOT_EXPORT','QuotaExceededError');
const stage=(report,name)=>report.stages.find(row=>row.stage===name);

function event(){
 const listeners=new Set();
 return {listeners,addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn),
  emit:value=>[...listeners].forEach(fn=>fn(value))};
}
function harness(overrides={}){
 const calls=[],ports=[],memory={};
 const storage={
  async get(key){return {[key]:memory[key]};},
  async set(entries){Object.assign(memory,entries);}
 };
 let permission=true,now=1_000_000;
 const runtime={id:extensionId,connectNative(name){
  assert.equal(name,labHostName);
  calls.push('native');
  const port={onMessage:event(),onDisconnect:event(),closed:0,posted:[],
   postMessage(value){this.posted.push(value);},disconnect(){this.closed++;}};
  ports.push(port);
  return port;
 }};
 const auth={sessionId:'private-session',accounts:[{id:accountId,name:'private account'}],
  scopes:['workers-r2.read','workers-r2-bucket-item.read','workers-r2.write','workers-r2-bucket-item.write']};
 const options={runtime,storage,diagnosticStorage:storage,build,clock:()=>now,
  permission:async()=>permission,trustedStorage:async()=>{calls.push('trusted');},
  authority:async()=>{calls.push('authority');return auth;},
  buckets:async()=>{calls.push('buckets');return {buckets:[{name:input.bucketName}],cursor:''};},
  checkBucket:async()=>{calls.push('bucket');return true;},
  workerPrefix:async()=>{calls.push('prefix');return '';},
  checkUpload:async()=>{calls.push('upload-readiness');return {sessionId:auth.sessionId};},
  spoolDirectory:async()=>{calls.push('spool');return {};},
  opfsCapability:()=>true,opfsProbe:async()=>{calls.push('opfs-probe');},
  storageEstimate:async()=>({quota:100_000_000,usage:0}),
  handshakeTimeoutMs:250,stageTimeoutMs:300,startupTimeoutMs:1000,...overrides};
 const open=()=>createPythonLab(options);
 return {calls,ports,runtime,open,lab:open(),auth,options,
  permit:value=>{permission=value;},advance:ms=>{now+=ms;},
  disconnect(port,message){runtime.lastError={message};port.onDisconnect.emit();delete runtime.lastError;}};
}
async function until(fn){
 for(let i=0;i<80;i++){
  const value=await fn();
  if(value)return value;
  await delay(2);
 }
 throw Error('Timed out waiting for fixture');
}
async function expectFailure(h,stageName,code,selection=input){
 const result=await h.lab.request('start',selection);
 assert.equal(result.ok,false);
 assert.equal(result.code,code);
 for(let i=0;i<3;i++)assert.equal((await h.lab.ui('status')).code,code);
 const {startup}=await h.lab.ui('diagnostics');
 assert.equal(startup.firstFailure.stage,stageName);
 assert.equal(startup.firstFailure.code,code);
 assert.equal(startup.outcome,'FAILED');
 assert.match(startup.correlationId,/^[a-f0-9-]{36}$/);
 assert.equal(startup.build.version,build.extensionVersion);
 assert(!JSON.stringify(startup).includes('DO_NOT_EXPORT'));
 return startup;
}
async function ready(h){
 const prior=h.ports.length;
 const promise=h.lab.ui('start',input);
 const port=await until(()=>h.ports[prior]);
 port.onMessage.emit({type:'ready'});
 return {data:await promise,port};
}

test('optional permission first-grant API absence blocks before Cloudflare and OPFS; refreshed context can start',async()=>{
 const h=harness();
 const connect=h.runtime.connectNative;
 delete h.runtime.connectNative;
 const before=await expectFailure(h,'native-api','NATIVE_API_UNAVAILABLE');
 assert.equal(stage(before,'native-permission').outcome,'PASS');
 assert.equal(stage(before,'authorization').outcome,'NOT_REACHED');
 assert.equal(stage(before,'spool-init-cleanup').outcome,'NOT_REACHED');
 assert.deepEqual(h.calls,['trusted']);
 assert.match(before.firstFailure.recovery,/reload REDOWN once/);
 h.runtime.connectNative=connect;
 const reloaded=h.open();h.lab=reloaded;
 assert.equal((await h.lab.ui('status')).nativeApiAvailable,true);
 assert.equal((await ready(h)).data.state,'PAIRING');
 assert.equal((await h.lab.ui('diagnostics')).startup.firstFailure,null);
 h.lab.revoke();
});

test('permission denial and revocation are typed and do not create a grant',async()=>{
 const h=harness();
 h.permit(false);
 const denied=await expectFailure(h,'native-permission','NATIVE_PERMISSION_DENIED');
 assert.equal(stage(denied,'native-permission').outcome,'UNAVAILABLE');
 assert.deepEqual(h.calls,['trusted']);
 h.permit(true);
 const {port}=await ready(h);
 h.permit(false);
 h.lab.revoke('NATIVE_PERMISSION_REVOKED');
 assert.equal(port.closed,1);
 assert.equal(port.onMessage.listeners.size,0);
 assert.equal((await h.lab.ui('status')).pairCode,undefined);
 const {startup}=await h.lab.ui('diagnostics');
 assert.equal(startup.firstFailure.code,'NATIVE_PERMISSION_REVOKED');
});

test('startup emits specific sanitized codes at the failing stage',async t=>{
 const rows=[
  ['trusted-storage','LAB_TRUSTED_STORAGE_UNAVAILABLE','trustedStorage',secretError()],
  ['opfs-capability','LAB_OPFS_UNAVAILABLE','opfsCapability',null],
  ['authorization','REAUTH_REQUIRED','authority',providerError],
  ['selected-bucket','LAB_BUCKET_CHECK_FAILED','checkBucket',secretError()],
  ['worker-prefix','LAB_WORKER_PREFIX_FAILED','workerPrefix',secretError()],
  ['upload-readiness','REAUTH_REQUIRED','checkUpload',providerError],
  ['spool-init-cleanup','LAB_SPOOL_INITIALIZATION_FAILED','spoolDirectory',secretError()],
  ['storage-estimate','LAB_STORAGE_ESTIMATE_FAILED','storageEstimate',secretError()]
 ];
 for(const [name,code,dependency,error] of rows){
  await t.test(name,async()=>{
   const h=harness({[dependency]:()=>{if(error)throw error;return false;}});
   const result=await expectFailure(h,name,code);
   if(error instanceof DOMException)assert.equal(result.firstFailure.causeName,'QuotaExceededError');
   assert.equal(h.ports.length,0);
  });
 }
 await t.test('input and extension identity',async()=>{
  await expectFailure(harness(),'input-validation','INVALID_INPUT',{...input,bucketName:'../private'});
  const h=harness();h.runtime.id='untrusted';
  await expectFailure(h,'extension-identity','LAB_EXTENSION_ID_MISMATCH');
 });
 await t.test('auth recheck rejects changes',async()=>{
  const h=harness();
  let count=0;
  h.options.authority=async()=>({...h.auth,sessionId:++count===1?'private-session':'new-private-session'});
  h.lab=h.open();
  await expectFailure(h,'auth-recheck','AUTH_SESSION_CHANGED');
  assert.equal(h.ports.length,0);
 });
 await t.test('port launch synchronous failure',async()=>{
  const h=harness();h.runtime.connectNative=()=>{throw new TypeError('DO_NOT_EXPORT');};
  const report=await expectFailure(h,'native-port-launch','NATIVE_HOST_LAUNCH_FAILED');
  assert.equal(report.firstFailure.causeName,'TypeError');
 });
});

test('missing registration, host exit, malformed handshake and timeout clean up ports',async t=>{
 for(const [message,expected] of [
  ['Specified native messaging host not found.','NATIVE_HOST_NOT_REGISTERED'],
  ['Failed to start native messaging host.','NATIVE_HOST_LAUNCH_FAILED'],
  ['Native host has exited.','NATIVE_HOST_EXITED'],
  ['Access to the specified native messaging host is forbidden.','NATIVE_HOST_FORBIDDEN'],
  ['raw DO_NOT_EXPORT signed-url message','NATIVE_HOST_DISCONNECTED'],
  [{type:'ready',extra:'DO_NOT_EXPORT'},'NATIVE_HANDSHAKE_INVALID'],
  [null,'NATIVE_HANDSHAKE_TIMEOUT']
 ]){
  await t.test(expected,async()=>{
   const h=harness({handshakeTimeoutMs:30});
   const waiting=expectFailure(h,'native-handshake',expected);
   const port=await until(()=>h.ports[0]);
   if(typeof message==='string')h.disconnect(port,message);
   else if(message)port.onMessage.emit(message);
   await waiting;
   assert.equal(port.closed,1);
   assert.equal(port.onMessage.listeners.size,0);
   assert.equal(port.onDisconnect.listeners.size,0);
  });
 }
});

test('cancelled and stale native attempts cannot open a grant; pairing clock starts on ready',async()=>{
 const h=harness();
 const start=h.lab.request('start',input);
 const old=await until(()=>h.ports[0]);
 const stale=[...old.onMessage.listeners][0],staleDisconnect=[...old.onDisconnect.listeners][0];
 const pending=await h.lab.ui('status');
 assert.equal(pending.state,'STARTING');
 assert.equal(pending.pairCode,undefined);
 await h.lab.ui('end');
 assert.equal((await start).code,'LAB_SESSION_ENDED');
 assert.equal(old.closed,1);
 const retry=h.lab.ui('start',input);
 const port=await until(()=>h.ports[1]);
 stale({type:'ready'});staleDisconnect();
 assert.equal((await h.lab.ui('status')).state,'STARTING');
 h.advance(53_000);
 port.onMessage.emit({type:'ready'});
 const data=await retry;
 assert.equal(data.codeExpiresAt,1_173_000);
 assert.equal(data.expiresAt,1_953_000);
 assert.equal(data.pairCode.length,16);
 assert(!JSON.stringify(await h.lab.ui('diagnostics')).includes(data.pairCode));
 h.disconnect(port,'Native host has exited.');
 assert.equal((await h.lab.ui('status')).code,'NATIVE_HOST_EXITED');
});

test('late cloud completion after cancel and late OPFS completion after timeout stay fenced',async()=>{
 let finish,signal;
 const h=harness({stageTimeoutMs:25,spoolDirectory:s=>{signal=s;return new Promise(resolve=>{finish=resolve;});}});
 await expectFailure(h,'spool-init-cleanup','LAB_STAGE_TIMEOUT');
 assert.equal(signal.aborted,true);
 finish({});
 await delay(4);
 assert.equal(h.ports.length,0);
 let finishBucket,bucketSignal;
 h.options.checkBucket=async(_root,_auth,s)=>{bucketSignal=s;return new Promise(resolve=>{finishBucket=resolve;});};
 h.lab=h.open();
 const start=h.lab.request('start',input);
 await until(()=>finishBucket);
 h.lab.revoke('NATIVE_PERMISSION_REVOKED');
 assert.equal((await start).code,'NATIVE_PERMISSION_REVOKED');
 assert.equal(bucketSignal.aborted,true);
 finishBucket(true);
 await delay(4);
 assert.equal(h.ports.length,0);
});

test('worker restart preserves only the diagnostic receipt and requires a new grant',async()=>{
 const h=harness();
 const {data}=await ready(h);
 const restarted=h.open();
 await until(async()=>(await h.lab.ui('diagnostics')).startup.outcome==='READY_TO_PAIR');
 const status=await restarted.ui('status');
 assert.equal(status.state,'OFF');
 assert.equal(status.code,'LAB_WORKER_RESTARTED');
 const report=await restarted.ui('diagnostics');
 assert.equal(report.startup.outcome,'READY_TO_PAIR');
 for(const privateValue of [data.pairCode,data.scopeId,input.accountId,input.bucketName,h.auth.sessionId])
  assert(!JSON.stringify(report).includes(privateValue));
 h.lab.revoke();
});

test('a grant expiring before the next request closes the helper with a distinct receipt',async()=>{
 const h=harness();
 const {port}=await ready(h);
 h.advance(15*60_000);
 port.onMessage.emit({type:'request',id:crypto.randomUUID(),client:crypto.randomUUID(),
  method:'pair',input:{code:'expired-fixture',ticket:null}});
 assert.equal((await h.lab.ui('status')).code,'LAB_AUTHORIZATION_EXPIRED');
 assert.equal(port.closed,1);
 assert.equal((await h.lab.ui('diagnostics')).startup.firstFailure.stage,'lifecycle');
});

test('read-only preflight and discovery use shared stages without launching or creating spool files',async()=>{
 const h=harness();
 await h.lab.ui('accounts');
 await h.lab.ui('buckets',{accountId,cursor:''});
 const noTarget=await h.lab.ui('preflight');
 assert.equal(noTarget.outcome,'INCOMPLETE');
 assert.equal(stage(noTarget,'authorization').outcome,'NOT_REACHED');
 const report=await h.lab.ui('preflight',input);
 assert.equal(report.outcome,'PASS');
 assert.equal(stage(report,'bucket-listing').outcome,'PASS');
 assert.equal(stage(report,'opfs-capability').outcome,'PASS');
 assert.equal(stage(report,'upload-readiness').outcome,'PASS');
 assert.equal(stage(report,'native-handshake').outcome,'NOT_REACHED');
 assert.equal(stage(report,'spool-init-cleanup').outcome,'NOT_REACHED');
 assert.equal(report.providerRoundTrip,'NOT_TESTED_BY_DIAGNOSTICS');
 assert.equal(h.ports.length,0);
 assert(!h.calls.includes('spool'));
 const {discovery}=await h.lab.ui('diagnostics');
 assert.equal(stage(discovery,'bucket-listing').outcome,'PASS');
 const blocked=harness({opfsProbe:()=>{throw new DOMException('DO_NOT_EXPORT','SecurityError');}});
 const failure=await blocked.lab.ui('preflight',input);
 assert.equal(failure.firstFailure.code,'LAB_OPFS_PROBE_FAILED');
 assert.equal(failure.firstFailure.outcome,'FAIL');
 assert.equal(failure.firstFailure.causeName,'SecurityError');
});
