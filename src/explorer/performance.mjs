// Opt-in, local Performance Timeline only. No identities, paths, URLs or data.
// Enable localStorage.click2cloudPerformance='1' and reload the genuine Shelf.
let enabled=false;try{enabled=globalThis.localStorage?.getItem('click2cloudPerformance')==='1';}catch{}
export function paintTrace(kind,start=performance.now()){
 if(!enabled)return;requestAnimationFrame(()=>requestAnimationFrame(()=>{const name='c2c.explorer.'+kind;performance.measure(name,{start,end:performance.now()});const entries=performance.getEntriesByType('measure').filter(e=>e.name.startsWith('c2c.explorer.'));if(entries.length>256)for(const e of entries.slice(0,128))performance.clearMeasures(e.name);}));
}
