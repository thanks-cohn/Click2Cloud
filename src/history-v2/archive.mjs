import {database,read,cursorRows} from './idb.mjs';

export const cleanupMs=15*60*1000;
export const suggestedCap=200000;
export const archiveDefaults=Object.freeze({limit:null,cleanup:'hide',deleteFrom:null});
export const archiveBatch=128;
const defaultState={...archiveDefaults,revision:0,clearing:false};
const stores=['records','exclusions','settings'];
const order=record=>[record.orderAt,record.recordId];
const stateOf=async settings=>(await read(settings.get('archive')))??defaultState;
const keyRange=({from,to}={})=>from==null?(to==null?null:IDBKeyRange.upperBound([to],true)):
  to==null?IDBKeyRange.lowerBound([from]):IDBKeyRange.bound([from],[to],false,true);
const validLimit=limit=>limit===null||Number.isSafeInteger(limit)&&limit>0;

export function createHistoryArchive({indexedDB,locks=globalThis.navigator?.locks,name='click2cloud-history-v2',now=Date.now}={}) {
  const transact=database(name,db=>{
    const records=db.createObjectStore('records',{keyPath:'recordId'});
    records.createIndex('chronology',['orderAt','recordId']);
    records.createIndex('ordinary',['ordinaryAt','recordId']);
    db.createObjectStore('exclusions');
    db.createObjectStore('settings');
  },indexedDB);
  let localLock=Promise.resolve();
  function exclusive(fn,signal) {
    if(locks)return locks.request(name,{signal},fn);
    const pending=localLock.then(()=>{signal?.throwIfAborted();return fn();});
    localLock=pending.catch(()=>{});
    return pending;
  }
  async function removeOldest(records, exclusions, range, limit) {
    if(!limit)return 0;
    return new Promise((resolve,reject)=>{
      const request=records.index('chronology').openKeyCursor(range);
      let removed=0;
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const row=request.result;
        if(!row){resolve(removed);return;}
        exclusions.put(1,row.primaryKey);
        records.delete(row.primaryKey);
        if(++removed===limit)resolve(removed);
        else row.continue();
      };
    });
  }
  async function maintain({timer=true}={}) {
    for(;;) {
      const more=await transact(stores,'readwrite',async (records,exclusions,settings)=>{
        const state=await stateOf(settings);
        const count=await read(records.count());
        let removed=0;
        if(state.clearing||state.limit!==null&&count>state.limit) {
          removed+=await removeOldest(records,exclusions,null,Math.min(archiveBatch,state.clearing?count:count-state.limit));
        }
        const cutoff=now()-cleanupMs;
        if(timer&&!state.clearing&&state.cleanup==='delete'&&cutoff>state.deleteFrom&&removed<archiveBatch) {
          removed+=await removeOldest(records,exclusions,keyRange({from:state.deleteFrom,to:cutoff}),archiveBatch-removed);
        }
        if(removed||state.clearing)settings.put({...state,revision:state.revision+1,clearing:state.clearing&&count>removed},'archive');
        return removed===archiveBatch;
      });
      if(!more)return;
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }
  function prepare(record) {
    if(record?.schemaVersion!==1||typeof record.recordId!=='string'||!record.recordId||record.recordId.length>2048||
      !Number.isSafeInteger(record.orderAt)||!Number.isSafeInteger(record.observedAt))throw Error('HISTORY_V2_INVALID_RECORD');
    return record;
  }
  function upsert(records) {
    if(!Array.isArray(records)||records.length>archiveBatch)throw Error('HISTORY_V2_BATCH_INVALID');
    records.forEach(prepare);
    return exclusive(async ()=>{
      // A previous clear must finish before accepting new evidence; source receipts stay independent.
      if((await status()).clearing)await maintain();
      return transact(stores,'readwrite',async (archive,exclusions,settings)=>{
        const state=await stateOf(settings);
        let inserted=0,changed=false;
        for(const record of records) {
          if(await read(exclusions.getKey(record.recordId))!==undefined)continue;
          const previous=await read(archive.get(record.recordId));
          if(previous&&(previous.observedAt>record.observedAt||previous.status==='verified'&&record.status!=='verified'))continue;
          const orderAt=previous?.orderAt??record.orderAt;
          const next={...record, orderAt,terminalAt:previous?.terminalAt??record.terminalAt,
            ordinaryAt:record.kind==='screenshot-save'?undefined:orderAt};
          if(previous&&JSON.stringify(previous)===JSON.stringify(next))continue;
          archive.put(next);
          changed=true;
          if(!previous)inserted++;
        }
        if(inserted&&state.limit!==null) {
          const count=await read(archive.count());
          await removeOldest(archive,exclusions,null,Math.max(0,Math.min(inserted,count-state.limit)));
        }
        if(changed)settings.put({...state,revision:state.revision+1},'archive');
      });
    });
  }
  const status=()=>transact(['records','settings'],'readonly',async (records,settings)=>({...await stateOf(settings),count:await read(records.count())}));
  function setPolicy({cleanup,limit,approved=false,expectedCount}={}) {
    if(cleanup!==undefined&&!['off','hide','delete'].includes(cleanup)||limit!==undefined&&!validLimit(limit))throw Error('HISTORY_V2_INVALID_POLICY');
    return exclusive(async ()=>{
      await transact(stores,'readwrite',async (records,_exclusions,settings)=>{
        const state=await stateOf(settings);
        if(state.clearing)throw Error('HISTORY_V2_CLEAR_IN_PROGRESS');
        const enablingDelete=cleanup==='delete'&&state.cleanup!=='delete';
        if(enablingDelete&&!approved)throw Error('HISTORY_V2_CONFIRM_DELETE');
        if(limit!=null&&(state.limit===null||limit<state.limit)) {
          const count=await read(records.count());
          if(!approved)throw Error('HISTORY_V2_CONFIRM_CAP');
          if(count>limit&&count!==expectedCount)throw Error('HISTORY_V2_COUNT_CHANGED');
        }
        settings.put({...state,limit:limit===undefined?state.limit:limit,cleanup:cleanup??state.cleanup,
          deleteFrom:enablingDelete?now():state.deleteFrom,revision:state.revision+1},'archive');
      });
      await maintain({timer:false});
      return status();
    });
  }
  function clear({approved,expectedCount}={}) {
    if(approved!==true||!Number.isSafeInteger(expectedCount)||expectedCount<0)throw Error('HISTORY_V2_CONFIRM_CLEAR');
    return exclusive(async ()=>{
      await transact(stores,'readwrite',async (records,_exclusions,settings)=>{
        const state=await stateOf(settings);
        if(state.clearing)return;
        if(await read(records.count())!==expectedCount)throw Error('HISTORY_V2_COUNT_CHANGED');
        settings.put({...state,clearing:true,revision:state.revision+1},'archive');
      });
      await maintain();
      return status();
    });
  }
  function page({page=1,size=25,from=null,to=null,queue=false}={}) {
    if(!Number.isSafeInteger(page)||page<1||!Number.isInteger(size)||size<1||size>archiveBatch)throw Error('HISTORY_V2_INVALID_PAGE');
    return transact(['records','settings'],'readonly',async (records,settings)=>{
      const state=await stateOf(settings);
      if(state.clearing)throw Error('HISTORY_V2_CLEAR_IN_PROGRESS');
      if(queue&&state.cleanup!=='off')from=Math.max(from??-1,now()-cleanupMs);
      const index=records.index('chronology');
      if(from!==null&&to!==null&&from>=to)return {page:1,pages:1,count:0,items:[],revision:state.revision};
      const range=keyRange({from,to});
      const count=await read(index.count(range));
      const pages=Math.max(1,Math.ceil(count/size)), current=Math.min(page,pages);
      const skip=(current-1)*size, take=Math.min(size,count-skip), tail=count-skip-take;
      const reverse=tail<skip;
      const items=await cursorRows(index,range,reverse?'next':'prev',reverse?tail:skip,take);
      if(reverse)items.reverse();
      return {page:current,pages,count,items,revision:state.revision};
    });
  }
  function snapshot({from,to,includeScreenshots=true,signal}={},consume) {
    return exclusive(async ()=>{
      const indexName=includeScreenshots?'chronology':'ordinary';
      const empty=from!=null&&to!=null&&from>=to;
      const range=empty?null:keyRange({from,to});
      const {revision,count}=await transact(['records','settings'],'readonly',async (records,settings)=>{
        const state=await stateOf(settings);
        if(state.clearing)throw Error('HISTORY_V2_CLEAR_IN_PROGRESS');
        return {revision:state.revision,count:empty?0:await read(records.index(indexName).count(range))};
      });
      async function* records() {
        let last=null;
        if(empty)return;
        for(;;) {
          signal?.throwIfAborted();
          const bound=last?(from==null?IDBKeyRange.upperBound(last,true):IDBKeyRange.bound([from],last,false,true)):range;
          const batch=await transact(['records'],'readonly',store=>cursorRows(store.index(indexName),bound,'prev',0,archiveBatch));
          if(!batch.length)return;
          yield* batch;
          if(batch.length<archiveBatch)return;
          last=order(batch.at(-1));
        }
      }
      const result=await consume({records:records(),count,revision});
      if((await status()).revision!==revision)throw Error('HISTORY_V2_SNAPSHOT_CHANGED');
      return result;
    },signal);
  }
  const sourceCheckpoint=()=>transact(['settings'],'readonly',settings=>read(settings.get('sourceCheckpoint')));
  const saveSourceCheckpoint=cursor=>transact(['settings'],'readwrite',settings=>read(settings.put(cursor,'sourceCheckpoint')));
  return {upsert,page,status,snapshot,setPolicy,clear,sourceCheckpoint,saveSourceCheckpoint,maintain:()=>exclusive(maintain)};
}
