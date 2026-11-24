import {dayKey,historyDefaults,validateHistoryPreferences} from '../history/model.mjs';
const dayMs=86400000;
const midnight=day=>Date.parse(day+'T00:00:00Z');
const key=at=>new Date(at).toISOString().slice(0,10);
const addDays=(day,count)=>key(midnight(day)+count*dayMs);
const startWeek=day=>addDays(day,-((new Date(midnight(day)).getUTCDay()+6)%7));
const dayValid=day=>/^\d{4}-\d{2}-\d{2}$/.test(day??'')&&Number.isFinite(midnight(day))&&key(midnight(day))===day;

// Search civil-day boundaries from UTC so 23/25-hour days retain their actual duration.
export function civilBoundary(day,timezone) {
  if(!dayValid(day))throw Error('HISTORY_DATE_RANGE_INVALID');
  const middle=midnight(day);
  let low=middle-2*dayMs, high=middle+2*dayMs;
  while(low<high) {
    const candidate=Math.floor((low+high)/2);
    if(dayKey(candidate,timezone)<day)low=candidate+1;
    else high=candidate;
  }
  return low;
}
export function selectHistoryRange({range='all',timezone=historyDefaults.timezone,start,end,now=Date.now()}={}) {
  validateHistoryPreferences({range:'all',previews:'closed',timezone});
  if(range==='all')return {from:null,to:null,timezone,range};
  const today=dayKey(now,timezone);
  if(range==='daily') {start=today;end=today;}
  else if(range==='weekly') {start=startWeek(today);end=addDays(start,6);}
  else if(range==='monthly') {
    start=today.slice(0,7)+'-01';
    const date=new Date(midnight(start));date.setUTCMonth(date.getUTCMonth()+1);end=addDays(key(date.getTime()),-1);
  } else if(range==='yearly') {start=today.slice(0,4)+'-01-01';end=today.slice(0,4)+'-12-31';}
  else if(range!=='custom')throw Error('HISTORY_DATE_RANGE_INVALID');
  if(!dayValid(start)||!dayValid(end)||start>end)throw Error('HISTORY_DATE_RANGE_INVALID');
  return {from:civilBoundary(start,timezone),to:civilBoundary(addDays(end,1),timezone),timezone,range};
}

export function calendarPath(time,timezone,now=Date.now()) {
  if(time==null)return [{id:'unknown',name:'Date unavailable'}];
  const today=dayKey(now,timezone), day=dayKey(time,timezone), monday=startWeek(today);
  const diff=Math.round((midnight(monday)-midnight(startWeek(day)))/(7*dayMs));
  const label=['Earlier This Week','Last Week','Two Weeks Ago','Three Weeks Ago'];
  const dayGroup={id:day,name:day};
  if(day===today)return [{id:day,name:'Today'}];
  if(diff>=0&&diff<label.length&&day<today)return [{id:'week:'+startWeek(day),name:label[diff]},dayGroup];
  const year=day.slice(0,4),month=day.slice(0,7),week=Math.ceil(Number(day.slice(-2))/7);
  const title=new Intl.DateTimeFormat(undefined,{timeZone:'UTC',month:'long'}).format(midnight(day));
  return [{id:year,name:year},{id:month,name:title},{id:`${month}:week-${week}`,name:`Week ${week}`},dayGroup];
}
