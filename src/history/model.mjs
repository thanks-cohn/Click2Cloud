// Customer projections of canonical remote-result records. Never infer remote proof,
// public URLs, upload metadata, or page titles from unrelated diagnostics.
export const HISTORY_PAGE_SIZE=25;
export const historyDefaults=Object.freeze({range:'all',previews:'all',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'});
export function safeHistoryURL(raw){
 try{const u=new URL(raw);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)return null;
 for(const k of [...u.searchParams.keys()])if(/token|signature|credential|secret|password|authorization|api[-_]?key|^x-amz-|^x-goog-|^(auth|sig|key|code|access_token)$/i.test(k))u.searchParams.delete(k);
 u.hash='';return u.href.length<=4096?u.href:null;}catch{return null;}
}
export function captureHistoryContext(info={},tab={}){
 const hostPageURL=safeHistoryURL(info.pageUrl??tab.url),sourceURL=safeHistoryURL(info.srcUrl??info.linkUrl??info.pageUrl);
 return {hostPageURL,sourceURL,hostPageTitle:hostPageURL&&typeof tab.title==='string'?tab.title.slice(0,512):null,hostname:hostPageURL?new URL(hostPageURL).hostname:null};
}
export function validateHistoryPreferences(p){
 if(!p||!['all','daily','weekly'].includes(p.range)||!['all','first','closed'].includes(p.previews))throw Error('HISTORY_PREFERENCE_INVALID');
 try{new Intl.DateTimeFormat('en',{timeZone:p.timezone}).format();}catch{throw Error('HISTORY_TIMEZONE_INVALID');}
 return {range:p.range,previews:p.previews,timezone:p.timezone};
}
export function dayKey(at,timezone){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(at));const get=k=>parts.find(p=>p.type===k).value;return `${get('year')}-${get('month')}-${get('day')}`;}
export function weekKey(day){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const year=d.getUTCFullYear(),start=new Date(Date.UTC(year,0,1));return `${year}-W${String(Math.ceil(((d-start)/86400000+1)/7)).padStart(2,'0')}`;}
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value??'')&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function inHistoryRange(at,{range='all',timezone=historyDefaults.timezone,start,end,now=Date.now()}={}){
 if(!at||!Number.isFinite(new Date(at).getTime()))return range==='all';
 const day=dayKey(at,timezone),today=dayKey(now,timezone);
 if(range==='all')return true;if(range==='daily')return day===today;if(range==='weekly')return weekKey(day)===weekKey(today);
 if(range!=='custom'||!validDate(start)||!validDate(end)||start>end)throw Error('HISTORY_DATE_RANGE_INVALID');return day>=start&&day<=end;
}
const secretName=/token|signature|credential|secret|password|authorization|api[-_]?key|^x-amz-|^x-goog-/i;
function publicMetadata(value,key='',privacy=false){
 if(privacy&&/source.*url|page.*url|host.*title|page.*title/i.test(key))return '[omitted for privacy]';
 if(secretName.test(key))return '[redacted]';
 if(Array.isArray(value))return value.map(v=>publicMetadata(v,'',privacy));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,publicMetadata(v,k,privacy)]));
 if(typeof value==='string'){
  if(/^https?:/i.test(value))return safeHistoryURL(value)??'[unavailable URL]';
  if(key==='click2cloud')try{const parsed=JSON.parse(value),safe=publicMetadata(parsed,'',privacy);return JSON.stringify(parsed)===JSON.stringify(safe)?value:JSON.stringify(safe);}catch{}
 }
 return value;
}
export function savedMetadata(receipt,{privacy=false}={}){
 const raw=receipt?.savedFileMetadata;if(!raw)return null;
 // Exact as-written fields only. This snapshot is produced by the writer, never
 // reconstructed from receipt IDs, timing, EXIF or parsed provenance.
 return publicMetadata({httpMetadata:raw.httpMetadata??{},customMetadata:raw.customMetadata??{}},'',privacy);
}
export function historyRecord(row,{privacy=false}={}){
 const r=row.receipt,d=r?.destination??row.destination??{},c=row.historyContext??{},provenance=r?.provenance;
 const objectKey=r?.key??null,filename=objectKey?.split('/').at(-1)??row.attemptedFilename??null;
 const metadata=savedMetadata(r,{privacy}),verified=row.state==='verified'&&!!r&&!!row.proofKind;
 const links=privacy?{hostPageURL:null,sourceURL:null}: {hostPageURL:safeHistoryURL(c.hostPageURL),sourceURL:safeHistoryURL(c.sourceURL??provenance?.sourceUrl)};
 return {operationId:row.operationId,timestamp:Number.isFinite(new Date(row.at).getTime())?new Date(row.at).toISOString():null,status:verified?'verified':['failed','blocked','cancelled'].includes(row.state)?'failed':'uncertain',statusLabel:verified?'Saved and verified':['failed','blocked','cancelled'].includes(row.state)?'Not saved':'Not confirmed',filename,originalFilename:provenance?.originalFilename??row.attemptedFilename??null,hostPageTitle:privacy?null:c.hostPageTitle??null,hostname:privacy?null:c.hostname??(links.hostPageURL?new URL(links.hostPageURL).hostname:null),...links,publicObjectURLs:[],provider:d.provider??null,accountReference:d.accountId??null,connectionId:d.connectionId??null,bucket:d.bucketName??null,prefix:objectKey?objectKey.slice(0,objectKey.lastIndexOf('/')+1):d.prefix??null,objectKey,saveMode:row.saveMode??(provenance?.presentation?.placement==='quick'?'quick':provenance?.mode)??null,proofKind:row.proofKind??null,error:verified?null:row.code??null,savedFileMetadata:metadata,metadataRedacted:metadata?JSON.stringify(metadata)!==JSON.stringify({httpMetadata:r.savedFileMetadata.httpMetadata??{},customMetadata:r.savedFileMetadata.customMetadata??{}}):false,metadataAvailability:metadata?(r.savedFileMetadataOrigin==='current-remote'?'Current remote metadata; historical upload snapshot unavailable':'Historical upload metadata snapshot'):'Not captured for this operation',availability:{hostPageTitle:privacy?'Omitted for privacy':c.hostPageTitle?'Captured':'Not captured',publicObjectURLs:'No verified public URL recorded',savedFileMetadata:metadata?'Captured at save':'Not captured'},canGoTo:!!r&&typeof r.key==='string'&&row.state==='verified'};
}
export function customerRows(rows,options={}){return rows.filter(r=>r.kind!=='readiness'&&(r.kind!=='depth-click'||!r.cause||!rows.some(s=>s.operationId===r.cause))).map(r=>historyRecord(r,options));}
export function historyPage(rows,{page=1,...range}={}){const filtered=rows.filter(r=>inHistoryRange(r.timestamp,range)),pages=Math.max(1,Math.ceil(filtered.length/25)),current=Math.min(pages,Math.max(1,page));return {items:filtered.slice((current-1)*25,current*25),page:current,pages,total:filtered.length};}
export function historyGroups(items,timezone){const years=new Map();for(const item of items){const day=item.timestamp?dayKey(item.timestamp,timezone):'Date not captured',week=item.timestamp?weekKey(day):'Week not captured',year=item.timestamp?week.slice(0,4):'Year not captured';if(!years.has(year))years.set(year,new Map());const weeks=years.get(year);if(!weeks.has(week))weeks.set(week,new Map());const days=weeks.get(week);if(!days.has(day))days.set(day,[]);days.get(day).push(item);}return years;}
const csv=v=>{let text=String(v==null?'':typeof v==='object'?JSON.stringify(v):v);if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
export async function* exportHistory(pages,{format='json',privacy=false,...selection}={}){
 // Validate even for an empty export. Caller supplies cursor pages, independent
 // of display pagination. One chunk/record keeps output memory bounded.
 inHistoryRange(Date.now(),selection);const meta={schema:'click2cloud.history/1',selection:{...selection,timezone:selection.timezone??historyDefaults.timezone},privacy,exportedAt:new Date().toISOString()};
 if(!['json','jsonl','csv'].includes(format))throw Error('HISTORY_FORMAT_INVALID');
 if(format==='json')yield '{"export":'+JSON.stringify(meta)+',"operations":[';
 else if(format==='jsonl')yield JSON.stringify({export:meta})+'\n';
 const fields=['recordType',...Object.keys(historyRecord({at:0})).filter(k=>k!=='canGoTo'),'exportSelection'];
 if(format==='csv'){yield fields.map(csv).join(',')+'\r\n';yield fields.map(k=>csv(k==='recordType'?'export':k==='exportSelection'?meta:null)).join(',')+'\r\n';}
 let first=true;
 for await(const page of pages){for(const row of customerRows(page,{privacy})){if(!inHistoryRange(row.timestamp,selection))continue;const value=privacy?{...row,hostPageTitle:null,hostname:null,hostPageURL:null,sourceURL:null}:row;delete value.canGoTo;
 if(format==='json'){yield (first?'':',')+JSON.stringify(value);}
 else if(format==='jsonl')yield JSON.stringify(value)+'\n';
 else {yield fields.map(k=>csv(k==='recordType'?'operation':k==='exportSelection'?null:value[k])).join(',')+'\r\n';}first=false;
 }await new Promise(resolve=>setTimeout(resolve,0));}
 if(format==='json')yield ']}';
}
