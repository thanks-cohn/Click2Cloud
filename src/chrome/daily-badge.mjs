import {dayKey} from '../history/model.mjs';

const localTotalsKey = 'verifiedLocalDownloadTotals';
const rolloverAlarm = 'click2cloud-daily-badge';

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

function countRows(rows, start, end) {
  const seen = new Set();
  for (const row of rows) {
    const at = row.updatedAt ?? row.at;
    if ((row.kind && row.kind !== 'save') || row.state !== 'verified' || !row.proofKind ||
        !row.receipt?.key || !row.operationId || !Number.isFinite(at) || at < start || at >= end) continue;
    seen.add(row.operationId);
  }
  return seen.size;
}
export function countVerifiedSaves(rows, now, timezone) {
  return countRows(rows,midnightEdge(now,timezone,false),nextLocalMidnight(now,timezone));
}

export function createDailyBadge({chrome, readHistory, readPreferences, clock = Date.now}) {
  let tail = Promise.resolve();
  const readLocal = async () => (await chrome.storage?.local?.get(localTotalsKey))?.[localTotalsKey] ?? {};
  function refresh() {
    const update = tail.then(async () => {
      const now = clock();
      let when = now + 60000, text = '!';
      try {
        const {timezone} = await readPreferences();
        const rows = await readHistory();
        const local = await readLocal(), start=midnightEdge(now,timezone,false);
        const midnight = nextLocalMidnight(now,timezone);
        const downloads=Object.entries(local.minutes??{}).reduce((total,[minute,files])=>
          minute*60000>=start&&minute*60000<midnight&&Number.isSafeInteger(files)?total+files:total,0);
        const count = countRows(rows,start,midnight)+downloads;
        text = count >= 1000 ? '1k+' : String(count);
        when = midnight;
      } catch { /* A timed retry will reconcile temporarily unavailable History. */ }
      await Promise.allSettled([
        Promise.resolve().then(() => chrome.action.setBadgeText({text})),
        Promise.resolve().then(() => chrome.action.setBadgeBackgroundColor({color: '#253b70'})),
        Promise.resolve().then(() => chrome.alarms.create(rolloverAlarm, {when}))
      ]);
    });
    tail = update.catch(() => {});
    return update;
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
  return Object.freeze({refresh,recordLocal});
}
