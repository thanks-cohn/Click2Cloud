// Real Chromium DOM/layout; synthetic OAuth, inventory and IPC. Never cloud proof.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(new URL('../',import.meta.url).pathname),phase=process.env.C2C_PHASE??'after';
const sourceRoot=resolve(process.env.C2C_SOURCE_ROOT??root);
const out=resolve(process.env.C2C_DEPTH_HISTORY_EVIDENCE??'codex/11.13.2026-0355/DEPTH_P0_REPAIR/EVIDENCE/browser');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{const p=resolve(sourceRoot,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(sourceRoot+'/'))return res.writeHead(403).end();try{res.setHeader('Content-Type',({'.mjs':'text/javascript','.css':'text/css','.html':'text/html'})[extname(p)]??'text/plain');res.end(await readFile(p));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const results={phase,sourceRoot,time:new Date().toISOString(),evidenceClass:'actual-Chromium-DOM-fixture-provider-not-native-menu',measurements:[]};
try{
 browser=await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});results.browser=browser.version();
 const page=await browser.newPage({viewport:{width:1000,height:1000}});page.setDefaultTimeout(10000);
 await page.addInitScript(()=>{const host=import('/tests/product-browser-host.mjs');globalThis.chrome={runtime:{id:'fixture',onMessage:{addListener(){}},sendMessage:async m=>(await host).invoke({version:m.version,method:m.method,params:m.params})},storage:{local:{get:async key=>({[key]:JSON.parse(localStorage.getItem(key)??'null')}),set:async values=>{for(const [key,value] of Object.entries(values))localStorage.setItem(key,JSON.stringify(value));}}}};});
 await page.goto(`http://127.0.0.1:${server.address().port}/extension/app.html`);
 await page.waitForFunction(()=>!!window.productFixture);

 await page.evaluate(async()=>window.productFixture.current.recordRemoteResult({kind:'depth-click',operationId:'depth-click:fixture',state:'blocked',code:'WORKER_SETUP_REQUIRED',destination:{provider:'cloudflare-r2',connectionId:'cloudflare:fixture-account',accountId:'fixture-account',bucketName:'fixture-bucket',prefix:''},stage:JSON.stringify({itemId:'fixture',reason:'PLAN_MISSING',mode:'depth'})}));
 const customerHistory=async()=>{
  await page.getByRole('button',{name:'History',exact:true}).click();
  const row=page.locator('[data-operation="depth-click:fixture"]');
  await row.getByText('Not saved',{exact:true}).waitFor();
  assert.equal(await row.getByRole('button',{name:'GO TO',exact:true}).count(),0);
 };
 assert.equal(await page.locator('#remote-history').isVisible(),false);
 await customerHistory();
 await page.reload();
 await customerHistory();

 await page.locator('#header-more').click();
 await page.getByRole('menuitem',{name:'Settings',exact:true}).click();
 await page.locator('#debug-mode').check();
 await page.waitForFunction(()=>document.documentElement.dataset.debugMode==='on');
 await page.locator('#header-more').click();
 await page.getByRole('menuitem',{name:'Help · Diagnose',exact:true}).click();
 await page.getByRole('button',{name:'Inspect save diagnostics',exact:true}).click();
 await page.getByText('Depth click · blocked',{exact:true}).waitFor();
 assert.equal(await page.locator('[data-receipt="depth-click:fixture"]').count(),0);
 await page.getByText('Click boundary details',{exact:true}).click();await page.getByText(/PLAN_MISSING/).waitFor();
 await page.screenshot({path:resolve(out,'blocked-click.png')});
 results.result='PASS';results.checks=['production IndexedDB retains depth-click record across reload','ordinary History shows blocked click with Debug Mode off','debug save diagnostics show click boundary metadata','blocked click exposes no receipt or GO TO control'];
}catch(e){results.result='FAIL';results.error=e.stack;process.exitCode=1;}
finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));}
