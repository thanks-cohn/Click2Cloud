import {isoWeek} from '../persistence/external-recovery.mjs';
import {stableId} from '../core/menu-identity.mjs';
/** One bounded page per tick. Durable external checkpoints precede advancement. No auth UI calls. */
export function createWholeCloudJobs({recovery,fileApi,isAuthorized,clock=Date.now}={}) {
  const busy=new Set();
  const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
  const name=identity=>'whole-cloud-'+stableId('job',JSON.stringify(identity)).split(':').pop();
  const read=async identity=>(await recovery.readNamespace(name(identity))).value;
  const save=(job)=>recovery.writeNamespace(name(job.identity),job,{cadence:job.cadence});
  function validate(identity){if(!identity||Object.keys(identity).some(k=>!['provider','connectionId','accountId'].includes(k))||['provider','connectionId','accountId'].some(k=>typeof identity[k]!=='string'||!identity[k]))throw Error('INVALID_CLOUD_IDENTITY');}
  async function list(){try{return (await recovery.readNamespace('whole-cloud-subscriptions')).value.identities;}catch(e){if(e.message==='NO_VALID_RECOVERY_POINT')return [];throw e;}}
  async function enable(identity,{cadence='weekly'}={}) {
    validate(identity);if(!['weekly','daily'].includes(cadence))throw Error('INVALID_CADENCE');
    let prior;try{prior=await read(identity);}catch(e){if(e.message!=='NO_VALID_RECOVERY_POINT')throw e;}
    if(prior?.enabled)return prior;
    const job={schemaVersion:1,identity,enabled:true,cadence,state:'DUE',revision:(prior?.revision??0)+1,startedAt:clock(),nextDue:clock(),bucketCursor:'',bucketIndex:0,buckets:[],objectCursor:'',page:0,complete:false};
    await save(job);const identities=await list();if(!identities.some(i=>JSON.stringify(i)===JSON.stringify(identity)))identities.push(identity);await recovery.writeNamespace('whole-cloud-subscriptions',{identities});return job;
  }
  async function tick(identity,{signal}={}) {
    validate(identity);const key=name(identity);if(busy.has(key))return {state:'BUSY'};busy.add(key);
    try {
      const job=await read(identity);if(!job.enabled)return {state:'STOPPED'};
      if(await isAuthorized(identity)!==true){job.state='PAUSED_AUTH';await save(job);return job;}
      if(job.nextDue>clock())return job;
      if(job.complete){job.complete=false;job.buckets=[];job.bucketIndex=0;job.objectCursor='';job.bucketCursor='';job.startedAt=clock();job.page=0;job.verifyPage=0;job.pageChain='';}
      signal?.throwIfAborted();
      if(!job.bucketsLoaded){
        const r=await fileApi.run('buckets',{accountId:identity.accountId,cursor:job.bucketCursor},{signal});
        if(r.state!=='completed') {job.state='PARTIAL';await save(job);return job;}
        if(r.data.cursor&&r.data.cursor===job.bucketCursor){job.state='PARTIAL';await save(job);return job;}
        job.buckets.push(...r.data.buckets.map(b=>b.name));job.bucketCursor=r.data.cursor??'';
        job.bucketsLoaded=true;
        job.state='RUNNING';await save(job);return job;
      }
      if(job.bucketIndex<job.buckets.length){
        const bucketName=job.buckets[job.bucketIndex];const r=await fileApi.run('listRaw',{source:{accountId:identity.accountId,bucketName,prefix:''},cursor:job.objectCursor},{signal});
        if(r.state!=='completed'){job.state='PARTIAL';await save(job);return job;}
        if(r.data.cursor&&r.data.cursor===job.objectCursor){job.state='PARTIAL';await save(job);return job;}
        const entries=r.data.entries.map(e=>({key:e.key,size:e.size??null}));
        await recovery.writeNamespace(key+'-page-'+job.revision+'-'+job.page,{schemaVersion:1,identity,bucketName,entries,observedAt:clock(),complete:false});
        job.page++;job.objectCursor=r.data.cursor??'';if(!job.objectCursor)job.bucketIndex++;
        job.state='RUNNING';await save(job);return job;
      }
      if(job.bucketCursor){job.buckets=[];job.bucketIndex=0;job.bucketsLoaded=false;await save(job);return job;}
      // Independently read every durable chunk before final coverage; one per tick keeps work bounded.
      job.verifyPage??=0;job.pageChain??='';
      if(job.verifyPage<job.page){
        const chunk=await recovery.readNamespace(key+'-page-'+job.revision+'-'+job.verifyPage);
        if(JSON.stringify(chunk.value.identity)!==JSON.stringify(identity))throw Error('OUTLINE_IDENTITY_MISMATCH');
        job.pageChain=await digest(job.pageChain+JSON.stringify(chunk.value));job.verifyPage++;job.state='VERIFYING';await save(job);return job;
      }
      job.complete=true;job.state='WAITING_REFRESH';job.completedAt=clock();job.nextDue=clock()+(job.cadence==='daily'?86400000:604800000);job.bucketsLoaded=false;
      const start=isoWeek(job.startedAt),end=isoWeek(clock());start.week=String(start.week).padStart(2,'0');end.week=String(end.week).padStart(2,'0');
      const range=start.year===end.year?`week${start.week}${start.week===end.week?'':'-'+end.week}-${end.year}`:`week${start.week}-${start.year}-to-week${end.week}-${end.year}`;
      job.exportName=`backup-${identity.provider}-${range}-${key}-r${job.revision}.json`;
      job.exportReceipt=await recovery.exportVerified(job.exportName,{schemaVersion:1,kind:'whole-cloud-outline',identity,revision:job.revision,startedAt:job.startedAt,completedAt:clock(),complete:true,consistency:'observed-over-time-not-atomic',pageCount:job.page,pageNamespace:key+'-page-'+job.revision,pageFilePattern:'<pageNamespace>-<zero-based-index>/CURRENT.json',pageChain:job.pageChain,verification:'SHA256 chain of canonical decoded page values in index order; each CURRENT envelope has its own SHA256'});job.revision++;await save(job);return job;
    }catch(e){if(signal?.aborted)return {state:'CANCELLED'};throw e;}finally{busy.delete(key);}
  }
  return Object.freeze({list,enable,inspect:read,tick,async disable(identity){const job=await read(identity);job.enabled=false;job.state='STOPPED';await save(job);return job;},async onSameAccountLogin(identity){const job=await read(identity);return job.enabled&&job.state==='PAUSED_AUTH'?tick(identity):job;}});
}
