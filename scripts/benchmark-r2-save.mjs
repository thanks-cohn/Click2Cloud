// Runs both production Workers in local workerd using the same mock HTTPS
// source, OAuth authority delay and R2 binding. Run from repository root.
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as wait} from 'node:timers/promises';
import {build} from 'esbuild';
import {Miniflare,createFetchMock} from 'miniflare';

const baseline='c337e415596be01f061e161f167d9f5aed13825c';
const snapshot=await mkdtemp(join(tmpdir(),'c2c-r2-benchmark-'));
const protocols=[
 {size:1024,delay:0},
 {size:1048576,delay:0},
 {size:1048576,delay:260}
];
const modes={simple:'',narrow:'Folder/Leaf/',depth:'Nested/Child/Leaf/'};
const quantile=(values,p)=>Math.round(values.slice().sort((a,b)=>a-b)[Math.ceil(p*values.length)-1]);
function distribution(values){
 return values.length?{p50:quantile(values,.5),p95:quantile(values,.95),p99:quantile(values,.99)}:null;
}
async function measure(root,buildName){
 const {createRemoteTransport}=await import(pathToFileURL(join(root,'src/cloudflare/transport.mjs')));
 const sourceFixture=resolve('tests/fixtures/public-egress.mjs');
 const script=(await build({entryPoints:[join(root,'src/cloudflare/worker.mjs')],format:'esm',platform:'browser',bundle:true,write:false,
  plugins:[{name:'controlled-source-fixture',setup(builder){builder.onResolve({filter:/public-egress\.mjs$/},()=>({path:sourceFixture}));}}]})).outputFiles[0].text;
 const mock=createFetchMock();mock.disableNetConnect();
 for(const {size,delay} of protocols){
  const response=mock.get('https://raw.githubusercontent.com').intercept({path:'/'+size+'-'+delay}).reply(200,Buffer.alloc(size,37),
   {headers:{'content-length':String(size),'content-type':'application/octet-stream'}});
  if(delay)response.delay(delay);response.persist();
 }
 const secret='synthetic-benchmark-only',mf=new Miniflare({modules:true,script,compatibilityDate:'2026-01-01',
  r2Buckets:['STORAGE'],bindings:{ACCOUNT_ID:'benchmark',BUCKET_NAME:'benchmark',PREFIX_SCOPE:'',SIGNING_KEY:secret,CODE_DIGEST:'fixture'},
  durableObjects:{CLAIMS:{className:'RemoteClaims',useSQLite:true}},fetchMock:mock});
 try{
  await mf.ready;
  const bucket=await mf.getR2Bucket('STORAGE');
  let requests=[],firstRequestAt=0;
  const plan={state:'ready',protocol:'click2cloud-remote-2',accountId:'benchmark',bucketName:'benchmark',prefixScope:'',secret,url:'https://fixture.workers.dev'};
  const transport=createRemoteTransport({lookup:async()=>plan,oauth:{authority:async()=>({sessionId:'fixture',accounts:[{id:'benchmark'}]})},
   verifyAuthority:async()=>{await wait(25);return true;},fetch:async(url,options)=>{
    const path=new URL(url).pathname;
    if(!requests.length)firstRequestAt=performance.now();
    requests.push(path);
    return mf.dispatchFetch(url,options);
   }});
  const output=[];
  for(const [mode,prefix] of Object.entries(modes))for(const {size,delay} of protocols){
   const samples=[];
   for(let i=0;i<10;i++){
    const target={provider:'cloudflare',connectionId:'cloudflare:benchmark',accountId:'benchmark',bucketName:'benchmark',prefix};
    requests=[];const start=performance.now();
    const result=await transport.save({target,source:{url:'https://raw.githubusercontent.com/'+size+'-'+delay,filename:[mode,size,delay,i].join('-')+'.bin'}});
    const totalMs=performance.now()-start;
    const object=result.receipt?await bucket.head(result.receipt.key):null;
    samples.push({totalMs,dispatchMs:firstRequestAt-start,ok:result.state==='verified'&&object?.size===size&&object?.version===result.receipt.version,
     code:result.code,requests:requests.slice(),timings:result.timings});
   }
   const valid=samples.filter(row=>row.ok),stages=new Set(valid.flatMap(row=>Object.keys(row.timings??{})));
   output.push({mode,size,sourceDelayMs:delay,samples:samples.length,failures:samples.filter(row=>!row.ok).map(row=>row.code),
    totalMs:distribution(valid.map(row=>row.totalMs)),dispatchMs:distribution(valid.map(row=>row.dispatchMs)),
    stageMs:Object.fromEntries([...stages].map(stage=>[stage,distribution(valid.flatMap(row=>Number.isFinite(row.timings?.[stage])?[row.timings[stage]]:[]))])),
    requestSequences:[...new Set(valid.map(row=>row.requests.join(' → ')))],firstSampleMs:Math.round(samples[0].totalMs)});
  }
  return {build:buildName,cells:output};
 }finally{await mf.dispose();await mock.close();}
}
try{
 const archive=execFileSync('git',['archive',baseline,'src','right2cloud-module'],{maxBuffer:32*1024*1024});
 execFileSync('tar',['-x','-C',snapshot],{input:archive});
 const before=await measure(snapshot,baseline),after=await measure(resolve('.'),'overhaul working tree');
 console.log(JSON.stringify({evidence:'Local workerd/R2, controlled HTTPS and OAuth fixture. No Chrome delivery or live Cloudflare.',before,after},null,2));
 if([before,after].some(build=>build.cells.some(cell=>cell.failures.length)))process.exitCode=1;
}finally{await rm(snapshot,{recursive:true,force:true});}
