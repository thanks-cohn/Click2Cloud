// Controlled host-transport comparison. No browser, network or provider access.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {setTimeout as wait} from 'node:timers/promises';
import {createRemoteTransport as updated} from '../../src/cloudflare/transport.mjs';

const baselineRevision='2a3799c2661057c3a95fc4b37b3a70e9f9b7782c';
const transportPath='src/cloudflare/transport.mjs';
const transportURL=new URL('../../'+transportPath,import.meta.url);
const source=execFileSync('git',['show',baselineRevision+':'+transportPath],{encoding:'utf8'});
const moduleSource=source.replace(/ from '([.][^']+)'/g,(_,path)=>' from '+JSON.stringify(new URL(path,transportURL).href));
const {createRemoteTransport:baseline}=await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));

const fixture={bucketAuthorityMs:45,workerRequestMs:30,pollIntervalMs:20,pendingPolls:[0,1,2],repeats:4};
async function sampleMode(create,mode,lifecycle){
 const prefix={simple:'',narrow:'Curated/Leaf/',depth:'Tree/Middle/Leaf/'}[mode];
 const target={provider:'cloudflare',accountId:'fixture',connectionId:'cloudflare:fixture',bucketName:'fixture-'+mode,prefix};
 const plan={state:'ready',protocol:'click2cloud-remote-2',accountId:target.accountId,bucketName:target.bucketName,
  secret:'synthetic-test-only',codeDigest:'unchanged-worker',url:'https://synthetic.invalid.workers.dev',prefixScope:''};
 let operation,reads;
 const make=()=>create({oauth:{authority:async()=>({sessionId:'fixture-session',accounts:[{id:target.accountId}]})},
  lookup:async()=>plan,verifyAuthority:async()=>{reads++;await wait(fixture.bucketAuthorityMs);return true;},
  pollIntervalMs:fixture.pollIntervalMs,
  fetch:async(url,options)=>{
   const path=new URL(url).pathname;
   if(path==='/remote-save')operation.dispatchMs=performance.now()-operation.start;
   await wait(fixture.workerRequestMs);
   const body=JSON.parse(options.body);
   switch(path){
    case '/remote-save':
     operation.receipt={operationId:body.operationId,destination:body.destination,key:prefix+'asset.bin',size:3,etag:'fixture-etag',version:'fixture-version'};
     return Response.json({state:'pending',code:'REMOTE_ACCEPTED'});
    case '/operation':
     if(operation.pending-- >0)return Response.json({state:'pending',code:'REMOTE_ACTIVE'});
     return Response.json({state:'verified',receipt:operation.receipt});
    case '/verify':
     return Response.json({state:'completed',proof:operation.receipt});
    default: throw Error('unexpected route');
   }
  }});
 const warm=make(),samples=[];
 for(let i=0;i<fixture.repeats;i++)for(const pending of fixture.pendingPolls){
  const transport=lifecycle==='cold'?make():warm;
  reads=0;operation={pending,start:performance.now()};
  const result=await transport.save({target,source:{url:'https://example.com/asset.bin',filename:'asset.bin'}});
  assert.equal(result.state,'verified',JSON.stringify(result));
  samples.push({ms:performance.now()-operation.start,dispatchMs:operation.dispatchMs,reads});
 }
 const summarize=key=>{
  const values=samples.map(s=>s[key]).sort((a,b)=>a-b);
  return {median:Math.round((values[values.length/2-1]+values[values.length/2])/2),p95:Math.round(values[Math.ceil(values.length*.95)-1]),max:Math.round(values.at(-1))};
 };
 return {mode,lifecycle,samples:samples.length,errors:0,dispatchMs:summarize('dispatchMs'),verifiedMs:summarize('ms'),authorityReads:[...new Set(samples.map(s=>s.reads))].sort((a,b)=>a-b)};
}
const results=[];
for(const mode of ['simple','narrow','depth'])for(const lifecycle of ['cold','warm']){
 const before=await sampleMode(baseline,mode,lifecycle),after=await sampleMode(updated,mode,lifecycle);
 results.push({before,after});
}
console.log(JSON.stringify({baselineRevision,fixture,evidence:'Simulated host transport with fixed delays and synthetic receipts. Cold means a new transport instance.',results},null,2));
