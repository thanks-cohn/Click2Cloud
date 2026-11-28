import assert from 'node:assert/strict';
import {AsyncLocalStorage} from 'node:async_hooks';
import {createHash,randomUUID} from 'node:crypto';
import {channel} from 'node:diagnostics_channel';
import {appendFile,readFile,rename,writeFile} from 'node:fs/promises';
import {release} from 'node:os';
import {dirname,join} from 'node:path';
import {createInterface} from 'node:readline';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {build} from 'esbuild';
import {createFetchMock,Miniflare} from 'miniflare';
import {createEngineApi} from '../../src/api/service.mjs';
import {createChromeRegistrar} from '../../src/chrome/registrar.mjs';
import {createRightClickObservation} from '../../src/chrome/python-lab/right-click.mjs';
import {createPythonLab} from '../../src/chrome/python-lab/session.mjs';
import {campaignDefaults} from '../../src/chrome/python-lab/campaign-policy.mjs';
import {createCloudflareOnboarding,readWorkerStatus,reconcileReadinessProbe} from '../../src/cloudflare/onboarding.mjs';
import {createProvisioner,WORKER_MODULES} from '../../src/cloudflare/deployment.mjs';
import {createRemoteTransport,preparedDestination} from '../../src/cloudflare/transport.mjs';
import {digest,remoteDestination} from '../../src/cloudflare/wire.mjs';
import {createEngine} from '../../src/core/engine.mjs';
import {createCurrentStore} from '../../src/persistence/current-store.mjs';
import {sourceFromClick} from '../../right2cloud-module/src/index.mjs';

const sourceOrigin='https://right-click-fixture.example.com';
const sha=bytes=>createHash('sha256').update(Buffer.from(bytes)).digest('hex');
const until=async check=>{
 for(let attempts=0;attempts<300;attempts++){
  const result=await check();if(result)return result;
  await delay(10);
 }
 throw Object.assign(Error('FIXTURE_BOUNDARY_TIMEOUT'),{code:'FIXTURE_BOUNDARY_TIMEOUT'});
};
const safeCode=(error,fallback='FIXTURE_ASSERTION_FAILED')=>/^[A-Z][A-Z0-9_]{1,79}$/.test(error?.code??'')?error.code:fallback;
const safeTransportError=error=>({
 type:['Error','TypeError','AbortError','TimeoutError','SocketError','MiniflareCoreError'].includes(error?.name)?error.name:null,
 code:safeCode(error,null),causeCode:safeCode(error?.cause,null),
 errno:Number.isInteger(error?.cause?.errno)?error.cause.errno:Number.isInteger(error?.errno)?error.errno:null,
 syscall:['read','write','recv','send','connect','WSARecv','WSASend'].find(name=>name===(error?.cause?.syscall??error?.syscall))??null
});

// Match Miniflare's actual HTTP loopback requests, not the synthetic Worker
// URL, and retain only socket ordinals and timing. Never record headers.
function observeLoopbackSockets(){
 const context=new AsyncLocalStorage(),requests=new WeakMap(),sockets=new WeakMap();
 const created=channel('undici:request:create'),sent=channel('undici:client:sendHeaders');
 const onCreate=({request})=>{
  const evidence=context.getStore();
  if(evidence&&request.origin===evidence.origin&&request.path===evidence.route)requests.set(request,evidence);
 };
 const onSend=({request,socket})=>{
  const evidence=requests.get(request);
  if(!evidence||!socket)return;
  const now=performance.now(),previous=sockets.get(socket);
  const id=previous?.id??++evidence.runtime.nextSocketId,ordinal=(previous?.ordinal??0)+1;
  evidence.socket={id,ordinal,previousRoute:previous?.route??null,
   sincePreviousSendMs:previous?Math.round(now-previous.at):null};
  sockets.set(socket,{id,ordinal,route:evidence.route,at:now});
 };
 created.subscribe(onCreate);sent.subscribe(onSend);
 return {run:(evidence,dispatch)=>context.run(evidence,dispatch),
  close(){created.unsubscribe(onCreate);sent.unsubscribe(onSend);}};
}

function probeEvidence(result,target,operationId){
 const exact=remoteDestination(target);
 const probePrefix=[exact.prefix,'.click2cloud-readiness',operationId].filter(Boolean).join('/');
 const destination=value=>value?{
  matchesScope:['provider','connectionId','accountId','bucketName','conflictPolicy'].every(key=>value[key]===exact[key]),
  prefix:value.prefix===probePrefix?probePrefix:value.prefix===exact.prefix?exact.prefix:null
 }:null;
 const id=value=>/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value??'')?value:null;
 const hex=value=>/^[\da-f]{32,64}$/i.test(value??'')?value:null;
 const receipt=result?.receipt;
 return {
  state:['verified','blocked','uncertain','failed','pending'].includes(result?.state)?result.state:null,
  code:safeCode(result,null),operationId:id(result?.operationId),
  destination:destination(result?.destination),
  proofKind:result?.proofKind==='independent-get-byte-comparison'?result.proofKind:null,
  receipt:receipt?{
   operationId:id(receipt.operationId),destination:destination(receipt.destination),
   key:receipt.key===probePrefix+'/readiness.txt'?receipt.key:null,
   size:Number.isSafeInteger(receipt.size)&&receipt.size>=0?receipt.size:null,
   etag:hex(receipt.etag),version:hex(receipt.version)
  }:null
 };
}

export async function verifyRightClickFixture(manifestPath,{runtime,storage,opfs,cli,buildInfo,accountId,bucketName}){
 const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
 assert.equal(manifest.schema,'redown.right-click-scenarios/1');
 const modules=new Map(await Promise.all(WORKER_MODULES.map(async path=>[path,await readFile(path,'utf8')])));
 const deployedDigest=await digest([...modules]);
 const {outputFiles}=await build({entryPoints:['src/cloudflare/worker.mjs'],bundle:true,write:false,format:'esm',platform:'browser',
  plugins:[{name:'fixture-public-egress',setup(builder){
   builder.onResolve({filter:/public-egress\.mjs$/},()=>({path:fileURLToPath(new URL('./public-egress.mjs',import.meta.url))}));
  }}]});
 const outcome={evidenceLayer:'paired-python/native-loopback-production-registrar-signed-workerd-r2',
  revision:buildInfo.revision,sourceDigest:buildInfo.sourceDigest,workerCodeDigest:deployedDigest,
  extensionVersion:buildInfo.extensionVersion,protocol:'1.0.0',platform:process.platform,osRelease:release(),
  arch:process.arch,nodeVersion:process.versions.node,cases:[]};
 const directory=dirname(manifestPath),snapshot=join(directory,'observations.json'),temporary=snapshot+'.tmp';
 const save=async()=>{
  await writeFile(temporary,JSON.stringify(outcome,null,2)+'\n');
  await rename(temporary,snapshot);
 };
 const campaignStarted=performance.now();
 const progress=event=>appendFile(join(directory,'progress.ndjson'),JSON.stringify({
  elapsedMs:Math.round(performance.now()-campaignStarted),...event
 })+'\n');
 const sockets=observeLoopbackSockets();
 try{
 await save();
 for(const [index,scenario] of manifest.cases.entries()){
  const started=performance.now();
  const report=async(phase,status,observation)=>progress({
   ordinal:index+1,total:manifest.cases.length,case:scenario.case,mode:scenario.mode,scenario:scenario.scenario,
   phase,status,caseElapsedMs:Math.round(performance.now()-started),...(observation?{observation}:{})
  });
  const fixture={phase:'fixture-initialization',warmInitialization:null,fixtureTransport:[],runtimeLifecycles:[],loopbackProbes:[]};
  await report('fixture-initialization','RUNNING');
  try{outcome.cases.push({case:scenario.case,status:'OBSERVED',...await runScenario(scenario,fixture,report),...fixture});}
  catch(error){
   outcome.cases.push({case:scenario.case,status:'FAIL',code:safeCode(error),errorType:error.name,location:String(error.stack).split('\n').find(line=>line.includes('right-click-lab.mjs'))?.trim().replace(/^.*right-click-lab.mjs:/,'right-click-lab.mjs:'),...fixture});
  }
  outcome.cases.at(-1).elapsedMs=Math.round(performance.now()-started);
  await save();
  const {status,code,phase,actual,warmInitialization}=outcome.cases.at(-1);
  await report('case-complete',status,{status,code,phase,actual,warmInitialization});
 }
 return outcome.cases.every(item=>item.status==='OBSERVED');
 }finally{sockets.close();}

 async function runScenario({mode,scenario,prefix,filename,payload,capabilityFaults=[],warmProbeFault,interruptWarmProbe=false,interruptSetupProbe=false},fixture,report){
  const {fixtureTransport}=fixture;
  const caseStarted=performance.now(),elapsed=()=>Math.round(performance.now()-caseStarted);
  assert(['simple','nested','depth'].includes(mode));
  const root={provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName,prefix:''};
  const exact={...root,prefix},sibling={...root,prefix:'qa/second/'};
  const mainURL=sourceOrigin+'/'+filename,secondURL=sourceOrigin+'/second.txt';
  const sourceMock=createFetchMock();sourceMock.disableNetConnect();
  for(const url of [mainURL,secondURL])sourceMock.get(sourceOrigin).intercept({path:new URL(url).pathname}).reply(200,payload,
   {headers:{'content-length':String(Buffer.byteLength(payload)),'content-type':'text/plain'}}).persist();
  const current=createCurrentStore({dbName:'right-click-fixture-'+randomUUID()});
  const plans=new Map(),runtimes=new Map(),allWorkers=new Set();
  const injectedFaults=[],admissions=[],submissions=[];
  const probeStatusIds=[];
  let interruptedProbeId=null;
  let activeAuth='fixture-login',registrar,lab,engine,cloudflare,trace,preparedOptions;
  let publicationRequests=0,deployments=0,workerRequests=0,healthFailures=0,readinessProbeRequests=0,peakLocalRuntimes=0;
  let lostAck=0,settingsMissing=0,setupBlocked=false,armTransient=false,grantDenied=false;
  let releaseSetup;
  const setupHold=new Promise(resolve=>{releaseSetup=resolve;});
  const oauth={
   status:async()=>({state:'CONNECTED',accounts:[{id:accountId}]}),
   authority:async()=>({sessionId:activeAuth,accounts:[{id:accountId}],
    scopes:['workers-r2.read','workers-r2.write','workers-r2-bucket-item.read','workers-scripts.admin','workers-scripts.edit']})
  };
  const envelope=(value,status=200)=>Response.json({success:status===200,result:value},{status});
  const request=async(path,options={})=>{
   assert.equal(options.expectedSession,activeAuth);
   if(path.endsWith('/workers/subdomain'))return envelope({subdomain:'right-click-fixture'});
   const match=/\/workers\/scripts\/([^/]+)(.*)$/.exec(path);assert(match,path);
   const [,name,suffix]=match;
   if(suffix==='/settings'){
    const worker=runtimes.get(name);
    if(!worker){settingsMissing++;return envelope(null,404);}
    return envelope({bindings:worker.bindings});
   }
   if(suffix==='/subdomain'&&options.method==='POST')return envelope({enabled:true});
   assert.equal(options.method,'PUT');
   if(scenario==='registration-race'){setupBlocked=true;await setupHold;}
   const metadata=JSON.parse(await options.body.get('metadata').text());
   const bindings=Object.fromEntries(metadata.bindings.filter(row=>'text' in row).map(row=>[row.name,row.text]));
   assert.equal(bindings.ACCOUNT_ID,accountId);assert.equal(bindings.BUCKET_NAME,bucketName);
   assert.equal(bindings.CODE_DIGEST,deployedDigest);
   const lifecycle={id:fixture.runtimeLifecycles.length+1,startedMs:elapsed(),readyMs:null,
    disposeStartedMs:null,disposedMs:null,stderrEndedMs:null,stderrClosedMs:null,resetWarnings:[]};
   fixture.runtimeLifecycles.push(lifecycle);
   const mf=new Miniflare({modules:true,script:outputFiles[0].text,compatibilityDate:'2026-01-01',r2Buckets:['STORAGE'],
    durableObjects:{CLAIMS:{className:'RemoteClaims',useSQLite:true}},bindings,fetchMock:sourceMock,
    handleRuntimeStdio:(stdout,stderr)=>{
     stdout.pipe(process.stdout,{end:false});stderr.pipe(process.stderr,{end:false});
     stderr.once('end',()=>{lifecycle.stderrEndedMs=elapsed();});
     stderr.once('close',()=>{lifecycle.stderrClosedMs=elapsed();});
     createInterface({input:stderr,crlfDelay:Infinity}).on('line',line=>{
      const detail=/(WSARecv|WSASend)(?:\(\))?[^#\r\n]{0,60}#(\d+)|ECONNRESET|Connection reset by peer/i.exec(line);
      if(detail&&lifecycle.resetWarnings.length<16)lifecycle.resetWarnings.push({
       atMs:elapsed(),kind:detail[1]??'connection-reset',errno:detail[2]?Number(detail[2]):null
      });
     });
    }
   });
   const runtime={mf,bindings:metadata.bindings,lifecycle,nextSocketId:0};
   allWorkers.add(runtime);
   peakLocalRuntimes=Math.max(peakLocalRuntimes,allWorkers.size);
   const started=performance.now();
   try{runtime.origin=(await mf.ready).origin;lifecycle.readyMs=elapsed();}
   catch(error){
    fixtureTransport.push({boundary:'workerd-startup',deployment:deployments+1,
     durationMs:Math.round(performance.now()-started),...safeTransportError(error)});
    throw error;
   }
   runtimes.set(name,runtime);
   deployments++;
   if(['lost-deploy-ack','evicted-setup'].includes(scenario)&&!lostAck++){throw Object.assign(Error('FIXTURE_LOST_DEPLOYMENT_ACK'),{code:'TRANSIENT_API_FAILURE'});}
   return envelope({});
  };
  async function disposeWorker(worker){
   worker.lifecycle.disposeStartedMs=elapsed();
   await worker.mf.dispose();
   worker.lifecycle.disposedMs=elapsed();
   allWorkers.delete(worker);
  }
  const scope={target:root,authorized:true,complete:true,folders:['qa/',prefix,sibling.prefix]};
  const buildDigest=scenario==='compatible-build'?await digest('different-extension-bundle'):deployedDigest;
  const getAuthorization=async target=>({sessionId:activeAuth,authorizedTargets:target?.accountId===accountId?[target]:[]});
  function startHost(){
   registrar?.close();
   const provisioner=createProvisioner({request,authority:oauth.authority,readModule:async path=>modules.get(path),
    load:async key=>structuredClone(plans.get(key)),store:async(key,value)=>plans.set(key,structuredClone(value))});
   const transport=createRemoteTransport({oauth,lookup:provisioner.lookup,expectedCodeDigest:buildDigest,pollIntervalMs:10,
    verifyAuthority:async()=>{if(grantDenied)throw Object.assign(Error('INSUFFICIENT_SCOPE'),{code:'INSUFFICIENT_SCOPE'});return true;},
    record:event=>current.recordRemoteResult(event),fetch:async(url,options)=>{
     const {hostname,pathname}=new URL(url);workerRequests++;
     if(pathname==='/remote-save'){
      publicationRequests++;
      const {operationId,destination,source}=JSON.parse(options.body);
      submissions.push({operationId,destination,source});
     }
     if(pathname==='/capabilities'&&armTransient){armTransient=false;healthFailures++;throw Error('BENIGN_FIXTURE_CONNECTION_LOST');}
     const worker=runtimes.get(hostname.split('.')[0]);
     if(!worker)return new Response(null,{status:404});
     const warm=fixture.phase==='fixture-initialization'?fixture.warmInitialization:null;
     const phase=warm?'warm-initialization':pathname==='/capabilities'?(deployments===0?'retained':readinessProbeRequests?'post-probe':'post-deploy'):
      pathname==='/probe'?'readiness-probe':pathname==='/probe-status'?'readiness-reconciliation':null;
     if(pathname==='/probe'){readinessProbeRequests++;if(warm)warm.probeWrites++;}
     if(pathname==='/probe-status'&&!warm)probeStatusIds.push(JSON.parse(options.body).operationId);
     if(phase==='readiness-probe'||phase==='readiness-reconciliation')await report(phase,'RUNNING');
     const started=performance.now();
     const evidence={origin:worker.origin,runtime:worker,route:pathname,socket:null};
     const loopback={runtimeId:worker.lifecycle.id,route:pathname,phase,atMs:elapsed(),
      runtimeAgeMs:elapsed()-worker.lifecycle.readyMs,httpStatus:null,socket:null};
     let injected=false,errorEvidence=null;
     try{
      if(phase&&capabilityFaults.includes(phase)&&!injectedFaults.includes(phase)){
       injected=true;
       injectedFaults.push(phase);
       throw Object.assign(new TypeError('Fixture capability connection lost'),{cause:{code:'ECONNRESET'}});
      }
      const probeFault=warm&&pathname==='/probe'?(warmProbeFault??(interruptWarmProbe?'response-lost':null)):null;
      const rejected=probeFault==='service-unavailable';
      const response=rejected?Response.json({state:'blocked',code:'SERVICE_UNAVAILABLE'},{status:503}):
       await sockets.run(evidence,()=>worker.mf.dispatchFetch(url,options));
      loopback.httpStatus=response.status;
      if(warm)warm.requests.push({
       route:pathname,httpStatus:response.status,json:response.headers.get('content-type')?.split(';',1)[0]==='application/json',
       durationMs:Math.round(performance.now()-started),...(rejected?{injected:true}:{})
      });
      if(probeFault==='response-lost'){
       await response.arrayBuffer();
       injected=true;
       warm.replyLossInjected=true;
       throw Object.assign(new TypeError('Fixture lost the warm probe response'),{cause:{code:'ECONNRESET'}});
      }
      if(interruptSetupProbe&&phase==='readiness-probe'&&!interruptedProbeId){
       const written=await response.json();
       assert.equal(written.state,'verified');
       interruptedProbeId=written.operationId;
       injected=true;
       throw Object.assign(new TypeError('Fixture lost the verified setup probe response'),{cause:{code:'ECONNRESET'}});
      }
      return response;
     }catch(error){
      errorEvidence=safeTransportError(error);
      fixtureTransport.push({boundary:'workerd-dispatch',transport:'local-workerd-loopback',route:pathname,phase,deployment:deployments,
       durationMs:Math.round(performance.now()-started),injected,...errorEvidence,
       runtimeId:loopback.runtimeId,runtimeAgeMs:loopback.runtimeAgeMs,socket:evidence.socket,
       runtimeStderrEnded:worker.lifecycle.stderrEndedMs!==null||worker.lifecycle.stderrClosedMs!==null});
      throw error;
     }finally{
      if(pathname==='/probe'||pathname==='/probe-status')fixture.loopbackProbes.push({
       ...loopback,socket:evidence.socket,durationMs:Math.round(performance.now()-started),injected,error:errorEvidence
      });
     }
    }});
   cloudflare=createCloudflareOnboarding({current,oauth,provisioner,transport,inspectBucket:async()=>!grantDenied});
   trace=createRightClickObservation({readCurrent:current.read,inspectNative:()=>registrar.inspect(),
    readPlan:provisioner.lookup,readResult:current.readRemoteResult,readConnection:oauth.status});
   const chrome={runtime:{},contextMenus:{onClicked:{addListener(){},removeListener(){}},create(_row,ack){ack();},remove(_id,ack){ack();}}};
   registrar=createChromeRegistrar({chrome,dispatchOwnsAuthorization:true,dispatch:async(row,{info,generation})=>{
    const seen=trace.observe(row);
    const result=await engine.save({itemId:row.id,generation,context:'link',source:sourceFromClick(info),observation:seen?.event});
    seen?.finish(result);return result;
   }});
   engine=createEngine({current,registrar,getAuthorization,providerSetupActions:true,
    remoteSave:input=>{
     admissions.push({operationId:input.operationId,target:input.target,source:input.source});
     return transport.save({...input,prepare:cloudflare.ensureSaveReady});
    }});
   const getInventory=async()=>({scopes:[{...scope,workerReady:preparedDestination(await provisioner.lookup(root),root).state==='READY'}],
    depthScopes:[{...scope,workerReady:preparedDestination(await provisioner.lookup(root),root).state==='READY'}]});
   const api=createEngineApi({engine,current,oauth,cloudflare,getInventory,confirm:async()=>true,
    authorize:async({scope})=>scope!=='provision'||scenario==='registration-race'});
   preparedOptions={provisioner,transport,api};
  }
  try{
   startHost();
   const needsWarm=['returning','compatible-build','transient-health','revoked','endpoint-missing'].includes(scenario);
   if(needsWarm){
    await report('warm-initialization','RUNNING');
    // Seed only the explicitly returning/fault scenarios. Cold first-use
    // cases start with no retained plan, no provider worker and no proof.
    const warm=fixture.warmInitialization={
     boundary:'provision',operationId:randomUUID(),requests:[],capability:null,probe:null,probeStatus:null,
     probeWrites:0,outcome:null,replyLossInjected:false,experiment:warmProbeFault?'failure-control':'ordinary-initialization'
    };
    const initialSession=activeAuth;
    const revalidate=async()=>{
     const a=await oauth.authority();
     if(a.sessionId!==initialSession||!a.accounts.some(entry=>entry.id===exact.accountId)||grantDenied)
      throw Object.assign(Error('Warm initialization lost authority'),{code:'AUTHORIZATION_REVOKED'});
    };
    await preparedOptions.provisioner.prepare(exact,{approved:true});
    const worker=[...runtimes.values()][0];
    warm.boundary='signed-capability';
    // A listening Workerd port or R2 proxy handle does not exercise the signed
    // Worker, Durable Object and R2 path. Match production's check before PUT.
    const capability=await readWorkerStatus(preparedOptions.transport,exact,revalidate,{afterDeploy:true});
    warm.capability={state:capability.state,code:safeCode(capability,null)};
    assert.equal(capability.state,'PREPARED');
    warm.boundary='readiness-probe';
    let probe;
    try{probe=await preparedOptions.transport.probe({target:exact,operationId:warm.operationId,
     authorize:async()=>{await revalidate();return true;}});}
    catch(error){warm.probe={error:safeTransportError(error)};throw error;}
    warm.probe=probeEvidence(probe,exact,warm.operationId);
    let proof=probe;
    if(!warmProbeFault||probe.state==='uncertain'){
     try{
      proof=await reconcileReadinessProbe(preparedOptions.transport,exact,warm.operationId,revalidate,{
       initial:probe,observe:result=>{warm.probeStatus=probeEvidence(result,exact,warm.operationId);}
      });
     }catch(error){warm.probeStatus={error:safeTransportError(error)};throw error;}
    }
    const accepted=warmProbeFault?probe:proof;
    assert.equal(accepted?.state,'verified');
    warm.boundary='retain-write-proof';
    await revalidate();
    await preparedOptions.provisioner.markVerified(exact,initialSession);
    warm.outcome=probe.state==='verified'?'verified':'reconciled';
    warm.boundary='verified';
    deployments=0;
    readinessProbeRequests=0;
    if(scenario!=='returning'){activeAuth='fixture-reconnected';startHost();}
    if(scenario==='transient-health')armTransient=true;
    if(scenario==='endpoint-missing'){
     // The retired listener must release its sockets and runtime resources
     // before replacement, including when Windows runs this case in isolation.
     runtimes.clear();
     await disposeWorker(worker);
    }
   }
   fixture.phase='scenario';
   await report('menu-registration','RUNNING');

   // Plain registration still uses the actual CURRENT/engine API. Explicitly
   // approved first-use setup can begin once the reconciled route is exposed.
   const changes=[{type:'setShowInChrome',show:{simple:mode==='simple',nested:mode==='nested',depth:mode==='depth',flat:false}}];
   if(mode==='depth')changes.push({type:'setDepthDisplayBuckets',scopes:[{target:root,maxDepth:4}]});
   else for(const target of scenario==='sibling'?[exact,sibling]:[exact])
    changes.push({type:'createDestination',mode,target,label:target===exact?'Fixture exact':'Fixture sibling'});
   const before=await current.read();
   await current.writeSetupOperation('approval:'+accountId,{accountId,approved:true});
   const registration=preparedOptions.api.invoke({version:'3+1.1',method:'commitConfigChange',
    params:{changes,expectedRevision:before.product.revision,idempotencyKey:randomUUID(),
     ...(scenario==='registration-race'?{prepareModes:[mode]}:{})}},'gui');
   if(['returning','evicted-setup'].includes(scenario)){
    assert.equal((await registration).data.native.state,'completed');
    if(scenario==='evicted-setup'){
     await report('evicted-setup','RUNNING');
     const interrupted=await cloudflare.recoverDestination({target:exact});
     assert.equal(interrupted.code,'TRANSIENT_API_FAILURE');
     assert.equal((await preparedOptions.provisioner.lookup(exact)).state,'pending');
    }else activeAuth='fixture-reconnected';
    startHost();
    assert.equal((await preparedOptions.api.reconcile({lifecycle:true,refreshDepthReadiness:false})).state,'completed');
   }
   const row=await until(()=>{
    const native=registrar.inspect();
    if(native.pending||native.acknowledgedGeneration!==native.desired?.generation)return null;
    return native.desired?.rows.find(row=>row.origin?.mode===mode&&row.role==='save'&&row.target.prefix===prefix);
   });
   if(scenario==='registration-race')await until(()=>setupBlocked);
   const config=await current.read();
   const modes=Object.keys(config.configs).filter(key=>(config.configs[key].destinations??config.configs[key].scopes).length);
   const inspectedBefore=workerRequests;
   await report('native-pairing','RUNNING');
   lab=createPythonLab({runtime,storage,build:{...buildInfo,labEvidenceClass:outcome.evidenceLayer},
    authority:oauth.authority,permission:async()=>true,opfsCapability:()=>true,buckets:async()=>({buckets:[{name:bucketName}]}),
    checkBucket:async()=>true,checkUpload:async()=>{throw Error('READ_ONLY_PROBE_MUST_NOT_PREWARM');},
    inspectRightClick:trace.inspect,storageEstimate:async()=>({quota:64*1024**2,usage:0}),spoolDirectory:async()=>opfs()});
   const grant=await lab.ui('start',{accountId,bucketName,mode:'read-only',minutes:5,scopeId:null,
    ceilings:{...campaignDefaults,files:0},readSelection:{prefix:'qa/',maxReadAttempts:1}});
   assert.equal(grant.state,'PAIRING');
   await cli(['pair','--code',grant.pairCode]);
   const argumentsFor=['right-click-inspect','--mode',mode==='nested'?'narrow':mode,'--prefix',prefix];
   const cold=await cli(argumentsFor);
   const coldProbeMadeWorkerRequests=workerRequests!==inspectedBefore;
   if(scenario==='revoked')grantDenied=true;
   await report('save-readiness-and-dispatch','RUNNING');
   const submitted=registrar.handleClick({menuItemId:row.id,linkUrl:mainURL});
   let secondary,scenarioExercised=true;
   if(scenario==='registration-race'){
    await until(()=>registrar.inspect().inFlightCount>0 || trace.inspect(exact,{mode}).then(item=>!!item.attempt));
    scenarioExercised=setupBlocked&&deployments===0;releaseSetup();
   }
   if(scenario==='sibling'){
    const other=registrar.inspect().desired.rows.find(item=>item.role==='save'&&item.origin?.mode===mode&&item.target.prefix===sibling.prefix);
    if(other)secondary=registrar.handleClick({menuItemId:other.id,linkUrl:secondURL});
    else secondary=registrar.handleClick({menuItemId:row.id,linkUrl:secondURL});
   }
   const [result,second]=await Promise.all([submitted,secondary]);
   await report('independent-readback','RUNNING');
   if(secondary)assert.equal(second.completion,'verified');
   const registered=await registration;
   assert.equal(registered.data?.native?.state,'completed',JSON.stringify(registered));
   const read=await cli(argumentsFor);
   const scopeDenied=await cli(['right-click-inspect','--mode',mode==='nested'?'narrow':mode,'--prefix','outside/'],2);
   assert.equal(scopeDenied.code,'LAB_SCOPE_MISMATCH');
   const bucket=await [...runtimes.values()][0]?.mf.getR2Bucket('STORAGE');
   const expectedKey=prefix+filename;
   const object=bucket&&await bucket.get(expectedKey);
   const objectCount=bucket?(await bucket.list()).objects.filter(object=>!object.key.includes('.click2cloud-readiness/')).length:0;
   if(scenario==='transient-health')scenarioExercised=healthFailures===1;
   if(['lost-deploy-ack','evicted-setup'].includes(scenario))scenarioExercised=lostAck===1&&deployments===1;
   if(scenario==='endpoint-missing')scenarioExercised=settingsMissing>0&&deployments===1;
   const [admission]=admissions,[submission]=submissions;
   const originalOperationVerified=!!(admissions.length===1&&submissions.length===1&&admission.operationId===submission.operationId&&
    admission.operationId===read.receipt?.operationId&&admission.operationId===result.remoteOperationId&&
    admission.target.accountId===exact.accountId&&admission.target.bucketName===exact.bucketName&&admission.target.prefix===prefix&&
    submission.destination?.accountId===exact.accountId&&submission.destination?.bucketName===exact.bucketName&&
    submission.destination?.prefix===prefix.slice(0,-1)&&admission.source.url===mainURL&&submission.source?.url===mainURL);
   const firstHealth=read.attempt?.events.find(event=>event.stage==='worker.health');
   return {cold,observed:read,actual:{
    isolatedMode:modes.length===1?modes[0]:modes.join(','),
    accountAuthorized:cold.observations.accountAuthorized.observed,
    compiled:cold.observations.compiled.observed,registrationAcknowledged:cold.observations.registrationAcknowledged.observed,
    coldProbeMadeWorkerRequests,publicationRequests,deployments,objectCount,scenarioExercised,
    localProofBefore:cold.observations.localWorkerProof.observed,
    nativeInput:read.observations.nativeInput.observed,sourceAdmitted:read.observations.sourceAdmitted.observed,
    workerResponsive:read.observations.workerResponsive.observed,dispatched:read.observations.dispatched.observed,
    publicationVerified:read.observations.publicationVerified.observed,outsideScopeDenied:true,
    verified:result.completion==='verified'&&read.observations.publicationVerified.observed===true,
    key:object?.key??null,sha256:object?sha(await object.arrayBuffer()):null,
    manualIntervention:read.observations.manualIntervention.observed,code:result.code??null,
    capabilityFaults:injectedFaults,peakLocalRuntimes,readinessProbeRequests,originalOperationVerified,
    ...(interruptSetupProbe?{interruptedProbeId,probeStatusIds,
     originalProbeReconciled:!!(interruptedProbeId&&probeStatusIds.length>0&&probeStatusIds.every(id=>id===interruptedProbeId))}:{}),
    firstFailedBoundary:read.attempt?.firstFailedBoundary??null,initialHealthCode:firstHealth?.code??null,
    operationId:result.remoteOperationId??result.operationId??null
   }};
  }finally{
   releaseSetup();registrar?.close();
   await lab?.ui('end').catch(()=>{});
   for(const worker of allWorkers)await disposeWorker(worker);
   await sourceMock.close();
  }
 }
}
