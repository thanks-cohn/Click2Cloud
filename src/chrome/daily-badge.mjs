import {dayKey} from '../history/model.mjs';
import {verifiedSaveTime} from '../history/verified-save.mjs';

const localTotalsKey = 'verifiedLocalDownloadTotals';
const rolloverAlarm = 'click2cloud-daily-badge';
const normal = '#253b70', green = '#087a35';
const displayLimit = 1000;
const pulseMs = 180, handoffMs = 100, queueLimit = 3;
const iconPaths = suffix => Object.fromEntries([16, 32, 48, 128].map(size => [size, `extension/icons/redown${suffix}-${size}.png`]));
const idleIcon = iconPaths(''), successIcon = iconPaths('-success');

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

export function createDailyBadge({chrome, readHistory, countHistory, countBasic, readPreferences, transmissionEnabled = () => true, clock = Date.now, wait = waitForPulse}) {
  let tail = Promise.resolve();
  let refreshing, requested = false, day, flash, idleReady = false, basicRevision = 0;
  const successes = [];
  const readLocal = async () => (await chrome.storage?.local?.get(localTotalsKey))?.[localTotalsKey] ?? {};
  const color = value => Promise.resolve().then(() => chrome.action.setBadgeBackgroundColor({color:value}));
  const icon = path => Promise.resolve().then(() => chrome.action.setIcon?.({path}));
  async function restore() {
    const results = await Promise.allSettled([icon(idleIcon), color(normal)]);
    return results.every(result => result.status === 'fulfilled');
  }
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
    if (!projection || !row.operationId || !inDay(verifiedSaveTime(row), projection)) return true;
    if (projection.ids.has(row.operationId)) return false;
    // The durable host receipts retain the exact count. Bound the worker's cache.
    if (projection.ids.size < displayLimit) projection.ids.add(row.operationId);
    return true;
  }
  async function countToday(now,timezone) {
    if(day?.timezone===timezone&&inDay(now,day))return day;
    const projection={timezone,start:midnightEdge(now,timezone,false),end:nextLocalMidnight(now,timezone),ids:new Set()};
    day=projection;
    // Concurrent committed writes can join this same set while a cold scan is running.
    if(countHistory)await countHistory(row=>{remember(row,projection);return false;});
    return projection;
  }
  function queueSuccess(at) {
    if (transmissionEnabled() && successes.length + Number(!!flash) < queueLimit) successes.push(at);
  }
  function cancelTransmission() {
    successes.length = 0;
    flash?.controller.abort();
  }
  function recordVerified(row,{transmission=true}={}) {
    const at=verifiedSaveTime(row);
    if(!row.operationId||!Number.isFinite(at))return;
    if (remember(row,day) && transmission) queueSuccess(at);
    return refresh();
  }
  function recordBasicVerified(at) {
    if (!Number.isFinite(at)) return;
    basicRevision++;
    queueSuccess(at);
    return refresh();
  }
  async function basicTotal(projection) {
    if (!countBasic) return {count:0, complete:true};
    const revision = basicRevision;
    if (projection.basicRevision === revision) return projection.basic;
    const result = await countBasic({start:projection.start, end:projection.end});
    if (result.complete) {
      projection.basic = result;
      projection.basicRevision = revision;
    }
    return result;
  }
  async function playFlash(controller) {
    const {signal}=controller;
    idleReady = false;
    try{
      const steps = [
        [() => icon(successIcon), pulseMs], [() => icon(idleIcon), handoffMs],
        [() => color(green), pulseMs], [() => color(normal), handoffMs],
        [() => icon(successIcon), pulseMs], [() => icon(idleIcon), 0],
      ];
      for (const [apply, duration] of steps) {
        if (signal.aborted) return;
        await apply();
        if (duration && !signal.aborted) await wait(duration, signal);
      }
      idleReady = true;
    }catch{/* Always attempt to restore the idle color. */}
    finally{
      if (!idleReady) idleReady = await restore();
      flash=undefined;
      if (successes.length) void refresh();
    }
  }
  async function paint() {
    if (!flash && !idleReady) idleReady = await restore();
    const now = clock();
    let when = now + 60000, text = '!';
    try {
      const {timezone} = await readPreferences();
      const local = await readLocal(), projection=await countToday(now,timezone);
      const downloads=Object.entries(local.minutes??{}).reduce((total,[minute,files])=>
        inDay(minute*60000,projection)&&Number.isSafeInteger(files)?total+files:total,0);
      const verified=countHistory?projection.ids.size:countVerifiedSaves(await readHistory(),now,timezone);
      const basic = await basicTotal(projection).catch(() => ({count:projection.basic?.count ?? 0, complete:false}));
      const count=verified+downloads+basic.count;
      text=count>=displayLimit?'1k+':basic.complete?String(count):count>0?`${count}+`:'!';
      when=basic.complete?projection.end:Math.min(projection.end, when);
    } catch {
      day=undefined; // A timed retry will reconcile temporarily unavailable History.
    }
    const [badge]=await Promise.allSettled([
      Promise.resolve().then(() => chrome.action.setBadgeText({text})),
      Promise.resolve().then(() => chrome.alarms.create(rolloverAlarm, {when}))
    ]);
    if(text==='!'||text==='0'||badge.status==='rejected'||!transmissionEnabled()) {
      cancelTransmission();
    } else if (day) {
      if (flash && !inDay(flash.at, day)) flash.controller.abort();
      if (!flash && idleReady) {
        while (successes.length) {
          const at = successes.shift();
          if (!inDay(at, day)) continue;
          flash = {at, controller:new AbortController()};
          void playFlash(flash.controller);
          break;
        }
      }
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
  return Object.freeze({refresh,recordLocal,recordVerified,recordBasicVerified,cancelTransmission});
}
