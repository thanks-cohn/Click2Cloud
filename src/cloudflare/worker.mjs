import {createWorker} from '../../right2cloud-module/src/cloudflare-worker.mjs';
import {equal,destination,validateIntent,keyFor} from '../../right2cloud-module/src/common.mjs';
import {verifyGrant,PROTOCOL,digest,boundedJSON,fail} from './wire.mjs';
import {destinationWriter} from './writer-registry.mjs';
import {publicFetch} from './public-egress.mjs';
import {JOB_MEMORY_BUDGET,JOB_CAPACITY} from './resources.mjs';
const safeCode=e=>/^[A-Z_]+$/.test(e?.code??'')?e.code:'REQUEST_REJECTED';
export class RemoteClaims {
 constructor(state,env,ports={}){this.state=state;this.env=env;this.ports=ports;this.running=new Set();this.progress=new Map();this.admitted=0;}
 key(cap,id){return 'claim:'+cap.principal+':'+id;}
 async update(key,fn){return this.state.storage.transaction(async tx=>{const prior=await tx.get(key);const next=fn(prior);await tx.put(key,next);return next;});}
 async authenticate(request,intent){
  const e=this.env,p=await verifyGrant(e.SIGNING_KEY,request.headers.get('authorization')?.replace(/^Bearer /,'')),d=destination(p.destination);
  if(p.principal!==d.connectionId||d.accountId!==e.ACCOUNT_ID||d.bucketName!==e.BUCKET_NAME||d.connectionId!=='cloudflare:'+e.ACCOUNT_ID||((e.PREFIX_SCOPE??'')&&d.prefix!==e.PREFIX_SCOPE&&!d.prefix.startsWith(e.PREFIX_SCOPE+'/')))fail('BINDING_MISMATCH');
  if(await this.state.storage.get('revoked:'+p.principal+':'+p.sessionId))fail('AUTHORIZATION_REVOKED');
  if(intent&&(p.use!=='save'||p.operationId!==intent.operationId||!equal(d,intent.destination)||p.sourceDigest!==await digest(intent.source)))fail('CAPABILITY_DENIED');
  return {...p,destination:d,storage:e.STORAGE};
 }
 async live(cap,key){const job=await this.state.storage.get(key);return job?.leaseUntil>Date.now()&&!await this.state.storage.get('revoked:'+cap.principal+':'+cap.sessionId);}
 async operation(cap,id){
  const key=this.key(cap,id),job=await this.state.storage.get(key);
  if(!job||!equal(job.destination,cap.destination))return {state:'uncertain',code:'OPERATION_UNKNOWN',operationId:id};
  const receipt=job.result?.receipt??(!this.running.has(key)&&job.stage==='writing'&&job.key&&Number.isSafeInteger(job.expectedSize)?{key:job.key,size:job.expectedSize,operationId:id,destination:cap.destination}:null);
  if(receipt){
   const proof=await destinationWriter(cap).verify({receipt});
   if(proof&&proof.operationId===id&&proof.size===receipt.size&&(!receipt.etag||proof.etag===receipt.etag)&&(!receipt.version||proof.version===receipt.version))return {state:'verified',code:'R2_HEAD_VERSION_SIZE',operationId:id,receipt:{...proof,destination:cap.destination},proofKind:'independent-head-version-size'};
   if(job.result?.state==='written')return {state:'uncertain',code:'VERIFICATION_MISMATCH',operationId:id};
  }
  if(job.result)return {...job.result,operationId:id};
  return {state:this.running.has(key)?'pending':'uncertain',code:this.running.has(key)?'REMOTE_IN_PROGRESS':'OPERATION_INTERRUPTED',operationId:id,stage:job.stage,bytes:this.progress.get(key)??job.bytes??0,stagingParts:job.parts??0};
 }
 async probeProof(cap,operationId){
  const d={...cap.destination,prefix:[cap.destination.prefix,'.click2cloud-readiness',operationId].filter(Boolean).join('/')},key=keyFor(d,'readiness.txt'),bytes=new TextEncoder().encode('Click2Cloud readback '+operationId),object=await this.env.STORAGE.get(key);
  if(!object||object.customMetadata?.operationId!==operationId||object.size!==bytes.length)return {state:'uncertain',code:'READINESS_UNVERIFIED',operationId};
  const readback=new Uint8Array(await object.arrayBuffer());if(readback.length!==bytes.length||!readback.every((b,i)=>b===bytes[i]))return {state:'uncertain',code:'READINESS_UNVERIFIED',operationId};
  return {state:'verified',code:'R2_READBACK_BYTES',operationId,destination:d,receipt:{destination:d,key,size:bytes.length,etag:object.etag,version:object.version,operationId},proofKind:'independent-get-byte-comparison'};
 }
 async fetch(request){
  let possibleWrite=false,operationId,admissionHeld=false;
  try{
   const path=new URL(request.url).pathname;if(request.method!=='POST')fail('ROUTE_DENIED');
   if(path==='/remote-save'){
    const intent=await boundedJSON(request,16384);validateIntent(intent);operationId=intent.operationId;
    const cap=await this.authenticate(request,intent),key=this.key(cap,operationId);
    if(this.admitted>=JOB_CAPACITY)return Response.json({state:'blocked',code:'RESOURCE_BUSY',operationId});
    this.admitted++;admissionHeld=true;
    const claimed=await this.state.storage.transaction(async tx=>{if(await tx.get(key))return false;await tx.put(key,{destination:cap.destination,sessionId:cap.sessionId,sourceDigest:cap.sourceDigest,leaseUntil:cap.expiresAt,stage:'accepted',at:Date.now()});return true;});
    if(!claimed){this.admitted--;admissionHeld=false;return Response.json({state:'uncertain',code:'OPERATION_ALREADY_CLAIMED',operationId});}
    admissionHeld=false;
    this.running.add(key);
    const work=async()=>{
     let lastProgress=0;
     try{
      const stage=async value=>this.update(key,j=>({...j,...value,...(value.stage==='writing'?{expectedSize:value.bytes}:{})}));
      const result=await createWorker({
       authenticate:async()=>cap,claimOperation:async()=>true,recheckAuthorization:()=>this.live(cap,key),fetch:this.ports.fetch??publicFetch,
       recordPrepared:async(_cap,prepared)=>stage({stage:'prepared',key:prepared.key}),
       onProgress:bytes=>{this.progress.set(key,bytes);},
       writer:()=>destinationWriter(cap,{recordStage:stage,recordPart:(i,value)=>this.state.storage.put(key+':part:'+i,value),readPart:i=>this.state.storage.get(key+':part:'+i),...(this.ports.FixedLengthStream?{FixedLengthStream:this.ports.FixedLengthStream}:{})})
      }).fetch(new Request('https://internal/remote-save',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(intent)}),this.env);
      const value=await boundedJSON(result);await this.update(key,j=>({...j,result:value,stage:value.state==='written'?'written':j.stage,finishedAt:Date.now()}));
     }catch{try{await this.update(key,j=>({...j,result:{state:'uncertain',code:'RESULT_PERSISTENCE_UNCONFIRMED',operationId},finishedAt:Date.now()}));}catch{/* Prepared key/size permits read-only recovery even when final receipt storage failed. */}}
     finally{this.running.delete(key);this.progress.delete(key);this.admitted--;}
    };
    const task=work();this.state.waitUntil(task);
    return Response.json({state:'pending',code:'REMOTE_ACCEPTED',operationId},{status:202});
   }
   const cap=await this.authenticate(request);
   if(path==='/capabilities'&&cap.use==='status'){
    const list=await this.env.STORAGE.list({prefix:cap.destination.prefix?cap.destination.prefix+'/':'',limit:1});
    return Response.json({state:'completed',protocol:PROTOCOL,codeDigest:this.env.CODE_DIGEST,destination:cap.destination,storageBound:!!list,durableClaims:true,conditionalCreate:true,sourcePolicy:'public-https-pinned-tls',transfer:'stream-or-bounded-spool-conditional-put',multipartConditionalCompletion:'NOT_VERIFIED',resourceAdmission:{...JOB_MEMORY_BUDGET,active: this.admitted,capacity:JOB_CAPACITY}});
   }
   if(path==='/lease'&&cap.use==='save'){
    const key=this.key(cap,cap.operationId),job=await this.state.storage.get(key);
    if(!job||job.sessionId!==cap.sessionId||job.sourceDigest!==cap.sourceDigest||!equal(job.destination,cap.destination)||job.leaseUntil<=Date.now())fail('LEASE_DENIED');
    await this.update(key,j=>({...j,leaseUntil:cap.expiresAt}));return Response.json({state:'completed',operationId:cap.operationId});
   }
   if(path==='/cancel'&&cap.use==='cancel'){const key=this.key(cap,cap.operationId),job=await this.state.storage.get(key);if(!job||!equal(job.destination,cap.destination))fail('OPERATION_UNKNOWN');await this.update(key,j=>({...j,leaseUntil:0,cancelRequested:true}));return Response.json({state:'uncertain',code:'CANCELLATION_REQUESTED_INSPECT',operationId:cap.operationId});}
   if(path==='/operation'&&cap.use==='status'){
    const {operationId:id}=await boundedJSON(request,1024);if(!/^[a-zA-Z0-9_-]{16,128}$/.test(id??''))fail('OPERATION_INVALID');return Response.json(await this.operation(cap,id));
   }
   if(path==='/revoke'&&cap.use==='revoke'){await this.state.storage.put('revoked:'+cap.principal+':'+cap.sessionId,true);return Response.json({state:'completed'});}
   if(path==='/probe-status'&&cap.use==='status'){const query=await boundedJSON(request,1024);if(!/^[a-zA-Z0-9_-]{16,128}$/.test(query.operationId??''))fail('OPERATION_INVALID');return Response.json(await this.probeProof(cap,query.operationId));}
   if(path==='/probe'&&cap.use==='probe'){
    operationId=cap.operationId;if(!/^[a-zA-Z0-9_-]{16,128}$/.test(operationId??''))fail('OPERATION_INVALID');
    const claimed=await this.state.storage.transaction(async tx=>{const k='probe:'+cap.principal+':'+operationId;if(await tx.get(k))return false;await tx.put(k,true);return true;});
    if(!claimed)return Response.json(await this.probeProof(cap,operationId));
    const d={...cap.destination,prefix:[cap.destination.prefix,'.click2cloud-readiness',operationId].filter(Boolean).join('/')},bytes=new TextEncoder().encode('Click2Cloud readback '+operationId),writer=destinationWriter(cap),prepared={key:keyFor(d,'readiness.txt'),destination:d};
    possibleWrite=true;const result=await writer.write({prepared,body:bytes,length:bytes.length,contentType:'text/plain',operationId});
    if(result.conflict)return Response.json(await this.probeProof(cap,operationId));return Response.json(await this.probeProof(cap,operationId));
   }
   if(path==='/verify'&&cap.use==='save'){
    const receipt=await boundedJSON(request,8192);
    if(receipt.operationId!==cap.operationId||!equal(receipt.destination,cap.destination)||typeof receipt.key!=='string'||!receipt.key.startsWith(cap.destination.prefix?cap.destination.prefix+'/':'')||receipt.key.slice(cap.destination.prefix?cap.destination.prefix.length+1:0).includes('/'))fail('RECEIPT_SCOPE_MISMATCH');
    const proof=await destinationWriter(cap).verify({receipt});return Response.json({state:'completed',proof:proof?{...proof,destination:cap.destination}:null});
   }
   fail('ROUTE_DENIED');
  }catch(e){if(admissionHeld)this.admitted--;return Response.json({state:possibleWrite?'uncertain':'blocked',code:possibleWrite?'WRITE_UNCONFIRMED':safeCode(e),operationId},{status:possibleWrite?200:403});}
 }
}
export default {async fetch(request,env){
 try{await verifyGrant(env.SIGNING_KEY,request.headers.get('authorization')?.replace(/^Bearer /,''));}catch{return Response.json({state:'blocked',code:'CAPABILITY_DENIED'},{status:403});}
 try{return await env.CLAIMS.get(env.CLAIMS.idFromName('remote-claims-v1')).fetch(request);}catch{return Response.json({state:new URL(request.url).pathname==='/remote-save'?'uncertain':'blocked',code:'SERVICE_UNAVAILABLE'},{status:503});}
}};
