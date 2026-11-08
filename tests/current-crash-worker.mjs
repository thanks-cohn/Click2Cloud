// Disposable real browser Worker: intentionally terminated while a production
// CURRENT transaction is active. Never imported by the extension.
import {createCurrentStore} from '../src/persistence/current-store.mjs';
onmessage=async({data:{dbName,point}})=>{
 const c=createCurrentStore({dbName,fault:stage=>{if(stage===point){postMessage({stage});for(;;){/* terminated by the isolated test host */}}}});
 const s=await c.read();await c.commitProduct({...s,product:{...s.product,theme:'light'},expectedRevision:s.product.revision,idempotencyKey:'killed',fingerprint:'killed'});
};
