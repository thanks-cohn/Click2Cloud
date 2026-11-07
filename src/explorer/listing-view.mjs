// Presentation helpers for the existing File API, not another transfer/config owner.
export function createListingOrder(){
 const collator=new Intl.Collator(undefined,{numeric:true});let previous,key,direction,rows=[],indices=new Map();
 return {read(entries,sort){if(previous!==entries||key!==sort.key||direction!==sort.direction){previous=entries;key=sort.key;direction=sort.direction;rows=[...entries].sort((a,b)=>Number(b.folder)-Number(a.folder)||direction*(typeof a[key]==='number'&&typeof b[key]==='number'?a[key]-b[key]:collator.compare(String(a[key]??''),String(b[key]??'')))||collator.compare(a.key,b.key));indices=new Map(rows.map((e,i)=>[e.key,i]));}return rows;},index(value){return indices.get(value);}};
}
export function rowWindow(length,scrollTop,height,rowHeight=40){const start=Math.max(0,Math.floor(Math.max(0,scrollTop-40)/rowHeight)-6);return {start,end:Math.min(length,start+Math.ceil(height/rowHeight)+14),top:start*rowHeight};}
export function createListingReader(read,{maxPages=64,ttlMs=10000,clock=Date.now}={}){
 let generation=0;const cache=new Map(),pending=new Map();
 return {invalidate(){generation++;cache.clear();pending.clear();},async page(source,cursor='',fresh=false){const key=JSON.stringify([source,cursor]),epoch=generation,cached=cache.get(key);if(!fresh&&cached&&clock()-cached.at<ttlMs)return cached.value;if(pending.has(key))return pending.get(key);
 const task=Promise.resolve().then(()=>read(source,cursor)).then(value=>{if(epoch===generation){cache.delete(key);cache.set(key,{value,at:clock()});while(cache.size>maxPages)cache.delete(cache.keys().next().value);}return value;});pending.set(key,task);try{return await task;}finally{if(pending.get(key)===task)pending.delete(key);}}};
}
