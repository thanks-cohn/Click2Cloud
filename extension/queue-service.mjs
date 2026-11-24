import {createHistoryStore} from '../src/queue/store.mjs';
import {historyDefaults} from '../src/history/model.mjs';

const key = 'queueHistoryViewV1';
export const queueDefaults = Object.freeze({
  timer:'hide', preset:'full', range:'all', previews:'closed', timezone:historyDefaults.timezone,
  expandScreenshotHostURL:false
});
function normalize(value) {
  const next = {...queueDefaults};
  for (const [field,values] of Object.entries({
    timer:['hide','off','delete'],preset:['full','compact'],range:['all','daily','weekly'],
    previews:['all','first','closed']
  })) if (values.includes(value?.[field])) next[field] = value[field];
  try {
    if (typeof value?.timezone === 'string') {
      new Intl.DateTimeFormat('en',{timeZone:value.timezone});
      next.timezone = value.timezone;
    }
  } catch {}
  next.expandScreenshotHostURL = value?.expandScreenshotHostURL === true;
  return next;
}

export function createQueueService() {
  const store = createHistoryStore();
  let preferences = queueDefaults, sync, accountingPending = false, coverage = [];
  const ready = chrome.storage.local.get(key).then(saved=>{preferences = normalize(saved[key]);}).catch(()=>{});
  async function update(patch) {
    await ready;
    return navigator.locks.request(key,async()=>{
      const saved = await chrome.storage.local.get(key);
      const next = normalize({...normalize(saved[key]),...patch});
      await chrome.storage.local.set({[key]:next});
      preferences = next;
      return next;
    });
  }
  async function scan(source) {
    const checkpoint=await store.sourceCheckpoint(source);
    let cursor=checkpoint?.cursor??null,malformed=checkpoint?.malformed??0;
    do {
      const page = await chrome.runtime.sendMessage({channel:'queue-history-scan',source,cursor});
      if (!page?.ok) throw Error('HISTORY_SOURCE_UNAVAILABLE');
      if (page.records.length) {
        for (let offset = 0; offset < page.records.length; offset += 250) {
          await store.reconcile(page.records.slice(offset,offset+250));
        }
      }
      malformed += page.malformed;
      cursor=page.next;
      await store.sourceCheckpoint(source,cursor?{cursor,malformed}:null);
    } while(cursor);
    return malformed;
  }

  function refresh() {
    if (sync) return sync;
    sync = Promise.allSettled(['current','basic'].map(source=>navigator.locks.request('redown-history-backfill:'+source,()=>scan(source)))).then(results=>{
      coverage=results.map((result,index)=>({
        source:['current','basic'][index], state:result.status==='rejected'?'unavailable':result.value?'partial':'retained-source-scanned',
        ...(result.status==='fulfilled'?{malformed:result.value}:{}),
        historicalGaps:'Previously deleted or truncated source records cannot be recovered.'
      }));
      accountingPending=coverage.some(source=>source.state!=='retained-source-scanned');
      return coverage;
    }).finally(()=>{sync=undefined;});
    return sync;
  }
  void chrome.storage.onChanged?.addListener((changes,area)=>{
    if (area==='local'&&changes[key]) preferences = normalize(changes[key].newValue);
  });
  chrome.runtime.onMessage.addListener((message,sender)=>{
    if (sender?.id!==chrome.runtime.id) return;
    if (message?.channel==='queue-history-accounting-pending') accountingPending = true;
  });
  return {store,ready,update,refresh,get preferences(){return preferences;},
    get accountingPending(){return accountingPending;},get coverage(){return coverage;}};
}
