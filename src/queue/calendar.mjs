import {dayKey, historyDefaults} from '../history/model.mjs';

const dayMs = 86400000;
const isoDay = number => new Date(number).toISOString().slice(0,10);
const dayNumber = day => Date.parse(day+'T00:00:00Z');
const monday = day => {
  const date = dayNumber(day);
  return date - ((new Date(date).getUTCDay()+6)%7)*dayMs;
};

export function historyCalendar(at, timezone, now = Date.now()) {
  if (!at) return [['unknown','Date not captured']];
  const day = dayKey(at,timezone), today = dayKey(now,timezone);
  const start = monday(today), week = Math.round((start-monday(day))/(7*dayMs));
  if (day === today) return [['today','Today']];
  if (week >= 0 && week <= 3) {
    return [['recent-'+week,['Earlier This Week','Last Week','Two Weeks Ago','Three Weeks Ago'][week]],[day,day]];
  }
  const [year,month,date] = day.split('-');
  const weekOfMonth = Math.floor((Number(date)-1 + (new Date(dayNumber(year+'-'+month+'-01')).getUTCDay()+6)%7)/7)+1;
  const monthLabel = new Intl.DateTimeFormat(undefined,{month:'long',timeZone:'UTC'}).format(new Date(dayNumber(day)));
  return [[year,year],[year+'-'+month,monthLabel],[year+'-'+month+'-'+weekOfMonth,'Week '+weekOfMonth],[day,day]];
}

function firstInstant(day, timezone) {
  const nominal = dayNumber(day);
  if (!Number.isFinite(nominal) || isoDay(nominal) !== day) throw Error('HISTORY_DATE_RANGE_INVALID');
  let left = nominal - 2*dayMs, right = nominal + 2*dayMs;
  while (left < right) {
    const middle = Math.floor((left+right)/2);
    if (dayKey(middle,timezone) < day) left = middle + 1; else right = middle;
  }
  return left;
}

export function historyInterval({range = 'all', start, end, timezone = historyDefaults.timezone,
  now = Date.now()} = {}) {
  if (range === 'all') return {};
  if (range === 'custom') {
    const from = firstInstant(start,timezone), until = firstInstant(end,timezone);
    if (from > until) throw Error('HISTORY_DATE_RANGE_INVALID');
    return {from,end:firstInstant(isoDay(dayNumber(end)+dayMs),timezone)};
  }
  const today = dayKey(now,timezone), day = dayNumber(today);
  let first = day, next = day + dayMs;
  if (range === 'weekly') { first = monday(today); next = first + 7*dayMs; }
  if (range === 'monthly') {
    first = dayNumber(today.slice(0,7)+'-01');
    const date = new Date(first); date.setUTCMonth(date.getUTCMonth()+1); next = +date;
  }
  if (range === 'yearly') {
    first = dayNumber(today.slice(0,4)+'-01-01');
    const date = new Date(first); date.setUTCFullYear(date.getUTCFullYear()+1); next = +date;
  }
  return {from:firstInstant(isoDay(first),timezone),end:firstInstant(isoDay(next),timezone)};
}
