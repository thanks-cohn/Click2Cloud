// Authorized EXISTING isolated Worker / disposable prefix only. No production deployment.
import {readFile,mkdir,writeFile} from 'node:fs/promises';import {createHmac,createHash,randomBytes} from 'node:crypto';
import {createProvisioner} from '../src/cloudflare/deployment.mjs';import {createRemoteTransport} from '../src/cloudflare/transport.mjs';import {digest,PROTOCOL,remoteDestination} from '../src/cloudflare/wire.mjs';
import {createFileTransport,fileOperationTarget} from '../src/cloudflare/file-transport.mjs';import {createClick2CloudFileApi} from '../src/explorer/index.mjs';
const dir=new URL('../docs/evidence/redown-restoration/',import.meta.url);await mkdir(dir,{recursive:true});
const prior=JSON.parse(await readFile(new URL('../docs/evidence/cloudflare-m01/live-results.json',import.meta.url))),accountId=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
const target={provider:'cloudflare',connectionId:'cloudflare:'+accountId,accountId,bucketName:'redown',prefix:'__click2cloud_true_remote_test__/'},plans=new Map(),results=[];
const evidence={evidenceClass:'LIVE_CLOUDFLARE_ENVIRONMENT_API_TOKEN_NOT_INSTALLED_CHROME_OR_OWNER_OAUTH',branchBaseline:'9dfe415',bucket:'redown',prefix:target.prefix,results};
const request=(path,o={})=>fetch('https://api.cloudflare.com/client/v4'+path,{...o,headers:{...o.headers,authorization:'Bearer '+token},signal:AbortSignal.timeout(60000)});
const sha=x=>createHash('sha256').update(x).digest('hex'),hmac=(k,s)=>createHmac('sha256',k).update(s).digest();
async function s3(method,key){
 const endpoint=new URL(process.env.S3_API_ENDPOINT),access=process.env.CLOUDFLARE_ACCESS_KEY_ID,secret=process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
 if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.pathname!=='/'||!endpoint.hostname.endsWith('.r2.cloudflarestorage.com')||!access||!secret)throw Object.assign(Error(),{code:'INDEPENDENT_S3_CONFIG_UNAVAILABLE'});
 const u=new URL('/redown/'+key.split('/').map(encodeURIComponent).join('/'),endpoint),date=new Date().toISOString().replace(/[:-]|\.\d{3}/g,''),day=date.slice(0,8),scope=day+'/auto/s3/aws4_request',payload=sha('');
 const canonical=method+'\n'+u.pathname+'\n\nhost:'+u.host+'\nx-amz-content-sha256:'+payload+'\nx-amz-date:'+date+'\n\nhost;x-amz-content-sha256;x-amz-date\n'+payload;
 const sig=createHmac('sha256',hmac(hmac(hmac(hmac('AWS4'+secret,day),'auto'),'s3'),'aws4_request')).update('AWS4-HMAC-SHA256\n'+date+'\n'+scope+'\n'+sha(canonical)).digest('hex');
 return fetch(u,{method,headers:{'accept-encoding':'identity','x-amz-date':date,'x-amz-content-sha256':payload,authorization:'AWS4-HMAC-SHA256 Credential='+access+'/'+scope+', SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature='+sig},signal:AbortSignal.timeout(30000)});
}
let transport,plan;const cleanup=[];
try{
 if(!process.argv.includes('--approved-existing-test-worker'))throw Object.assign(Error(),{code:'EXPLICIT_TEST_APPROVAL_FLAG_REQUIRED'});
 if(!accountId||!token||prior.accountFingerprint!==await digest(accountId)||!/^click2cloud-r2-[a-f0-9]{20}$/.test(prior.worker??''))throw Object.assign(Error(),{code:'TEST_OWNERSHIP_UNCONFIRMED'});
 const settings=await request('/accounts/'+accountId+'/workers/scripts/'+prior.worker+'/settings'),body=await settings.json(),bindings=body.result?.bindings??[];
 if(!settings.ok||!bindings.some(x=>x.name==='STORAGE'&&x.bucket_name==='redown')||!bindings.some(x=>x.name==='ACCOUNT_ID'&&x.text===accountId)||!bindings.some(x=>x.name==='PREFIX_SCOPE'&&x.text===target.prefix.slice(0,-1)))throw Object.assign(Error(),{code:'TEST_BINDINGS_UNCONFIRMED'});
 results.push({gate:'existing-isolated-ownership',state:'PASS',httpStatus:settings.status});
 plan={state:'ready',protocol:PROTOCOL,accountId,bucketName:'redown',name:prior.worker,url:'https://'+prior.workerHost,secret:randomBytes(32).toString('hex'),prefixScope:target.prefix.slice(0,-1)};
 try{const saved=JSON.parse(await readFile('/tmp/c2c-save-repair-test-plan.json','utf8'));if(saved.name===prior.worker&&saved.accountId===accountId&&saved.prefixScope===plan.prefixScope)plan=saved;}catch{}
 plans.set(await digest([accountId,'redown']),plan);
 const provisioner=createProvisioner({request,readModule:p=>readFile(new URL('../'+p,import.meta.url),'utf8'),load:k=>plans.get(k),store:async(k,v)=>{plans.set(k,v);await writeFile('/tmp/c2c-save-repair-test-plan.json',JSON.stringify(v),{mode:0o600});}});
 plan=await provisioner.prepare(target,{approved:true,rebuild:!process.argv.includes('--reuse-test-worker'),prefixScope:target.prefix.slice(0,-1)});evidence.workerCodeDigest=plan.codeDigest;
 results.push({gate:process.argv.includes('--reuse-test-worker')?'reuse-existing-test-worker':'update-existing-test-worker',state:'PASS'});
 const oauth={authority:async()=>({sessionId:'restoration-live-only',accounts:[{id:accountId}]})};transport=createRemoteTransport({oauth,lookup:provisioner.lookup,pollIntervalMs:250,expectedCodeDigest:plan.codeDigest});
 let status;for(let n=0;n<30;n++){status=await transport.status(target);if(!['CAPABILITY_DENIED','WORKER_BUILD_MISMATCH'].includes(status.code))break;await new Promise(r=>setTimeout(r,2000));}
 results.push({gate:'matching-deployed-digest-and-capability',state:['READY','PREPARED'].includes(status.state)?'PASS':'BLOCKED',code:status.code});if(!['READY','PREPARED'].includes(status.state))throw Object.assign(Error(),{code:status.code});
 const fileApi=createClick2CloudFileApi({send:createFileTransport({remote:transport}),http:{request,boundedFetch:fetch}});
 const scenarios=[
  {label:'text',url:'https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore',filename:'native-text.txt'},
  {label:'image',url:'https://raw.githubusercontent.com/github/explore/main/topics/javascript/javascript.png',filename:'native-image.png'},
  {label:'redirect',url:'https://github.com/github/gitignore/raw/refs/heads/main/Node.gitignore',filename:'native-redirect.txt',expected:'https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore'},
  {label:'unknown-length',url:'https://httpbin.org/stream-bytes/1048576?seed=42&chunk_size=4096',filename:'native-unknown.bin',unknown:true},
  {label:'invalid-certificate',url:'https://expired.badssl.com/',filename:'must-not-write.txt',blocked:true},
  {label:'private-literal',url:'https://127.0.0.1/private',filename:'must-not-write.txt',blocked:true}
 ];
 for(const scenario of scenarios){
  const operationId=crypto.randomUUID(),filename='restoration-'+operationId+'-'+scenario.filename,save=await transport.save({target,operationId,source:{url:scenario.url,filename}});
  const check=await transport.inspectOperation(target,operationId);const row={gate:scenario.label,operationId,saveState:save.state,code:save.code,diagnostic:save.diagnostic,inspection:{state:check.state,code:check.code},state:'FAIL'};
  if(scenario.blocked){row.state=save.state==='blocked'?'PASS':'FAIL';row.evidence='Negative outcome; certificate attribution only if diagnostic/provider code establishes it';results.push(row);continue;}
  if(save.state!=='verified'){results.push(row);continue;}
  const receipt=save.receipt,key=receipt.key;if(!key.startsWith(target.prefix)||key!==target.prefix+filename)throw Object.assign(Error(),{code:'TEST_OBJECT_SCOPE_MISMATCH'});
  cleanup.push({key,receipt});const independent=await s3('GET',key),bytes=new Uint8Array(await independent.arrayBuffer()),expected=new Uint8Array(await (await fetch(scenario.expected??scenario.url)).arrayBuffer());
  const stat=await fileApi.run('stat',{source:target,key}),listed=await fileApi.run('list',{source:target});
  row.receipt={key,size:receipt.size,etag:receipt.etag,version:receipt.version,transfer:receipt.transfer,stagingCleanup:receipt.stagingCleanup};row.independent={httpStatus:independent.status,size:bytes.length,sha256:sha(bytes),sourceMatches:sha(bytes)===sha(expected)};row.explorer={stat:stat.state,listed:listed.state,exactKey:listed.data?.entries?.some(e=>e.key===key)===true,etag:stat.data?.object?.etag};row.provenance={stored:independent.headers.has('x-amz-meta-sourceurl'),credentialsExported:false};
  row.state=independent.ok&&bytes.length===receipt.size&&row.independent.sourceMatches&&row.explorer.exactKey&&(!scenario.unknown||receipt.transfer==='bounded-spool')?'PASS':'FAIL';results.push(row);
 }
 // File-operation proof uses only a new uniquely named source, copied from the
 // already verified disposable text object; all keys stay within this run's prefix.
 const text=cleanup.find(x=>x.key.endsWith('native-text.txt'));
 if(text){const folder='file-actions-'+crypto.randomUUID(),destination={...target,prefix:target.prefix+folder+'/'};
  async function action(type,input){const r=await fileApi.run(type,{source:target,...input},{operationId:crypto.randomUUID()});if(r.state!=='completed')throw Object.assign(Error(),{code:r.code??'FILE_ACTION_UNCONFIRMED'});return r;}
  const created=await action('mkdir',{name:folder});const marker=destination.prefix+'.redown';cleanup.push({key:marker,marker:true,operationId:created.data.operationId});
  const copy=await action('copy',{destination,entries:[{key:text.key,folder:false}],conflict:'keep'}),copied=copy.data.receipt.key;cleanup.push({key:copied,receipt:copy.data.receipt});
  const get=await s3('GET',copied),copiedBytes=new Uint8Array(await get.arrayBuffer()),original=await s3('GET',text.key),originalBytes=new Uint8Array(await original.arrayBuffer());
  const renamed='renamed.txt',rename=await fileApi.run('rename',{source:destination,entry:{key:copied,folder:false},newName:renamed},{operationId:crypto.randomUUID()});if(rename.state!=='completed')throw Object.assign(Error(),{code:rename.code??'RENAME_UNCONFIRMED'});cleanup.push({key:rename.data.receipt.key,receipt:rename.data.receipt});
  const old=await s3('HEAD',copied),newGet=await s3('GET',rename.data.receipt.key),newBytes=new Uint8Array(await newGet.arrayBuffer());
  results.push({gate:'live-File-API-folder-copy-rename-independent-readback',state:get.ok&&newGet.ok&&old.status===404&&sha(copiedBytes)===sha(originalBytes)&&sha(newBytes)===sha(originalBytes)?'PASS':'FAIL',copiedKey:copied,renamedKey:rename.data.receipt.key,size:newBytes.length,sha256:sha(newBytes),oldKeyAbsence:old.status});
  const deleted=await fileApi.run('delete',{source:target,entries:[{key:destination.prefix,folder:true}]},{operationId:crypto.randomUUID()}),absent=await s3('HEAD',rename.data.receipt.key);results.push({gate:'live-File-API-folder-delete',state:deleted.state==='completed'&&absent.status===404?'PASS':'FAIL',absenceStatus:absent.status});
 }
 evidence.state=results.every(r=>r.state==='PASS')?'PASS':'PARTIAL';if(evidence.state!=='PASS')process.exitCode=2;
}catch(e){evidence.state='BLOCKED';evidence.code=/^[A-Z][A-Z0-9_]{0,63}$/.test(e?.code??'')?e.code:'LIVE_TEST_UNAVAILABLE';process.exitCode=2;}
finally{
 for(const item of cleanup){try{const current=await s3('HEAD',item.key);if(current.status===404){results.push({gate:'cleanup',key:item.key,state:'PASS',absenceStatus:404});continue;}if(!item.key.startsWith(target.prefix)||!current.ok)throw Error();if(item.receipt){const etag=current.headers.get('etag')?.replaceAll('"','');if(etag!==item.receipt.etag||Number(current.headers.get('content-length'))!==item.receipt.size||current.headers.get('x-amz-meta-operationid')!==item.receipt.operationId)throw Error();}else if(!item.marker||current.headers.get('x-amz-meta-operationid')!==item.operationId)throw Error();const removed=await s3('DELETE',item.key),absent=await s3('HEAD',item.key);results.push({gate:'cleanup',key:item.key,state:removed.ok&&absent.status===404?'PASS':'FAIL',absenceStatus:absent.status});}catch{results.push({gate:'cleanup',key:item.key,state:'BLOCKED_IDENTITY_UNCONFIRMED'});process.exitCode=2;}}
 if(results.some(r=>r.gate==='cleanup'&&r.state!=='PASS'))evidence.state='PARTIAL';
 await writeFile(new URL('live-provider.json',dir),JSON.stringify(evidence,(_k,v)=>accountId&&typeof v==='string'?v.replaceAll(accountId,'[account]'):v,2)+'\n');console.log(JSON.stringify({state:evidence.state,code:evidence.code,results}));
}
