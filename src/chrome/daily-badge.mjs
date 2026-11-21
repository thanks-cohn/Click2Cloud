import {dayKey} from '../history/model.mjs';
import {verifiedSaveTime} from '../history/verified-save.mjs';

const localTotalsKey = 'verifiedLocalDownloadTotals';
const rolloverAlarm = 'click2cloud-daily-badge';
const normal = '#253b70', green = '#087a35';
const displayLimit = 1000;

function midnightEdge(now, timezone, forward) {
  const today = dayKey(now, timezone), horizon = 27 * 3600000;
  let low = forward ? now : now - horizon, high = forward ? now + horizon : now;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2), sameDay = dayKey(middle, timezone) === today;
    if (sameDay === forward) low = middle;
    else high = middle;
  }
  return high;
}
export const nextLocalMidnight = (now, timezone) => midnightEdge(now, timezone, true);

function inDay(at,{start,end}) {
  return Number.isFinite(at) && at >= start && at < end;
}

export function countVerifiedSaves(rows, now, timezone) {
  const day = {start:midnightEdge(now,timezone,false),end:nextLocalMidnight(now,timezone)};
  return new Set(rows.filter(row => row.operationId && inDay(verifiedSaveTime(row),day)).map(row => row.operationId)).size;
}

function waitForPulse(ms,signal) {
  return new Promise(resolve => {
    function finish(){
      clearTimeout(timer);
      signal.removeEventListener('abort',finish);
      resolve();
    }
    const timer=setTimeout(finish,ms);
    signal.addEventListener('abort',finish,{once:true});
  });
}

export function createDailyBadge({chrome, readHistory, countHistory, readPreferences, clock = Date.now, wait = waitForPulse}) {
  let tail = Promise.resolve();
  let refreshing, requested = false, day, flash, flashTime;
  const readLocal = async () => (await chrome.storage?.local?.get(localTotalsKey))?.[localTotalsKey] ?? {};
  const color = value => Promise.resolve().then(() => chrome.action.setBadgeBackgroundColor({color:value}));
  function refresh() {
    requested = true;
    if (refreshing) return refreshing;
    const update = tail.then(async () => {
      do {
        requested = false;
        await paint();
      } while (requested);
    });
    refreshing = update.finally(() => { refreshing = null; });
    tail = refreshing.catch(() => {});
    return refreshing;
  }
  function remember(row, projection) {
    // Badge text saturates at 1k+, so the in-memory deduplication set can also stop there.
    if(projection?.ids.size<displayLimit&&row.operationId&&inDay(verifiedSaveTime(row),projection))
      projection.ids.add(row.operationId);
  }
  async function countToday(now,timezone) {
    if(day?.timezone===timezone&&inDay(now,day))return day;
    const projection={timezone,start:midnightEdge(now,timezone,false),end:nextLocalMidnight(now,timezone),ids:new Set()};
    day=projection;
    // Concurrent committed writes can join this same set while a cold scan is running.
    if(countHistory)await countHistory(row=>{remember(row,projection);return false;});
    return projection;
  }
  function recordVerified(row) {
    const at=verifiedSaveTime(row);
    if(!row.operationId||!Number.isFinite(at))return;
    remember(row,day);
    if(!flash)flashTime=at;
    return refresh();
  }
  async function playFlash(controller) {
    const {signal}=controller;
    try{
      for(const [value,duration] of [[green,100],[normal,85],[green,100]]){
        if(signal.aborted)break;
        await color(value);
        if(!signal.aborted)await wait(duration,signal);
      }
    }catch{/* Always attempt to restore the idle color. */}
    finally{
      await color(normal).catch(()=>{});
      flash=undefined;
    }
  }
  async function paint() {
    const successAt=flashTime;
    flashTime=undefined;
    if(!flash)await color(normal).catch(()=>{});
    const now = clock();
    let when = now + 60000, text = '!';
    try {
      const {timezone} = await readPreferences();
      const local = await readLocal(), projection=await countToday(now,timezone);
      const downloads=Object.entries(local.minutes??{}).reduce((total,[minute,files])=>
        inDay(minute*60000,projection)&&Number.isSafeInteger(files)?total+files:total,0);
      const verified=countHistory?projection.ids.size:countVerifiedSaves(await readHistory(),now,timezone);
      const count=verified+downloads;
      text=count>=displayLimit?'1k+':String(count);
      when=projection.end;
    } catch {
      day=undefined; // A timed retry will reconcile temporarily unavailable History.
    }
    const [badge]=await Promise.allSettled([
      Promise.resolve().then(() => chrome.action.setBadgeText({text})),
      Promise.resolve().then(() => chrome.alarms.create(rolloverAlarm, {when}))
    ]);
    if(text==='!'||text==='0'||badge.status==='rejected')flash?.abort();
    else if(!flash&&day&&inDay(successAt,day)){
      flash=new AbortController();
      void playFlash(flash);
    }
  }
  function recordLocal(jobId, files) {
    if (!/^[a-f0-9-]{36}$/.test(jobId??'') || !Number.isSafeInteger(files) || files<1 || files>20000) return Promise.reject(Error('DOWNLOAD_COMPLETION_INVALID'));
    const mutation = tail.then(async () => {
      const now = clock(), minute=Math.floor(now/60000), stored = await readLocal();
      const jobs = Array.isArray(stored.jobs) ? stored.jobs.filter(entry => Array.isArray(entry)&&entry[1]>=now-48*3600000) : [];
      if (jobs.some(([id])=>id===jobId) || jobs.length>=20000) return;
      const minutes=Object.fromEntries(Object.entries(stored.minutes??{}).filter(([at,total])=>Number(at)>=minute-2880&&Number.isSafeInteger(total)));
      minutes[minute]=(minutes[minute]??0)+files;
      await chrome.storage.local.set({[localTotalsKey]:{minutes,jobs:[...jobs,[jobId,now]]}});
    });
    tail=mutation.catch(()=>{});
    return mutation.then(refresh);
  }
  chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === rolloverAlarm) void refresh(); });
  return Object.freeze({refresh,recordLocal,recordVerified});
}
