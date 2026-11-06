import {stableId,scopeKey,normalizeTarget,ancestors} from '../core/menu-identity.mjs';
/** Independent metadata-only per-bucket recovery crawl. One actual Universal File
 * API page per call; no display-depth coupling, auth UI, object writes, or timer ACK. */
export function createRecoveryCrawl({fileApi,recovery,isAuthorized,clock=Date.now}={}) {
  const busy=new Set();
  const namespace=t=>'depth-index-'+stableId('scope',scopeKey(t)).split(':').pop();
  async function inspect(target){return (await recovery.readNamespace(namespace(normalizeTarget(target)))).value;}
  async function tick({target,enabled,depth},{cadence='weekly'}={}) {
    const t=normalizeTarget({...target,prefix:''}),name=namespace(t);
    if(!enabled)return {state:'STOPPED'};
    if(!Number.isSafeInteger(depth)||depth<1)throw Error('INVALID_DEPTH');
    if(busy.has(name))return {state:'BUSY'};busy.add(name);
    try {
      let job;try{job=await inspect(t);}catch(e){if(e.message!=='NO_VALID_RECOVERY_POINT')throw e;}
      if(!job||job.depth!==depth)job={schemaVersion:1,target:t,depth,cursor:'',folders:[],complete:false,state:'DUE',nextDue:0};
      if(await isAuthorized(t)!==true){job.state='PAUSED_AUTH';await recovery.writeNamespace(name,job,{cadence});return job;}
      if(job.nextDue>clock())return job;
      if(job.complete){job.complete=false;job.cursor='';job.folders=[];}
      const result=await fileApi.run('listRaw',{source:t,cursor:job.cursor});
      if(result.state!=='completed'){job.state='PARTIAL';job.code='PROVIDER_READ_FAILED';await recovery.writeNamespace(name,job,{cadence});return job;}
      const next=result.data.cursor??'';
      if(typeof next!=='string'||next&&next===job.cursor)throw Error('CURSOR_REPEATED');
      const folders=new Set(job.folders);
      for(const e of result.data.entries){const path=e.key.slice(0,e.key.lastIndexOf('/')+1);for(const p of ancestors(path))if(p.split('/').filter(Boolean).length<=depth)folders.add(p);}
      job.folders=[...folders].sort();job.cursor=next;job.complete=!next;job.state=next?'RUNNING':'WAITING_REFRESH';job.observedAt=clock();
      if(job.complete){const nextDate=new Date(clock());nextDate.setUTCHours(0,0,0,0);nextDate.setUTCDate(nextDate.getUTCDate()+(cadence==='daily'?1:((8-nextDate.getUTCDay())%7||7)));job.nextDue=nextDate.getTime();}
      const receipt=await recovery.writeNamespace(name,job,{cadence});return {...job,receipt};
    }finally{busy.delete(name);}
  }
  return Object.freeze({inspect,tick});
}
