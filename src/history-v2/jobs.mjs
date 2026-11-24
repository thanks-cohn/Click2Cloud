import {database,read,cursorRows} from './idb.mjs';

const group={working:0,attention:1,waiting:2};
const toJob=(record,accounting)=>{
  const finish=['verified','uploaded'].includes(record.status);
  const category=finish&&accounting?'done':record.status in group?record.status:'attention';
  return category==='done'?{recordId:record.recordId,observedAt:record.observedAt,category}:
    {...record,savedFileMetadata:undefined,category,rank:group[category],sortAt:-record.orderAt,
      accountingPending:finish&&!accounting};
};

export function createLiveJobs({indexedDB,name='click2cloud-live-jobs-v1'}={}) {
  const transact=database(name,db=>{
    const jobs=db.createObjectStore('jobs',{keyPath:'recordId'});
    jobs.createIndex('display',['rank','sortAt','recordId']);
  },indexedDB);
  async function reconcile(records,accounted) {
    return transact(['jobs'],'readwrite',async jobs=>{
      for(const record of records) {
        if(record.outputId) {
          const preparationId=JSON.stringify([record.sourceApi,record.attemptId,null]);
          const preparation=await read(jobs.get(preparationId));
          if(preparation&&preparation.category!=='done'&&preparation.observedAt<=record.observedAt)jobs.put({recordId:preparationId,observedAt:record.observedAt,category:'done'});
        }
        const old=await read(jobs.get(record.recordId));
        if(old&&(old.observedAt>record.observedAt||old.observedAt===record.observedAt&&old.category==='done'))continue;
        const next=toJob(record,accounted);
        if(old?.acknowledged&&old.observedAt===record.observedAt&&old.status===record.status&&!next.accountingPending)continue;
        jobs.put(next);
      }
    });
  }
  function page({offset=0,category=null}={}) {
    if(!Number.isSafeInteger(offset)||offset<0||category!==null&&!Object.hasOwn(group,category))throw Error('QUEUE_INVALID_PAGE');
    const range=category===null?null:IDBKeyRange.bound([group[category]],[group[category]+1],false,true);
    return transact(['jobs'],'readonly',async jobs=>{
      const index=jobs.index('display');
      const counts=Object.fromEntries(await Promise.all(Object.entries(group).map(async ([key,rank])=>[key,await read(index.count(IDBKeyRange.bound([rank],[rank+1],false,true)))])));
      const items=await cursorRows(index,range,'next',offset,10);
      return {counts,items,total:category===null?Object.values(counts).reduce((a,b)=>a+b,0):counts[category]};
    });
  }
  function acknowledge(id,observedAt) {
    return transact(['jobs'],'readwrite',async jobs=>{
      const record=await read(jobs.get(id));
      if(record?.category!=='attention'||record.accountingPending||record.observedAt!==observedAt)throw Error('QUEUE_JOB_CHANGED');
      jobs.put({recordId:id,category:'attention',observedAt,status:record.status,acknowledged:true});
    });
  }
  return {page,reconcile,acknowledge};
}
