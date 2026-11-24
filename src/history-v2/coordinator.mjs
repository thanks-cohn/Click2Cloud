import {readOwnerAttempt} from './records.mjs';
import {archiveBatch} from './archive.mjs';

export function createHistoryCoordinator({source, archive, jobs, changed, unavailable, locks=globalThis.navigator?.locks}) {
  let scan, updates, retryTimer, closed=false,synced=false;
  const dirty=new Set();
  async function accept(evidence) {
    const records=evidence.flatMap(row=>{try{return readOwnerAttempt(row);}catch{unavailable('source');return [];}});
    let accounted=true;
    const terminal=records.filter(record=>!['working','waiting'].includes(record.status));
    try {
      for(let first=0;first<terminal.length;first+=archiveBatch)await archive.upsert(terminal.slice(first,first+archiveBatch));
    } catch {
      accounted=false;synced=false;
      unavailable('history');
      scheduleRecovery();
    }
    try {
      for(let first=0;first<records.length;first+=archiveBatch) await jobs.reconcile(records.slice(first,first+archiveBatch),accounted);
    } catch { accounted=false;synced=false;unavailable('jobs');scheduleRecovery(); }
    if(records.length)changed();
    return accounted;
  }
  function scheduleRecovery() {
    if(closed||retryTimer)return;
    retryTimer=setTimeout(()=>{retryTimer=null;void reconcile();},15000);
  }
  function reconcile() {
    if(scan||closed)return scan;
    const run=async ()=>{
      if(closed)return;
      await archive.maintain().catch(()=>unavailable('history'));
      let cursor=await archive.sourceCheckpoint().catch(()=>null)??null;
      let durableProgress=true;
      do {
        const page=await source.readQueueReceiptPage(cursor);
        if(closed)return;
        const accepted=await accept(page.items);
        durableProgress=durableProgress&&accepted;
        cursor=page.cursor;
        if(durableProgress)await archive.saveSourceCheckpoint(cursor).catch(()=>unavailable('history'));
        await new Promise(resolve=>setTimeout(resolve,0));
      }while(cursor&&!closed);
      synced=durableProgress&&!closed;
      changed();
      return synced;
    };
    scan=(locks?locks.request('click2cloud-history-source-reconcile',run):run())
      .catch(()=>{unavailable('source');scheduleRecovery();}).finally(()=>{scan=null;});
    return scan;
  }
  function notify(id) {
    if(closed||typeof id!=='string')return;
    if(dirty.size>=1024) {dirty.clear();scheduleRecovery();}
    dirty.add(id);
    if(updates)return;
    updates=(async ()=>{
      while(dirty.size&&!closed) {
        const ids=[...dirty].slice(0,64);
        ids.forEach(value=>dirty.delete(value));
        await accept(await source.readRemoteResultsById(ids));
      }
    })().catch(()=>{unavailable('source');scheduleRecovery();}).finally(()=>{updates=null;});
  }
  function close(){closed=true;clearTimeout(retryTimer);dirty.clear();}
  return {reconcile,notify,close,isSynced:()=>synced};
}
