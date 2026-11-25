export const HISTORY_DATABASE = 'redown-history-v2';
export const HISTORY_CLEANUP_ALARM = 'redown-history-v2-cleanup';
export const PAGE_SIZE = 25;
export const VISIBILITY_MS = 15 * 60_000;
const stores = ['records', 'jobs', 'excluded', 'state'];
const request = r => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});
function cursors(source, range, direction, visit) {
  return new Promise((resolve, reject) => {
    const r = source.openCursor(range, direction);
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const cursor = r.result;
      if (!cursor) return resolve();
      Promise.resolve().then(() => visit(cursor)).then(next => {
        if (next === false) resolve();
        else if (Number.isInteger(next) && next > 0) cursor.advance(next);
        else cursor.continue();
      }).catch(reject);
    };
  });
}
const capValid = value => Number.isSafeInteger(value) && value > 0;
export const QUEUE_CLEANUP_ALARM = 'redown-queue-cleanup';
export const queueRetentionDefaults = Object.freeze({normalMinutes:15,errorMinutes:60,keepErrors:false});
const minute = 60_000;
const expiryClass = job => !(job.queueTerminal??job.terminal) || !Number.isSafeInteger(job.terminalAt) ? undefined :
  ['verified','cancelled'].includes(job.status) ? 'normal' : 'error';
const deadlines = (policy, now) => ({
  normal:policy.normalMinutes===null?null:now-policy.normalMinutes*minute,
  error:policy.keepErrors?null:now-policy.errorMinutes*minute
});
const jobFields = ['recordId','sourceRecordId','sourceApi','attemptId','actionId','deliveryId','provider','kind','destination',
  'status','terminal','requestedAt','terminalAt','updatedAt','filename','code','progress','bytes','recoverable',
  'retryExpiresAt','retryable','cancellable','parentAttemptId','saveMode'];
function projectJob(record,rank,jobAt){
  return {...Object.fromEntries(jobFields.map(field=>[field,record[field]])),rank,jobAt,
    terminal:record.queueTerminal??record.terminal,queueClass:expiryClass(record)};
}
function searchKeys(record){
  const values=[record.filename,record.provider,record.destination?.bucket,record.destination?.key,
    record.destination?.folder,record.destination?.path,
    {google:'google drive',cloudflare:'cloudflare r2',dropbox:'dropbox',onedrive:'onedrive'}[record.provider]];
  const words=new Set();
  for(const value of values){
    if(!value)continue;
    const normalized=value.slice(0,1024).toLowerCase();
    words.add(normalized);
    for(const word of normalized.split(/[^\p{L}\p{N}]+/u).slice(0,48))if(word)words.add(word);
  }
  return [...words].map(word=>[word,record.sortAt,record.recordId]);
}

export const normalizeHistoryQuery = value => value?.normalize('NFC').toLowerCase().trim().replace(/\s+/gu,' ') ?? '';
function matchesHistory(record, terms){
  const {filename,provider,destination,hostname,hostTitle,hostUrl,sourceUrl,originalUrl} = record;
  const fields = [filename,provider,destination?.bucket,destination?.key,destination?.folder,destination?.path,
    [destination?.bucket,destination?.key ?? destination?.folder].filter(Boolean).join(' / '),
    {google:'Google Drive',cloudflare:'Cloudflare R2',dropbox:'Dropbox',onedrive:'OneDrive'}[provider],
    hostname,hostTitle,hostUrl,sourceUrl,originalUrl].filter(value=>typeof value==='string').map(normalizeHistoryQuery);
  return terms.every(term=>fields.some(field=>field.includes(term)));
}

export function createHistoryStore({indexedDB = globalThis.indexedDB, locks = globalThis.navigator?.locks,
  database = HISTORY_DATABASE, clock = Date.now} = {}) {
  let opening;
  const lock = work => locks ? locks.request(database + ':archive', work) : work();
  function open() {
    return opening ??= new Promise((resolve, reject) => {
      const r = indexedDB.open(database, 2);
      let blocked = false;
      r.onblocked = () => { blocked = true; reject(Error('HISTORY_STORAGE_BLOCKED')); };
      r.onerror = () => reject(r.error);
      r.onupgradeneeded = event => {
        const db = r.result;
        if(event.oldVersion===0){
          const records=db.createObjectStore('records',{keyPath:'recordId'});
          records.createIndex('chronology',['sortAt','recordId']);
          records.createIndex('kind',['kind','sortAt','recordId']);
          records.createIndex('search','searchKeys',{multiEntry:true});
          db.createObjectStore('jobs',{keyPath:'recordId'}).createIndex('order',['rank','jobAt','recordId']);
          db.createObjectStore('excluded');
          db.createObjectStore('state');
        }
        const jobs=r.transaction.objectStore('jobs');
        jobs.createIndex('expiry',['queueClass','terminalAt']);
        if(event.oldVersion===1){
          const cursor=jobs.openCursor();
          cursor.onsuccess=()=>{
            const row=cursor.result;
            if(!row)return;
            const job=row.value;
            row.update({...projectJob(job,job.acknowledged?4:job.rank,job.jobAt),acknowledged:job.acknowledged});
            row.continue();
          };
        }
      };
      r.onsuccess = () => {
        if (blocked) r.result.close();
        else {
          r.result.onversionchange = () => { r.result.close(); opening = undefined; };
          resolve(r.result);
        }
      };
    }).catch(error => { opening = undefined; throw error; });
  }
  async function run(names, mode, work) {
    const db = await open();
    const tx = db.transaction(names, mode);
    const done = new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onabort = () => reject(tx.error ?? Error('HISTORY_TRANSACTION_ABORTED'));
    });
    try {
      const result = await work(Object.fromEntries(names.map(name => [name, tx.objectStore(name)])));
      await done;
      return result;
    } catch (error) {
      try { tx.abort(); } catch {}
      await done.catch(() => {});
      throw error;
    }
  }
  function selection({from = 0, end = Number.MAX_SAFE_INTEGER, before, kind} = {}) {
    const prefix=kind?[kind]:[];
    const lower = [...prefix,from], upper = before ? [...prefix,...before] : [...prefix,end];
    if (indexedDB.cmp(lower, upper) >= 0) return false;
    return IDBKeyRange.bound(lower, upper, false, true);
  }
  function exclude(s, cursor) {
    s.excluded.put(1, cursor.primaryKey);
    cursor.delete();
  }
  async function prune(s, range, maximum = Infinity, eligible = () => true) {
    if (maximum <= 0) return 0;
    let removed = 0;
    await cursors(s.records.index('chronology'), range, 'next', cursor => {
      if(!eligible(cursor.value))return;
      exclude(s, cursor);
      return ++removed < maximum;
    });
    return removed;
  }
  async function enforce(s) {
    const policy = await request(s.state.get('policy')) ?? {};
    if (policy.deleteSince != null) {
      const range = selection({from:policy.deleteSince, end:clock()-VISIBILITY_MS+1});
      if (range) await prune(s,range,Infinity,row=>row.terminalAt>=policy.deleteSince);
    }
    if (policy.cap) await prune(s, null, (await request(s.records.count()))-policy.cap);
  }
  const queuePolicy=async s=>({...queueRetentionDefaults,...await request(s.state.get('queue-policy'))});
  async function pruneJobs(s,policy){
    const before=deadlines(policy,clock());
    const watermark=await request(s.state.get('queue-expired'))??{};
    for(const [group,end] of Object.entries(before)){
      if(end===null||end<0)continue;
      await cursors(s.jobs.index('expiry'),IDBKeyRange.bound([group,0],[group,end+1],false,true),'next',cursor=>{
        cursor.delete();
      });
      watermark[group]=Math.max(watermark[group]??-1,end);
    }
    await request(s.state.put(watermark,'queue-expired'));
  }
  function dismiss(s,job){
    if(job?.terminal&&job.rank<4)s.jobs.put({...job,acknowledged:true,rank:4});
  }
  return {
    snapshot: lock,
    async close() { if (opening) (await opening).close(); opening = undefined; },
    sourceCheckpoint: (source,cursor) => cursor===undefined?
      run(['state'],'readonly',s=>request(s.state.get('source:'+source))):
      run(['state'],'readwrite',s=>request(s.state.put(cursor,'source:'+source))),
    get: recordId=>run(['records'],'readonly',s=>request(s.records.get(recordId))),
    rememberRename: (recordId,changes)=>lock(()=>run(['records'],'readwrite',async s=>{
      const record=await request(s.records.get(recordId));

      if(record){
        const value={...record,...changes,renamed:true};
        await request(s.records.put({...value,searchKeys:searchKeys(value)}));
      }
    })),
    queuePolicy: ()=>run(['state'],'readonly',queuePolicy),
    setQueuePolicy: patch=>lock(()=>run(['jobs','state'],'readwrite',async s=>{
      const policy={...await queuePolicy(s),...patch};
      if(policy.normalMinutes!==null&&!capValid(policy.normalMinutes)||!capValid(policy.errorMinutes)||
        typeof policy.keepErrors!=='boolean')throw Error('QUEUE_INVALID_RETENTION');
      await request(s.state.put(policy,'queue-policy'));
      await pruneJobs(s,policy);
      return policy;
    })),
    maintainJobs: ()=>lock(()=>run(['jobs','state'],'readwrite',async s=>pruneJobs(s,await queuePolicy(s)))),
    policy: () => run(['state'], 'readonly', async s => await request(s.state.get('policy')) ?? {}),
    async setPolicy(policy, {confirmed = false} = {}) {
      return lock(() => run(stores, 'readwrite', async s => {
        const previous = await request(s.state.get('policy')) ?? {};
        const {cap=null,deleteSince=null}={...previous,...policy};
        if(cap!==null&&!capValid(cap)||deleteSince!==null&&!capValid(deleteSince))throw Error('HISTORY_INVALID_POLICY');
        if (!confirmed && (cap !== null && (previous.cap == null || cap < previous.cap) ||
          deleteSince !== null && deleteSince !== previous.deleteSince)) throw Error('HISTORY_CONFIRMATION_REQUIRED');
        await request(s.state.put({cap, deleteSince}, 'policy'));
        await enforce(s);
        return {cap, deleteSince};
      }));
    },
    reconcile(records) {
      if (!Array.isArray(records) || records.length > 512) throw Error('HISTORY_INVALID_BATCH');
      return lock(() => run(stores, 'readwrite', async s => {
        const policy=await queuePolicy(s), before=deadlines(policy,clock());
        const watermark=await request(s.state.get('queue-expired'))??{};
        for (const record of records) {
          if (record.schemaVersion !== 1 || typeof record.recordId !== 'string' || !record.recordId ||
              !Number.isSafeInteger(record.sortAt) || record.sortAt < 0) throw Error('HISTORY_INVALID_RECORD');
          const {recordId, rank, jobAt, removeJob, queueTerminal, ...metadata} = record;
          if(removeJob){
            s.jobs.delete(recordId);
            s.state.put(record.updatedAt??0,'retired-job:'+recordId);
            continue;
          }
          if(record.kind==='screenshot'&&!record.deliveryId&&!record.terminal){
            const retired=await request(s.state.get('retired-job:'+recordId));
            if(retired!==undefined)continue;
          }
          const [old, job, excluded] = await Promise.all([request(s.records.get(recordId)),
            request(s.jobs.get(recordId)), request(s.excluded.get(recordId))]);
          const latest = [old, job].filter(Boolean).sort((a,b) => (b.updatedAt ?? 0)-(a.updatedAt ?? 0))[0];
          if((latest?.updatedAt??0)>(record.updatedAt??0)||old?.status==='verified'&&record.status!=='verified')continue;
          if (latest && latest.updatedAt === record.updatedAt && latest.status === record.status &&
              latest.code === record.code && latest.retryable===record.retryable && latest.cancellable===record.cancellable &&
              latest.bytes===record.bytes && job?.saveMode===record.saveMode && (record.terminal ? (!!old || excluded) && (rank===undefined||!!job) : !!job)) continue;
          const group=expiryClass(record);
          const expired=group&&record.terminalAt<=Math.max(before[group]??-1,watermark[group]??-1);
          if (rank!==undefined&&!expired) {
            const acknowledged=job?.acknowledged===true&&job.status===record.status&&job.code===record.code&&
              job.updatedAt===record.updatedAt;
            const entry=projectJob(record,acknowledged?4:rank,jobAt??record.requestedAt??record.sortAt);
            s.jobs.put({...entry,acknowledged});
          }else if(!job?.acknowledged)s.jobs.delete(recordId);
          if (record.terminal && !excluded) {
            const rename=old?.renamed?Object.fromEntries(
              ['renamed','filename','providerObjectId','etag','version','bytes','destination'].map(field=>[field,old[field]])):null;
            const value={recordId,...metadata,...rename,sortAt:old?.sortAt??record.sortAt,terminalAt:old?.terminalAt??record.terminalAt};
            s.records.put({...value,searchKeys:searchKeys(value)});
          }
        }
        await enforce(s);
      }));
    },
    maintain: () => lock(() => run(stores, 'readwrite', enforce)),
    clear: ({confirmed = false} = {}) => {
      if (!confirmed) throw Error('HISTORY_CONFIRMATION_REQUIRED');
      return lock(() => run(['records','excluded'],'readwrite',async s=>{
        let removed=0,range=null;
        while(true){
          const keys=await request(s.records.getAllKeys(range,512));
          for(const key of keys)s.excluded.put(1,key);
          removed+=keys.length;
          if(keys.length<512)break;
          range=IDBKeyRange.lowerBound(keys.at(-1),true);
        }
        await request(s.records.clear());
        return removed;
      }));
    },
    count: () => run(['records'], 'readonly', s => request(s.records.count())),
    page({page = 1, from, end, query, kind, signal} = {}) {
      if (!capValid(page)) throw Error('HISTORY_INVALID_PAGE');
      const normalized=normalizeHistoryQuery(query);
      return run(['records'], 'readonly', async s => {
        signal?.throwIfAborted();
        const index=s.records.index(kind?'kind':'chronology');
        const range=selection({from,end,kind}),items=[];
        if(normalized){
          const terms=normalized.split(' '),last=[],offset=(page-1)*PAGE_SIZE;
          let total=0,rangeEmpty=true;
          // Scan retained metadata in display order. Legacy records need no index
          // rebuild, and only the requested and final pages are kept in memory.
          function visit(record){
            signal?.throwIfAborted();
            rangeEmpty=false;
            if(!matchesHistory(record,terms))return;
            const {searchKeys,...item}=record;
            if(total%PAGE_SIZE===0)last.length=0;
            last.push(item);
            if(total>=offset&&total<offset+PAGE_SIZE)items.push(item);
            total++;
          }
          // Modern Chromium can cross the IndexedDB boundary in small batches.
          // Older browsers use the same scan and ordering through a cursor.
          if(range&&typeof index.getAllRecords==='function'){
            let batchRange=range;
            while(true){
              signal?.throwIfAborted();
              const batch=await request(index.getAllRecords({query:batchRange,count:128,direction:'prev'}));
              for(const entry of batch)visit(entry.value);
              if(batch.length<128)break;
              batchRange=IDBKeyRange.bound(range.lower,batch.at(-1).key,false,true);
            }
          }else if(range)await cursors(index,range,'prev',cursor=>visit(cursor.value));
          const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
          return {items:page>pages?last:items,total,pages,page:Math.min(page,pages),rangeEmpty};
        }
        const total=range?await request(!kind&&from===undefined&&end===undefined?s.records.count():index.count(range)):0;
        const pages=Math.max(1,Math.ceil(total/PAGE_SIZE)),current=Math.min(page,pages);
        const direction=current===pages&&pages>1?'next':'prev';
        let skip=direction==='next'?0:(current-1)*PAGE_SIZE;
        const amount=Math.min(PAGE_SIZE,total-(current-1)*PAGE_SIZE);
        if(range&&total)await cursors(index,range,direction,cursor=>{
          if(skip){const offset=skip;skip=0;return offset;}
          const {searchKeys,...record}=cursor.value;
          items.push(record);
          return items.length<amount;
        });
        if(direction==='next')items.reverse();
        return {items,total,pages,page:current};
      });
    },
    batch({from,end,before,kind,limit = 100} = {}) {
      if(!capValid(limit)||limit>512)throw Error('HISTORY_INVALID_BATCH');
      const range=selection({from,end,before,kind});
      if(!range)return [];
      return run(['records'],'readonly',async s=>{
        const items=[];
        await cursors(s.records.index(kind?'kind':'chronology'),range,'prev',cursor=>{
          const {searchKeys,...record}=cursor.value;
          items.push(record);
          return items.length<limit;
        });
        return items;
      });
    },
    jobs({offset = 0, limit = 10} = {}) {
      return run(['jobs'], 'readonly', async s => {
        const index = s.jobs.index('order');
        const counts = await Promise.all([0,1,2,3].map(rank =>
          request(index.count(IDBKeyRange.bound([rank],[rank+1],false,true)))));
        const items = [];
        let skip = offset;
        await cursors(index, IDBKeyRange.upperBound([4],true), 'next', cursor => {
          if (skip) { const count = skip; skip = 0; return count; }
          items.push(cursor.value);
          return items.length < limit;
        });
        return {items,working:counts[0],attention:counts[1],waiting:counts[2],finished:counts[3],
          total:counts.reduce((sum,count)=>sum+count,0)};
      });
    },
    job: recordId=>run(['jobs'],'readonly',s=>request(s.jobs.get(recordId))),
    activeJobs: (updatedSince=0)=>run(['jobs'],'readonly',async s=>{
      const items=[];
      await cursors(s.jobs.index('order'),IDBKeyRange.upperBound([3],true),'next',cursor=>{
        const job=cursor.value;
        if(job.cancellable&&!job.terminal&&(job.updatedAt??0)>=updatedSince)items.push(job);
      });
      return items;
    }),
    clearJobs: ()=>lock(()=>run(['jobs'],'readwrite',s=>
      cursors(s.jobs,null,'next',cursor=>dismiss(s,cursor.value)))),
    acknowledge: recordId => lock(() => run(['jobs'], 'readwrite', async s => {
      dismiss(s,await request(s.jobs.get(recordId)));
    }))
  };
}
