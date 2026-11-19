// Controlled production transport/Depth lifecycle benchmark; no real network or R2.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const sourceRoot=process.env.C2C_BENCH_SOURCE_ROOT?pathToFileURL(process.env.C2C_BENCH_SOURCE_ROOT+'/'):new URL('../',import.meta.url);
const {createRemoteTransport}=await import(new URL('src/cloudflare/transport.mjs',sourceRoot));
const {createDepthNativeClick}=await import(new URL('src/modes/depth/native-click.mjs',sourceRoot));
const {PROTOCOL}=await import(new URL('src/cloudflare/wire.mjs',sourceRoot));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const root={provider:'cloudflare',connectionId:'cloudflare:fixture',accountId:'fixture',bucketName:'click2cloud-qa',prefix:'C2C-QA/Narrow/A/'};
const plan={state:'ready',accountId:'fixture',bucketName:root.bucketName,protocol:PROTOCOL,secret:'fixture-only-signing-key',url:'https://fixture.workers.dev',codeDigest:'fixture-code',verifiedTargets:{'':{codeDigest:'fixture-code'}}};
const rows=[];
for(const mode of ['simple','nested','depth'])for(const condition of ['cold','warm'])for(const size of [1024,1048576]){
 const samples=[];
 for(let i=0;i<12;i++){
  let capabilities=0,requestMs=0,authMs=0,dispatchAt=null,verifiedAt=null;const receipts=new Map(),started=performance.now();
  const transport=createRemoteTransport({oauth:{authority:async()=>({sessionId:'fixture-session',accounts:[{id:'fixture'}]})},lookup:async()=>plan,expectedCodeDigest:plan.codeDigest,fetch:async(url,options)=>{
   const t=performance.now(),path=new URL(url).pathname,input=JSON.parse(options.body);if(path==='/remote-save')dispatchAt=t;await wait(20);let value;
   if(path==='/capabilities'){capabilities++;value={state:'completed',protocol:PROTOCOL,destination:{provider:'cloudflare-r2',connectionId:root.connectionId,accountId:root.accountId,bucketName:root.bucketName,prefix:root.prefix.slice(0,-1),conflictPolicy:'keep-both'},storageBound:true,durableClaims:true,conditionalCreate:true,codeDigest:plan.codeDigest};}
   else if(path==='/remote-save'){await wait(size===1024?5:25);const receipt={destination:input.destination,operationId:input.operationId,key:input.destination.prefix+'/image.png',size,etag:'fixture-etag',version:'fixture-version'};receipts.set(receipt.operationId,receipt);value={state:'written',receipt};}
   else if(path==='/verify'){value={state:'completed',proof:receipts.get(input.operationId)};verifiedAt=performance.now();}
   else throw Error(path);requestMs+=performance.now()-t;return Response.json(value);
  }});
  const authorize=async()=>{const t=performance.now();const r=await transport.status(root);authMs+=performance.now()-t;return {sessionId:'fixture-session',authorizedTargets:r.state==='READY'?[root]:[]};};
  // Mirrors registrar + engine initial, preflight, pre-dispatch and final checks.
  const run=async(auth=authorize)=>{await auth(root);await auth(root);return transport.save({target:root,source:{url:'https://raw.githubusercontent.com/image.png',filename:'image.png'},authorize:async()=>{const a=await auth(root);return a?.sessionId==='fixture-session'&&a.authorizedTargets.length===1;}});};
  if(condition==='cold')await wait(15); // explicit modeled boot, not measured MV3 boot
  let result;
  if(mode==='depth')result=await createDepthNativeClick({current:{recordRemoteResult:async()=>{}},oauth:{authority:async()=>({accounts:[{id:'fixture'}]})},transport,lookup:async()=>plan,inspect:()=>({desired:{generation:1},acknowledgedGeneration:1}),authorize})( {id:'fixture-depth',target:root,origin:{mode:'depth'}},{},{},run);
  else result=await run();
  assert.equal(result.state,'verified',JSON.stringify(result));samples.push({totalMs:performance.now()-started,requestMs,authMs,preRemoteDispatchMs:dispatchAt-started,postVerificationMs:performance.now()-verifiedAt,capabilities,timings:result.timings});
 }
 const distribution=a=>{a.sort((a,b)=>a-b);return {p50:a[Math.floor(a.length*.5)],p95:a[Math.ceil(a.length*.95)-1],max:a.at(-1)};};
 rows.push({mode,condition,bytes:size,n:samples.length,totalMs:distribution(samples.map(x=>x.totalMs)),requestMs:distribution(samples.map(x=>x.requestMs)),uncachedStatusAuthorizationMs:distribution(samples.map(x=>x.authMs)),preRemoteDispatchMs:distribution(samples.map(x=>x.preRemoteDispatchMs)),postVerificationMs:distribution(samples.map(x=>x.postVerificationMs)),capabilities:samples[0].capabilities,stages:Object.fromEntries(Object.keys(samples[0].timings).map(k=>[k,distribution(samples.map(x=>x.timings[k]))]))});
}
const output=process.argv[2]??'work/onboarding/benchmark.json';await mkdir(output.slice(0,output.lastIndexOf('/')),{recursive:true});await writeFile(output,JSON.stringify({evidenceClass:'CONTROLLED_NODE_FIXTURE_NOT_CHROME_NOT_R2',conditions:'20ms per request; modeled 15ms cold boot; modeled source/write 5ms small,25ms large; timings overlap; no real bytes transferred',clock:'performance.now monotonic, one Node process',authorizationMetric:'uncachedStatusAuthorizationMs counts only fallback status authorizer; reused authorization is included in transport intent/authorizationRecheckMs, not a fabricated zero cost',unavailable:['real source DNS/TLS/bytes','R2 put/head','Chrome onClicked/MV3 boot','real provider latency'],rows},null,2)+'\n');
