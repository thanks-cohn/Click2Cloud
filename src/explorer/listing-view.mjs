// Presentation helpers for the existing File API, not another transfer/config owner.
export function createListingOrder(){
 const collator=new Intl.Collator(undefined,{numeric:true}),cache=new WeakMap();let current;
 return {read(entries,sort){let found=cache.get(entries);if(!found||found.key!==sort.key||found.direction!==sort.direction){const rows=[...entries].sort((a,b)=>Number(b.folder)-Number(a.folder)||sort.direction*(typeof a[sort.key]==='number'&&typeof b[sort.key]==='number'?a[sort.key]-b[sort.key]:collator.compare(String(a[sort.key]??''),String(b[sort.key]??'')))||collator.compare(a.key,b.key));found={key:sort.key,direction:sort.direction,rows,indices:new Map(rows.map((e,i)=>[e.key,i]))};cache.set(entries,found);}current=found;return found.rows;},index(value){return current?.indices.get(value);}};
}
export function rowWindow(length,scrollTop,height,rowHeight=40){const start=Math.min(Math.max(0,length-1),Math.max(0,Math.floor(Math.max(0,scrollTop-40)/rowHeight)-6));return {start,end:Math.min(length,start+Math.ceil(height/rowHeight)+14),top:start*rowHeight};}
// Metadata only, bounded concurrency/cache; never caches cloud authority. Signals
// cancel queued work/subscribers. Already-sent runtime IPC cannot be recalled:
// stale responses are discarded by epochs, not misrepresented as network aborts.
export function createListingReader(read,{maxPages=64,ttlMs=10000,maxConcurrent=3,clock=Date.now}={}){
 let generation=0,active=0;const cache=new Map(),pending=new Map(),waiting=[];
 const pump=()=>{while(active<maxConcurrent&&waiting.length){const job=waiting.shift();if(job.signal.aborted){job.reject(job.signal.reason);continue;}active++;Promise.resolve().then(job.run).then(job.resolve,job.reject).finally(()=>{active--;pump();});}};
 return {invalidate(){generation++;cache.clear();pending.clear();},async page(source,cursor='',fresh=false,signal){
  signal?.throwIfAborted();const key=JSON.stringify([source,cursor]),epoch=generation,cached=cache.get(key);if(!fresh&&cached&&clock()-cached.at<ttlMs)return cached.value;let request=pending.get(key);if(request?.controller.signal.aborted)request=null;
  if(!request){const controller=new AbortController();request={controller,subscribers:0};const task=new Promise((resolve,reject)=>{waiting.push({signal:controller.signal,resolve,reject,run:()=>read(source,cursor,controller.signal)});pump();}).then(raw=>{if(!Array.isArray(raw?.entries))throw Error('Provider listing is invalid.');const value={...raw,entries:[...new Map(raw.entries.map(e=>[e.key,e])).values()]};if(epoch===generation&&!controller.signal.aborted){cache.delete(key);cache.set(key,{value,at:clock()});while(cache.size>maxPages)cache.delete(cache.keys().next().value);}return value;});request.task=task;pending.set(key,request);task.finally(()=>{if(pending.get(key)===request)pending.delete(key);}).catch(()=>{});}
  request.subscribers++;return new Promise((resolve,reject)=>{let done=false;const finish=(fn,value)=>{if(done)return;done=true;signal?.removeEventListener('abort',abort);request.subscribers--;fn(value);},abort=()=>{finish(reject,signal.reason);if(!request.subscribers)request.controller.abort(signal.reason);};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();request.task.then(value=>finish(resolve,value),e=>finish(reject,e));});
 }};
}

export function gridWindow(length,scrollTop,height,width){const columns=Math.max(1,Math.floor(width/160)),rowHeight=136,startRow=Math.min(Math.max(0,Math.ceil(length/columns)-1),Math.max(0,Math.floor(scrollTop/rowHeight)-2)),start=startRow*columns,end=Math.min(length,start+(Math.ceil(height/rowHeight)+4)*columns);return {start,end,top:startRow*rowHeight,total:Math.ceil(length/columns)*rowHeight,columns,rowHeight};}
