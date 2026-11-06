// Opt-in isolated infrastructure test. Uses environment credentials only in this
// process; never bootstraps an extension OAuth session or alters REDOWN resources.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createProvisioner} from '../src/cloudflare/deployment.mjs';
import {createRemoteTransport} from '../src/cloudflare/transport.mjs';
import {digest} from '../src/cloudflare/wire.mjs';
const output=new URL('../docs/evidence/cloudflare-m01/',import.meta.url),plans=new Map(),receipts=[];
await mkdir(output,{recursive:true});
const accountId=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const target={provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName:'redown',prefix:'__click2cloud_true_remote_test__/'};
let plan,transport;
const evidence={evidenceClass:'LIVE_CLOUDFLARE_DEPLOYMENT_TRANSFER_PENDING',accountFingerprint:accountId?await digest(accountId):null,bucket:'redown',prefix:target.prefix,results:[],limits:{knownLength:67108864,unknownLength:8388608}};
async function request(path,options={}){return fetch('https://api.cloudflare.com/client/v4'+path,{...options,headers:{...options.headers,authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(60000)});}
try{
 if(!process.argv.includes('--approved-test-deploy'))throw Object.assign(Error(),{code:'EXPLICIT_DEPLOY_FLAG_REQUIRED'});
 if(!accountId||!token)throw Object.assign(Error(),{code:'CLOUDFLARE_VARIABLES_MISSING'});
 const provisioner=createProvisioner({request,readModule:p=>readFile(new URL('../'+p,import.meta.url),'utf8'),load:k=>plans.get(k),store:(k,v)=>plans.set(k,v)});
 if(process.argv.includes('--resume-owned-test-worker')){
  const old=JSON.parse(await readFile(new URL('live-results.json',output),'utf8'));
  if(old.accountFingerprint!==evidence.accountFingerprint||old.bucket!=='redown'||!/^click2cloud-r2-[a-f0-9]{20}$/.test(old.worker??'')||!old.workerHost?.startsWith(old.worker+'.')||!old.workerHost.endsWith('.workers.dev'))throw Object.assign(Error(),{code:'TEST_OWNERSHIP_UNCONFIRMED'});
  const settings=await request('/accounts/'+accountId+'/workers/scripts/'+old.worker+'/settings');const settingsBody=await settings.json();const bindings=settingsBody.result?.bindings??[];
  if(!settings.ok||!bindings.some(b=>b.name==='STORAGE'&&b.bucket_name==='redown')||!bindings.some(b=>b.name==='PREFIX_SCOPE'&&b.text==='__click2cloud_true_remote_test__'))throw Object.assign(Error(),{code:'TEST_BINDING_UNCONFIRMED'});
  const secret=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
  plans.set(await digest([accountId,'redown']),{state:'ready',protocol:'click2cloud-remote-1',accountId,bucketName:'redown',name:old.worker,url:'https://'+old.workerHost,secret,prefixScope:'__click2cloud_true_remote_test__'});
 }
 plan=await provisioner.prepare(target,{approved:true,rebuild:process.argv.includes('--resume-owned-test-worker'),prefixScope:'__click2cloud_true_remote_test__'});
 evidence.codeDigest=plan.codeDigest;evidence.worker=plan.name;evidence.workerHost=new URL(plan.url).hostname;evidence.results.push({gate:'isolated-worker-deployment',state:'PASS'});
 const oauth={authority:async()=>({sessionId:'live-test-session',accounts:[{id:accountId}]})};
 transport=createRemoteTransport({oauth,lookup:provisioner.lookup});
 const status=await transport.status(target);evidence.results.push({gate:'authenticated-worker-readiness',...status});
 if(!['READY','PREPARED'].includes(status.state))throw Object.assign(Error(),{code:status.code??'WORKER_NOT_READY'});
 for(const [filename,url]of [['image.png','https://raw.githubusercontent.com/github/explore/main/topics/javascript/javascript.png'],['link.gitignore','https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore']]){
  const r=await transport.save({target,operationId:crypto.randomUUID(),source:{url,filename}});receipts.push(r);evidence.results.push({gate:'remote-'+filename,result:r});
  if(r.state!=='verified')throw Object.assign(Error(),{code:r.code??'SAVE_NOT_VERIFIED'});
 }
 const invalid=await transport.save({target,operationId:crypto.randomUUID(),source:{url:'https://127.0.0.1/private',filename:'denied'}});evidence.results.push({gate:'private-source-denied',state:invalid.state,code:invalid.code});
 if(invalid.state==='verified')throw Object.assign(Error(),{code:'PRIVATE_SOURCE_WAS_NOT_DENIED'});
 await provisioner.markVerified(target);
 evidence.state='PASS';evidence.verified=receipts.filter(r=>r.state==='verified').length;
}catch(e){evidence.state='BLOCKED';evidence.code=/^[A-Z_]+$/.test(e.code??'')?e.code:'LIVE_TEST_FAILED';process.exitCode=2;}
finally{
 // Cleanup is restricted to exact keys from independently verified receipts.
 for(const r of receipts.filter(r=>r.state==='verified')){
  const key=r.receipt?.key;if(!key?.startsWith(target.prefix))continue;
  try{const fresh=await transport.inspect(target,r.receipt);if(!fresh.proof||!['key','size','etag','version','operationId'].every(k=>fresh.proof[k]===r.receipt[k])){evidence.results.push({gate:'test-object-cleanup',key,state:'SKIPPED_IDENTITY_CHANGED'});continue;}const path='/accounts/'+accountId+'/r2/buckets/redown/objects/'+key.split('/').map(encodeURIComponent).join('/');const del=await request(path,{method:'DELETE'});const check=await request(path,{method:'HEAD'});evidence.results.push({gate:'test-object-cleanup',key,http:del.status,absenceHttp:check.status});}catch{evidence.results.push({gate:'test-object-cleanup',key,state:'NOT_CONFIRMED'});}
 }
 if(evidence.state==='PASS'&&evidence.results.some(r=>r.gate==='test-object-cleanup'&&r.absenceHttp!==404)){evidence.state='PARTIAL';evidence.code='TEST_OBJECT_CLEANUP_UNCONFIRMED';process.exitCode=2;}
 // Never publish secrets/capabilities/source URLs in the durable evidence.
 console.log(JSON.stringify({state:evidence.state,code:evidence.code,worker:plan?.name,workerHost:plan?.url?new URL(plan.url).hostname:undefined,verified:evidence.verified??0}));
 await writeFile(new URL('live-results.json',output),JSON.stringify(evidence,(_key,value)=>accountId&&typeof value==='string'?value.replaceAll(accountId,evidence.accountFingerprint):value,2)+'\n');
}
