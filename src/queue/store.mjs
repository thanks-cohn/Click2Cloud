export const HISTORY_DATABASE = 'redown-history-v2';
export const HISTORY_CLEANUP_ALARM = 'redown-history-v2-cleanup';
export const PAGE_SIZE = 25;
export const VISIBILITY_MS = 15 * 60_000;
const stores = ['records', 'jobs', 'excluded', 'state'];
const request = r => new Promise((resolve, reject) => {
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});
function cursors(source, range, direction, visit, keysOnly = false) {
  return new Promise((resolve, reject) => {
    const r = keysOnly ? source.openKeyCursor(range, direction) : source.openCursor(range, direction);
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

export function createHistoryStore({indexedDB = globalThis.indexedDB, locks = globalThis.navigator?.locks,
  database = HISTORY_DATABASE, clock = Date.now} = {}) {
  let opening;
  const lock = work => locks ? locks.request(database + ':archive', work) : work();
  function open() {
    return opening ??= new Promise((resolve, reject) => {
      const r = indexedDB.open(database, 1);
      let blocked = false;
      r.onblocked = () => { blocked = true; reject(Error('HISTORY_STORAGE_BLOCKED')); };
      r.onerror = () => reject(r.error);
      r.onupgradeneeded = () => {
        const db = r.result;
        const records=db.createObjectStore('records', {keyPath:'recordId'});
        records.createIndex('chronology', ['sortAt','recordId']);
        records.createIndex('kind', ['kind','sortAt','recordId']);
        records.createIndex('search','searchKeys',{multiEntry:true});
        db.createObjectStore('jobs', {keyPath:'recordId'}).createIndex('order', ['rank','jobAt','recordId']);
        db.createObjectStore('excluded');
        db.createObjectStore('state');
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
  function selection({from = 0, end = Number.MAX_SAFE_INTEGER, before, query, kind} = {}) {
    const prefix=query?[query]:kind?[kind]:[];
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
  return {
    snapshot: lock,
    async close() { if (opening) (await opening).close(); opening = undefined; },
    sourceCheckpoint: (source,cursor) => cursor===undefined?
      run(['state'],'readonly',s=>request(s.state.get('source:'+source))):
      run(['state'],'readwrite',s=>request(s.state.put(cursor,'source:'+source))),
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
        for (const record of records) {
          if (record.schemaVersion !== 1 || typeof record.recordId !== 'string' || !record.recordId ||
              !Number.isSafeInteger(record.sortAt) || record.sortAt < 0) throw Error('HISTORY_INVALID_RECORD');
          const {recordId, rank, jobAt, removeJob, ...metadata} = record;
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
          if ((latest?.updatedAt ?? 0) > (record.updatedAt ?? 0)) continue;
          if (latest && latest.updatedAt === record.updatedAt && latest.status === record.status &&
              latest.code === record.code && (record.terminal ? !!old || excluded : !!job)) continue;
          if (rank !== undefined && !(old && rank !== 1 && old.status === 'verified')) {
            const acknowledged = job?.acknowledged === true && job.status === record.status && job.code === record.code;
            s.jobs.put({...record, acknowledged, rank:acknowledged ? 3 : rank, jobAt:jobAt ?? record.requestedAt ?? record.sortAt});
          } else s.jobs.delete(recordId);
          if (record.terminal && !excluded) {
            const value={recordId,...metadata,sortAt:old?.sortAt??record.sortAt,terminalAt:old?.terminalAt??record.terminalAt};
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
        let removed=0;
        await cursors(s.records,null,'next',cursor=>{
          s.excluded.put(1,cursor.primaryKey);
          removed++;
        },true);
        await request(s.records.clear());
        return removed;
      }));
    },
    count: () => run(['records'], 'readonly', s => request(s.records.count())),
    page({page = 1, from, end, query, kind} = {}) {
      if (!capValid(page)) throw Error('HISTORY_INVALID_PAGE');
      return run(['records'], 'readonly', async s => {
        const index=s.records.index(query?'search':kind?'kind':'chronology');
        const range=selection({from,end,query,kind}),items=[];
        const total=range?await request(!query&&!kind&&from===undefined&&end===undefined?s.records.count():index.count(range)):0;
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
        const counts = await Promise.all([0,1,2].map(rank =>
          request(index.count(IDBKeyRange.bound([rank],[rank+1],false,true)))));
        const items = [];
        let skip = offset;
        await cursors(index, IDBKeyRange.upperBound([3],true), 'next', cursor => {
          if (skip) { const count = skip; skip = 0; return count; }
          items.push(cursor.value);
          return items.length < limit;
        });
        return {items,working:counts[0],attention:counts[1],waiting:counts[2],
          total:counts.reduce((sum,count)=>sum+count,0)};
      });
    },
    acknowledge: recordId => lock(() => run(['jobs'], 'readwrite', async s => {
      const job = await request(s.jobs.get(recordId));
      if (job?.rank === 1) await request(s.jobs.put({...job, acknowledged:true,rank:3}));
    }))
  };
}
