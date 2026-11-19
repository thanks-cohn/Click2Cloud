// Real Chromium DOM/layout; synthetic OAuth, inventory and IPC. Never cloud proof.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(new URL('../',import.meta.url).pathname),phase=process.env.C2C_PHASE??'after';
const sourceRoot=resolve(process.env.C2C_SOURCE_ROOT??root);
const out=resolve(root,'codex/11.13.2026-0355/EVIDENCE/layout-'+phase);await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{const p=resolve(sourceRoot,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(sourceRoot+'/'))return res.writeHead(403).end();try{res.setHeader('Content-Type',({'.mjs':'text/javascript','.css':'text/css','.html':'text/html'})[extname(p)]??'text/plain');res.end(await readFile(p));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
const results={phase,sourceRoot,time:new Date().toISOString(),evidenceClass:'actual-Chromium-DOM-fixture-provider-not-native-menu',measurements:[]};
try{
 browser=await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});results.browser=browser.version();
 const page=await browser.newPage({viewport:{width:1000,height:1000}});page.setDefaultTimeout(10000);
 await page.addInitScript(()=>{const host=import('/tests/product-browser-host.mjs');globalThis.chrome={runtime:{id:'fixture',onMessage:{addListener(){}},sendMessage:async m=>(await host).invoke({version:m.version,method:m.method,params:m.params})}};});
 await page.goto(`http://127.0.0.1:${server.address().port}/extension/app.html`);
 await page.waitForFunction(()=>!!window.productFixture);
 await page.evaluate(async()=>{const f=window.productFixture;const s=await f.current.read();const scopes=Array.from({length:23},(_,i)=>({target:{...f.target,bucketName:i===0?'long-bucket-name-for-accessibility-and-responsive-layout':`bucket-${i}`},maxDepth:i===0?100:10}));await f.current.commitProduct({...s,configs:{...s.configs,depth:{...s.configs.depth,scopes},simple:{...s.configs.simple,destinations:[{target:f.target,label:'Simple control'}]},nested:{...s.configs.nested,destinations:[{target:{...f.target,prefix:'projects/'},label:'Narrow control'}]}},expectedRevision:s.product.revision,idempotencyKey:'layout-seed',fingerprint:'layout-seed'});});
 for(const width of [1000,360]){
  await page.setViewportSize({width,height:1000});
  await page.locator('#manage').click();
  for(const mode of ['simple','nested','depth']){
   await page.locator(`[data-manager-mode="${mode}"]`).click();await page.locator('[data-hide]').first().waitFor();
   const measurement=await page.locator('.dest-row').first().evaluate(el=>{const describe=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {width:r.width,height:r.height,alignItems:s.alignItems,display:s.display,margin:s.margin,padding:s.padding};};return {row:describe(el),controls:describe(el.querySelector('.controls')),eye:describe(el.querySelector('[data-hide]')),trash:describe(el.querySelector('[data-delete]')),label:el.querySelector('label')?describe(el.querySelector('label')):null};});
   results.measurements.push({width,mode,...measurement});
   if(phase==='after'&&mode!=='depth'){const baseline=JSON.parse(await readFile(resolve(out,'../layout-before/results.json'),'utf8'));assert.deepEqual(measurement,Object.fromEntries(Object.entries(baseline.measurements.find(m=>m.width===width&&m.mode===mode)).filter(([k])=>!['width','mode'].includes(k))));}
   if(mode==='depth'){
    await page.locator('[data-hide]').first().focus();await page.screenshot({path:resolve(out,`${width}-depth-focus.png`)});
    if(phase==='after'){assert.equal(measurement.eye.height,32);assert.equal(measurement.trash.height,32);assert.equal(measurement.eye.width,32);}
    const before=await page.evaluate(async()=>JSON.stringify((await window.productFixture.current.read()).configs));
    await page.locator('[data-hide]').first().click();await page.locator('[data-delete]').last().click();
    assert.equal(await page.evaluate(async()=>JSON.stringify((await window.productFixture.current.read()).configs)),before,'eye/delete must stage only');
    await page.locator('#next').click();assert.match(await page.locator('#dest-list').innerText(),/bucket-20/);
    await page.locator('#previous').click();
    await page.evaluate(()=>document.body.style.zoom='1.5');await page.screenshot({path:resolve(out,`${width}-depth-zoom.png`)});await page.evaluate(()=>document.body.style.zoom='');
   }else await page.screenshot({path:resolve(out,`${width}-${mode}.png`)});
  }
  await page.locator('.dialog-head button').click();
 }
 results.result='PASS';
}catch(e){results.result='FAIL';results.error=e.stack;process.exitCode=1;}
finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results));}
