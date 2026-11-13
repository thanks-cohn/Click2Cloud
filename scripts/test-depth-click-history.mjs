// Real Chromium DOM/layout; synthetic OAuth, inventory and IPC. Never cloud proof.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(new URL('../',import.meta.url).pathname),phase=process.env.C2C_PHASE??'after';
const sourceRoot=resolve(process.env.C2C_SOURCE_ROOT??root);
const out=resolve(root,'codex/11.13.2026-0355/DEPTH_P0_REPAIR/EVIDENCE/browser');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{const p=resolve(sourceRoot,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(sourceRoot+'/'))return res.writeHead(403).end();try{res.setHeader('Content-Type',({'.mjs':'text/javascript','.css':'text/css','.html':'text/html'})[extname(p)]??'text/plain');res.end(await readFile(p));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const results={phase,sourceRoot,time:new Date().toISOString(),evidenceClass:'actual-Chromium-DOM-fixture-provider-not-native-menu',measurements:[]};
try{
 browser=await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});results.browser=browser.version();
 const page=await browser.newPage({viewport:{width:1000,height:1000}});page.setDefaultTimeout(10000);
 await page.addInitScript(()=>{const host=import('/tests/product-browser-host.mjs');globalThis.chrome={runtime:{id:'fixture',onMessage:{addListener(){}},sendMessage:async m=>(await host).invoke({version:m.version,method:m.method,params:m.params})}};});
 await page.goto(`http://127.0.0.1:${server.address().port}/extension/app.html`);
 await page.waitForFunction(()=>!!window.productFixture);

 await page.evaluate(async()=>window.productFixture.current.recordRemoteResult({kind:'depth-click',operationId:'depth-click:fixture',state:'blocked',code:'WORKER_SETUP_REQUIRED',destination:{provider:'cloudflare-r2',connectionId:'cloudflare:fixture-account',accountId:'fixture-account',bucketName:'fixture-bucket',prefix:''},stage:JSON.stringify({itemId:'fixture',reason:'PLAN_MISSING',mode:'depth'})}));
 await page.locator('#remote-history').click();await page.getByText('Depth click · blocked',{exact:true}).waitFor();
 assert.equal(await page.locator('[data-receipt="depth-click:fixture"]').count(),0);
 await page.getByText('Click boundary details',{exact:true}).click();await page.getByText(/PLAN_MISSING/).waitFor();
 await page.screenshot({path:resolve(out,'blocked-click.png')});
 await page.reload();await page.locator('#remote-history').click();await page.getByText('Depth click · blocked',{exact:true}).waitFor();
 results.result='PASS';results.checks=['production IndexedDB retains depth-click kind','actual app renders blocked click and metadata','no fabricated receipt controls','reload retains click record'];
}catch(e){results.result='FAIL';results.error=e.stack;process.exitCode=1;}
finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));}
