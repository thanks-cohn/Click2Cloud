// Real Chromium UI/download/IDB, explicit Chrome messaging ports. No installed
// extension/native menu/live provider claim. All data is generated synthetic data.
import {chromium} from 'playwright-core';import {createServer} from 'node:http';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';
const root=resolve(process.env.C2C_EXPORT_ROOT??'.'),output=resolve(process.env.C2C_EXPORT_EVIDENCE??'work/recorder-first/browser-exports'),baseline=process.env.C2C_EXPORT_BASELINE==='1';await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><title>Recorder export fixture</title><main id="panel"></main>');return;}const path=resolve(root,'.'+url.pathname);if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}try{res.setHeader('content-type',extname(path)==='.mjs'?'text/javascript':extname(path)==='.css'?'text/css':'text/plain');res.end(await readFile(path));}catch{res.writeHead(404).end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.C2C_CHROME_EXECUTABLE??'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-precise-memory-info']});const results=[];
try{
 for(const count of baseline?[102]:[0,102,10000,...(process.env.C2C_EXPORT_STRESS==='1'?[100000]:[])])for(const privacy of baseline?['SECURE']:['SECURE','RAW']){
  const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage();page.on('dialog',d=>d.accept());await page.goto(origin);
  await page.evaluate(async count=>{
   const {createRecorderHost}=await import('/src/recorder/host.mjs'),{openBasic,openRich}=await import('/src/recorder/storage.mjs');
   const chromePort={storage:{local:{get:async()=>({uiDebugMode:true}),set:async()=>{}},onChanged:{addListener(){}}}};
   const host=await createRecorderHost({chrome:chromePort,build:{extensionVersion:'0.3.19'}});
   window.exportCalls=[];window.chrome={runtime:{sendMessage:async request=>{window.exportCalls.push(request.method);return host.request(request);}}};
   const call=async(method,params={})=>{const r=await host.request({version:2,method,params});if(r.state!=='completed')throw Error(r.code);return r.data;};
   let state;for(let i=0;i<250;i++){state=await call('status');if(state.basic.control&&state.rich.state==='AVAILABLE'&&state.debug)break;await new Promise(ok=>setTimeout(ok,10));}
   const run=await call('start',{limit:Math.max(4000,count),consent:true});window.selectedRun=run.id;
   const basic=await openBasic({epoch:state.basic.control.epoch}),rich=await openRich({epoch:state.basic.control.epoch}),basicCount=Math.min(2000,Math.ceil(count/5));
   for(let start=0;start<basicCount;start+=128)await basic.commit(Array.from({length:Math.min(128,basicCount-start)},()=>({attemptId:crypto.randomUUID(),state:'blocked',providerId:'cloudflare',mode:'simple'})));
   const batch=count===102?7:128,attempt=crypto.randomUUID();
   for(let start=1;start<=count;start+=batch)await rich.append(Array.from({length:Math.min(batch,count-start+1)},(_,i)=>({schemaVersion:2,runId:run.id,sequence:start+i,attemptId:attempt,workerEpoch:state.basic.control.epoch,timestampUtc:'2026-11-14T00:00:00.000Z',stage:'intent',providerId:'cloudflare',mode:'simple',context:'link',raw:{sourceUrl:'https://synthetic.invalid/PRIVATE_EXPORT_SENTINEL?signature=PRIVATE_EXPORT_SENTINEL'}})));
   rich.close();basic.close();const {mountRecorderPanel}=await import('/extension/recorder-panel.mjs');await mountRecorderPanel(document.querySelector('#panel'));
   window.heapBefore=performance.memory?.usedJSHeapSize??null;
  },count);
  // Default run selection must not silently export Basic-only; explicitly selecting
  // the run in the baseline isolates the separate manual download defect.
  if(baseline)await page.selectOption('#rec-run',await page.evaluate(()=>window.selectedRun));
  else assert.equal(await page.inputValue('#rec-run'),await page.evaluate(()=>window.selectedRun));
  const downloadPromise=page.waitForEvent('download',{timeout:baseline?3000:180000});
  await page.click(privacy==='RAW'?'#rec-raw':'#rec-secure');
  let download;try{download=await Promise.race([downloadPromise,page.waitForFunction(()=>/^(FAILED|CANCELED)/.test(document.querySelector('#rec-export-status').textContent),{},{timeout:180000}).then(async()=>{throw Error(await page.locator('#rec-export-status').textContent());})]);}catch{const diagnostic=await page.evaluate(()=>({status:document.querySelector('#rec-export-status').textContent,pageCalls:window.exportCalls.filter(x=>x==='page').length,downloadAnchorReady:!!document.querySelector('#rec-download')?.href,manualNextVisible:!!document.querySelector('#rec-next')&&!document.querySelector('#rec-next').hidden}));results.push({count,privacy,state:'FAIL',reason:'ONE_CLICK_DID_NOT_START_DOWNLOAD',...diagnostic});await context.close();throw Error('ONE_CLICK_DID_NOT_START_DOWNLOAD');}
  const path=output+'/'+privacy+'-'+count+'.zip';await download.saveAs(path);assert.equal(await download.failure(),null);
  const verified=JSON.parse(execFileSync('python',['scripts/verify-recorder-zip.py',path,String(count),privacy],{encoding:'utf8'}));
  const ui=await page.evaluate(()=>({status:document.querySelector('#rec-export-status').textContent,pageCalls:window.exportCalls.filter(x=>x==='page').length,heapBefore:window.heapBefore,heapAfter:performance.memory?.usedJSHeapSize??null,manualNext:!!document.querySelector('#rec-next')}));
  assert(ui.status.startsWith('COMPLETE'),ui.status);assert(!ui.manualNext);results.push({count,privacy,state:'PASS',oneExportAction:true,oneDownload:true,...verified,...ui});await context.close();
 }
}catch(error){process.exitCode=1;if(!results.some(r=>r.state==='FAIL'))results.push({state:'FAIL',reason:error.message});}
finally{await writeFile(output+'/results.json',JSON.stringify({evidenceClass:'HTTP_BROWSER_UI_REAL_IDB_DOWNLOAD_FAKE_CHROME_PORT_NOT_INSTALLED_EXTENSION',browser:browser.version(),os:process.platform,baseline,results},null,2)+'\n');await browser.close();await new Promise(ok=>server.close(ok));}
console.log(JSON.stringify(results.map(({status,...r})=>r),null,2));
