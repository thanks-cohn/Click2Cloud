import {dayKey} from '../history/model.mjs';

const localTotalsKey = 'verifiedLocalDownloadTotals';
const rolloverAlarm = 'click2cloud-daily-badge';

export function nextLocalMidnight(now, timezone) {
  const today = dayKey(now, timezone);
  let low = now, high = now + 27 * 3600000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (dayKey(middle, timezone) === today) low = middle;
    else high = middle;
  }
  return high;
}

export function countVerifiedSaves(rows, now, timezone) {
  const today = dayKey(now, timezone);
  const seen = new Set();
  for (const row of rows) {
    const at = row.updatedAt ?? row.at;
    if ((row.kind && row.kind !== 'save') || row.state !== 'verified' || !row.proofKind ||
        !row.receipt?.key || !row.operationId || !Number.isFinite(at) || dayKey(at, timezone) !== today) continue;
    seen.add(row.operationId);
  }
  return seen.size;
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
        const local = await readLocal();
        const count = countVerifiedSaves(rows, now, timezone) + (local.timezone===timezone&&local.day===dayKey(now,timezone)&&Number.isSafeInteger(local.total)?local.total:0);
        text = count >= 1000 ? '1k+' : String(count);
        when = nextLocalMidnight(now, timezone);
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
      const {timezone} = await readPreferences();
      const now = clock(), day = dayKey(now,timezone), stored = await readLocal();
      const jobs = Array.isArray(stored.jobs) ? stored.jobs.filter(entry => Array.isArray(entry)&&entry[1]>=now-48*3600000) : [];
      if (jobs.some(([id])=>id===jobId) || jobs.length>=20000) return;
      const total = stored.day===day&&stored.timezone===timezone&&Number.isSafeInteger(stored.total) ? stored.total : 0;
      await chrome.storage.local.set({[localTotalsKey]:{day,timezone,total:total+files,jobs:[...jobs,[jobId,now]]}});
    });
    tail=mutation.catch(()=>{});
    return mutation.then(refresh);
  }
  chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === rolloverAlarm) void refresh(); });
  return Object.freeze({refresh,recordLocal});
}
