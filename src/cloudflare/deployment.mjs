import {diagnoseCloudflare} from '../auth/cloudflare-oauth.mjs';
import {PROTOCOL,remoteDestination,fail,digest} from './wire.mjs';
export const WORKER_MODULES=['src/cloudflare/worker.mjs','src/cloudflare/wire.mjs','src/cloudflare/resources.mjs','src/cloudflare/writer-registry.mjs','src/cloudflare/public-egress.mjs','src/cloudflare/public-address.mjs',...['cloudflare-worker','cloudflare-r2-writer','source-fetch','verification','common','public-address'].map(n=>'right2cloud-module/src/'+n+'.mjs')];
export function createProvisioner({request,readModule,load,store}){
 async function json(path,options={}){const r=await request(path,options);let body;try{body=await r.json();}catch{fail('CLOUDFLARE_RESPONSE_INVALID');}if(!r.ok||body.success!==true)fail([401,403,429].includes(r.status)||r.status>=500?diagnoseCloudflare(r,body,{context:'worker'}).code:'CLOUDFLARE_SETUP_FAILED');return body.result;}
 return Object.freeze({async prepare(target,{prefixScope,approved=false,rebuild=false}={}){
  if(!approved)fail('SETUP_APPROVAL_REQUIRED');const d=remoteDestination(target),key=await digest([d.accountId,d.bucketName]);
  let plan=await load(key);if(plan&&(plan.accountId!==d.accountId||plan.bucketName!==d.bucketName||(plan.protocol!==PROTOCOL&&!(rebuild&&plan.protocol==='click2cloud-remote-1'))||!/^click2cloud-r2-[a-f0-9]{20}$/.test(plan.name??'')||!/^[a-f0-9]{64}$/.test(plan.secret??'')))fail('TRANSPORT_PLAN_INVALID');prefixScope??=plan?.prefixScope??'';const sources=await Promise.all(WORKER_MODULES.map(async path=>[path,await readModule(path)])),codeDigest=await digest(sources);if(plan?.state==='ready'&&!rebuild){if(plan.codeDigest!==codeDigest)fail('WORKER_UPGRADE_APPROVAL_REQUIRED');return plan;}
  let recoveredMissing=false;
  if(plan?.state==='pending'||plan&&rebuild){
   const base='/accounts/'+encodeURIComponent(d.accountId)+'/workers';
   const response=await request(base+'/scripts/'+plan.name+'/settings');
   if(response.ok){const b=await response.json(),bindings=b.result?.bindings??[];
    if(!bindings.some(x=>x.name==='STORAGE'&&x.bucket_name===d.bucketName)||!bindings.some(x=>x.name==='ACCOUNT_ID'&&x.text===d.accountId))fail('PROVISION_RECONCILE_REQUIRED');
    if(!bindings.some(x=>x.name==='PREFIX_SCOPE'&&x.text===(plan.prefixScope??'')))fail('PROVISION_RECONCILE_REQUIRED');
    if(plan.state==='pending'&&plan.codeDigest===codeDigest&&bindings.some(x=>x.name==='CODE_DIGEST'&&x.text===codeDigest)){await json(base+'/scripts/'+plan.name+'/subdomain',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({enabled:true})});const sub=await json(base+'/subdomain');if(!/^[a-z0-9-]+$/.test(sub?.subdomain??''))fail('WORKER_ADDRESS_UNAVAILABLE');plan={...plan,state:'ready',url:'https://'+plan.name+'.'+sub.subdomain+'.workers.dev'};await store(key,plan);return plan;}
    if(plan.state==='pending'&&!rebuild)fail('WORKER_UPGRADE_APPROVAL_REQUIRED');
   }else if(response.status===404)recoveredMissing=true;else fail('PROVISION_RECONCILE_REQUIRED');
  }
  if(plan&&!['ready','pending'].includes(plan.state))fail('PROVISION_RECONCILE_REQUIRED');
  const updating=!!plan&&!recoveredMissing;
  const name=plan?.name??'click2cloud-r2-'+crypto.randomUUID().replace(/-/g,'').slice(0,20),secret=plan?.secret??Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
  plan={name,secret,codeDigest,state:'pending',accountId:d.accountId,bucketName:d.bucketName,prefixScope,protocol:PROTOCOL};await store(key,plan);
  const base='/accounts/'+encodeURIComponent(d.accountId)+'/workers';
  const form=new FormData();
  form.append('metadata',new Blob([JSON.stringify({main_module:'src/cloudflare/worker.mjs',compatibility_date:'2026-01-01',compatibility_flags:['nodejs_compat'],observability:{enabled:false},
   bindings:[{name:'STORAGE',type:'r2_bucket',bucket_name:d.bucketName},{name:'CLAIMS',type:'durable_object_namespace',class_name:'RemoteClaims'},
    {name:'CODE_DIGEST',type:'plain_text',text:codeDigest},{name:'ACCOUNT_ID',type:'plain_text',text:d.accountId},{name:'BUCKET_NAME',type:'plain_text',text:d.bucketName},{name:'PREFIX_SCOPE',type:'plain_text',text:prefixScope},
    {name:'SIGNING_KEY',type:'secret_text',text:secret}],...(!updating?{migrations:{new_tag:'v1',new_sqlite_classes:['RemoteClaims']}}:{})})],{type:'application/json'}));
  for(const [path,source] of sources)form.append(path,new Blob([source],{type:'application/javascript+module'}),path);
  await json(base+'/scripts/'+name,{method:'PUT',body:form});
  await json(base+'/scripts/'+name+'/subdomain',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({enabled:true})});
  const sub=await json(base+'/subdomain');if(!/^[a-z0-9-]+$/.test(sub?.subdomain??''))fail('WORKER_ADDRESS_UNAVAILABLE');
  plan={...plan,state:'ready',url:'https://'+name+'.'+sub.subdomain+'.workers.dev'};await store(key,plan);return plan;
 },async markVerified(target,sessionId){const d=remoteDestination(target),key=await digest([d.accountId,d.bucketName]),plan=await load(key);if(plan?.state!=='ready')fail('WORKER_SETUP_REQUIRED');await store(key,{...plan,verifiedAt:Date.now(),verifiedTargets:{...plan.verifiedTargets,[d.prefix]:{at:Date.now(),sessionId,codeDigest:plan.codeDigest}}});},async lookup(target){const d=remoteDestination(target);return load(await digest([d.accountId,d.bucketName]));}});
}
