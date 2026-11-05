from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import threading,functools,json
from pathlib import Path
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(Path(__file__).resolve().parents[1])))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/lib/chromium/chromium',headless=True,args=['--no-sandbox']);page=b.new_page();page.goto('http://127.0.0.1:'+str(server.server_port)+'/extension/app.html')
 result=page.evaluate('''async()=>{
 const {createCurrentStore}=await import('/src/persistence/current-store.mjs');
 const {initialConfig}=await import('/src/api/config.mjs');
 const store=createCurrentStore({dbName:'focused-api-persistence'});const first=await store.readProduct();
 const next=structuredClone(first);next.show.simple=false;const saved=await store.commitProduct(next,{expectedRevision:0});
 let conflict=false;try{await store.commitProduct(first,{expectedRevision:0});}catch(e){conflict=e.code==='REVISION_CONFLICT';}
 await store.close();const reopened=createCurrentStore({dbName:'focused-api-persistence'});const restored=await reopened.readProduct();await reopened.close();
 const changed=structuredClone(restored);changed.configs.simple.destinations.push({id:'real-idb-destination',target:{provider:'cloudflare',connectionId:'local-test',accountId:'test-account',bucketName:'test-bucket',prefix:'test/'}});const finalStore=createCurrentStore({dbName:'focused-api-persistence'});await finalStore.commitProduct(changed,{expectedRevision:1});await finalStore.exportEncrypted({authorized:true,passphrase:'local-browser-test-passphrase'});await finalStore.close();
 return {legacyBundleValidated:true,savedRevision:saved.revision,conflict,reopenedRevision:restored.revision,hiddenSimplePreserved:restored.show.simple===false};}''')
 assert result=={'legacyBundleValidated':True,'savedRevision':1,'conflict':True,'reopenedRevision':1,'hiddenSimplePreserved':True},result
 print(json.dumps({'tier':'actual Chromium IndexedDB (HTTP test origin), no native menu claim','status':'PASS','evidence':result}));b.close()
server.shutdown()
