// Opt-in live provider verification, isolated prefix/Worker; never an OAuth or
// installed Chrome substitute. Private plan stays outside the repository.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,createHmac} from 'node:crypto';
import {resolve} from 'node:path';import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createProvisioner} from '../src/cloudflare/deployment.mjs';
import {createRemoteTransport} from '../src/cloudflare/transport.mjs';
const output=resolve(process.env.C2C_LOGIN_EVIDENCE??'docs/evidence/login-ready-product');await mkdir(output,{recursive:true});
const report={sourceRevision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),runtimeSourceDirty:!!execFileSync('git',['status','--porcelain','--','src','extension'],{encoding:'utf8'}).trim(),evidenceClass:'LIVE_CLOUDFLARE_API_TOKEN_WORKER_R2_NOT_EXTENSION_OAUTH_OR_NATIVE_CHROME',operations:[]},plans=new Map(),accountId=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN,privatePlan=resolve(tmpdir(),'c2c-login-live-plan.json');
const target={provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName:'redown',prefix:'__click2cloud_true_remote_test__/login-'+crypto.randomUUID()+'/'};
const sha=x=>createHash('sha256').update(x).digest('hex'),hmac=(k,s)=>createHmac('sha256',k).update(s).digest();
async function independentGet(key){
 const u=new URL(process.env.S3_API_ENDPOINT),access=process.env.CLOUDFLARE_ACCESS_KEY_ID,secret=process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
 if(u.protocol!=='https:'||!u.hostname.endsWith('.r2.cloudflarestorage.com')||u.username||u.password||u.pathname!=='/'||!access||!secret)throw Object.assign(Error(),{code:'INDEPENDENT_R2_CONFIG_UNAVAILABLE'});
 u.pathname='/redown/'+key.split('/').map(encodeURIComponent).join('/');const date=new Date().toISOString().replace(/[:-]|\.\d{3}/g,''),day=date.slice(0,8),scope=day+'/auto/s3/aws4_request',payload=sha(''),canonical='GET\n'+u.pathname+'\n\nhost:'+u.host+'\nx-amz-content-sha256:'+payload+'\nx-amz-date:'+date+'\n\nhost;x-amz-content-sha256;x-amz-date\n'+payload;
 const signature=createHmac('sha256',hmac(hmac(hmac(hmac('AWS4'+secret,day),'auto'),'s3'),'aws4_request')).update('AWS4-HMAC-SHA256\n'+date+'\n'+scope+'\n'+sha(canonical)).digest('hex');
 return fetch(u,{headers:{'accept-encoding':'identity','x-amz-date':date,'x-amz-content-sha256':payload,authorization:'AWS4-HMAC-SHA256 Credential='+access+'/'+scope+', SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature='+signature},redirect:'error',signal:AbortSignal.timeout(30000)});
}
let stage='approval';
try{
 if(!process.argv.includes('--approved-isolated-worker'))throw Object.assign(Error(),{code:'EXPLICIT_APPROVAL_FLAG_REQUIRED'});
 if(!accountId||!token)throw Object.assign(Error(),{code:'CLOUDFLARE_VARIABLES_MISSING'});
 const request=async(path,o={})=>{const response=await fetch('https://api.cloudflare.com/client/v4'+path,{...o,headers:{...o.headers,authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(60000)});const body=await response.clone().json().catch(()=>({}));report.operations.push({id:crypto.randomUUID(),stage:'management-api',method:o.method??'GET',endpoint:path.replaceAll(accountId,'{account_id}'),httpStatus:response.status,providerCodes:body.errors?.map(e=>e.code)??[],state:response.ok&&body.success!==false?'PASS':'BLOCKED'});return response;};
 try{const saved=JSON.parse(await readFile(privatePlan,'utf8'));if(saved.accountId===accountId&&saved.bucketName==='redown'&&saved.prefixScope==='__click2cloud_true_remote_test__')plans.set(saved.key,saved.plan);}catch{}
 const provisioner=createProvisioner({request,readModule:p=>readFile(new URL('../'+p,import.meta.url),'utf8'),load:k=>plans.get(k),store:async(key,plan)=>{plans.set(key,plan);await writeFile(privatePlan,JSON.stringify({key,accountId,bucketName:'redown',prefixScope:'__click2cloud_true_remote_test__',plan}),{mode:0o600});}});
 stage='worker-preparation';const plan=await provisioner.prepare(target,{approved:true,prefixScope:'__click2cloud_true_remote_test__'});report.worker=plan.name;report.workerCodeDigest=plan.codeDigest;
 const oauth={authority:async()=>({sessionId:'environment-api-token-test',accounts:[{id:accountId}]})},transport=createRemoteTransport({oauth,lookup:provisioner.lookup,expectedCodeDigest:plan.codeDigest,pollIntervalMs:250,fetch:async(u,o)=>{const r=await fetch(u,o);report.operations.push({id:crypto.randomUUID(),stage:'worker-http',method:o.method,endpoint:new URL(u).pathname,httpStatus:r.status,contentType:r.headers.get('content-type'),state:r.ok?'PASS':'BLOCKED'});return r;}});
 stage='worker-capability';const status=await transport.status(target);report.operations.push({id:crypto.randomUUID(),stage,state:['READY','PREPARED'].includes(status.state)?'PASS':'BLOCKED',code:status.code??status.state});if(!['READY','PREPARED'].includes(status.state))throw Object.assign(Error(),{code:status.code});
 for(let n=0;n<2;n++){
  stage='true-remote-save';const id=crypto.randomUUID(),source={url:'https://raw.githubusercontent.com/github/explore/main/topics/javascript/javascript.png',filename:id+'.png'},save=await transport.save({target,source,operationId:id});report.operations.push({id,stage,state:save.state==='verified'?'PASS':'BLOCKED',code:save.code??save.state,diagnostic:save.diagnostic,timings:save.timings});if(save.state!=='verified')throw Object.assign(Error(),{code:save.code??'SAVE_UNVERIFIED'});
  stage='independent-r2-get';const r=await independentGet(save.receipt.key),bytes=new Uint8Array(await r.arrayBuffer()),expected=new Uint8Array(await (await fetch(source.url)).arrayBuffer());const match=r.ok&&bytes.length===save.receipt.size&&sha(bytes)===sha(expected);report.operations.push({id:crypto.randomUUID(),parentOperationId:id,stage,state:match?'PASS':'BLOCKED',httpStatus:r.status,size:bytes.length,sha256:sha(bytes),sourceMatches:match,key:save.receipt.key});if(!match)throw Object.assign(Error(),{code:'INDEPENDENT_R2_MISMATCH'});
 }
 report.state='PASS';
}catch(error){report.state='BLOCKED';report.failure={stage,code:/^[A-Z][A-Z0-9_]+$/.test(error.code??'')?error.code:'LIVE_REQUEST_FAILED'};process.exitCode=2;}
report.unchanged={productionWorkers:true,existingObjects:true,REDOWN:true};report.retained='Only newly created isolated test Worker/objects; private signing plan outside repository. No cleanup deletes.';
await writeFile(resolve(output,'live-provider.json'),JSON.stringify(report,(_k,v)=>accountId&&typeof v==='string'?v.replaceAll(accountId,'[account]'):v,2)+'\n');console.log(JSON.stringify({state:report.state,failure:report.failure,operations:report.operations.length}));
