import {createWorker} from '../../right2cloud-module/src/cloudflare-worker.mjs';
import {equal,destination} from '../../right2cloud-module/src/common.mjs';
import {verifyGrant,PROTOCOL,digest,boundedJSON,fail} from './wire.mjs';
import {destinationWriter} from './writer-registry.mjs';

// Durable Objects own atomic claims and revocation across processes/restarts.
// One immutable account/bucket binding per deployment. No public asset route.
export class RemoteClaims {
 constructor(state,env){this.state=state;this.env=env;}
 async authenticate(request,intent){
  const e=this.env,p=await verifyGrant(e.SIGNING_KEY,request.headers.get('authorization')?.replace(/^Bearer /,''));
  const d=destination(p.destination);
  if(d.accountId!==e.ACCOUNT_ID||d.bucketName!==e.BUCKET_NAME||d.connectionId!=='cloudflare:'+e.ACCOUNT_ID||((e.PREFIX_SCOPE??'')&&d.prefix!==e.PREFIX_SCOPE&&!d.prefix.startsWith(e.PREFIX_SCOPE+'/')))fail('BINDING_MISMATCH');
  if(await this.state.storage.get('revoked:'+p.principal+':'+p.sessionId))fail('AUTHORIZATION_REVOKED');
  if(intent&&(p.use!=='save'||p.operationId!==intent.operationId||!equal(d,intent.destination)||p.sourceDigest!==await digest(intent.source)))fail('CAPABILITY_DENIED');
  return {...p,destination:d,storage:e.STORAGE,allowedHosts:JSON.parse(e.SOURCE_HOSTS),maxBytes:64*1024*1024,maxBufferBytes:8*1024*1024,timeoutMs:60000};
 }
 async fetch(request){
  try{
   const path=new URL(request.url).pathname;
   if(request.method!=='POST')fail('ROUTE_DENIED');
   if(path==='/remote-save'){const workerTimings={};let sourceStarted;const result=await createWorker({
    authenticate:async(r,_e,i)=>{const started=performance.now();try{return await this.authenticate(r,i);}finally{workerTimings.authenticationMs=Math.round(performance.now()-started);}},
    claimOperation:async(c,id,intent)=>{const started=performance.now();const result=await this.state.storage.transaction(async tx=>{const k='claim:'+c.principal+':'+id;if(await tx.get(k))return false;await tx.put(k,{fingerprint:await digest(intent),at:Date.now()});return true;});workerTimings.claimMs=Math.round(performance.now()-started);sourceStarted=performance.now();return result;},
    recheckAuthorization:async c=>c.expiresAt>Date.now()&&!await this.state.storage.get('revoked:'+c.principal+':'+c.sessionId),
    writer:c=>{const native=destinationWriter(c);return {...native,prepare:async args=>{workerTimings.sourcePreparationMs=Math.round(performance.now()-sourceStarted);const started=performance.now();const prepared=await native.prepare(args);workerTimings.destinationPrepareMs=Math.round(performance.now()-started);return prepared;},write:async args=>{const started=performance.now(),result=await native.write(args);return {...result,workerTimings:{...workerTimings,streamAndWriteMs:Math.round(performance.now()-started)}};}};},
    // Exact administrator-approved hosts only. Worker fetch uses platform egress;
    // public-host ownership/platform SSRF guarantees remain an operator gate.
    fetch:async(url,options)=>{const started=performance.now();const response=await globalThis.fetch(url,{...options,headers:{'accept-encoding':'identity'}});workerTimings.sourceHeadersMs=(workerTimings.sourceHeadersMs??0)+Math.round(performance.now()-started);if(response.redirected)return response;const headers=new Headers(response.headers),mime=(headers.get('content-type')??'application/octet-stream').split(';')[0].trim();headers.set('content-type',mime.length<=127&&/^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(mime)?mime:'application/octet-stream');if(headers.has('content-encoding')&&headers.get('content-encoding')!=='identity'){headers.delete('content-length');headers.delete('content-encoding');}return new Response(response.body,{status:response.status,headers});}
   }).fetch(request,this.env);
    const value=await boundedJSON(result.clone());if(value.state==='written'){const cap=await this.authenticate(request);await this.state.storage.put('result:'+cap.principal+':'+value.receipt.operationId,value.receipt);}
    return result;
   }
   const cap=await this.authenticate(request);
   if(path==='/capabilities'&&cap.use==='status'){
    const exists=await this.env.STORAGE.list({limit:1});
    return Response.json({state:'completed',protocol:PROTOCOL,codeDigest:this.env.CODE_DIGEST,destination:cap.destination,storageBound:!!exists,conditionalCreate:true,durableClaims:true,maxBytes:cap.maxBytes,maxBufferBytes:cap.maxBufferBytes,allowedHosts:cap.allowedHosts});
   }
   if(path==='/operation'&&cap.use==='status'){
    const query=await boundedJSON(request,1024);if(!/^[a-zA-Z0-9_-]{16,128}$/.test(query.operationId??''))fail('OPERATION_INVALID');
    const receipt=await this.state.storage.get('result:'+cap.principal+':'+query.operationId);
    if(!receipt||!equal(receipt.destination,cap.destination))return Response.json({state:'uncertain',code:'OPERATION_RECEIPT_UNAVAILABLE'});
    const proof=await destinationWriter(cap).verify({receipt});const verified=proof&&['key','size','etag','version','operationId'].every(k=>proof[k]===receipt[k]);
    return Response.json({state:verified?'verified':'uncertain',code:verified?'R2_HEAD_VERSION_SIZE':'VERIFICATION_MISMATCH',receipt,proofKind:verified?'independent-head-version-size':null});
   }
   if(path==='/revoke'&&cap.use==='revoke'){await this.state.storage.put('revoked:'+cap.principal+':'+cap.sessionId,true);return Response.json({state:'completed'});}
   if(path==='/verify'&&cap.use==='save'){
    const receipt=await boundedJSON(request,8192);
    if(receipt.operationId!==cap.operationId||!equal(receipt.destination,cap.destination)||typeof receipt.key!=='string'||!receipt.key.startsWith(cap.destination.prefix?cap.destination.prefix+'/':'')||receipt.key.slice(cap.destination.prefix?cap.destination.prefix.length+1:0).includes('/'))fail('RECEIPT_SCOPE_MISMATCH');
    const proof=await destinationWriter(cap).verify({receipt});
    return Response.json({state:'completed',proof:proof?{...proof,destination:cap.destination}:null});
   }
   fail('ROUTE_DENIED');
  }catch(e){return Response.json({state:'blocked',code:/^[A-Z_]+$/.test(e.code??'')?e.code:'REQUEST_REJECTED'},{status:403});}
 }
}
export default {async fetch(request,env){
 try{await verifyGrant(env.SIGNING_KEY,request.headers.get('authorization')?.replace(/^Bearer /,''));}catch{return Response.json({state:'blocked',code:'CAPABILITY_DENIED'},{status:403});}
 try{const object=env.CLAIMS.get(env.CLAIMS.idFromName('remote-claims-v1'));return await object.fetch(request);}catch{return Response.json({state:'blocked',code:'SERVICE_UNAVAILABLE'},{status:503});}
}};
