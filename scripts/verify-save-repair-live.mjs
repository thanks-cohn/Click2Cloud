// Explicitly authorized EXISTING isolated test Worker only. Never provision a new
// Worker/bucket, touch production setup, or export signing/API/S3 credentials.
import {readFile,mkdir,writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import {createHmac,createHash,randomBytes} from 'node:crypto';
import {createProvisioner} from '../src/cloudflare/deployment.mjs';import {createRemoteTransport} from '../src/cloudflare/transport.mjs';import {digest,PROTOCOL} from '../src/cloudflare/wire.mjs';
const dir=new URL('../docs/evidence/save-receipt-repair/',import.meta.url);await mkdir(dir,{recursive:true});
const prior=JSON.parse(await readFile(new URL('../docs/evidence/cloudflare-m01/live-results.json',import.meta.url))),accountId=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const target={provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName:'redown',prefix:'__click2cloud_true_remote_test__/'},plans=new Map(),results=[];
const evidence={evidenceClass:'LIVE_CLOUDFLARE_EXISTING_ISOLATED_WORKER_ENVIRONMENT_TOKEN_NOT_WINDOWS_OAUTH',baselineRevision:'6dc4142',bucket:target.bucketName,prefix:target.prefix,results};
const request=(path,o={})=>fetch('https://api.cloudflare.com/client/v4'+path,{...o,headers:{...o.headers,authorization:'Bearer '+token},signal:AbortSignal.timeout(60000)});
const sha=x=>createHash('sha256').update(x).digest('hex'),hmac=(k,s)=>createHmac('sha256',k).update(s).digest();
async function s3(method,key){
 const endpoint=new URL(process.env.S3_API_ENDPOINT),access=process.env.CLOUDFLARE_ACCESS_KEY_ID,secret=process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.pathname!=='/'||!endpoint.hostname.endsWith('.r2.cloudflarestorage.com')||!access||!secret)throw Object.assign(Error(),{code:'INDEPENDENT_S3_CONFIG_UNAVAILABLE'});
 const u=new URL('/redown/'+key.split('/').map(encodeURIComponent).join('/'),endpoint),date=new Date().toISOString().replace(/[:-]|\.\d{3}/g,''),day=date.slice(0,8),scope=day+'/auto/s3/aws4_request',payload=sha('');
 const canonical=method+'\n'+u.pathname+'\n\nhost:'+u.host+'\nx-amz-content-sha256:'+payload+'\nx-amz-date:'+date+'\n\nhost;x-amz-content-sha256;x-amz-date\n'+payload;
 const sig=createHmac('sha256',hmac(hmac(hmac(hmac('AWS4'+secret,day),'auto'),'s3'),'aws4_request')).update('AWS4-HMAC-SHA256\n'+date+'\n'+scope+'\n'+sha(canonical)).digest('hex');
 return fetch(u,{method,headers:{'x-amz-date':date,'x-amz-content-sha256':payload,authorization:'AWS4-HMAC-SHA256 Credential='+access+'/'+scope+', SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature='+sig},signal:AbortSignal.timeout(30000)});
}
let transport;
try{
 if(!process.argv.includes('--approved-existing-test-worker'))throw Object.assign(Error(),{code:'EXPLICIT_TEST_APPROVAL_FLAG_REQUIRED'});
 if(!accountId||!token||prior.accountFingerprint!==await digest(accountId)||!/^click2cloud-r2-[a-f0-9]{20}$/.test(prior.worker??''))throw Object.assign(Error(),{code:'TEST_OWNERSHIP_UNCONFIRMED'});
 const r=await request('/accounts/'+accountId+'/workers/scripts/'+prior.worker+'/settings'),b=await r.json(),bindings=b.result?.bindings??[];
 if(!r.ok||!bindings.some(x=>x.name==='STORAGE'&&x.bucket_name==='redown')||!bindings.some(x=>x.name==='ACCOUNT_ID'&&x.text===accountId)||!bindings.some(x=>x.name==='PREFIX_SCOPE'&&x.text===target.prefix.slice(0,-1)))throw Object.assign(Error(),{code:'TEST_BINDINGS_UNCONFIRMED'});
 results.push({gate:'existing-isolated-ownership',httpStatus:r.status,state:'PASS'});
 plans.set(await digest([accountId,'redown']),{state:'ready',protocol:PROTOCOL,accountId,bucketName:'redown',name:prior.worker,url:'https://'+prior.workerHost,secret:randomBytes(32).toString('hex'),prefixScope:target.prefix.slice(0,-1)});
 try{const saved=JSON.parse(await readFile('/tmp/c2c-save-repair-test-plan.json','utf8'));if(saved.name===prior.worker&&saved.accountId===accountId&&saved.prefixScope===target.prefix.slice(0,-1))plans.set(await digest([accountId,'redown']),saved);}catch{}
 const fixtureSource=process.argv.includes('--httpbin-source')?'https://httpbin.org/base64/SGVsbG8sIENsaWNrMkNsb3VkIQ==':process.argv.includes('--google-source')?'https://www.google.com/robots.txt':'https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore';evidence.sourceFixture=process.argv.includes('--httpbin-source')?'httpbin-fixed-base64':process.argv.includes('--google-source')?'google-robots':'github-node-gitignore';
 for(const mode of (process.argv.includes('--repaired-only')?['repaired']:['baseline','repaired'])){
  const provisioner=createProvisioner({request,readModule:p=>mode==='baseline'?execFileSync('git',['show','6dc4142:'+p],{encoding:'utf8'}):readFile(new URL('../'+p,import.meta.url),'utf8'),load:k=>plans.get(k),store:async(k,v)=>{plans.set(k,v);await writeFile('/tmp/c2c-save-repair-test-plan.json',JSON.stringify(v),{mode:0o600});}});
  const plan=await provisioner.prepare(target,{approved:true,rebuild:!process.argv.includes('--reuse-test-worker'),prefixScope:target.prefix.slice(0,-1)});results.push({gate:mode+(process.argv.includes('--reuse-test-worker')?'-isolated-reuse':'-isolated-update'),state:'PASS',codeDigest:plan.codeDigest});
  transport=createRemoteTransport({oauth:{authority:async()=>({sessionId:'isolated-save-repair',accounts:[{id:accountId}]})},lookup:provisioner.lookup,pollIntervalMs:250});
  let status;for(let attempt=0;attempt<30;attempt++){status=await transport.status(target);if(!['WORKER_BUILD_MISMATCH','CAPABILITY_DENIED'].includes(status.code))break;await new Promise(r=>setTimeout(r,2000));}results.push({gate:mode+'-capability',state:status.state,code:status.code});if(!['READY','PREPARED'].includes(status.state))throw Object.assign(Error(),{code:status.code??'WORKER_NOT_READY'});
  const id=crypto.randomUUID(),filename='save-repair-'+id+'.gitignore',save=await transport.save({target,operationId:id,source:{url:fixtureSource,filename}}),inspection=await transport.inspectOperation(target,id);
  results.push({gate:mode+'-save',state:save.state,code:save.code,diagnostic:save.diagnostic,operationId:id,inspection:{state:inspection.state,code:inspection.code,diagnostic:inspection.diagnostic},receipt:save.receipt?{key:save.receipt.key,size:save.receipt.size,etag:save.receipt.etag,version:save.receipt.version}:undefined});
  if(mode==='baseline')continue;
  if(save.state!=='verified')throw Object.assign(Error(),{code:save.code??'LIVE_SAVE_NOT_VERIFIED'});
  const key=save.receipt.key;if(!key.startsWith(target.prefix)||key!==target.prefix+filename)throw Object.assign(Error(),{code:'TEST_OBJECT_SCOPE_MISMATCH'});
  const independent=await s3('GET',key),bytes=new Uint8Array(await independent.arrayBuffer()),expected=new Uint8Array(await (await fetch(fixtureSource)).arrayBuffer());
  const match=independent.ok&&bytes.length===save.receipt.size&&sha(bytes)===sha(expected);results.push({gate:'independent-provider-S3-readback',state:match?'PASS':'FAIL',httpStatus:independent.status,size:bytes.length,sha256:sha(bytes),sourceMatches:match});
  if(!match)throw Object.assign(Error(),{code:'INDEPENDENT_READBACK_FAILED'});
  const check=await transport.inspectOperation(target,id);if(check.state!=='verified'||check.receipt.version!==save.receipt.version)throw Object.assign(Error(),{code:'TEST_IDENTITY_CHANGED'});
  const del=await s3('DELETE',key),absent=await s3('HEAD',key);results.push({gate:'exact-new-test-object-cleanup',deleteStatus:del.status,absenceStatus:absent.status,state:del.ok&&absent.status===404?'PASS':'FAIL'});
 }
 evidence.state='PASS';
}catch(e){evidence.state='BLOCKED';evidence.code=/^[A-Z][A-Z0-9_]{0,63}$/.test(e?.code??'')?e.code:'LIVE_TEST_UNAVAILABLE';process.exitCode=2;}
finally{await writeFile(new URL('live-provider.json',dir),JSON.stringify(evidence,(_k,v)=>accountId&&typeof v==='string'?v.replaceAll(accountId,'[account]'):v,2)+'\n');console.log(JSON.stringify({state:evidence.state,code:evidence.code,results}));}
